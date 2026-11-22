"""Archive flag, per-course announcement opt-out, and single-recipient gifts.

Archive is a timestamp on the enrollment, never a change to status. Lesson
access checks still require status = active, so hiding a course from the
purchased list must not reuse that column.
"""

from datetime import datetime
from typing import ClassVar
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class CourseAnnouncementPreference(Base):
    __tablename__ = "course_announcement_preferences"
    __table_args__: ClassVar[dict] = {"schema": "public"}

    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("public.courses.id", ondelete="CASCADE"), primary_key=True
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true", default=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CourseGift(Base):
    __tablename__ = "course_gifts"
    __table_args__: ClassVar[dict] = {"schema": "public"}

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    sender_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("public.user.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("public.courses.id", ondelete="CASCADE"), index=True
    )
    recipient_email: Mapped[str] = mapped_column(String(320), nullable=False)
    recipient_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("public.user.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    claim_token: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
