"""Additive agent bookkeeping; never replaces tutor messages or enrollments."""
from datetime import datetime
from typing import ClassVar
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class Identity:
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)


class AgentSession(Identity, Base):
    __tablename__ = "agent_sessions"
    __table_args__ = (Index("ix_agent_sessions_owner_page", "user_id", "page_instance_id"), {"schema": "public"})
    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"))
    auth_session_id: Mapped[str] = mapped_column(String(100))
    page_instance_id: Mapped[str] = mapped_column(String(100))
    route: Mapped[str] = mapped_column(String(500))
    course_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.courses.id", ondelete="CASCADE"))
    lesson_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.lessons.id", ondelete="CASCADE"))
    capabilities: Mapped[list] = mapped_column(JSONB, default=list)
    snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    context_revision: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AgentRun(Identity, Base):
    __tablename__ = "agent_runs"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_agent_run_owner_key"),
        Index("ix_agent_runs_session_time", "session_id", "created_at"),
        Index("uq_agent_run_active_owner", "user_id", unique=True, postgresql_where=text("state IN ('created','resolving_context','planning','awaiting_approval','executing','verifying')")),
        {"schema": "public"},
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"))
    session_id: Mapped[UUID] = mapped_column(ForeignKey("public.agent_sessions.id", ondelete="CASCADE"))
    thread_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.tutor_chat_threads.id", ondelete="SET NULL"))
    state: Mapped[str] = mapped_column(String(30), default="created")
    channel: Mapped[str] = mapped_column(String(20), default="text")
    idempotency_key: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[str] = mapped_column(String(64))
    worker_id: Mapped[str | None] = mapped_column(String(100))
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    message: Mapped[str] = mapped_column(Text)
    input_message_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.tutor_chat_messages.id", ondelete="SET NULL"))
    response: Mapped[str] = mapped_column(Text, default="")
    plan: Mapped[list] = mapped_column(JSONB, default=list)
    plan_version: Mapped[int] = mapped_column(Integer, default=0)
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    next_sequence: Mapped[int] = mapped_column(Integer, default=0)
    usage: Mapped[dict] = mapped_column(JSONB, default=dict)
    context_revision: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(500))


class AgentEvent(Identity, Base):
    __tablename__ = "agent_events"
    __table_args__ = (UniqueConstraint("run_id", "sequence", name="uq_agent_event_sequence"), {"schema": "public"})
    run_id: Mapped[UUID] = mapped_column(ForeignKey("public.agent_runs.id", ondelete="CASCADE"))
    sequence: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(60))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentToolCall(Identity, Base):
    __tablename__ = "agent_tool_calls"
    __table_args__ = (Index("ix_agent_tool_run", "run_id", "created_at"), {"schema": "public"})
    run_id: Mapped[UUID] = mapped_column(ForeignKey("public.agent_runs.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    arguments: Mapped[dict] = mapped_column(JSONB)
    arguments_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="proposed")
    risk: Mapped[str] = mapped_column(String(20))
    result: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(String(500))
    approval_id: Mapped[UUID | None] = mapped_column(Uuid)
    action_id: Mapped[UUID | None] = mapped_column(Uuid, unique=True)
    receipt: Mapped[dict | None] = mapped_column(JSONB)
    expected_page_instance_id: Mapped[str | None] = mapped_column(String(100))
    expected_context_revision: Mapped[int | None] = mapped_column(Integer)
    expected_lesson_id: Mapped[UUID | None] = mapped_column(Uuid)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentApproval(Identity, Base):
    __tablename__ = "agent_approvals"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    run_id: Mapped[UUID] = mapped_column(ForeignKey("public.agent_runs.id", ondelete="CASCADE"))
    tool_call_id: Mapped[UUID] = mapped_column(ForeignKey("public.agent_tool_calls.id", ondelete="CASCADE"), unique=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"))
    arguments_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    page_instance_id: Mapped[str] = mapped_column(String(100))
    context_revision: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
