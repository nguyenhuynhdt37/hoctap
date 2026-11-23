from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ComboLevel = Literal["tieu-hoc", "thcs", "thpt"]
ComboSort = Literal["recent", "price_asc", "price_desc"]
COMBO_LEVELS: tuple[ComboLevel, ...] = ("tieu-hoc", "thcs", "thpt")


class CatalogComboFilters(BaseModel):
    limit: int = Field(default=3, ge=1, le=50)
    level: ComboLevel | None = None
    subject: str | None = Field(
        default=None, max_length=80, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    sort: ComboSort = "recent"


class ComboCoursePreview(BaseModel):
    id: UUID
    title: str
    thumbnail: str | None


class ComboSubject(BaseModel):
    code: str
    name: str


class ComboInstructor(BaseModel):
    id: UUID
    name: str


class ComboPromotion(BaseModel):
    status: Literal["coupon_required"] = "coupon_required"
    ends_at: datetime = Field(
        description="Latest expiry among currently eligible combo coupons."
    )


class CatalogCombo(BaseModel):
    id: UUID
    slug: str
    title: str
    thumbnail: str | None
    description: str
    levels: list[ComboLevel]
    subjects: list[ComboSubject]
    course_count: int
    lesson_count: int
    duration_seconds: int = Field(
        ge=0, description="Total recorded video duration across all component courses."
    )
    currency: Literal["VND"] = "VND"
    price: Decimal
    standalone_total: Decimal = Field(
        description="Sum of current public standalone list prices, before coupons."
    )
    savings_amount: Decimal = Field(ge=0)
    savings_percent: int = Field(
        ge=0,
        le=100,
        description="Savings as a percentage of the standalone total, rounded down.",
    )
    courses: list[ComboCoursePreview] = Field(max_length=4)
    instructor: ComboInstructor
    promotion: ComboPromotion | None


class CatalogCombosResponse(BaseModel):
    items: list[CatalogCombo]
    available_levels: list[ComboLevel]
    has_public_combos: bool
