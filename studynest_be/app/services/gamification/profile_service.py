import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import LevelsConfig, UserGamificationProfiles, UserPeakBalances, XpTransactions
from app.repositories.gamification.balances import get_or_create_account_row
from app.repositories.gamification.daily_checkin_repository import DailyCheckinRepository
from app.schemas.gamification.missions import LevelUp, XpState
from app.services.gamification.level_rewards import xp_required


def next_level_xp(level: int, config: LevelsConfig | None) -> int:
    return xp_required(level + 1, config)


class GamificationProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.wallet = DailyCheckinRepository(db)

    async def _get_required_xp(self, current_level: int) -> int:
        config = await self.db.get(LevelsConfig, current_level + 1)
        return next_level_xp(current_level, config)

    async def get_profile(self, user_id: uuid.UUID) -> dict:
        profile = await self.db.get(UserGamificationProfiles, user_id)
        xp = await self.xp_state(user_id, profile=profile)
        return {
            "level": xp.level,
            "current_xp": xp.current_xp,
            "total_xp": xp.total_xp,
            "required_xp": xp.required_xp,
            "current_peak_balance": xp.peak_balance,
            "streak": {
                "current_streak": profile.current_streak if profile else 0,
                "best_streak": profile.best_streak if profile else 0,
                "streak_freezes": profile.streak_freezes if profile else 0,
                "last_active_date": (
                    profile.last_active_date.isoformat() if profile and profile.last_active_date else None
                ),
            },
        }

    async def xp_state(
        self, user_id: uuid.UUID, *, profile: UserGamificationProfiles | None = None
    ) -> XpState:
        if profile is None:
            profile = await self.db.get(UserGamificationProfiles, user_id)
        level = profile.level if profile else 1
        return XpState(
            level=level,
            current_xp=profile.current_xp if profile else 0,
            required_xp=await self._get_required_xp(level),
            total_xp=profile.total_xp if profile else 0,
            peak_balance=await self.peak_balance(user_id),
        )

    async def peak_balance(self, user_id: uuid.UUID) -> int:
        balance = await self.db.scalar(select(UserPeakBalances.current_balance).where(
            UserPeakBalances.user_id == user_id,
        ))
        return balance or 0

    async def award_xp(
        self, user_id: uuid.UUID, mission_id: uuid.UUID, amount: int,
    ) -> tuple[UserGamificationProfiles, LevelUp | None]:
        profile = await get_or_create_account_row(self.db, UserGamificationProfiles, user_id, lock=True)
        previous_level = profile.level
        previous_total = profile.total_xp
        profile.current_xp += amount
        profile.total_xp += amount
        profile.version += 1
        profile.updated_at = datetime.now(UTC)

        configs = {
            config.level: config
            for config in await self.db.scalars(select(LevelsConfig).where(LevelsConfig.level > previous_level))
        }
        peak_bonus = 0
        while True:
            config = configs.get(profile.level + 1)
            required = next_level_xp(profile.level, config)
            if profile.current_xp < required:
                break
            profile.current_xp -= required
            profile.level += 1
            rewards = (config.rewards_config or {}) if config is not None else {}
            peak_bonus += int(rewards.get("reward_peak") or rewards.get("peak") or rewards.get("peak_wallet") or 0)

        self.db.add(XpTransactions(
            user_id=user_id, amount=amount, before_xp=previous_total, after_xp=profile.total_xp,
            source="mission", event_id=mission_id, event_type="mission.claimed",
            metadata_={"previous_level": previous_level, "current_level": profile.level},
        ))
        level_up = None
        if profile.level > previous_level:
            level_up = LevelUp.model_validate({"from": previous_level, "to": profile.level, "peak_bonus": peak_bonus})
        return profile, level_up

    async def award_peak(
        self, user_id: uuid.UUID, mission_id: uuid.UUID, amount: int, *, source: str = "mission",
    ) -> None:
        balance = await self.wallet.get_or_create_peak_balance(user_id)
        before, after = await self.wallet.credit_peak_wallet(balance, amount)
        await self.wallet.create_peak_transaction(
            user_id, amount, before, after, source, event_id=mission_id,
            event_type="level.up" if source == "level_up" else "mission.claimed",
        )
