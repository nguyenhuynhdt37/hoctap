from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Sort = Literal["newest", "popular", "rating", "price_asc", "price_desc"]


class BrowseTaxonomyOption(BaseModel):
    id: UUID
    code: str
    name: str


class BrowseSubjectOption(BrowseTaxonomyOption):
    slug: str


class BrowseGradeOption(BrowseSubjectOption):
    education_level_id: UUID
    grade_number: int


class BrowseProviderOption(BaseModel):
    id: UUID
    name: str
    slug: str


class BrowseGradeSubject(BaseModel):
    grade_id: UUID
    subject_id: UUID


class BrowseDeliveryOption(BaseModel):
    code: str
    name: str


class BrowseFiltersResponse(BaseModel):
    levels: list[BrowseTaxonomyOption]
    grades: list[BrowseGradeOption]
    subjects: list[BrowseSubjectOption]
    learning_goals: list[BrowseTaxonomyOption]
    exams: list[BrowseTaxonomyOption]
    grade_subjects: list[BrowseGradeSubject]
    providers: list[BrowseProviderOption]
    delivery_types: list[BrowseDeliveryOption]


class CatalogInstructor(BaseModel):
    id: UUID
    fullname: str
    avatar: str | None


class CatalogSubject(BaseModel):
    id: UUID
    name: str | None


class CatalogGrade(BaseModel):
    id: UUID
    name: str
    grade_number: int


class CatalogCourseResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    thumbnail: str | None
    base_price: float
    currency: str | None
    rating_avg: float
    rating_count: int
    total_enrolls: int
    total_hours: float
    created_at: datetime | None
    level: str | None
    language: str | None
    delivery_type: str
    instructor: CatalogInstructor
    subject: CatalogSubject | None
    provider: BrowseProviderOption | None
    grades: list[CatalogGrade]


class CatalogCoursesResponse(BaseModel):
    items: list[CatalogCourseResponse]
    next_cursor: str | None
    has_more: bool
    total: int | None


class CatalogFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")
    level: str | None = Field(None, max_length=80)
    grade: int | None = Field(None, ge=1, le=12)
    subject: str | None = Field(None, max_length=100)
    goal: str | None = Field(None, max_length=80)
    exam: str | None = Field(None, max_length=80)
    provider: str | None = Field(None, max_length=180)
    delivery_type: Literal["recorded_video"] | None = None
    currency: Literal["VND", "USD"] | None = "VND"
    min_price: Decimal | None = Field(None, ge=0, max_digits=10, decimal_places=2)
    max_price: Decimal | None = Field(None, ge=0, max_digits=10, decimal_places=2)
    rating: float | None = Field(None, ge=0, le=5)
    keyword: str | None = Field(None, max_length=160)
    sort: Sort = "newest"
    limit: int = Field(20, ge=1, le=50)
    cursor: str | None = Field(None, max_length=4096)
    include_total: bool = True

    @model_validator(mode="after")
    def price_range(self):
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("Giá tối thiểu không được lớn hơn giá tối đa")
        return self


class CourseTaxonomy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject_id: UUID | None = None
    provider_id: UUID | None = None
    grade_ids: list[UUID] = Field(default_factory=list, max_length=12)
    learning_goal_ids: list[UUID] = Field(default_factory=list, max_length=30)
    exam_ids: list[UUID] = Field(default_factory=list, max_length=30)
    delivery_type: Literal["recorded_video"] = "recorded_video"


class TaxonomyInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    code: str = Field(
        min_length=1, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    name: str = Field(min_length=1, max_length=160)
    is_active: bool = True
    order_index: int = Field(0, ge=0)
    slug: str | None = Field(None, max_length=100)
    education_level_id: UUID | None = None
    grade_number: int | None = Field(None, ge=1, le=12)
    description: str | None = Field(None, max_length=10000)
    exam_type: str | None = Field(None, max_length=60)


class ProviderInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(default="", max_length=180)
    provider_type: Literal[
        "individual", "center", "exam_center", "organization", "school"
    ] = "individual"
    description: str | None = Field(None, max_length=10000)
    logo_url: str | None = Field(None, max_length=2048)
    banner_url: str | None = Field(None, max_length=2048)


class ProviderDirectoryFilters(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    page: int = Field(1, ge=1)
    size: int = Field(12, ge=1, le=100)
    search: str | None = Field(None, max_length=160)
    province: str | None = Field(None, max_length=160)
    provider_type: (
        Literal["individual", "school", "center", "exam_center", "organization"] | None
    ) = None
    verification_status: Literal["pending", "verified", "rejected"] | None = None
    is_active: bool | None = None
    sort: Literal["name_asc", "name_desc", "newest", "oldest"] = "name_asc"


class ProviderAdminInput(ProviderInput):
    province: str | None = Field(None, max_length=160)
    address: str | None = Field(None, max_length=2000)
    website_url: str | None = Field(None, max_length=2048)

    @field_validator("website_url")
    @classmethod
    def validate_website(cls, value):
        from urllib.parse import urlsplit

        if value and (
            urlsplit(value).scheme not in {"http", "https"}
            or not urlsplit(value).hostname
        ):
            raise ValueError("Website phải là địa chỉ HTTP hoặc HTTPS")
        return value or None

    verification_status: Literal["verified"] = "verified"
    is_active: bool = True


class MemberInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    user_id: UUID
    status: Literal["active", "inactive"] = "active"
    reason: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def require_revocation_reason(self):
        if self.status == "inactive" and not self.reason:
            raise ValueError("Cần ghi lý do thu hồi liên kết giảng viên")
        return self


class ProviderCreationRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=160)
    provider_type: Literal[
        "individual", "center", "exam_center", "organization", "school"
    ] = "center"
    description: str = Field(min_length=10, max_length=10000)
    contact_email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )
    website_url: str | None = Field(None, max_length=2048)
    reason: str = Field(min_length=10, max_length=2000)

    @field_validator("name")
    @classmethod
    def bounded_normalized_name(cls, value):
        import unicodedata

        normalized = " ".join(unicodedata.normalize("NFKC", value).lower().split())
        if not 2 <= len(normalized) <= 160:
            raise ValueError("Tên đơn vị sau chuẩn hóa cần từ 2 đến 160 ký tự")
        return value

    @field_validator("website_url")
    @classmethod
    def valid_website(cls, value):
        if not value:
            return None
        from pydantic import HttpUrl, TypeAdapter

        normalized = str(TypeAdapter(HttpUrl).validate_python(value))
        if len(normalized) > 2048:
            raise ValueError("Đường dẫn quá dài")
        return normalized


class ProviderRequestDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["approved", "rejected"]
    note: str = Field(default="", max_length=2000)
    provider_id: UUID | None = None

    @model_validator(mode="after")
    def validate_decision(self):
        if self.decision == "rejected" and (not self.note or self.provider_id):
            raise ValueError("Từ chối cần lý do và không được gắn đơn vị")
        return self
