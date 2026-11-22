"""Consent-aware memory and evidence-preserving rolling conversation context."""
import hashlib
import re
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import delete, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import LessonTutorMemory, TutorChatMessages, TutorChatThreads
from app.db.models.learning_memory import AgentThreadSummary, LearningMemoryConsent, LearningMemoryItem
from app.services.user.tutor_chat import TutorChatService


class MemoryConsentInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    enabled: bool
    retention_days: int | None = Field(default=None, ge=1, le=365)


class MemoryProposal(BaseModel):
    model_config = ConfigDict(extra='forbid')
    scope: Literal['lesson', 'course', 'profile']
    kind: Literal['learning_goal', 'review_topic', 'explanation_preference', 'current_task', 'hint_used', 'unresolved_question', 'personal_fact']
    content: str = Field(min_length=1, max_length=800)
    course_id: UUID | None = None
    lesson_id: UUID | None = None
    evidence_message_ids: list[UUID] = Field(default_factory=list, max_length=10)
    supersedes_id: UUID | None = None

    @model_validator(mode='after')
    def validate_scope(self):
        self.content = self.content.strip()
        if not self.content:
            raise ValueError('Memory cannot be empty')
        if self.scope == 'lesson' and not self.lesson_id:
            raise ValueError('Lesson memory needs lesson_id')
        if self.scope == 'course' and (not self.course_id or self.lesson_id):
            raise ValueError('Course memory needs course_id and has no lesson_id')
        if self.scope == 'profile' and (self.course_id or self.lesson_id):
            raise ValueError('Profile memory has no course or lesson')
        return self


def memory_fingerprint(data: MemoryProposal) -> str:
    normalized = re.sub(r'\s+', ' ', data.content.casefold()).strip()
    return hashlib.sha256(f'{data.scope}:{data.course_id}:{data.lesson_id}:{data.kind}:{normalized}'.encode()).hexdigest()


def serialize_memory(item):
    return {key: getattr(item, key) for key in ('id', 'scope', 'kind', 'content', 'course_id', 'lesson_id', 'status', 'confidence', 'evidence', 'source_type', 'supersedes_id', 'created_at', 'updated_at', 'expires_at', 'confirmed_at')}


class MemoryService:
    def __init__(self, db: AsyncSession, user_id: UUID):
        self.db, self.user_id = db, user_id

    async def _lock_async(self):
        # Covers the absence of a consent row too, preventing a proposal from
        # committing after another request revoked consent and erased memory.
        await self.db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
            {"key":f"learning-memory:{self.user_id}"})

    async def consent_async(self):
        row = await self.db.get(LearningMemoryConsent, self.user_id, populate_existing=True)
        return {'enabled': bool(row.enabled) if row else True, 'retention_days': row.retention_days if row else None, 'policy_version': '2'}

    async def set_consent_async(self, data: MemoryConsentInput):
        await self._lock_async()
        row = await self.db.get(LearningMemoryConsent, self.user_id, populate_existing=True)
        if not row:
            row = LearningMemoryConsent(user_id=self.user_id)
            self.db.add(row)
        row.enabled, row.retention_days = data.enabled, data.retention_days
        # Revoking consent removes memory content immediately, retaining only
        # fingerprints as tombstones against automatic resurrection.
        if not data.enabled:
            await self.delete_all_async(commit=False)
        else:
            # NULL means retain for the account lifetime, until explicit deletion.
            max_expiry = datetime.now(UTC) + timedelta(days=data.retention_days) if data.retention_days else None
            items = (await self.db.scalars(select(LearningMemoryItem).where(
                LearningMemoryItem.user_id == self.user_id,
                LearningMemoryItem.status.in_(['proposed', 'confirmed']),
            ))).all()
            for item in items:
                if max_expiry is None or item.expires_at is None or item.expires_at > max_expiry:
                    item.expires_at = max_expiry
        await self.db.commit()
        return await self.consent_async()

    async def _scope_access_async(self, course_id=None, lesson_id=None):
        service = TutorChatService(db=self.db)
        if lesson_id:
            info = await service.validate_lesson_access(self.user_id, lesson_id)
            if course_id and info['course'].id != course_id:
                raise HTTPException(409, 'Lesson and course context do not match')
            course_id = info['course'].id
        elif course_id:
            await service.validate_enrollment(self.user_id, course_id)
        return course_id

    async def propose_async(self, data: MemoryProposal, *, from_agent=False):
        await self._lock_async()
        consent = await self.consent_async()
        if not consent['enabled']:
            raise HTTPException(403, 'Hãy bật bộ nhớ học tập trước khi lưu thông tin.')
        course_id = await self._scope_access_async(data.course_id, data.lesson_id)
        if from_agent and not data.evidence_message_ids:
            raise HTTPException(422, 'Agent memory proposals require owned message evidence')
        evidence = []
        for message_id in data.evidence_message_ids:
            message = await self.db.scalar(select(TutorChatMessages).join(TutorChatThreads, TutorChatThreads.id == TutorChatMessages.thread_id).where(TutorChatMessages.id == message_id, TutorChatMessages.user_id == self.user_id, TutorChatThreads.user_id == self.user_id, TutorChatThreads.is_deleted.is_(False)))
            if not message:
                raise HTTPException(404, 'Memory evidence not found')
            thread = await self.db.get(TutorChatThreads, message.thread_id)
            if (course_id and thread.course_id != course_id) or (data.lesson_id and thread.lesson_id != data.lesson_id):
                raise HTTPException(409, 'Memory evidence is outside this scope')
            # Model-authored observations remain proposals, never mastery facts.
            evidence.append({'message_id': str(message_id), 'thread_id': str(message.thread_id), 'role': message.role})
        if data.supersedes_id:
            previous = await self._owned_async(data.supersedes_id)
            if previous.status != "confirmed":
                raise HTTPException(409, "Chỉ có thể thay thế bộ nhớ đã xác nhận còn hiệu lực.")
            if previous.scope != data.scope or previous.course_id != course_id or previous.lesson_id != data.lesson_id or previous.kind != data.kind:
                raise HTTPException(409, 'Conflicting memory belongs to another scope')
        fingerprint = memory_fingerprint(data.model_copy(update={"course_id": course_id}))
        existing = await self.db.scalar(select(LearningMemoryItem).where(LearningMemoryItem.user_id == self.user_id, LearningMemoryItem.fingerprint == fingerprint))
        if existing:
            if existing.status in {'deleted','superseded'} or (existing.expires_at is not None and existing.expires_at <= datetime.now(UTC)):
                raise HTTPException(409, 'Thông tin này đã bị xóa. Hãy tạo một nội dung mới để lưu lại.')
            return serialize_memory(existing)
        item = LearningMemoryItem(user_id=self.user_id, course_id=course_id, lesson_id=data.lesson_id, scope=data.scope, kind=data.kind, content=data.content, fingerprint=fingerprint, status='proposed', confidence=0 if from_agent else 100, evidence=evidence, source_type='agent_proposed' if from_agent else 'learner_declared', supersedes_id=data.supersedes_id, expires_at=datetime.now(UTC) + timedelta(days=consent['retention_days']) if consent['retention_days'] else None)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return serialize_memory(item)

    async def _owned_async(self, memory_id):
        item = await self.db.scalar(select(LearningMemoryItem).where(LearningMemoryItem.id == memory_id, LearningMemoryItem.user_id == self.user_id).with_for_update().execution_options(populate_existing=True))
        if not item:
            raise HTTPException(404, 'Không tìm thấy bộ nhớ')
        return item

    async def confirm_async(self, memory_id):
        await self._lock_async()
        if not (await self.consent_async())['enabled']:
            raise HTTPException(403, 'Bộ nhớ đang tắt')
        item = await self._owned_async(memory_id)
        if item.status not in {'proposed', 'confirmed'} or (item.expires_at is not None and item.expires_at <= datetime.now(UTC)):
            raise HTTPException(409, 'Memory is no longer available')
        await self._scope_access_async(item.course_id, item.lesson_id)
        if item.status == 'confirmed':
            return serialize_memory(item)
        if item.supersedes_id:
            previous = await self._owned_async(item.supersedes_id)
            if previous.status != 'confirmed' or (previous.expires_at is not None and previous.expires_at <= datetime.now(UTC)):
                raise HTTPException(409,'Bộ nhớ được thay thế đã thay đổi hoặc bị xóa; cần tạo đề xuất mới.')
            previous.status = 'superseded'
        item.status, item.confirmed_at = 'confirmed', datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(item)
        return serialize_memory(item)

    async def list_async(self, *, course_id=None, lesson_id=None, include_proposals=False):
        if not (await self.consent_async())['enabled']:
            return []
        await self._scope_access_async(course_id, lesson_id)
        stmt = select(LearningMemoryItem).where(LearningMemoryItem.user_id == self.user_id, LearningMemoryItem.status.in_(['confirmed', 'proposed'] if include_proposals else ['confirmed']), or_(LearningMemoryItem.expires_at.is_(None), LearningMemoryItem.expires_at > datetime.now(UTC)))
        if lesson_id:
            stmt = stmt.where(LearningMemoryItem.lesson_id == lesson_id)
        elif course_id:
            stmt = stmt.where(LearningMemoryItem.course_id == course_id)
        else:
            # All-scope listing is for the owner's settings or explicit memory
            # inventory request. Context builders must request exact scope.
            pass
        return [serialize_memory(row) for row in (await self.db.scalars(stmt.order_by(LearningMemoryItem.updated_at.desc()).limit(100))).all()]

    async def context_async(self, course_id=None, lesson_id=None, max_chars=3000):
        if not (await self.consent_async())['enabled']:
            return []
        await self._scope_access_async(course_id, lesson_id)
        from sqlalchemy import and_, or_
        predicates = [LearningMemoryItem.scope == 'profile']
        if course_id:
            predicates.append(and_(LearningMemoryItem.scope == 'course', LearningMemoryItem.course_id == course_id))
        if lesson_id:
            predicates.append(and_(LearningMemoryItem.scope == 'lesson', LearningMemoryItem.lesson_id == lesson_id))
        rows = (await self.db.scalars(select(LearningMemoryItem).where(LearningMemoryItem.user_id == self.user_id, LearningMemoryItem.status == 'confirmed', or_(LearningMemoryItem.expires_at.is_(None), LearningMemoryItem.expires_at > datetime.now(UTC)), or_(*predicates)).order_by(LearningMemoryItem.updated_at.desc()).limit(30))).all()
        result, size = [], 0
        for row in rows:
            if size + len(row.content) > max_chars:
                continue
            result.append({'id': str(row.id), 'kind': row.kind, 'content': row.content, 'source_type': row.source_type, 'evidence': row.evidence, 'confidence': row.confidence})
            size += len(row.content)
        return result

    async def delete_async(self, memory_id):
        await self._lock_async()
        item = await self._owned_async(memory_id)
        item.status, item.content, item.evidence, item.confidence = 'deleted', '', [], 0
        await self.db.commit()
        return {'deleted': True, 'id': memory_id}

    async def delete_all_async(self, commit=True):
        await self._lock_async()
        rows = (await self.db.scalars(select(LearningMemoryItem).where(LearningMemoryItem.user_id == self.user_id).with_for_update().execution_options(populate_existing=True))).all()
        for item in rows:
            item.status, item.content, item.evidence, item.confidence = 'deleted', '', [], 0
        await self.db.execute(delete(AgentThreadSummary).where(AgentThreadSummary.user_id == self.user_id))
        await self.db.execute(delete(LessonTutorMemory).where(LessonTutorMemory.user_id == self.user_id))
        if commit:
            await self.db.commit()
        return {'deleted': True, 'count': len(rows)}

    async def conversation_context_async(self, thread_id: UUID, recent_limit=6, summary_chars=6000, current_message_id=None):
        from app.agent.semantic_compaction import conversation_context
        return await conversation_context(self.db,self.user_id,thread_id,recent_limit=recent_limit,current_message_id=current_message_id)
