"""Private bookmarks, independent of course favourites."""

from datetime import datetime
from typing import ClassVar
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class InstructorFavourite(Base):
    __tablename__ = "instructor_favourites"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True
    )
    instructor_id: Mapped[UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
