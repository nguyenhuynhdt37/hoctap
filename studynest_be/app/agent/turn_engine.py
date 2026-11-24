"""Hannes-Lite Turn Engine: ExecutionGate, RereadLedger, StagnationGuard, and Progressive Streaming.

Ported from @cosmew/core (TurnRun, TurnTools, ExecutionGate) in a lightweight,
deterministic Python form tailored for Mây Mây's FastAPI + PostgreSQL runtime.
"""
import asyncio
import hashlib
import json
import re
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

UNCHANGED_NOTICE = (
    "[unchanged] Lần gọi này trả về nội dung giống hệt lần đọc trước trong cùng lượt. "
    "Nội dung không lặp lại; hãy dùng kết quả đã có để trả lời hoặc thực hiện bước tiếp theo."
)

STAGNATION_NOTICE = (
    "Progress correction: Các lượt công cụ gần đây chỉ tạo ra kết quả đọc trùng lặp hoặc bị từ chối. "
    "Hãy sử dụng bằng chứng đã thu thập để trả lời học viên hoặc chọn một bước hợp lệ khác; "
    "không lặp lại thao tác đã bị từ chối."
)


def canonical_json(value: Any) -> str:
    """Deterministic JSON string with sorted keys for stable fingerprinting."""
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str, separators=(",", ":"))


def stable_digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


class ExecutionGate:
    """Port of Hannes `ExecutionGate` (`packages/core/src/agent/tool-runtime.ts`).

    Read-only / parallel-safe tools acquire shared slots up to `max_shared`;
    navigation and write tools acquire the gate exclusively in strict FIFO order.
    """

    def __init__(self, max_shared: int = 4) -> None:
        self.max_shared = max(1, int(max_shared))
        self._shared = 0
        self._exclusive = False
        self._queue: list[tuple[bool, asyncio.Future[None]]] = []

    def _fits(self, exclusive: bool) -> bool:
        if exclusive:
            return not self._exclusive and self._shared == 0
        return not self._exclusive and self._shared < self.max_shared

    def _pump(self) -> None:
        while self._queue:
            exclusive, waiter = self._queue[0]
            if waiter.cancelled():
                self._queue.pop(0)
                continue
            if not self._fits(exclusive):
                break
            self._queue.pop(0)
            if exclusive:
                self._exclusive = True
            else:
                self._shared += 1
            if not waiter.done():
                waiter.set_result(None)

    async def acquire(self, exclusive: bool = True) -> Callable[[], None]:
        loop = asyncio.get_running_loop()
        waiter: asyncio.Future[None] = loop.create_future()
        self._queue.append((exclusive, waiter))
        self._pump()
        try:
            await waiter
        except asyncio.CancelledError:
            if (exclusive, waiter) in self._queue:
                self._queue.remove((exclusive, waiter))
            self._pump()
            raise

        released = False

        def release() -> None:
            nonlocal released
            if released:
                return
            released = True
            if exclusive:
                self._exclusive = False
            else:
                self._shared = max(0, self._shared - 1)
            self._pump()

        return release


@dataclass
class RereadEntry:
    fingerprint: str
    call_count: int = 1


class TurnToolRuntime:
    """Port of Hannes `TurnTools` (`packages/core/src/agent/turn-tools.ts`).

    Coordinates tool batch execution, deduplicates identical read calls within a turn,
    fences denied write retries, and tracks stagnation across rounds.
    """

    def __init__(self, max_shared: int = 4) -> None:
        self.gate = ExecutionGate(max_shared=max_shared)
        self.seen_reads: dict[str, RereadEntry] = {}
        self.write_denied: set[str] = set()
        self.stagnant_rounds: int = 0
        self.executed_calls: int = 0

    @staticmethod
    def is_parallel_read(tool_def: Any) -> bool:
        """Read tools without client UI side-effects can safely run in shared slots."""
        if tool_def is None:
            return False
        risk = getattr(tool_def, "risk", "read")
        is_client = getattr(tool_def, "client", False)
        name = getattr(tool_def, "name", "")
        if risk != "read":
            return False
        # Client UI snapshots/reads are fast and read-only, but we serialize DB session mutations
        # at the SQLAlchemy session boundary if they share the same db connection.
        return name.startswith("mcp.") and not is_client

    def call_key(self, name: str, arguments: dict[str, Any], revision: int = 0) -> str:
        return f"{name}\0{revision}\0{canonical_json(arguments)}"

    def check_pre_refusal(self, name: str, arguments: dict[str, Any], risk: str) -> str | None:
        sig = f"{name}:{canonical_json(arguments)}"
        if risk == "write" and sig in self.write_denied:
            return "Thao tác ghi này vừa bị từ chối trong lượt hiện tại; không tự động thử lại khi chưa có yêu cầu mới."
        return None

    def record_outcome(
        self,
        name: str,
        arguments: dict[str, Any],
        risk: str,
        result: dict[str, Any] | None,
        *,
        revision: int = 0,
        error: str | None = None,
    ) -> tuple[dict[str, Any] | None, bool]:
        """Returns (possibly deduplicated result, produced_new_evidence)."""
        self.executed_calls += 1
        if error is not None or result is None:
            if risk == "write" and error and ("không chấp thuận" in error.lower() or "từ chối" in error.lower()):
                self.write_denied.add(f"{name}:{canonical_json(arguments)}")
            return result, False

        if risk != "read":
            # Navigation or write changes screen/domain state -> invalidate cached client reads
            if name.startswith(("video.", "ui.", "learning.", "editor.", "quiz.", "mcp.browser_")):
                self.seen_reads.clear()
            return result, True

        key = self.call_key(name, arguments, revision=revision)
        payload_without_call_id = {k: v for k, v in result.items() if k != "tool_call_id"}
        fp = stable_digest(payload_without_call_id)
        existing = self.seen_reads.get(key)
        if existing and existing.fingerprint == fp:
            existing.call_count += 1
            deduped = {
                "verified": result.get("verified", True),
                "evidence_kind": result.get("evidence_kind", "authorized_domain"),
                "unchanged": True,
                "notice": UNCHANGED_NOTICE,
            }
            if "tool_call_id" in result:
                deduped["tool_call_id"] = result["tool_call_id"]
            return deduped, False

        self.seen_reads[key] = RereadEntry(fingerprint=fp, call_count=1)
        return result, True

    def observe_round(self, batch_new_evidence: bool) -> str:
        """Updates stagnation counter after a tool batch and returns guidance if stagnant."""
        if batch_new_evidence:
            self.stagnant_rounds = 0
            return ""
        self.stagnant_rounds += 1
        if self.stagnant_rounds >= 2:
            return STAGNATION_NOTICE
        return ""


def progressive_deltas(text: str, chunk_size: int = 48) -> list[str]:
    """Splits a final response into natural semantic chunks (sentence/clause boundaries)
    for responsive SSE delta streaming when the upstream call returned a complete block.
    """
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]
    tokens = re.findall(r"\S+\s*|\n+", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for token in tokens:
        current.append(token)
        current_len += len(token)
        if current_len >= chunk_size or token.endswith(("\n", ". ", "! ", "? ", ": ")):
            chunks.append("".join(current))
            current = []
            current_len = 0
    if current:
        chunks.append("".join(current))
    return chunks
