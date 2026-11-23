from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, Numeric,
    String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class ReviewItem(Base):
    __tablename__ = "review_items"
    __table_args__ = (
        UniqueConstraint("id", "user_id", name="uq_review_item_owner"),
        Index("uq_review_items_current_question", "user_id", "quiz_id", unique=True,
              postgresql_where=text("invalidated_at IS NULL")),
        Index("ix_review_items_lesson", "lesson_id"),
        CheckConstraint("interval_days >= 0 AND repetitions >= 0 AND ease_factor BETWEEN 1.3 AND 3.0",
                        name="ck_review_item_schedule"),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"))
    lesson_id: Mapped[UUID] = mapped_column(ForeignKey("public.lessons.id", ondelete="CASCADE"))
    # Keep the snapshot identity even if the author deletes the question.
    quiz_id: Mapped[UUID] = mapped_column(Uuid)
    content_hash: Mapped[str] = mapped_column(String(64))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    repetitions: Mapped[int] = mapped_column(Integer, server_default="0")
    interval_days: Mapped[int] = mapped_column(Integer, server_default="0")
    ease_factor: Mapped[float] = mapped_column(Numeric(3, 2, asdecimal=False), server_default="2.50")
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ReviewAnswer(Base):
    __tablename__ = "review_answers"
    __table_args__ = (
        ForeignKeyConstraint(["item_id", "user_id"], ["public.review_items.id", "public.review_items.user_id"],
                             name="fk_review_answer_item_owner", ondelete="CASCADE"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_review_answer_user_key"),
        Index("ix_review_answers_user_time", "user_id", "answered_at"),
        Index("ix_review_answers_item", "item_id"),
        CheckConstraint("self_rating IN ('remembered', 'forgot')", name="ck_review_answer_rating"),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(Uuid)
    item_id: Mapped[UUID] = mapped_column(Uuid)
    idempotency_key: Mapped[UUID] = mapped_column(Uuid)
    option_id: Mapped[UUID] = mapped_column(Uuid)
    self_rating: Mapped[str] = mapped_column(String(10))
    result: Mapped[dict] = mapped_column(JSONB)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StudyGoal(Base):
    __tablename__ = "study_goals"
    __table_args__ = (
        Index("ix_study_goals_user_date", "user_id", "target_date"),
        CheckConstraint("target_type IN ('course', 'path')", name="ck_study_goal_target_type"),
        CheckConstraint("sessions_per_week BETWEEN 1 AND 7", name="ck_study_goal_sessions"),
        CheckConstraint("target_date >= plan_start_date", name="ck_study_goal_dates"),
        {"schema": "public"},
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"))
    target_type: Mapped[str] = mapped_column(String(6))
    target_id: Mapped[UUID] = mapped_column(Uuid)
    target_date: Mapped[date] = mapped_column(Date)
    sessions_per_week: Mapped[int] = mapped_column(Integer)
    plan_start_date: Mapped[date] = mapped_column(Date)
    baseline_completed_ids: Mapped[list[UUID]] = mapped_column(ARRAY(Uuid()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
