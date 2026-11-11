from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class FrameworkInput(StrictModel):
    code: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=160)
    subject_id: UUID
    levels: list[str] = Field(min_length=1, max_length=20)


class ProficiencyInput(StrictModel):
    entry_level_id: UUID | None = None
    target_level_id: UUID
    skill: str = Field(min_length=1, max_length=160)
    evidence: str = Field(min_length=20, max_length=10000)
    status: Literal["pending", "approved", "rejected"] = "pending"


class GroupInput(StrictModel):
    title: str = Field(min_length=1, max_length=180)
    course_ids: list[UUID] = Field(default_factory=list, max_length=20)


class StageInput(StrictModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=10000)
    target_level_id: UUID | None = None
    groups: list[GroupInput] = Field(default_factory=list, max_length=20)


class PathInput(StrictModel):
    slug: str = Field(default="", max_length=180)
    path_id: UUID | None = None
    subject_id: UUID
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(default="", max_length=20000)
    stages: list[StageInput] = Field(default_factory=list, max_length=20)


class BundleInput(StrictModel):
    slug: str = Field(default="", max_length=180)
    bundle_id: UUID | None = None
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(default="", max_length=20000)
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    course_ids: list[UUID] = Field(default_factory=list, max_length=60)
    path_version_id: UUID | None = None

    @model_validator(mode="after")
    def unique_courses(self):
        if len(set(self.course_ids)) != len(self.course_ids):
            raise ValueError("Không được lặp khóa học")
        return self


class BundleCheckout(StrictModel):
    version_id: UUID
    quote_hash: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    idempotency_key: UUID
    coupon_code: str | None = Field(default=None, max_length=40)


class BundleCouponInput(StrictModel):
    code: str = Field(
        min_length=3, max_length=40, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]+$"
    )
    discount_type: Literal["percent", "fixed"]
    value: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    min_total: Decimal = Field(default=0, ge=0, max_digits=12, decimal_places=2)
    max_discount: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    starts_at: AwareDatetime
    ends_at: AwareDatetime
    max_uses: int | None = Field(default=None, gt=0)
    per_user_limit: int = Field(default=1, gt=0, le=1000)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, value):
        return value.upper()

    @model_validator(mode="after")
    def valid_policy(self):
        if self.discount_type == "percent" and self.value > 100:
            raise ValueError("Phần trăm giảm tối đa 100")
        if self.ends_at <= self.starts_at:
            raise ValueError("Ngày kết thúc phải sau ngày bắt đầu")
        return self
