"""
DTOs cho module Daily Check-in.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# REWARD DTO
# ──────────────────────────────────────────────────────────────────────────────


class RewardDTO(BaseModel):
    """Thông tin một phần thưởng."""

    day_number: int = Field(..., description="Ngày trong chu kỳ")
    reward_type: str = Field(..., description="Loại phần thưởng (peak_wallet, badge, …)")
    reward_amount: Optional[int] = Field(None, description="Số lượng phần thưởng")
    reward_metadata: Optional[dict] = Field(None, description="Metadata phần thưởng")


# ──────────────────────────────────────────────────────────────────────────────
# CHECK-IN STATUS (GET /checkin)
# ──────────────────────────────────────────────────────────────────────────────


class CalendarDayDTO(BaseModel):
    """Thông tin một ngày trong lịch check-in."""

    day_number: int = Field(..., description="Ngày trong chu kỳ (1-based)")
    checkin_date: Optional[datetime.date] = Field(
        None, description="Ngày đã check-in (None nếu chưa)"
    )
    is_checked: bool = Field(False, description="Đã check-in ngày này chưa")
    reward: Optional[RewardDTO] = Field(None, description="Phần thưởng của ngày này")


class CheckinStatusResponse(BaseModel):
    """Response cho GET /api/v1/gamification/checkin."""

    checked_today: bool = Field(..., description="Đã check-in hôm nay chưa")
    current_streak: int = Field(..., description="Chuỗi streak hiện tại")
    best_streak: int = Field(..., description="Chuỗi streak cao nhất")
    current_day_in_cycle: int = Field(
        ..., description="Ngày hiện tại trong chu kỳ (1-based)"
    )
    cycle_days: int = Field(..., description="Tổng số ngày trong chu kỳ")
    today_reward: Optional[RewardDTO] = Field(
        None, description="Phần thưởng hôm nay (nếu chưa nhận)"
    )
    next_reward: Optional[RewardDTO] = Field(
        None, description="Phần thưởng ngày mai"
    )
    calendar: list[CalendarDayDTO] = Field(
        default_factory=list, description="Lịch check-in của chu kỳ hiện tại"
    )
    current_peak_balance: int = Field(
        ..., description="Số dư Peak Wallet hiện tại"
    )


# ──────────────────────────────────────────────────────────────────────────────
# CLAIM CHECK-IN (POST /checkin)
# ──────────────────────────────────────────────────────────────────────────────


class CheckinClaimResponse(BaseModel):
    """Response cho POST /api/v1/gamification/checkin."""

    success: bool = Field(..., description="Check-in thành công hay không")
    message: str = Field(..., description="Thông báo kết quả")
    current_day: int = Field(..., description="Ngày trong chu kỳ vừa check-in (1-based)")
    reward: Optional[RewardDTO] = Field(None, description="Phần thưởng vừa nhận")
    current_peak_balance: int = Field(..., description="Số dư Peak Wallet sau khi nhận")
    current_streak: int = Field(..., description="Chuỗi streak sau khi check-in")
    best_streak: int = Field(..., description="Chuỗi streak cao nhất")
    calendar: list[CalendarDayDTO] = Field(
        default_factory=list, description="Lịch check-in được cập nhật"
    )


# ──────────────────────────────────────────────────────────────────────────────
# ERROR RESPONSE
# ──────────────────────────────────────────────────────────────────────────────


class ErrorResponse(BaseModel):
    """Chuẩn hoá error response."""

    code: str = Field(..., description="Mã lỗi")
    message: str = Field(..., description="Mô tả lỗi")
    detail: Optional[str] = Field(None, description="Chi tiết bổ sung")
