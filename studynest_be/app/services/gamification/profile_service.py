import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import LevelsConfig, UserGamificationProfiles, UserPeakBalances


class GamificationProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_create_profile(self, user_id: uuid.UUID) -> UserGamificationProfiles:
        profile = await self.db.get(UserGamificationProfiles, user_id)
        if profile is None:
            profile = UserGamificationProfiles(
                user_id=user_id,
                level=1,
                current_xp=0,
                total_xp=0,
                total_peak_score=0,
                current_streak=0,
                best_streak=0,
                streak_freezes=0,
                version=1,
                last_active_date=None,
            )
            self.db.add(profile)
            await self.db.flush()
        return profile

    async def _get_or_create_peak_balance(self, user_id: uuid.UUID) -> UserPeakBalances:
        balance = await self.db.get(UserPeakBalances, user_id)
        if balance is None:
            balance = UserPeakBalances(user_id=user_id)
            self.db.add(balance)
            await self.db.flush()
        return balance

    async def _get_required_xp(self, current_level: int) -> int:
        stmt = select(LevelsConfig).where(LevelsConfig.level == current_level + 1)
        result = await self.db.execute(stmt)
        next_level = result.scalar_one_or_none()
        if next_level:
            return next_level.xp_required
        return 0

    async def get_profile(self, user_id: uuid.UUID) -> dict:
        profile = await self._get_or_create_profile(user_id)
        balance = await self._get_or_create_peak_balance(user_id)
        required_xp = await self._get_required_xp(profile.level)

        return {
            "level": profile.level,
            "current_xp": profile.current_xp,
            "total_xp": profile.total_xp,
            "required_xp": required_xp,
            "current_peak_balance": balance.current_balance,
            "streak": {
                "current_streak": profile.current_streak,
                "best_streak": profile.best_streak,
                "streak_freezes": profile.streak_freezes,
                "last_active_date": profile.last_active_date.isoformat() if profile.last_active_date else None,
            },
        }

