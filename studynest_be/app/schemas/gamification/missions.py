from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

MissionScope = Literal["daily", "course"]
MissionTemplate = Literal[
    "lesson.completed", "quiz.completed", "code.completed", "daily_checkin.completed",
    "chapter.complete", "chapter.quiz_pass", "course.complete", "course.weekly_streak",
]
MissionStatus = Literal["assigned", "in_progress", "completed", "claimed", "expired"]


class CourseSummary(BaseModel):
    id: UUID
    title: str
    thumbnail_url: str | None


class SectionSummary(BaseModel):
    id: UUID
    title: str
    position: int


class MissionProgress(BaseModel):
    current: int
    target: int


class CouponOffer(BaseModel):
    max_percent: int
    valid_days: int
    target: Literal["next_course_or_combo"] = "next_course_or_combo"


class MissionReward(BaseModel):
    xp: int
    peak: int
    coupon: CouponOffer | None


class Mission(BaseModel):
    id: UUID
    scope: MissionScope
    template: MissionTemplate
    title: str
    description: str
    course: CourseSummary | None
    section: SectionSummary | None
    progress: MissionProgress
    status: MissionStatus
    reward: MissionReward
    expires_at: datetime | None
    completed_at: datetime | None
    claimed_at: datetime | None
    href: str | None


class XpState(BaseModel):
    level: int
    current_xp: int
    required_xp: int
    total_xp: int
    peak_balance: int


class CourseMissions(BaseModel):
    course: CourseSummary
    progress_percent: float
    missions: list[Mission]


class MissionsOverview(BaseModel):
    xp: XpState
    daily: list[Mission]
    daily_resets_at: datetime
    long_term: list[CourseMissions]


class GrantedCoupon(BaseModel):
    id: UUID
    code_masked: str
    expires_at: datetime


class GrantedRewards(BaseModel):
    xp: int
    peak: int
    coupon: GrantedCoupon | None


class LevelUp(BaseModel):
    from_level: int = Field(serialization_alias="from", validation_alias="from")
    to: int
    peak_bonus: int


class ClaimResult(BaseModel):
    mission: Mission
    granted: GrantedRewards
    xp: XpState
    level_up: LevelUp | None


class InventoryCoupon(GrantedCoupon):
    title: str
    max_percent: int
    status: Literal["available", "used", "expired", "revoked"]


class RewardInventory(BaseModel):
    peak_balance: int
    coupons: list[InventoryCoupon]
