from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def valid_public_text(value):
    if value is not None:
        if "\x00" in value:
            raise ValueError("Văn bản chứa ký tự không hợp lệ")
        try:
            value.encode("utf-8")
        except UnicodeError as error:
            raise ValueError("Văn bản Unicode không hợp lệ") from error
    return value


class InstructorFilters(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    q: str = Field(default="", max_length=160)
    grade: int | None = Field(None, ge=1, le=12)
    level: str | None = Field(None, max_length=80)
    subject: str | None = Field(None, max_length=100)
    exam: str | None = Field(None, max_length=80)
    goal: str | None = Field(None, max_length=80)
    provider: str | None = Field(None, max_length=180)
    has_courses: bool | None = None
    min_rating: float | None = Field(None, ge=0, le=5)
    sort: Literal["relevant", "popular", "rating", "courses", "newest", "name"] = (
        "rating"
    )
    limit: int = Field(12, ge=1, le=30)
    cursor: str | None = Field(None, max_length=4096)
    include_total: bool = True

    @field_validator("q", "level", "subject", "exam", "goal", "provider", "cursor")
    @classmethod
    def valid_text(cls, value):
        return valid_public_text(value)

    @field_validator("q")
    @classmethod
    def normalize_query(cls, value):
        import unicodedata

        return unicodedata.normalize("NFC", " ".join(value.split()))


class NamedOption(BaseModel):
    id: UUID
    name: str


class SubjectOption(NamedOption):
    slug: str


class GradeOption(NamedOption):
    grade_number: int


class CodedOption(NamedOption):
    code: str


class PublicInstructor(BaseModel):
    id: UUID
    name: str
    avatar: str | None
    short_bio: str
    subjects: list[SubjectOption]
    grades: list[GradeOption]
    exams: list[CodedOption]
    learning_goals: list[CodedOption]
    providers: list[SubjectOption]
    public_course_count: int
    course_count: int
    student_count: int
    rating_avg: float
    evaluated_count: int
    rating_count: int
    first_public_course_at: datetime | None = None


class InstructorPage(BaseModel):
    items: list[PublicInstructor]
    next_cursor: str | None
    has_more: bool
    total: int | None


class InstructorProfile(PublicInstructor):
    instructor_description: str
    facebook_url: str | None
    created_at: datetime | None


class InstructorCourseFilters(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    limit: int = Field(20, ge=1, le=50)
    cursor: str | None = Field(None, max_length=4096)
    keyword: str = Field("", max_length=160)
    category_slug: str | None = Field(None, max_length=180)
    topic_slug: str | None = Field(None, max_length=180)
    level: Literal["beginner", "intermediate", "advanced", "all"] | None = None
    sort: Literal[
        "created_at_desc",
        "created_at_asc",
        "views_desc",
        "views_asc",
        "rating_desc",
        "rating_asc",
        "enrolls_desc",
        "enrolls_asc",
    ] = "rating_desc"
    grade: int | None = Field(None, ge=1, le=12)
    subject: str | None = Field(None, max_length=100)
    exam: str | None = Field(None, max_length=80)
    goal: str | None = Field(None, max_length=80)
    provider: str | None = Field(None, max_length=180)

    @field_validator(
        "keyword",
        "category_slug",
        "topic_slug",
        "level",
        "subject",
        "exam",
        "goal",
        "provider",
        "cursor",
    )
    @classmethod
    def valid_text(cls, value):
        return valid_public_text(value)


class InstructorCourse(BaseModel):
    id: UUID
    title: str
    slug: str
    thumbnail: str | None
    base_price: float
    currency: str | None
    is_purchased: bool
    is_favorite: bool
    rating_avg: float
    rating_count: int
    total_enrolls: int
    views: int
    level: str | None
    language: str | None
    category: SubjectOption | None
    topic: SubjectOption | None
    created_at: datetime | None
    updated_at: datetime | None


class InstructorCoursePage(BaseModel):
    items: list[InstructorCourse]
    next_cursor: str | None
    has_more: bool
    total: int


class SavedInstructorIds(BaseModel):
    ids: list[UUID]


class SavedInstructorState(BaseModel):
    saved: bool
