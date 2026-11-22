"""Versioned, bounded wire contracts shared by text, voice, and UI tools."""
from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RunState(StrEnum):
    CREATED = "created"
    RESOLVING = "resolving_context"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    PARTIAL = "partially_completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


TERMINAL_STATES = {RunState.COMPLETED, RunState.PARTIAL, RunState.FAILED, RunState.CANCELLED, RunState.EXPIRED}
ACTIVE_STATES = set(RunState) - TERMINAL_STATES
TRANSITIONS = {
    RunState.CREATED: {RunState.RESOLVING},
    RunState.RESOLVING: {RunState.PLANNING, RunState.EXECUTING},
    RunState.PLANNING: {RunState.EXECUTING, RunState.VERIFYING},
    RunState.EXECUTING: {RunState.AWAITING_APPROVAL, RunState.VERIFYING, RunState.PLANNING},
    RunState.AWAITING_APPROVAL: {RunState.EXECUTING},
    RunState.VERIFYING: {RunState.COMPLETED, RunState.PARTIAL, RunState.PLANNING, RunState.EXECUTING},
}


def check_transition(previous: str, target: str) -> None:
    old, new = RunState(previous), RunState(target)
    if old in TERMINAL_STATES or (new not in {RunState.FAILED, RunState.CANCELLED, RunState.EXPIRED} and new not in TRANSITIONS.get(old, set())):
        raise ValueError(f"Invalid agent transition: {old} -> {new}")


class VideoSnapshot(Contract):
    current_time: float = Field(ge=0, le=1_000_000)
    duration: float | None = Field(default=None, ge=0, le=1_000_000)
    is_playing: bool
    playback_rate: float | None = Field(default=None, gt=0, le=4)


class Selection(Contract):
    start: int = Field(ge=0, le=1_000_000)
    end: int = Field(ge=0, le=1_000_000)

    @model_validator(mode="after")
    def ordered(self):
        if self.end < self.start:
            raise ValueError("Selection end precedes start")
        return self


class EditorSnapshot(Contract):
    active_file_id: str | None = Field(default=None, max_length=100)
    revision: int = Field(ge=0)
    is_dirty: bool
    selection: Selection | None = None


class QuizSnapshot(Contract):
    quiz_id: UUID | None = None
    question_id: UUID | None = None
    state: str | None = Field(default=None, max_length=40)


class ScreenSnapshot(Contract):
    schema_version: Literal[1] = 1
    page_instance_id: str = Field(min_length=8, max_length=100)
    revision: int = Field(ge=0)
    captured_at: datetime
    route: str = Field(min_length=1, max_length=500, pattern=r"^/[^\r\n]*$")
    course_id: UUID | None = None
    lesson_id: UUID | None = None
    exercise_id: UUID | None = None
    capabilities: list[str] | None = Field(default=None, max_length=50)
    active_tab: str | None = Field(default=None, max_length=50)
    active_panel: str | None = Field(default=None, max_length=50)
    video: VideoSnapshot | None = None
    editor: EditorSnapshot | None = None
    quiz: QuizSnapshot | None = None

    @model_validator(mode="after")
    def recent(self):
        if self.captured_at.tzinfo is None:
            raise ValueError("captured_at requires timezone")
        age = (datetime.now(timezone.utc) - self.captured_at).total_seconds()
        if age < -30 or age > 300:
            raise ValueError("Screen context is stale")
        return self


class CreateSession(Contract):
    page_instance_id: str = Field(min_length=8, max_length=100)
    route: str = Field(min_length=1, max_length=500, pattern=r"^/[^\r\n]*$")
    course_id: UUID | None = None
    lesson_id: UUID | None = None
    capabilities: list[str] = Field(default_factory=list, max_length=50)


from app.schemas.chat.user.tutor_chat import ChatImageSchema


class CreateRun(Contract):
    session_id: UUID
    thread_id: UUID | None = None
    message: str = Field(min_length=1, max_length=12000)
    idempotency_key: str = Field(min_length=8, max_length=100)
    channel: Literal["text", "voice", "advisor"] = "text"
    images: list[ChatImageSchema] = Field(default_factory=list, max_length=3)


class ApprovalDecision(Contract):
    decision: Literal["approved", "rejected"]
    page_instance_id: str = Field(min_length=8, max_length=100)
    context_revision: int = Field(ge=0)


class ActionReceipt(Contract):
    page_instance_id: str = Field(min_length=8, max_length=100)
    context_revision: int = Field(ge=0)
    lesson_id: UUID | None = None
    status: Literal["completed", "failed", "cancelled", "stale_context"]
    verified: bool = False
    result: dict[str, Any] | None = None
    error: str | None = Field(default=None, max_length=500)


class AgentEvent(Contract):
    schema_version: Literal[1] = 1
    id: UUID
    run_id: UUID
    sequence: int = Field(ge=1)
    type: str
    timestamp: datetime
    payload: dict[str, Any]


class ModelToolCall(Contract):
    name: str = Field(min_length=1, max_length=100)
    arguments: dict[str, Any] = Field(default_factory=dict)


class ModelMemory(Contract):
    # Extractive evidence only: the model selects a durable fact, never invents one.
    quote: str = Field(min_length=5, max_length=500)
    kind: Literal['personal_fact', 'learning_goal', 'explanation_preference']
    key: str = Field(min_length=3, max_length=64, pattern=r'^[a-z][a-z0-9_.-]+$')


class ModelDecision(Contract):
    # Public action plan only. Never request or persist private model reasoning.
    message: str = Field(default="", max_length=16000)
    plan: list[str] = Field(default_factory=list, max_length=8)
    tool_calls: list[ModelToolCall] = Field(default_factory=list, max_length=4)
    done: bool = False
    memories: list[ModelMemory] = Field(default_factory=list, max_length=3)

    @field_validator('memories', mode='before')
    @classmethod
    def valid_memory_suggestions(cls, value):
        # Memory is best effort; a bad suggestion must not discard a valid answer.
        result = []
        for item in value[:3] if isinstance(value, list) else []:
            try:
                result.append(ModelMemory.model_validate(item))
            except (ValueError, TypeError):
                continue
        return result
