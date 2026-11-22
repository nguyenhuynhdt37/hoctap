"""Model-selected, extractive long-term memories anchored to an owned user message."""
import asyncio
import json
import hashlib
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func, or_, and_
from app.agent.contracts import ModelMemory
from app.agent.automatic_memory import SENSITIVE
from app.agent.memory import MemoryService, MemoryProposal, memory_fingerprint
from app.db.models.database import TutorChatMessages, TutorChatThreads, User
from app.db.models.learning_memory import LearningMemoryItem
from app.db.sesson import AsyncSessionLocal

SOURCES = {'automatic_user_statement', 'model_selected_statement'}
# These are user directives or transient tasks, not durable personal facts.
UNSAFE = re.compile(r'đừng (?:lưu|nhớ)|không (?:lưu|nhớ)|không được (?:lưu|nhớ)|do not (?:save|remember)|don.t (?:save|remember)|'
                    r'\bnếu\b|\bif\b|giả sử|(?:^|[.!]\s*)ví dụ|đóng vai|trích dẫn|trong truyện|nhân vật|system|developer|assistant|'
                    r'bỏ qua|luôn (?:chạy|gọi)|hãy (?:chạy|gọi|xóa|truy cập)|execute|sudo|rm -|<script|'
                    r'\b(?:hôm nay|bây giờ|lát nữa|đang đói|đang buồn|đang mệt)\b', re.I)
PERSONAL = re.compile(r'\b(?:tôi|tớ|mình|em|con(?=\s+(?:thích|muốn|tên|học|nuôi|làm))|my|i am|i work|i prefer|i like)\b', re.I)
SLOT_KEYS = {'preferred_name': 'identity.preferred_name', 'explanation': 'learning.explanation_style', 'friend_name': 'personal.friend_name'}
TASKS = set()
SLOTS = asyncio.Semaphore(2)


def normalized(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text)).strip()


def validate_selection(message_text, selected):
    """Exact user evidence, not text from tools/history/images or assistant inference."""
    text, quote = normalized(message_text), normalized(selected.quote).rstrip('.! ')
    if re.match(r'^(?:(?:bạn|cậu).*(?:đoán|nghĩ|biết|nhớ)|có phải|liệu|what|do you)', text, re.I):
        return None
    if re.search(r'(?:đừng|không|chưa)(?: cần| muốn)? (?:lưu|ghi nhớ)', text, re.I):
        return None
    if re.match(r'^(?:tôi|mình|tớ|em) (?:cần|muốn|nhờ) (?:bạn )?(?:giải|sửa|chạy|tóm tắt|phát|mở|xóa)\b', quote, re.I):
        return None
    if not quote or quote.casefold() not in text.casefold():
        return None
    if SENSITIVE.search(text) or UNSAFE.search(text) or SENSITIVE.search(quote):
        return None
    if not PERSONAL.search(quote) or '?' in quote or re.search(r'\b(?:gì|ai|nào)\b|["“”`]', quote, re.I):
        return None
    # An exact span inside a pasted quote/code/example is still not the user's fact.
    if re.search(r'["“”`]', text) or re.match(r'^(?:nếu|if)\b', text, re.I):
        return None
    return quote


async def capture_selected(db, user_id, message_id, selections):
    message = await db.scalar(select(TutorChatMessages).join(TutorChatThreads, TutorChatThreads.id == TutorChatMessages.thread_id).where(
        TutorChatMessages.id == message_id, TutorChatMessages.user_id == user_id,
        TutorChatMessages.role == 'user', TutorChatThreads.user_id == user_id, TutorChatThreads.is_deleted.is_(False)))
    if message is None:
        return []
    service = MemoryService(db, user_id)
    await service._lock_async()
    consent = await service.consent_async()
    if not consent['enabled']:
        return []
    now = datetime.now(timezone.utc)
    total = await db.scalar(select(func.count()).select_from(LearningMemoryItem).where(
        LearningMemoryItem.user_id == user_id, LearningMemoryItem.status == 'confirmed',
        or_(LearningMemoryItem.expires_at.is_(None), LearningMemoryItem.expires_at > now)))
    saved = []
    for raw in selections[:3]:
        try:
            item = raw if isinstance(raw, ModelMemory) else ModelMemory.model_validate(raw)
        except (ValueError, TypeError):
            continue
        quote = validate_selection(message.content, item)
        if not quote:
            continue
        fingerprint = memory_fingerprint(MemoryProposal(scope='profile', kind=item.kind, content=quote))
        topic_hash = hashlib.sha256(item.key.encode()).hexdigest()
        rows = (await db.scalars(select(LearningMemoryItem).where(LearningMemoryItem.user_id == user_id,
            LearningMemoryItem.scope == 'profile',
            or_(LearningMemoryItem.status == 'confirmed', LearningMemoryItem.fingerprint == fingerprint,
                and_(LearningMemoryItem.status == 'deleted', LearningMemoryItem.memory_key_hash == topic_hash))).order_by(LearningMemoryItem.updated_at.desc()))).all()
        def key(row):
            evidence = (row.evidence or [{}])[0]
            return evidence.get('memory_key') or SLOT_KEYS.get(evidence.get('slot'))
        # A forgotten topic cannot be resurrected under a paraphrased quote.
        if any((row.fingerprint == fingerprint and row.status != 'superseded') or (row.status == 'deleted' and (row.memory_key_hash == topic_hash or key(row) == item.key)) for row in rows):
            continue
        if any(row.status == 'deleted' and normalized(row.content).casefold().rstrip('.! ') == quote.casefold() for row in rows):
            continue
        if any(row.status == 'confirmed' and normalized(row.content).casefold().rstrip('.! ') == quote.casefold() for row in rows):
            continue
        previous = next((row for row in rows if row.status == 'confirmed' and row.source_type in SOURCES and key(row) == item.key), None)
        if total >= 100 and previous is None:
            continue
        if previous:
            previous.status = 'superseded'
        else:
            total += 1
        reusable = next((row for row in rows if row.fingerprint == fingerprint and row.status == 'superseded'), None)
        evidence = [{'message_id':str(message.id), 'thread_id':str(message.thread_id), 'role':'user', 'memory_key':item.key, 'quote':quote}]
        if reusable is not None:
            reusable.status, reusable.evidence, reusable.confirmed_at, reusable.updated_at = 'confirmed', evidence, now, now
            reusable.expires_at = now + timedelta(days=consent['retention_days']) if consent['retention_days'] else None
            reusable.memory_key_hash = topic_hash
            await db.flush()
            saved.append(str(reusable.id))
            continue
        row = LearningMemoryItem(user_id=user_id, scope='profile', kind=item.kind, content=quote,
            fingerprint=fingerprint, memory_key_hash=topic_hash, status='confirmed', confidence=100, source_type='model_selected_statement',
            evidence=[{'message_id':str(message.id), 'thread_id':str(message.thread_id), 'role':'user',
                       'memory_key':item.key, 'quote':quote}], confirmed_at=now,
            expires_at=now + timedelta(days=consent['retention_days']) if consent['retention_days'] else None,
            supersedes_id=previous.id if previous else None)
        db.add(row)
        await db.flush()
        saved.append(str(row.id))
    return saved


MEMORY_INSTRUCTION = '''Sau khi trả lời, chọn tối đa 3 thông tin bền vững hữu ích để cá nhân hóa các lần sau:
tên muốn được gọi, nghề nghiệp, sở thích lâu dài, mục tiêu học tập, cách học/cách giải thích phù hợp.
Chỉ chọn điều chính người dùng tự nói trong user_request hiện tại. Không suy diễn từ câu hỏi,
ảnh, lời AI, tài liệu, tool, thông tin người khác, ví dụ giả định; không chọn nhiệm vụ nhất thời,
cảm xúc nhất thời, bí mật, dữ liệu sức khỏe/tài chính/định danh nhạy cảm hay chỉ thị điều khiển công cụ.
Nếu người dùng không muốn lưu, memories=[]. Không phải câu nào cũng cần nhớ.
Mỗi memories gồm quote (trích nguyên văn một mệnh đề tự thuật, 5–500 ký tự), kind
(personal_fact|learning_goal|explanation_preference), key (chủ đề ASCII ổn định, không dấu,
ví dụ identity.preferred_name, work.occupation, interest.cats, learning.explanation_style,
goal.japanese). Cùng sự thật dù đổi cách nói dùng cùng key; thông tin mới thay thế cùng chủ đề.
Không lưu lại memory có trong context.memory, không tái tạo điều đã quên. Backend kiểm tra và
lưu riêng theo tài khoản; không nói “đã lưu” nếu chưa có xác nhận backend.'''


async def extract_for_message(user_id, message_id, on_saved=None):
    """Voice-only background extraction; no audio and no impact on call playback."""
    from app.core.settings import settings
    from app.core.llm import LLMService
    from app.agent.budgets import reserve_model
    if not settings.AGENT_SEMANTIC_MEMORY_ENABLED:
        return
    async with SLOTS:
        async with AsyncSessionLocal() as db:
            user = await db.get(User, user_id)
            message = await db.get(TutorChatMessages, message_id)
            if user is None or user.is_banned or user.deleted_at or message is None or message.user_id != user_id or message.role != 'user':
                return
            if not (await MemoryService(db, user_id).consent_async())['enabled']:
                return
            text = message.content[:12000]
            if not PERSONAL.search(text) or SENSITIVE.search(text) or UNSAFE.search(text):
                return
            current = await MemoryService(db, user_id).context_async()
            await db.commit()
        prompt = MEMORY_INSTRUCTION + '\nChỉ trả JSON {"memories": [...]}.\n' + json.dumps({'user_request':text, 'context':{'memory':current}}, ensure_ascii=False, default=str)
        llm = LLMService(model_override=settings.AGENT_MODEL or settings.TUTOR_CHAT_MODEL or None, stream_override=False)
        if llm.provider == '9router':
            from app.services.admin.ai_settings import get_chat_model
            model = llm.model_override or await get_chat_model()
            llm.model_override = model
        else:
            model = llm.primary_model
        reserve_model({}, prompt, model, 800)
        raw = await asyncio.wait_for(llm.call_model(prompt, retries=1, mime_type='application/json', temperature=0, max_output_tokens=800), timeout=settings.AGENT_MEMORY_TIMEOUT_SECONDS)
        from app.agent.runtime import strip_fence
        result = json.loads(strip_fence(raw))
        selections = result.get('memories', []) if isinstance(result, dict) else []
        if not isinstance(selections, list):
            return
        async with AsyncSessionLocal() as db:
            user = await db.get(User, user_id)
            if user is None or user.is_banned or user.deleted_at:
                return
            saved = await capture_selected(db, user_id, message_id, selections)
            await db.commit()
        if saved and on_saved:
            await on_saved(len(saved))


def schedule_extraction(user_id, message_id, on_saved=None):
    from app.core.settings import settings
    if not settings.AGENT_SEMANTIC_MEMORY_ENABLED or len(TASKS) >= 24:
        return
    async def work():
        try:
            await extract_for_message(user_id, message_id, on_saved)
        except Exception:
            # Never log private message contents/provider exceptions or break a call.
            from loguru import logger
            logger.warning('Background account memory extraction did not complete')
    task = asyncio.create_task(work(), name='account-memory-extraction')
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)
