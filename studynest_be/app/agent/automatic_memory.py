"""Save explicit, durable user statements; no model guesses or tool-derived facts."""
import re
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from app.agent.memory import MemoryService, MemoryProposal, memory_fingerprint
from app.db.models.database import TutorChatMessages
from app.db.models.learning_memory import LearningMemoryItem

# Conservative first-person declarations; questions, quoted instructions and
# sensitive topics stay in conversation history rather than automatic memory.
SENSITIVE = re.compile(r'password|mật khẩu|token|secret|api.?key|căn cước|cmnd|hộ chiếu|địa chỉ|số điện thoại|tài khoản ngân hàng|bệnh|sức khỏe|tôn giáo|chính trị|tình dục|\d{8,}|https?://|ignore|system prompt|bỏ qua.*(?:quy tắc|chỉ thị)', re.I)
PATTERNS = [
    ('personal_fact', 'preferred_name', r'^(?:(?:tôi|mình|tớ|em) tên (?:là )?|(?:hãy )?gọi (?:tôi|mình|tớ|em) là )[^\d\n]{1,80}$'),
    ('explanation_preference', 'explanation', r'^(?:tôi|mình|tớ|em) (?:thích|muốn|ưu tiên) (?:bạn )?(?:giải thích|trả lời|hướng dẫn|dạy|dùng ví dụ|nói chậm).{1,220}$'),
    ('learning_goal', None, r'^(?:mục tiêu (?:của )?(?:tôi|mình|tớ|em) (?:là|:) ?|(?:tôi|mình|tớ|em) (?:đang học|muốn học|đang ôn|muốn ôn|đặt mục tiêu) ).{2,220}$'),
    ('personal_fact', None, r'^(?:tôi|mình|tớ|em) (?:thích|yêu thích|có sở thích|nuôi) .{2,160}$'),
    ('personal_fact', 'friend_name', r'^(?:bạn (?:thân )?của (?:tôi|mình|tớ|em)) tên (?:là )?[^\d\n]{1,80}$'),
]


def candidates(text):
    text = text.strip()
    if '?' in text or SENSITIVE.search(text) or re.search(r'đừng (?:nhớ|lưu)|không (?:nhớ|lưu)|^ví dụ|giả sử|trích dẫn|\b(?:gì|ai|nào)\b|["“”`]', text, re.I):
        return []
    output = []
    for sentence in re.split(r'[.!;\n]+', text):
        sentence = re.sub(r'^(?:hãy nhớ(?: rằng)?|nhớ là|ghi nhớ(?: rằng)?)\s*[:,]?\s*', '', sentence.strip(), flags=re.I)
        for kind, slot, pattern in PATTERNS:
            if re.fullmatch(pattern, sentence, re.I):
                output.append((kind, slot, sentence))
                break
    return output[:3]


async def capture(db, user_id, message):
    if message.role != 'user' or message.user_id != user_id:
        return []
    proposed = candidates(message.content)
    if not proposed:
        return []
    service = MemoryService(db, user_id)
    await service._lock_async()
    consent = await service.consent_async()
    if not consent['enabled']:
        return []
    # The writer must use a persisted message of the same account.
    owned = await db.scalar(select(TutorChatMessages.id).where(TutorChatMessages.id == message.id, TutorChatMessages.user_id == user_id))
    if not owned:
        return []
    total = await db.scalar(select(func.count()).select_from(LearningMemoryItem).where(LearningMemoryItem.user_id == user_id, LearningMemoryItem.status == 'confirmed'))
    if total >= 100:
        return []
    saved = []
    for kind, slot, content in proposed:
        if total >= 100:
            break
        fingerprint = memory_fingerprint(MemoryProposal(scope='profile', kind=kind, content=content))
        existing = await db.scalar(select(LearningMemoryItem).where(LearningMemoryItem.user_id == user_id, LearningMemoryItem.fingerprint == fingerprint))
        if existing:  # includes deleted fingerprints: never resurrect forgotten facts
            continue
        previous = None
        if slot:
            previous = await db.scalar(select(LearningMemoryItem).where(LearningMemoryItem.user_id == user_id,
                LearningMemoryItem.scope == 'profile', LearningMemoryItem.status == 'confirmed',
                LearningMemoryItem.source_type == 'automatic_user_statement', LearningMemoryItem.evidence[0]['slot'].astext == slot).order_by(LearningMemoryItem.updated_at.desc()).limit(1))
            if previous:
                previous.status = 'superseded'
        now = datetime.now(timezone.utc)
        item = LearningMemoryItem(user_id=user_id,scope='profile',kind=kind,content=content,fingerprint=fingerprint,
            status='confirmed',confidence=100,source_type='automatic_user_statement',
            memory_key_hash=hashlib.sha256({'preferred_name':'identity.preferred_name','explanation':'learning.explanation_style','friend_name':'personal.friend_name'}.get(slot, '').encode()).hexdigest() if slot else None,
            evidence=[{'message_id':str(message.id),'thread_id':str(message.thread_id),'role':'user','slot':slot}],
            confirmed_at=now,expires_at=now+timedelta(days=consent['retention_days']) if consent['retention_days'] else None,
            supersedes_id=previous.id if previous else None)
        db.add(item); await db.flush(); saved.append(str(item.id))
        if previous is None:
            total += 1
    return saved
