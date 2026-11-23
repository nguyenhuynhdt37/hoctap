import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.core.redis import get_redis
from app.db.sesson import get_session
from app.schemas.gamification.missions import ClaimResult, MissionsOverview, RewardInventory
from app.services.gamification.mission_service import MissionService

router = APIRouter(prefix="/gamification", tags=["Gamification – Missions"])


async def limit_claims(user_id: UUID) -> None:
    key = f"gamification:mission-claim:{user_id}:{int(time.time()) // 60}"
    try:
        async with get_redis().pipeline(transaction=True) as pipeline:
            count, _ = await pipeline.incr(key).expire(key, 90).execute()
    except RedisError as exc:
        logger.warning("Không kiểm tra được giới hạn nhận thưởng ({})", type(exc).__name__)
        return
    if count > 30:
        raise HTTPException(
            429, "Bạn nhận thưởng quá nhanh. Vui lòng thử lại sau.", headers={"Retry-After": "60"},
        )


@router.get("/missions", response_model=MissionsOverview)
async def get_missions(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> MissionsOverview:
    user = await authorization.get_current_user()
    return await MissionService(db).overview(user.id)


@router.post("/missions/{mission_id}/claim", response_model=ClaimResult)
async def claim_mission(
    mission_id: UUID,
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> ClaimResult:
    user = await authorization.get_current_user()
    await limit_claims(user.id)
    return await MissionService(db).claim(user.id, mission_id)


@router.get("/rewards/inventory", response_model=RewardInventory)
async def reward_inventory(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> RewardInventory:
    user = await authorization.get_current_user()
    return await MissionService(db).inventory(user.id)
