"""Learner-owned account memory with explicit confirmation and source evidence.

The existing lesson_tutor_memory is a legacy projection, never the authority for
claims. Nothing in these tables grants instructors access to learner memory.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.models.database import Base


class LearningMemoryConsent(Base):
    __tablename__ = 'learning_memory_consent'
    __table_args__ = (CheckConstraint('retention_days IS NULL OR retention_days BETWEEN 1 AND 365', name='ck_memory_retention'), {'schema': 'public'})
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'), primary_key=True)
    voice_settings: Mapped[dict] = mapped_column(JSONB, default=dict, server_default='{}')
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default='true')
    retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    policy_version: Mapped[str] = mapped_column(String(20), default='1', server_default='1')
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LearningMemoryItem(Base):
    __tablename__ = 'learning_memory_items'
    __table_args__ = (
        CheckConstraint("scope IN ('lesson','course','profile')", name='ck_memory_scope'),
        CheckConstraint("status IN ('proposed','confirmed','superseded','deleted')", name='ck_memory_status'),
        CheckConstraint("kind IN ('learning_goal','review_topic','explanation_preference','current_task','hint_used','unresolved_question','personal_fact')", name='ck_memory_kind'),
        CheckConstraint('confidence >= 0 AND confidence <= 100', name='ck_memory_confidence'),
        UniqueConstraint('user_id', 'fingerprint', name='uq_memory_owner_fingerprint'),
        Index('ix_memory_owner_scope', 'user_id', 'scope', 'course_id', 'lesson_id', 'status'),
        Index('ix_memory_expiration', 'expires_at'),
        {'schema': 'public'},
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('public.courses.id', ondelete='SET NULL'))
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('public.lessons.id', ondelete='SET NULL'))
    scope: Mapped[str] = mapped_column(String(20))
    kind: Mapped[str] = mapped_column(String(40))
    content: Mapped[str] = mapped_column(Text)
    fingerprint: Mapped[str] = mapped_column(String(64))
    memory_key_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='proposed')
    confidence: Mapped[int] = mapped_column(Integer, default=100)
    # Evidence is a validated set of owned message IDs, not arbitrary external URLs.
    evidence: Mapped[list] = mapped_column(JSONB, default=list)
    source_type: Mapped[str] = mapped_column(String(30), default='learner_declared')
    supersedes_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('public.learning_memory_items.id', ondelete='SET NULL'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentThreadSummary(Base):
    __tablename__ = 'agent_thread_summaries'
    __table_args__ = ({'schema': 'public'},)
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.tutor_chat_threads.id', ondelete='CASCADE'), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'), index=True)
    summary: Mapped[str] = mapped_column(Text)
    # Explicit citations allow deletion/ownership validation and reproducibility.
    message_ids: Mapped[list] = mapped_column(JSONB, default=list)
    through_message_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey('public.tutor_chat_messages.id', ondelete='SET NULL'))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
