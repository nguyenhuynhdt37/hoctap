from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.gamification.rate_limit import limit_action
from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.gamification.missions import (
    ClaimResult,
    MissionsOverview,
    RewardInventory,
)
from app.services.gamification.mission_service import MissionService

router = APIRouter(prefix="/gamification", tags=["Gamification – Missions"])
Authorization = Annotated[AuthorizationService, Depends()]
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/missions", response_model=MissionsOverview)
async def get_missions(
    authorization: Authorization,
    db: Session,
) -> MissionsOverview:
    user = await authorization.get_current_user()
    return await MissionService(db).overview(user.id)


@router.post("/missions/{mission_id}/claim", response_model=ClaimResult)
async def claim_mission(
    mission_id: UUID,
    authorization: Authorization,
    db: Session,
) -> ClaimResult:
    user = await authorization.get_current_user()
    await limit_action(user.id, "mission-claim", "Bạn nhận thưởng quá nhanh. Vui lòng thử lại sau.")
    return await MissionService(db).claim(user.id, mission_id)


@router.get("/rewards/inventory", response_model=RewardInventory)
async def reward_inventory(
    authorization: Authorization,
    db: Session,
) -> RewardInventory:
    user = await authorization.get_current_user()
    return await MissionService(db).inventory(user.id)
