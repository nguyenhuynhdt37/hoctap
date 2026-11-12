"""Additive commerce control records; purchased snapshots remain in learning_paths."""

import uuid
from datetime import datetime
from typing import ClassVar

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class BundleVersionReview(Base):
    __tablename__ = "bundle_version_reviews"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundle_versions.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), default="draft", server_default="draft"
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    published_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    review_note: Mapped[str | None] = mapped_column(Text)


class BundleAuditEvent(Base):
    __tablename__ = "bundle_audit_events"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundles.id", ondelete="RESTRICT")
    )
    version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.course_bundle_versions.id", ondelete="RESTRICT")
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    action: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
