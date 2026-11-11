"""Additive academic catalog. Legacy category/topic relationships stay intact."""

import uuid
from datetime import datetime
from typing import ClassVar

from app.db.models.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column


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
            "provider_type IN ('individual','center','exam_center','organization')",
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
    logo_url: Mapped[str | None] = mapped_column(Text)
    banner_url: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending"
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
            "role IN ('owner','manager','instructor','editor')",
            name="ck_provider_member_role",
        ),
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
    role: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(
        String(20), default="active", server_default="active"
    )
    joined_at: Mapped[datetime] = mapped_column(
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
