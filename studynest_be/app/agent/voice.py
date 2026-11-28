"""Realtime voice adapter: chỉ giữ 1 tool delegate_chat để điều phối Chat Agent xử lý, tránh đốt token model live."""
import asyncio
from contextlib import suppress
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select

from app.agent.runtime import AgentService, delegate_voice_turn_async
from app.core.security import AuthError
from app.core.settings import settings
from app.db.models.agent import AgentEvent
from app.db.models.database import User
from app.db.sesson import AsyncSessionLocal


DELEGATE_CHAT_TOOL: dict = {
    "type": "function",
    "name": "delegate_chat",
    "description": (
        "Chuyển yêu cầu của học viên sang Trợ lý Chat xử lý (hỏi bài học, tra khóa học, "
        "mở trang/điều hướng, xem tiến độ, đọc ảnh đính kèm, tìm web, bộ nhớ, GitHub, "
        "hoặc bất kỳ câu hỏi kiến thức/dữ liệu nào). Luôn gọi công cụ này trừ lời chào cực ngắn."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "request": {
                "type": "string",
                "description": "Nguyên văn hoặc tóm tắt rõ ràng yêu cầu mới nhất của học viên.",
            }
        },
        "required": ["request"],
    },
}


class VoiceAgentAdapter:
    def __init__(self, relay, session_id, auth_sid):
        self.relay, self.session_id, self.auth_sid = relay, UUID(str(session_id)), str(auth_sid)
        self.namespace = uuid4().hex
        self.total_calls = 0

    @classmethod
    async def bind_async(cls, relay, session_id):
        if not settings.AGENT_ENABLED:
            raise HTTPException(503, "Agent chưa được bật")
        if settings.AGENT_MAX_RUN_COST_USD is not None:
            raise HTTPException(
                503,
                "Voice chưa có đo chi phí audio đủ để thực thi ngân sách tiền tệ; chưa thể mở phiên.",
            )
        identity = getattr(relay.ws.state, "access_identity", None)
        if identity is None or identity.user_id != relay.user.id:
            raise AuthError("invalid_token")
        adapter = cls(relay, session_id, identity.sid)
        async with AsyncSessionLocal() as db:
            svc = AgentService(db, relay.user, adapter.auth_sid)
            await svc.principal_async()
            session = await svc.get_session_async(adapter.session_id)
            if session.lesson_id != relay.lesson_id:
                raise HTTPException(409, "Voice không thuộc bài học đang mở")
            if session.lesson_id:
                await svc.validate_lesson_async()
        return adapter

    async def declarations_async(self):
        """Chỉ khai báo đúng 1 tool điều phối để không đốt token schema của 59 tools trên model live."""
        return [DELEGATE_CHAT_TOOL]

    async def _events_async(self, run_id, done):
        sequence = 0
        while True:
            async with AsyncSessionLocal() as db:
                user = await db.get(User, self.relay.user.id)
                if user is None:
                    return
                service = AgentService(db, user, self.auth_sid)
                await service.principal_async()
                await service.get_run_async(run_id)
                rows = (
                    await db.scalars(
                        select(AgentEvent)
                        .where(AgentEvent.run_id == run_id, AgentEvent.sequence > sequence)
                        .order_by(AgentEvent.sequence)
                        .limit(100)
                    )
                ).all()
                for event in rows:
                    sequence = event.sequence
                    await self.relay.emit(
                        "agent_event",
                        event={
                            "schema_version": 1,
                            "id": str(event.id),
                            "run_id": str(run_id),
                            "sequence": event.sequence,
                            "type": event.type,
                            "timestamp": event.created_at.isoformat(),
                            "payload": event.payload,
                        },
                    )
            if done.is_set() and len(rows) < 100:
                return
            try:
                await asyncio.wait_for(done.wait(), timeout=0.15)
            except TimeoutError:
                pass

    async def delegate_async(self, request_text: str, call_id: str, user_message: str | None = None):
        self.total_calls += 1
        if self.total_calls > 40:
            return {
                "verified": False,
                "persisted": False,
                "spoken_reply": "Phiên trò chuyện đã đạt giới hạn lượt xử lý. Bạn có thể mở phiên mới nhé.",
            }
        effective_message = (request_text or "").strip() or (
            (user_message if user_message is not None else self.relay.user_text).strip()
        )
        if not effective_message:
            return {
                "verified": False,
                "persisted": False,
                "spoken_reply": "Mình chưa nghe rõ yêu cầu, bạn nói lại giúp mình nhé.",
            }

        done = asyncio.Event()
        pump = None

        async def started(run_id):
            nonlocal pump
            pump = asyncio.create_task(self._events_async(run_id, done))

        try:
            result = await delegate_voice_turn_async(
                self.relay.user,
                self.auth_sid,
                self.session_id,
                effective_message,
                idempotency_key=f"voice-chat:{self.namespace}:{call_id}"[:100],
                on_run_created=started,
            )
            sources = result.get("sources") or []
            if sources:
                for source in sources:
                    if not any(x.get("chunk_id") == source.get("chunk_id") for x in self.relay.sources):
                        self.relay.sources.append(dict(source, index=len(self.relay.sources) + 1))
                await self.relay.emit("sources", sources=self.relay.sources)
            return {
                "verified": bool(result.get("verified")),
                "persisted": bool(result.get("persisted")),
                "awaiting_approval": bool(result.get("awaiting_approval")),
                "spoken_reply": result.get("spoken_reply") or "",
            }
        except HTTPException as exc:
            return {"verified": False, "persisted": False, "spoken_reply": str(exc.detail)}
        except asyncio.CancelledError:
            raise
        except Exception:
            return {
                "verified": False,
                "persisted": False,
                "spoken_reply": "Trợ lý chat tạm thời chưa hoàn tất yêu cầu này. Bạn thử lại nhé.",
            }
        finally:
            done.set()
            if pump:
                with suppress(Exception):
                    await asyncio.wait_for(pump, timeout=2)

    async def call_async(self, alias, arguments, call_id, user_message=None):
        if alias == "delegate_chat":
            req = arguments.get("request") if isinstance(arguments, dict) else ""
            return await self.delegate_async(str(req or ""), call_id, user_message=user_message)
        return {
            "verified": False,
            "persisted": False,
            "spoken_reply": "Công cụ này không khả dụng; hãy gọi delegate_chat để xử lý yêu cầu.",
        }
