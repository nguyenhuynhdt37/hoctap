"""Stable external identities used for sign-in."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (
        PrimaryKeyConstraint("provider", "provider_subject", name="user_identities_pkey"),
        UniqueConstraint("user_id", "provider", name="uq_user_identities_user_provider"),
        {"schema": "public"},
    )

    provider: Mapped[str] = mapped_column(String(32))
    provider_subject: Mapped[str] = mapped_column(String(255))
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE", name="fk_user_identities_user"),
    )
    email_at_link: Mapped[str] = mapped_column(String(254))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
