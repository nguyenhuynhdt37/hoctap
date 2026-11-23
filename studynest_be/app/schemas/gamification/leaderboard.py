from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.gamification.shop import Equipment

LeaderboardCategory = Literal["xp", "streak", "coins", "lessons", "quiz"]


class LeaderboardEntryDTO(BaseModel):
    rank: int = Field(..., ge=1, description="Thứ hạng trong hạng mục")
    user_id: UUID
    fullname: str
    avatar: str | None = None
    level: int = 1
    score: int = 0
    secondary_value: int = 0
    secondary_label: str = ""
    current_streak: int = 0
    total_xp: int = 0
    equipment: Equipment = Field(default_factory=Equipment)
    is_me: bool = False


class MyRankSummaryDTO(BaseModel):
    rank: int = Field(..., ge=1)
    total_participants: int = Field(..., ge=0)
    top_percent: float = Field(..., ge=0.0, le=100.0)
    score: int = 0
    secondary_value: int = 0
    secondary_label: str = ""
    level: int = 1
    next_rank_gap: int | None = None
    next_rank_user_name: str | None = None


class LeaderboardCategoryMetaDTO(BaseModel):
    id: LeaderboardCategory
    label: str
    tagline: str
    unit: str


class LeaderboardResponse(BaseModel):
    category: LeaderboardCategory
    meta: LeaderboardCategoryMetaDTO
    total_participants: int = 0
    top_score: int = 0
    entries: list[LeaderboardEntryDTO] = Field(default_factory=list)
    me: MyRankSummaryDTO | None = None
