"""Realtime Speech-to-Speech AI Roleplay service powered by Qwen 3.8 Omni Flash Realtime (zero separate TTS)."""
import asyncio
import base64
import json
import time
import uuid
from contextlib import suppress
from typing import Any

from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from loguru import logger
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import AccessCredentials, AuthorizationService
from app.core.qwen_voice import (
    call_qwen_json_async,
    open_realtime,
    pick_persona_voice,
    realtime_api_key,
    send_event,
)
from app.core.redis import get_redis
from app.core.settings import settings
from app.db.models.database import CourseSections, Lessons
from app.db.sesson import AsyncSessionLocal
from app.services.user.tutor_voice import (
    AudioBudget,
    _redeem_voice_ticket_async,
    origin_allowed,
)

SPEAKING_PROTOCOL = "studynest-speaking"
SPEAKING_MAX_SECONDS = 900

LANGUAGE_LABELS_VI: dict[str, str] = {
    "en": "Tiếng Anh",
    "zh": "Tiếng Trung",
    "ja": "Tiếng Nhật",
    "ko": "Tiếng Hàn",
    "fr": "Tiếng Pháp",
    "de": "Tiếng Đức",
    "vi": "Tiếng Việt",
}


class SpeakingRealtimeSession:
    def __init__(self, websocket: WebSocket, user: Any, lesson_id: uuid.UUID):
        self.ws = websocket
        self.user = user
        self.lesson_id = lesson_id
        self.lesson_title = ""
        self.lang_code = "en-GB"
        self.level = "B1"
        self.scenario = ""
        self.student_role = "Học viên"
        self.persona: dict[str, Any] = {}
        self.missions: list[dict[str, Any]] = []
        self.max_turns = 8
        self.allow_translation = True
        self.voice_name = "Tina"

        self.completed_mission_ids: list[str] = []
        self.history: list[dict[str, str]] = []
        self.user_turn_count = 0

        self.current_user_text = ""
        self.current_ai_text = ""
        self.send_lock = asyncio.Lock()
        self.analysis_tasks: set[asyncio.Task] = set()

    @property
    def is_vietnamese_target(self) -> bool:
        return self.lang_code.lower().startswith("vi")

    @property
    def target_language_label(self) -> str:
        short = self.lang_code.split("-")[0].lower()
        return LANGUAGE_LABELS_VI.get(short, self.lang_code)

    async def emit(self, kind: str, **values: Any):
        async with self.send_lock:
            await self.ws.send_json({"type": kind, **values})

    async def prepare(self) -> str:
        async with AsyncSessionLocal() as db:
            lesson = await db.scalar(
                select(Lessons)
                .options(
                    selectinload(Lessons.lesson_speaking),
                    selectinload(Lessons.section).selectinload(CourseSections.course),
                )
                .where(Lessons.id == self.lesson_id)
            )
            if not lesson or not lesson.lesson_speaking:
                raise HTTPException(404, "Không tìm thấy nội dung bài Giao tiếp AI.")
            sp = lesson.lesson_speaking
            self.lesson_title = lesson.title or "Bài Giao tiếp AI"
            self.lang_code = sp.lang_code or "en-GB"
            self.level = sp.level or "B1"
            self.scenario = sp.scenario or ""
            self.student_role = sp.student_role or "Học viên"
            self.persona = dict(sp.ai_persona or {})
            self.missions = list(sp.missions or [])
            self.max_turns = max(1, int(sp.max_turns or 8))
            self.allow_translation = bool(sp.allow_translation)
            self.voice_name = pick_persona_voice(self.persona)

        persona_name = self.persona.get("name") or "Alex"
        persona_role = self.persona.get("role") or "Đối tác hội thoại"
        persona_style = (
            self.persona.get("personality")
            or "thân thiện, kiên nhẫn, tự nhiên"
        )
        missions_text = "\n".join(
            f"- [{m.get('id')}] {m.get('title')}"
            + (f" (Gợi ý: {m.get('hint')})" if m.get("hint") else "")
            for m in self.missions
            if m.get("title")
        )

        instructions = f"""Bạn đang tham gia cuộc gọi luyện giao tiếp đóng vai trực tiếp với học viên Việt Nam (ngôn ngữ mẹ đẻ của học viên là Tiếng Việt).
Nhân vật bạn đóng vai: {persona_name} ({persona_role}).
Tính cách & phong cách nói: {persona_style}.
Tình huống bài học: {self.scenario}
Vai trò của học viên: {self.student_role}.
Ngôn ngữ giao tiếp mục tiêu của bài học: {self.lang_code} ({self.target_language_label}, trình độ {self.level}).

Danh sách nhiệm vụ học viên cần nói được trong cuộc trò chuyện:
{missions_text or "- Trò chuyện tự nhiên theo đúng tình huống."}

Quy tắc bắt buộc khi đàm thoại trực tiếp:
1. Riêng ở LỜI CHÀO ĐẦU TIÊN khi mới bắt đầu cuộc gọi: luôn giới thiệu ngắn gọn (1 câu ấm áp) bằng Tiếng Việt cho học viên biết bạn đóng vai {persona_name} ({persona_role}) trong tình huống này, sau đó nói ngay câu mở màn nhập vai bằng {self.lang_code}.
2. Trong các lượt đối đáp tiếp theo: đóng vai {persona_name} và trò chuyện bằng {self.lang_code} (1–2 câu ngắn gọn, tự nhiên, dưới 35 từ mỗi lượt để học viên dễ nghe và có nhiều cơ hội nói). Nếu học viên hỏi cầu cứu bằng Tiếng Việt vì bí từ, bạn có thể nhắc nhanh bằng Tiếng Việt rồi quay lại câu thoại bằng {self.lang_code}.
3. Khéo léo gợi mở để dẫn dắt học viên lần lượt hoàn thành các nhiệm vụ còn lại trong danh sách, tuyệt đối không nói hộ phần của học viên.
4. Nếu âm thanh học viên vừa nói quá ngắn hoặc chưa rõ chữ, hãy lịch sự hỏi lại ngắn gọn để học viên nói lại rõ hơn. Không bao giờ xuất mã JSON hay ký hiệu markdown."""
        return instructions

    def _schedule_analysis(
        self,
        *,
        ai_turn_id: str,
        user_turn_id: str | None,
        user_text: str,
        ai_text: str,
    ):
        task = asyncio.create_task(
            self._analyze_turn_async(
                ai_turn_id=ai_turn_id,
                user_turn_id=user_turn_id,
                user_text=user_text,
                ai_text=ai_text,
            )
        )
        self.analysis_tasks.add(task)
        task.add_done_callback(self.analysis_tasks.discard)

    async def _analyze_turn_async(
        self,
        *,
        ai_turn_id: str,
        user_turn_id: str | None,
        user_text: str,
        ai_text: str,
    ):
        try:
            if user_text.strip():
                await self.emit("analyzing_missions", active=True)
            already_done = set(self.completed_mission_ids)
            missions_json = json.dumps(
                [
                    {
                        "id": m.get("id"),
                        "title": m.get("title"),
                        "hint": m.get("hint") or "",
                        "already_completed": m.get("id") in already_done,
                    }
                    for m in self.missions
                ],
                ensure_ascii=False,
            )
            student_utterances = [
                item["content"]
                for item in self.history
                if item.get("role") == "user" and item.get("content", "").strip()
            ]
            recent_lines = "\n".join(
                f"{'Học viên' if item['role'] == 'user' else (self.persona.get('name') or 'AI')}: {item['content']}"
                for item in self.history[-12:]
            )
            prompt = f"""Bạn là giám khảo theo dõi tiến độ hoàn thành nhiệm vụ trong bài luyện nói đóng vai ({self.lang_code}, trình độ {self.level}).
Bối cảnh: {self.scenario}
Vai học viên: {self.student_role}

Danh sách các nhiệm vụ cần hoàn thành:
{missions_json}

Lịch sử hội thoại gần đây:
{recent_lines}

Toàn bộ các câu học viên đã nói từ đầu cuộc gọi:
{json.dumps(student_utterances, ensure_ascii=False)}

Câu học viên vừa nói ở lượt mới nhất: {user_text or "(Chỉ là lượt mở màn của AI)"}
Câu AI vừa đáp lại: {ai_text}

Hãy trả về DUY NHẤT 1 JSON object hợp lệ với đúng các khóa sau:
{{
  "reply_translation": "Bản dịch Tiếng Việt tự nhiên của Câu AI vừa đáp lại (trả chuỗi rỗng '' nếu câu AI vốn đã hoàn toàn bằng Tiếng Việt)",
  "completed_mission_ids_so_far": ["m1"],
  "grammar_correction": "Nếu câu học viên vừa nói có lỗi ngữ pháp/từ vựng đáng chú ý, gợi ý 1 cách diễn đạt tự nhiên hơn bằng {self.lang_code} kèm giải thích ngắn bằng Tiếng Việt; nếu câu đã ổn hoặc chỉ là lượt mở màn thì để chuỗi rỗng ''",
  "feedback_tip": "1 câu khích lệ ngắn hoặc gợi ý nhiệm vụ tiếp theo bằng Tiếng Việt (hoặc chuỗi rỗng '')"
}}

Quy tắc chấm nhiệm vụ QUAN TRỌNG:
- Đánh giá theo Ý NGHĨA GIAO TIẾP TƯƠNG ĐƯƠNG (Semantic Equivalence), KHÔNG bắt buộc học viên phải dùng y hệt từ khóa trong `hint`.
- Chỉ cần trong các câu học viên đã nói (đặc biệt là câu mới nhất), học viên đã truyền đạt đúng ý của nhiệm vụ nào (dù diễn đạt ngắn gọn, dùng từ đồng nghĩa, hoặc có lỗi phát âm/chính tả nhỏ do nhận diện giọng nói ASR), hãy đưa `id` của nhiệm vụ đó vào `completed_mission_ids_so_far`.
- Không tích nhiệm vụ nếu học viên mới chỉ nói từ cảm thán rỗng như 'yeah', 'ừ', 'ok', 'hello' chưa có nội dung nhiệm vụ."""
            parsed = await call_qwen_json_async(prompt, max_tokens=700, temperature=0.2)
            valid_ids = {str(m.get("id")) for m in self.missions}
            detected_raw = (
                [
                    str(mid)
                    for mid in (
                        parsed.get("completed_mission_ids_so_far")
                        or parsed.get("newly_completed_mission_ids")
                        or []
                    )
                    if str(mid) in valid_ids
                ]
                if user_text.strip()
                else []
            )
            newly_added = [mid for mid in detected_raw if mid not in already_done]
            if newly_added:
                merged_set = already_done | set(newly_added)
                self.completed_mission_ids = [
                    str(m.get("id"))
                    for m in self.missions
                    if str(m.get("id")) in merged_set
                ]
            all_done = (
                len(self.missions) > 0
                and len(self.completed_mission_ids) >= len(self.missions)
            )
            reply_trans = (
                ""
                if self.is_vietnamese_target
                else str(parsed.get("reply_translation") or "").strip()
            )
            await self.emit(
                "turn_analysis",
                turn_id=ai_turn_id,
                user_turn_id=user_turn_id,
                reply_translation=reply_trans,
                completed_mission_ids=self.completed_mission_ids,
                newly_completed_mission_ids=newly_added,
                grammar_correction=str(parsed.get("grammar_correction") or "").strip()
                if user_text.strip()
                else "",
                feedback_tip=str(parsed.get("feedback_tip") or "").strip(),
                all_missions_completed=all_done,
            )
        except Exception as exc:
            logger.warning("Speaking turn analysis failed: {}", exc)
            with suppress(Exception):
                await self.emit("analyzing_missions", active=False)

    async def trigger_opening_greeting(self, live):
        persona_name = self.persona.get("name") or "Alex"
        persona_role = self.persona.get("role") or "người đối thoại"
        opening_line = str(self.persona.get("opening_line") or "").strip()

        if self.is_vietnamese_target:
            if opening_line:
                greeting_instruction = (
                    f"Cuộc gọi vừa bắt đầu. Hãy giới thiệu ngắn gọn 1 câu ấm áp bằng Tiếng Việt: "
                    f"'Chào bạn! Mình sẽ đóng vai {persona_name} — {persona_role} để cùng bạn thực hành tình huống này nhé, chúng mình bắt đầu nào!' "
                    f"Sau đó nói tiếp luôn câu mở màn nhập vai: \"{opening_line}\""
                )
            else:
                greeting_instruction = (
                    f"Cuộc gọi vừa bắt đầu. Hãy chào học viên bằng Tiếng Việt, giới thiệu ngắn gọn bạn đóng vai "
                    f"{persona_name} ({persona_role}) trong tình huống này rồi mở lời nhập vai tự nhiên trong 1-2 câu."
                )
        else:
            if opening_line:
                greeting_instruction = (
                    f"Cuộc gọi vừa bắt đầu. Ngôn ngữ mẹ đẻ của học viên là Tiếng Việt: trước tiên hãy chào và giới thiệu ngắn gọn 1 câu bằng Tiếng Việt "
                    f"('Chào bạn! Hôm nay mình sẽ vào vai {persona_name} — {persona_role} để cùng bạn luyện giao tiếp {self.target_language_label} nhé. Mình bắt đầu nào!'), "
                    f"ngay sau đó chuyển sang nói câu mở màn nhập vai bằng {self.lang_code}: \"{opening_line}\""
                )
            else:
                greeting_instruction = (
                    f"Cuộc gọi vừa bắt đầu. Trước tiên hãy giới thiệu ngắn gọn 1 câu bằng Tiếng Việt rằng bạn sẽ đóng vai "
                    f"{persona_name} ({persona_role}) để luyện {self.target_language_label}, sau đó nói ngay 1 câu chào nhập vai bằng {self.lang_code}."
                )

        await send_event(
            live,
            "response.create",
            response={
                "modalities": ["text", "audio"],
                "instructions": greeting_instruction,
            },
        )

    async def relay(self, live):
        opening_pending = True

        async def input_loop():
            budget = AudioBudget()
            checked = time.monotonic()
            has_audio = False
            while True:
                event = await asyncio.wait_for(self.ws.receive(), timeout=120)
                if event["type"] == "websocket.disconnect":
                    return
                if time.monotonic() - checked > 30:
                    current = await AuthorizationService.get_require_role_ws(
                        self.ws, ["USER", "LECTURER", "ADMIN"]
                    )
                    if not current or current.is_banned or current.deleted_at:
                        return
                    checked = time.monotonic()

                if event.get("bytes") is not None:
                    if self.user_turn_count >= self.max_turns:
                        continue
                    audio = event["bytes"]
                    budget.consume(len(audio))
                    await send_event(
                        live,
                        "input_audio_buffer.append",
                        audio=base64.b64encode(audio).decode(),
                    )
                    has_audio = True
                elif event.get("text"):
                    raw_text = event["text"]
                    if len(raw_text) > 4096:
                        raise ValueError("Control message too large")
                    payload = json.loads(raw_text)
                    cmd = payload.get("type")
                    if cmd == "stop":
                        return
                    if cmd == "ping":
                        await self.emit("pong")
                    elif cmd == "audio_end" and has_audio:
                        await send_event(
                            live,
                            "input_audio_buffer.append",
                            audio=base64.b64encode(bytes(38400)).decode(),
                        )
                        has_audio = False
                    elif cmd == "text_turn":
                        if self.user_turn_count >= self.max_turns:
                            await self.emit(
                                "notice",
                                message="Bạn đã hoàn thành tối đa số lượt nói. Hãy bấm Kết thúc & Chấm điểm nhé!",
                            )
                            continue
                        spoken = str(payload.get("text") or "").strip()[:1000]
                        if not spoken:
                            continue
                        self.current_user_text = spoken
                        await self.emit(
                            "transcript", role="user", text=spoken, final=True
                        )
                        await send_event(
                            live,
                            "conversation.item.create",
                            item={
                                "type": "message",
                                "role": "user",
                                "content": [{"type": "input_text", "text": spoken}],
                            },
                        )
                        await send_event(live, "response.create")

        async def output_loop():
            nonlocal opening_pending
            response_id: str | None = None
            active_turn_id = "opening"
            input_item_id: str | None = None
            transcript_ready = asyncio.Event()
            transcript_ready.set()

            while True:
                raw = await live.recv()
                event = json.loads(raw)
                kind = event.get("type") or ""

                if kind == "error":
                    err_msg = (event.get("error") or {}).get("message") or ""
                    logger.warning("Qwen speaking realtime error: {}", err_msg[:180])
                    raise ConnectionError("Qwen speaking realtime error")

                if kind == "input_audio_buffer.speech_started":
                    opening_pending = False
                    await self.emit("interrupted")
                    if response_id and self.current_ai_text.strip():
                        partial_ai = self.current_ai_text.strip()
                        partial_user = self.current_user_text.strip()
                        self.current_ai_text = ""
                        self.current_user_text = ""
                        if partial_user:
                            self.user_turn_count += 1
                            u_id = f"u-{uuid.uuid4().hex[:8]}"
                            self.history.append({"role": "user", "content": partial_user})
                            self.history.append({"role": "assistant", "content": partial_ai})
                            await self.emit(
                                "turn",
                                turn_id=active_turn_id,
                                user_turn_id=u_id,
                                user=partial_user,
                                assistant=partial_ai,
                                user_turn_count=self.user_turn_count,
                                interrupted=True,
                            )
                            self._schedule_analysis(
                                ai_turn_id=active_turn_id,
                                user_turn_id=u_id,
                                user_text=partial_user,
                                ai_text=partial_ai,
                            )
                    response_id = None
                    self.current_ai_text = ""
                    input_item_id = event.get("item_id")
                    transcript_ready = asyncio.Event()

                elif kind == "input_audio_buffer.committed":
                    input_item_id = event.get("item_id") or input_item_id

                elif kind in {
                    "conversation.item.input_audio_transcription.text",
                    "conversation.item.input_audio_transcription.updated",
                    "conversation.item.input_audio_transcription.completed",
                }:
                    item_id = event.get("item_id")
                    if not input_item_id and item_id:
                        input_item_id = item_id
                    if input_item_id and item_id and item_id != input_item_id:
                        continue
                    if kind.endswith(".text"):
                        text = f"{event.get('text') or ''}{event.get('stash') or ''}".strip()
                        final = False
                    else:
                        text = str(event.get("transcript") or "").strip()
                        final = kind.endswith(".completed")
                    if text:
                        self.current_user_text = text[:4000]
                        await self.emit(
                            "transcript",
                            role="user",
                            text=self.current_user_text,
                            final=final,
                        )
                    if final:
                        transcript_ready.set()

                elif kind == "response.created":
                    response_id = event["response"]["id"]
                    active_turn_id = (
                        "opening"
                        if opening_pending
                        else f"a-{uuid.uuid4().hex[:8]}"
                    )
                    self.current_ai_text = ""

                elif kind == "response.done" and event["response"]["id"] == response_id:
                    response_id = None
                    status = event["response"].get("status")
                    if status == "failed":
                        raise ConnectionError("Qwen speaking response failed")
                    if status == "cancelled":
                        opening_pending = False
                        continue

                    if not transcript_ready.is_set() and not opening_pending:
                        with suppress(TimeoutError):
                            await asyncio.wait_for(transcript_ready.wait(), timeout=2.0)

                    ai_text = self.current_ai_text.strip()
                    user_text = "" if opening_pending else self.current_user_text.strip()
                    self.current_ai_text = ""
                    if not opening_pending:
                        self.current_user_text = ""

                    if opening_pending:
                        opening_pending = False
                        final_opening = (
                            ai_text
                            or str(self.persona.get("opening_line") or "").strip()
                        )
                        preset_trans = (
                            ""
                            if self.is_vietnamese_target
                            else str(self.persona.get("opening_translation") or "").strip()
                        )
                        if final_opening:
                            self.history.append(
                                {"role": "assistant", "content": final_opening}
                            )
                            await self.emit(
                                "turn",
                                turn_id="opening",
                                user_turn_id=None,
                                user="",
                                assistant=final_opening,
                                translation=preset_trans,
                                user_turn_count=self.user_turn_count,
                            )
                            if (
                                self.allow_translation
                                and not self.is_vietnamese_target
                                and not preset_trans
                            ):
                                self._schedule_analysis(
                                    ai_turn_id="opening",
                                    user_turn_id=None,
                                    user_text="",
                                    ai_text=final_opening,
                                )
                        await self.emit("listening")
                        continue

                    # Ignore tiny 1-word accidental noise echoes ("yeah", "uh", "um") from counting against max_turns
                    cleaned_noise = user_text.strip(" .,!?\"'").lower()
                    is_accidental_noise = cleaned_noise in {"yeah", "uh", "um", "hmm", "ah"} and self.is_vietnamese_target

                    user_turn_id: str | None = None
                    if user_text:
                        if not is_accidental_noise:
                            self.user_turn_count += 1
                        user_turn_id = f"u-{uuid.uuid4().hex[:8]}"
                        self.history.append({"role": "user", "content": user_text})
                    if ai_text:
                        self.history.append({"role": "assistant", "content": ai_text})

                    if user_text or ai_text:
                        await self.emit(
                            "turn",
                            turn_id=active_turn_id,
                            user_turn_id=user_turn_id,
                            user=user_text,
                            assistant=ai_text,
                            user_turn_count=self.user_turn_count,
                        )
                        if user_text and not is_accidental_noise:
                            self._schedule_analysis(
                                ai_turn_id=active_turn_id,
                                user_turn_id=user_turn_id,
                                user_text=user_text,
                                ai_text=ai_text,
                            )
                    await self.emit("listening")

                elif response_id and event.get("response_id", response_id) == response_id:
                    if kind in {
                        "response.output_audio_transcript.delta",
                        "response.audio_transcript.delta",
                    }:
                        delta = event.get("delta") or ""
                        self.current_ai_text += delta
                        await self.emit(
                            "transcript",
                            role="assistant",
                            turn_id=active_turn_id,
                            delta=delta,
                            text=self.current_ai_text,
                        )
                    elif kind in {
                        "response.output_audio.delta",
                        "response.audio.delta",
                    }:
                        await self.emit(
                            "audio",
                            turn_id=active_turn_id,
                            data=event["delta"],
                            sample_rate=24000,
                        )

        await self.trigger_opening_greeting(live)
        tasks = [
            asyncio.create_task(input_loop()),
            asyncio.create_task(output_loop()),
        ]
        try:
            done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for t in done:
                t.result()
        finally:
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            if self.analysis_tasks:
                for t in list(self.analysis_tasks):
                    t.cancel()
                await asyncio.gather(*self.analysis_tasks, return_exceptions=True)


async def run_speaking_realtime(websocket: WebSocket, lesson_id: uuid.UUID):
    if any(
        key in getattr(websocket, "query_params", {})
        for key in ("token", "access_token", "refresh_token")
    ):
        await websocket.close(code=1008)
        return
    if not origin_allowed(websocket.headers.get("origin")):
        await websocket.close(code=1008)
        return

    protocols = websocket.scope.get("subprotocols", [])
    bearer = next((p[7:] for p in protocols if p.startswith("bearer.")), None)
    ticket = next((p[7:] for p in protocols if p.startswith("ticket.")), None)
    await websocket.accept(
        subprotocol=SPEAKING_PROTOCOL if SPEAKING_PROTOCOL in protocols else None
    )

    legacy = AccessCredentials("bearer", bearer) if bearer is not None else None
    binding = None
    if ticket is not None:
        try:
            binding = await _redeem_voice_ticket_async(ticket)
        except (RedisError, ValueError, KeyError, TypeError):
            await websocket.close(code=4401)
            return

    user = await AuthorizationService.get_require_role_ws(
        websocket,
        ["USER", "LECTURER", "ADMIN"],
        legacy=legacy,
        legacy_binding=binding,
    )
    if not user:
        return

    session = SpeakingRealtimeSession(websocket, user, lesson_id)
    lease_key = f"speaking:realtime:{user.id}"
    lease_id = uuid.uuid4().hex
    locked = False
    try:
        if not realtime_api_key():
            raise HTTPException(
                503, "Chưa cấu hình Qwen 3.8 Omni Flash Realtime trên máy chủ."
            )
        instructions = await session.prepare()
        await get_redis().set(lease_key, lease_id, ex=SPEAKING_MAX_SECONDS + 15)
        locked = True

        logger.info(
            "Speaking realtime starting session={} lesson={} voice={} lang={}",
            lease_id,
            lesson_id,
            session.voice_name,
            session.lang_code,
        )
        async with asyncio.timeout(SPEAKING_MAX_SECONDS):
            async with open_realtime(
                instructions,
                session.voice_name,
                speed=1.0,
                tools=None,
                language_hint=session.lang_code,
                silence_duration_ms=1200,
            ) as live:
                await session.emit(
                    "ready",
                    voice=session.voice_name,
                    lang_code=session.lang_code,
                    max_turns=session.max_turns,
                    max_seconds=SPEAKING_MAX_SECONDS,
                )
                await session.relay(live)
    except WebSocketDisconnect:
        pass
    except TimeoutError:
        with suppress(Exception):
            await session.emit(
                "ended",
                message="Phiên gọi thoại đã đạt thời lượng tối đa. Bạn có thể bấm Chấm điểm hoặc gọi lại nhé.",
            )
    except HTTPException as exc:
        with suppress(Exception):
            await session.emit("error", message=exc.detail)
    except Exception as exc:
        logger.warning(
            "Speaking realtime failed session={} error={}",
            lease_id,
            type(exc).__name__,
        )
        with suppress(Exception):
            await session.emit(
                "error",
                message="Kết nối giọng nói AI tạm thời bị gián đoạn. Vui lòng thử gọi lại.",
            )
    finally:
        if locked:
            with suppress(Exception):
                await get_redis().eval(
                    "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
                    1,
                    lease_key,
                    lease_id,
                )
        with suppress(Exception):
            await websocket.close()
        logger.info("Speaking realtime closed session={}", lease_id)
