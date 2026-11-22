"""Immutable execution evidence. Submitted source and hidden inputs are not retained."""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.models.database import Base


class CodeTestAttempt(Base):
    __tablename__ = 'code_test_attempts'
    __table_args__ = (
        Index('ix_code_attempts_user_exercise_time', 'user_id', 'exercise_id', 'created_at'),
        {'schema': 'public'},
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.user.id', ondelete='CASCADE'))
    exercise_id: Mapped[uuid.UUID] = mapped_column(ForeignKey('public.lesson_codes.id', ondelete='CASCADE'))
    content_hash: Mapped[str] = mapped_column(String(64))
    suite_hash: Mapped[str] = mapped_column(String(64))
    buffer_revision: Mapped[int | None] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(24))
    files_manifest: Mapped[list] = mapped_column(JSONB)
    result: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
