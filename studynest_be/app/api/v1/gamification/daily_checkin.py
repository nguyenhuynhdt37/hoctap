"""
API Router cho module Daily Check-in.

Endpoints:
  GET  /api/v1/gamification/checkin  – Lấy trạng thái check-in hôm nay
  POST /api/v1/gamification/checkin  – Thực hiện Check-in
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from app.core.deps import AuthorizationService
from app.schemas.gamification.daily_checkin import (
    CheckinClaimResponse,
    CheckinStatusResponse,
    ErrorResponse,
)
from app.services.gamification.daily_checkin_service import DailyCheckinService

router = APIRouter(prefix="/gamification", tags=["Gamification – Daily Check-in"])


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/gamification/checkin
# ──────────────────────────────────────────────────────────────────────────────


@router.get(
    "/checkin",
    response_model=CheckinStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy trạng thái Check-in hôm nay",
    description=(
        "Trả về toàn bộ thông tin trạng thái Check-in của người dùng đang đăng nhập:\n\n"
        "- Đã check-in hôm nay chưa (`checked_today`).\n"
        "- Chuỗi streak hiện tại (`current_streak`) và cao nhất (`best_streak`).\n"
        "- Phần thưởng hôm nay (`today_reward`) và ngày tiếp theo (`next_reward`).\n"
        "- Lịch check-in đầy đủ của chu kỳ hiện tại (`calendar`).\n"
        "- Số dư Peak Wallet hiện tại (`current_peak_balance`)."
    ),
    responses={
        200: {"model": CheckinStatusResponse, "description": "Thành công"},
        401: {"model": ErrorResponse, "description": "Chưa đăng nhập"},
        403: {"model": ErrorResponse, "description": "Tài khoản bị khóa hoặc đã xóa"},
        404: {"model": ErrorResponse, "description": "Không có sự kiện Check-in đang hoạt động"},
        500: {"model": ErrorResponse, "description": "Lỗi hệ thống"},
    },
)
async def get_checkin_status(
    request: Request,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: DailyCheckinService = Depends(DailyCheckinService),
) -> CheckinStatusResponse:
    """Lấy trạng thái Check-in hiện tại của người dùng."""
    user = await authorization.get_current_user()
    return await service.get_checkin_status(user, request)


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/v1/gamification/checkin
# ──────────────────────────────────────────────────────────────────────────────


@router.post(
    "/checkin",
    response_model=CheckinClaimResponse,
    status_code=status.HTTP_200_OK,
    summary="Thực hiện Check-in hàng ngày",
    description=(
        "Thực hiện Check-in cho ngày hôm nay.\n\n"
        "**Idempotent**: Nếu đã check-in trong ngày, API trả về HTTP 409 "
        "(`ALREADY_CHECKED_IN`) để tránh cộng Peak hai lần.\n\n"
        "**Atomic**: Toàn bộ thao tác (tạo bản ghi, cập nhật streak, cộng Peak, "
        "ghi ledger, ghi activity log) nằm trong **một database transaction**. "
        "Nếu bất kỳ bước nào thất bại, toàn bộ bị rollback.\n\n"
        "**Phần thưởng** được đọc từ bảng cấu hình `daily_checkin_rewards_config`, "
        "hỗ trợ chu kỳ 7 ngày, 30 ngày hoặc bất kỳ chu kỳ nào được cấu hình."
    ),
    responses={
        200: {"model": CheckinClaimResponse, "description": "Check-in thành công"},
        401: {"model": ErrorResponse, "description": "Chưa đăng nhập"},
        403: {"model": ErrorResponse, "description": "Tài khoản bị khóa hoặc đã xóa"},
        404: {"model": ErrorResponse, "description": "Không có sự kiện hoặc phần thưởng"},
        409: {"model": ErrorResponse, "description": "Đã Check-in hôm nay rồi"},
        422: {"model": ErrorResponse, "description": "Phần thưởng không hợp lệ"},
        500: {"model": ErrorResponse, "description": "Lỗi hệ thống"},
    },
)
async def claim_checkin(
    request: Request,
    authorization: AuthorizationService = Depends(AuthorizationService),
    service: DailyCheckinService = Depends(DailyCheckinService),
) -> CheckinClaimResponse:
    """Thực hiện Check-in và nhận phần thưởng."""
    user = await authorization.get_current_user()
    return await service.claim_checkin(user, request)
