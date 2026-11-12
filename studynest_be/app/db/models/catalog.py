"""Additive academic catalog. Legacy category/topic relationships stay intact."""

import uuid
from datetime import datetime
from typing import ClassVar

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class TaxonomyMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    code: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    order_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )


class EducationLevel(TaxonomyMixin, Base):
    __tablename__ = "education_levels"
    __table_args__: ClassVar[dict] = {"schema": "public"}


class Grade(TaxonomyMixin, Base):
    __tablename__ = "grades"
    __table_args__ = (
        CheckConstraint("grade_number BETWEEN 1 AND 12", name="ck_grade_number"),
        {"schema": "public"},
    )
    education_level_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.education_levels.id"), index=True
    )
    grade_number: Mapped[int] = mapped_column(Integer, unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)


class Subject(TaxonomyMixin, Base):
    __tablename__ = "subjects"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)


class LearningGoal(TaxonomyMixin, Base):
    __tablename__ = "learning_goals"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    description: Mapped[str | None] = mapped_column(Text)


class Exam(TaxonomyMixin, Base):
    __tablename__ = "exams"
    __table_args__: ClassVar[dict] = {"schema": "public"}
    exam_type: Mapped[str] = mapped_column(
        String(60), default="entrance", server_default="entrance"
    )
    description: Mapped[str | None] = mapped_column(Text)


class Provider(Base):
    __tablename__ = "providers"
    __table_args__ = (
        CheckConstraint(
            "provider_type IN ('individual','center','exam_center','organization','school')",
            name="ck_provider_type",
        ),
        CheckConstraint(
            "verification_status IN ('pending','verified','rejected')",
            name="ck_provider_verification",
        ),
        {"schema": "public"},
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    provider_type: Mapped[str] = mapped_column(
        String(30), default="individual", server_default="individual"
    )
    description: Mapped[str | None] = mapped_column(Text)
    province: Mapped[str | None] = mapped_column(String(160))
    province_code: Mapped[str | None] = mapped_column(String(20))
    school_code: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_key: Mapped[str | None] = mapped_column(String(240), unique=True)
    source_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_snapshot: Mapped[dict | None] = mapped_column(JSONB)
    logo_url: Mapped[str | None] = mapped_column(Text)
    banner_url: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(
        String(20), default="verified", server_default="verified"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ProviderMember(Base):
    __tablename__ = "provider_members"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','inactive')", name="ck_provider_member_status"
        ),
        {"schema": "public"},
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.providers.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="active", server_default="active"
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    granted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    granted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocation_reason: Mapped[str | None] = mapped_column(Text)


class ProviderMembershipEvent(Base):
    __tablename__ = "provider_membership_events"
    __table_args__ = (
        CheckConstraint(
            "action IN ('legacy_imported','granted','revoked')",
            name="ck_provider_membership_event_action",
        ),
        CheckConstraint(
            "status IN ('active','inactive')",
            name="ck_provider_membership_event_status",
        ),
        CheckConstraint(
            "action = 'legacy_imported' OR actor_id IS NOT NULL",
            name="ck_provider_membership_event_actor",
        ),
        CheckConstraint(
            "action != 'revoked' OR (reason IS NOT NULL AND length(trim(reason)) > 0)",
            name="ck_provider_membership_event_reason",
        ),
        Index(
            "ix_provider_membership_events_provider_time",
            "provider_id",
            "occurred_at",
            "id",
        ),
        {"schema": "public"},
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.providers.id", ondelete="RESTRICT")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    action: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str | None] = mapped_column(Text)
    details: Mapped[dict] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ProviderJoinRequest(Base):
    __tablename__ = "provider_join_requests"
    __table_args__ = (
        CheckConstraint(
            "status NOT IN ('approved','rejected') OR review_note IS NOT NULL",
            name="ck_provider_join_review_not_null",
        ),
        CheckConstraint(
            "status IN ('pending','approved','rejected','cancelled')",
            name="ck_provider_join_status",
        ),
        CheckConstraint(
            "(status='pending' AND reviewed_by IS NULL AND decided_at IS NULL) OR (status='cancelled' AND reviewed_by IS NULL AND decided_at IS NOT NULL) OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND decided_at IS NOT NULL AND length(trim(review_note)) >= 10)",
            name="ck_provider_join_decision",
        ),
        Index(
            "uq_provider_join_pending",
            "provider_id",
            "requester_id",
            unique=True,
            postgresql_where=text("status='pending'"),
        ),
        {"schema": "public"},
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.providers.id", ondelete="RESTRICT"), index=True
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT"), index=True
    )
    position: Mapped[str] = mapped_column(String(160))
    work_email: Mapped[str | None] = mapped_column(String(254))
    evidence: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending"
    )
    review_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProviderCreationRequest(Base):
    __tablename__ = "provider_creation_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','approved','rejected','cancelled')",
            name="ck_provider_request_status",
        ),
        CheckConstraint(
            "provider_type IN ('individual','center','exam_center','organization','school')",
            name="ck_provider_request_type",
        ),
        CheckConstraint(
            "(status = 'pending' AND decided_at IS NULL AND reviewed_by IS NULL AND provider_id IS NULL) OR "
            "(status = 'approved' AND decided_at IS NOT NULL AND reviewed_by IS NOT NULL AND provider_id IS NOT NULL) OR "
            "(status = 'rejected' AND decided_at IS NOT NULL AND reviewed_by IS NOT NULL AND review_note IS NOT NULL AND length(trim(review_note)) > 0 AND provider_id IS NULL) OR "
            "(status = 'cancelled' AND decided_at IS NOT NULL AND reviewed_by IS NULL AND provider_id IS NULL)",
            name="ck_provider_request_decision",
        ),
        Index(
            "uq_provider_request_pending_name",
            "normalized_name",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
        Index(
            "ix_provider_requests_requester_created", "requester_id", "created_at", "id"
        ),
        Index("ix_provider_requests_status_created", "status", "created_at", "id"),
        {"schema": "public"},
    )
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("uuid_generate_v4()"),
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    name: Mapped[str] = mapped_column(String(160))
    normalized_name: Mapped[str] = mapped_column(String(160))
    provider_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str] = mapped_column(Text)
    contact_email: Mapped[str] = mapped_column(String(320))
    website_url: Mapped[str | None] = mapped_column(String(2048))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending"
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.user.id", ondelete="RESTRICT")
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    review_note: Mapped[str | None] = mapped_column(Text)
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("public.providers.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def mapping(name, left_name, left_table, right_name, right_table):
    return Table(
        name,
        Base.metadata,
        Column(
            left_name,
            Uuid,
            ForeignKey(f"public.{left_table}.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        Column(
            right_name,
            Uuid,
            ForeignKey(f"public.{right_table}.id"),
            primary_key=True,
            index=True,
        ),
        schema="public",
    )


grade_subjects = mapping(
    "grade_subjects", "grade_id", "grades", "subject_id", "subjects"
)
course_grades = mapping("course_grades", "course_id", "courses", "grade_id", "grades")
course_learning_goals = mapping(
    "course_learning_goals",
    "course_id",
    "courses",
    "learning_goal_id",
    "learning_goals",
)
course_exams = mapping("course_exams", "course_id", "courses", "exam_id", "exams")
