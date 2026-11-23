from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.gamification.leaderboard import LeaderboardCategory, LeaderboardResponse
from app.services.gamification.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/gamification", tags=["Bảng xếp hạng"])


async def _current_user_id(authorization: Annotated[AuthorizationService, Depends()]) -> UUID:
    return (await authorization.get_current_user()).id


@router.get(
    "/leaderboard",
    response_model=LeaderboardResponse,
    summary="Xem bảng xếp hạng theo nhiều hạng mục",
)
async def get_leaderboard(
    user_id: Annotated[UUID, Depends(_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_session)],
    category: Annotated[LeaderboardCategory, Query(description="Hạng mục xếp hạng")] = "xp",
    limit: Annotated[int, Query(ge=5, le=100, description="Số lượng học viên tối đa")] = 50,
) -> LeaderboardResponse:
    return await LeaderboardService(db).get_leaderboard(
        category=category,
        limit=limit,
        current_user_id=user_id,
    )
