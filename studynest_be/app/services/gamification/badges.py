from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import Badges, UserBadges
from app.schemas.learning_hub import BadgeView, BadgesView


async def list_badges(db: AsyncSession, user_id: UUID) -> BadgesView:
    rows = await db.execute(
        select(Badges.id, Badges.name, Badges.description, Badges.image_url, UserBadges.unlocked_at)
        .outerjoin(UserBadges, and_(UserBadges.badge_id == Badges.id, UserBadges.user_id == user_id))
        .where(Badges.deleted_at.is_(None), or_(Badges.is_active.is_(True), UserBadges.id.is_not(None)))
        .order_by(UserBadges.unlocked_at.desc().nulls_last(), Badges.name, Badges.id)
    )
    return BadgesView(badges=[BadgeView(
        id=badge_id, name=name, description=description, image_url=image_url,
        earned=unlocked is not None, earned_at=unlocked,
    ) for badge_id, name, description, image_url, unlocked in rows])
