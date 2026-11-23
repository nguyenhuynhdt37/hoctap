from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.learning_hub import BadgesView
from app.services.gamification.badges import list_badges

router = APIRouter(prefix="/gamification", tags=["Gamification – Badges"])


@router.get("/badges", response_model=BadgesView)
async def get_badges(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
) -> BadgesView:
    user = await authorization.get_current_user()
    return await list_badges(db, user.id)
