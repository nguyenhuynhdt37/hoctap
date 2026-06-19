from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.gamification.profile import GamificationProfileResponse
from app.services.gamification.profile_service import GamificationProfileService

router = APIRouter(prefix="/gamification", tags=["Gamification – Profile"])


@router.get(
    "/profile",
    response_model=GamificationProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy profile gamification thật của người dùng",
)
async def get_gamification_profile(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> GamificationProfileResponse:
    try:
        user = await authorization.get_current_user()
        service = GamificationProfileService(db)
        data = await service.get_profile(user.id)
        return GamificationProfileResponse(**data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[GamificationProfile] Failed to fetch profile: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "GAMIFICATION_PROFILE_FETCH_FAILED"},
        )

