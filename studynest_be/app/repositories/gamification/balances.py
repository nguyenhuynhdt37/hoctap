from uuid import UUID

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import UserGamificationProfiles, UserPeakBalances


async def get_or_create_account_row(
    db: AsyncSession,
    model: type[UserGamificationProfiles] | type[UserPeakBalances],
    user_id: UUID,
    *,
    lock: bool = False,
):
    row = await db.get(model, user_id, with_for_update=lock, populate_existing=lock)
    if row is not None:
        return row
    await db.execute(insert(model).values(user_id=user_id).on_conflict_do_nothing(
        index_elements=[model.user_id],
    ))
    return await db.get(model, user_id, with_for_update=lock, populate_existing=True)
