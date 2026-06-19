import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.db.models.database import User
from app.schemas.gamification.streak import (
    StreakResponse,
    StreakRestoreResponse,
    StreakHistoryResponse,
    StreakCalendarResponse,
    ActivityLogDTO,
)
from app.services.gamification.streak_service import StreakService

router = APIRouter(prefix="/gamification/streak", tags=["Gamification – Streak Engine"])


@router.get(
    "",
    response_model=StreakResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy thông tin Streak hiện tại của người dùng",
)
async def get_streak_status(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> StreakResponse:
    user = await authorization.get_current_user()
    service = StreakService(db)
    data = await service.get_streak_status(user.id)
    return StreakResponse(**data)


@router.get(
    "/calendar",
    response_model=StreakCalendarResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách ngày học tập tích cực trong chu kỳ gần đây",
)
async def get_streak_calendar(
    days: int = Query(30, ge=1, le=365),
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> StreakCalendarResponse:
    user = await authorization.get_current_user()
    service = StreakService(db)
    dates = await service.get_streak_calendar(user.id, days=days)
    return StreakCalendarResponse(active_dates=dates)


@router.get(
    "/history",
    response_model=StreakHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy lịch sử chi tiết các hoạt động học tập đạt chuẩn",
)
async def get_streak_history(
    limit: int = Query(20, ge=1, le=100),
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> StreakHistoryResponse:
    user = await authorization.get_current_user()
    service = StreakService(db)
    logs = await service.get_streak_history(user.id, limit=limit)
    activities = [ActivityLogDTO(**item) for item in logs]
    return StreakHistoryResponse(activities=activities)


@router.post(
    "/restore",
    response_model=StreakRestoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Khôi phục chuỗi Streak bị gián đoạn sử dụng Streak Freeze",
)
async def restore_streak(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> StreakRestoreResponse:
    user = await authorization.get_current_user()
    service = StreakService(db)
    data = await service.restore_streak(user.id)
    return StreakRestoreResponse(**data)
