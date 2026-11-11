"""Versioned curated learning paths and financially immutable bundle snapshots."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import ClassVar

from app.db.models.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column


class Identity:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )


class ProficiencyFramework(Identity, Base):
    __tablename__ = "proficiency_frameworks"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    code: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.subjects.id"))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )


class ProficiencyLevel(Identity, Base):
    __tablename__ = "proficiency_levels"
    __table_args__ = (
        UniqueConstraint("framework_id", "code"),
        UniqueConstraint("framework_id", "position"),
        {"schema": "public"},
    )
    framework_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.proficiency_frameworks.id")
    )
    code: Mapped[str] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(160))
    position: Mapped[int] = mapped_column(Integer)


class CourseProficiency(Identity, Base):
    __tablename__ = "course_proficiency"
    __table_args__ = (
        UniqueConstraint("course_id", "target_level_id"),
        CheckConstraint(
            "status IN ('pending','approved','rejected')", name="ck_proficiency_status"
        ),
        {"schema": "public"},
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.courses.id"), index=True
    )
    entry_level_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.proficiency_levels.id")
    )
    target_level_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.proficiency_levels.id")
    )
    skill: Mapped[str] = mapped_column(String(160))
    evidence: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("public.user.id"))


class LearningPath(Identity, Base):
    __tablename__ = "learning_paths"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.subjects.id"))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PathVersion(Identity, Base):
    __tablename__ = "learning_path_versions"
    __table_args__ = (
        UniqueConstraint("path_id", "version"),
        CheckConstraint(
            "status IN ('draft','published','archived')", name="ck_path_version_status"
        ),
        {"schema": "public"},
    )
    path_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.learning_paths.id"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PathStage(Identity, Base):
    __tablename__ = "learning_path_stages"
    __table_args__ = (UniqueConstraint("version_id", "position"), {"schema": "public"})
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.learning_path_versions.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)
    target_level_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.proficiency_levels.id")
    )


class StageGroup(Identity, Base):
    __tablename__ = "stage_course_groups"
    __table_args__ = (UniqueConstraint("stage_id", "position"), {"schema": "public"})
    stage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.learning_path_stages.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(180))
    position: Mapped[int] = mapped_column(Integer)


class StageOption(Identity, Base):
    __tablename__ = "stage_course_options"
    __table_args__ = (
        UniqueConstraint("group_id", "course_id"),
        UniqueConstraint("group_id", "position"),
        {"schema": "public"},
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.stage_course_groups.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.courses.id"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)


class UserLearningPath(Identity, Base):
    __tablename__ = "user_learning_paths"
    __table_args__ = (UniqueConstraint("user_id", "version_id"), {"schema": "public"})
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"), index=True)
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.learning_path_versions.id")
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CourseBundle(Identity, Base):
    __tablename__ = "course_bundles"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BundleVersion(Identity, Base):
    __tablename__ = "course_bundle_versions"
    __table_args__ = (
        UniqueConstraint("bundle_id", "version"),
        CheckConstraint(
            "status IN ('draft','published','archived')",
            name="ck_bundle_version_status",
        ),
        CheckConstraint("price >= 0", name="ck_bundle_price"),
        {"schema": "public"},
    )
    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundles.id"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(
        String(10), default="VND", server_default="VND"
    )
    status: Mapped[str] = mapped_column(String(20), default="draft")
    path_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.learning_path_versions.id")
    )
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BundleItem(Identity, Base):
    __tablename__ = "course_bundle_items"
    __table_args__ = (
        UniqueConstraint("version_id", "course_id"),
        UniqueConstraint("version_id", "position"),
        CheckConstraint(
            "list_price >= 0 AND allocated_price >= 0", name="ck_bundle_item_price"
        ),
        {"schema": "public"},
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundle_versions.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.courses.id"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    list_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    allocated_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)


class BundleOrder(Identity, Base):
    __tablename__ = "bundle_orders"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key"),
        Index("ix_bundle_orders_coupon_user", "coupon_id", "user_id"),
        CheckConstraint("total_paid >= 0", name="ck_bundle_order_total"),
        {"schema": "public"},
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"), index=True)
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundle_versions.id")
    )
    idempotency_key: Mapped[str] = mapped_column(String(100))
    quote_hash: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(180))
    total_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    coupon_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.bundle_coupons.id")
    )
    coupon_code: Mapped[str | None] = mapped_column(String(40))
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), server_default="0", default=0
    )
    currency: Mapped[str] = mapped_column(String(10), default="VND")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BundleCoupon(Identity, Base):
    __tablename__ = "bundle_coupons"
    __table_args__ = (
        CheckConstraint(
            "discount_type IN ('percent','fixed')", name="ck_bundle_coupon_type"
        ),
        CheckConstraint(
            "value > 0 AND (discount_type <> 'percent' OR value <= 100)",
            name="ck_bundle_coupon_value",
        ),
        CheckConstraint(
            "min_total >= 0 AND (max_discount IS NULL OR max_discount > 0)",
            name="ck_bundle_coupon_amount",
        ),
        CheckConstraint(
            "(max_uses IS NULL OR max_uses > 0) AND per_user_limit > 0",
            name="ck_bundle_coupon_limits",
        ),
        CheckConstraint("ends_at > starts_at", name="ck_bundle_coupon_dates"),
        {"schema": "public"},
    )
    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.course_bundles.id"), index=True
    )
    code: Mapped[str] = mapped_column(String(40), unique=True)
    discount_type: Mapped[str] = mapped_column(String(10))
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    min_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0"
    )
    max_discount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    max_uses: Mapped[int | None] = mapped_column(Integer)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"))


class BundleOrderLine(Identity, Base):
    __tablename__ = "bundle_order_lines"
    __table_args__ = (
        UniqueConstraint("order_id", "course_id"),
        CheckConstraint(
            "paid >= 0 AND list_price >= 0", name="ck_bundle_order_line_price"
        ),
        {"schema": "public"},
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.bundle_orders.id"), index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.courses.id"))
    title: Mapped[str] = mapped_column(String(180))
    instructor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.user.id"))
    list_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    paid: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    already_owned: Mapped[bool] = mapped_column(Boolean)
    purchase_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.purchase_items.id"), unique=True
    )
    earning_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.instructor_earnings.id"), unique=True
    )
