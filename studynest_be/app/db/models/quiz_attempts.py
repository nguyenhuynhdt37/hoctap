"""Server-graded practice attempts. Never treat browser-reported scores as evidence."""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.models.database import Base


class QuizAttempt(Base):
    __tablename__='quiz_attempts'
    __table_args__=(UniqueConstraint('user_id','idempotency_key',name='uq_quiz_attempt_user_key'),
        Index('ix_quiz_attempts_user_lesson_time','user_id','lesson_id','created_at'),
        Index('ix_quiz_attempts_user_created_at', 'user_id', 'created_at'),{'schema':'public'})
    id: Mapped[uuid.UUID]=mapped_column(Uuid,primary_key=True,default=uuid.uuid4)
    user_id: Mapped[uuid.UUID]=mapped_column(ForeignKey('public.user.id',ondelete='CASCADE'))
    lesson_id: Mapped[uuid.UUID]=mapped_column(ForeignKey('public.lessons.id',ondelete='CASCADE'))
    idempotency_key: Mapped[uuid.UUID]=mapped_column(Uuid)
    request_hash: Mapped[str]=mapped_column(String(64))
    content_hash: Mapped[str]=mapped_column(String(64))
    correct: Mapped[int]=mapped_column(Integer)
    total: Mapped[int]=mapped_column(Integer)
    details: Mapped[list]=mapped_column(JSONB)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now())
