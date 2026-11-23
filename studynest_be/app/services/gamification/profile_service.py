import uuid
from collections.abc import Set as AbstractSet
from datetime import UTC, datetime

from sqlalchemy import and_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    LevelsConfig,
    PeakTransactions,
    RewardGrants,
    UserGamificationProfiles,
    UserPeakBalances,
    XpTransactions,
)
from app.repositories.gamification.balances import get_or_create_account_row
from app.repositories.gamification.daily_checkin_repository import (
    DailyCheckinRepository,
)
from app.repositories.gamification.shop import ShopRepository
from app.schemas.gamification.missions import LevelUp
from app.schemas.gamification.profile import XpState
from app.schemas.gamification.shop import LevelRewardGrant
from app.services.gamification.level_rewards import level_reward, xp_required
from app.services.gamification.shop_items import serialize_item


def next_level_xp(level: int, config: LevelsConfig | None) -> int:
    return xp_required(level + 1, config)


class GamificationProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.wallet = DailyCheckinRepository(db)

    async def _get_required_xp(self, current_level: int) -> int:
        config = await self.db.get(LevelsConfig, current_level + 1) if current_level < 20 else None
        return next_level_xp(current_level, config)

    async def level_configs(self, first: int = 2) -> dict[int, LevelsConfig]:
        if first > 20:
            return {}
        return {config.level: config for config in await self.db.scalars(select(LevelsConfig).where(
            LevelsConfig.level.between(first, 20),
        ))}

    async def get_profile(self, user_id: uuid.UUID) -> dict:
        profile = await self.backfill_levels(user_id)
        xp = await self.xp_state(user_id, profile=profile)
        response = {
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
        await self.db.commit()
        return response

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

        configs = await self.level_configs(previous_level + 1)
        while profile.current_xp >= (required := next_level_xp(profile.level, configs.get(profile.level + 1))):
            profile.current_xp -= required
            profile.level += 1

        self.db.add(XpTransactions(
            user_id=user_id, amount=amount, before_xp=previous_total, after_xp=profile.total_xp,
            source="mission", event_id=mission_id, event_type="mission.claimed",
            metadata_={"previous_level": previous_level, "current_level": profile.level},
        ))
        if profile.level == previous_level:
            return profile, None

        rewards = await self._grant_levels(
            user_id, range(previous_level + 1, profile.level + 1), configs, mission_id=mission_id,
        )
        if profile.levels_rewarded_through == previous_level:
            profile.levels_rewarded_through = profile.level
        return profile, LevelUp.model_validate({
            "from": previous_level, "to": profile.level,
            "peak_bonus": sum(reward.coins for reward in rewards), "rewards": rewards,
        })

    async def backfill_levels(self, user_id: uuid.UUID) -> UserGamificationProfiles | None:
        profile = await self.db.get(UserGamificationProfiles, user_id)
        if profile is None or profile.levels_rewarded_through >= profile.level:
            return profile
        # Use the same lock order as XP awards and shop purchases: profile, then Coin wallet.
        profile = await self.db.get(UserGamificationProfiles, user_id, with_for_update=True, populate_existing=True)
        if profile is None or profile.levels_rewarded_through >= profile.level:
            return profile
        first = profile.levels_rewarded_through + 1
        configs = await self.level_configs(first)
        paid = await self._paid_levels(user_id, first, profile.level, configs)
        await self._grant_levels(user_id, range(first, profile.level + 1), configs, paid=paid)
        profile.levels_rewarded_through = profile.level
        return profile

    async def _paid_levels(
        self, user_id: uuid.UUID, first: int, last: int, configs: dict[int, LevelsConfig],
    ) -> set[int]:
        rows = await self.db.execute(
            select(PeakTransactions.metadata_, XpTransactions.metadata_)
            .outerjoin(XpTransactions, and_(
                XpTransactions.user_id == PeakTransactions.user_id,
                XpTransactions.event_id == PeakTransactions.event_id,
                XpTransactions.event_type == "mission.claimed",
            ))
            .where(PeakTransactions.user_id == user_id, PeakTransactions.source == "level_up",
                   PeakTransactions.event_type == "level.up", PeakTransactions.type == "credit")
        )
        paid = set()
        for coin_metadata, xp_metadata in rows:
            posted = (coin_metadata or {}).get("rewarded_levels")
            if isinstance(posted, list):
                paid.update(level for level in posted if isinstance(level, int) and first <= level <= last)
            elif xp_metadata:
                # Historical claims posted a single aggregate of configured Coin rewards.
                previous, current = xp_metadata.get("previous_level"), xp_metadata.get("current_level")
                if isinstance(previous, int) and isinstance(current, int):
                    paid.update(level for level in configs if max(first, previous + 1) <= level <= min(last, current))
        return paid

    async def _grant_levels(
        self, user_id: uuid.UUID, levels: range, configs: dict[int, LevelsConfig], *,
        mission_id: uuid.UUID | None = None, paid: AbstractSet[int] = frozenset(),
    ) -> list[LevelRewardGrant]:
        repo = ShopRepository(self.db)
        rewards = []
        # Bound bind parameters for old profiles with many levels to reconcile.
        for start in range(levels.start, levels.stop, 200):
            specs = {level: level_reward(level, configs.get(level)) for level in range(
                start, min(start + 200, levels.stop),
            )}
            stmt = insert(RewardGrants).values([
                {"user_id": user_id, "level": level, "reward_kind": "level",
                 "amount": 0 if level in paid else spec.coins}
                for level, spec in specs.items()
            ]).on_conflict_do_nothing(
                index_elements=[RewardGrants.user_id, RewardGrants.level, RewardGrants.reward_kind],
                index_where=RewardGrants.level.is_not(None),
            ).returning(RewardGrants.level, RewardGrants.amount)
            inserted = dict((await self.db.execute(stmt)).all())
            catalog = await repo.grant_items(user_id, [
                item.catalog_values() for level in sorted(inserted) for item in specs[level].items
            ])
            rewards.extend(LevelRewardGrant(
                level=level, coins=inserted[level],
                items=[serialize_item(catalog[item.key], owned=True) for item in specs[level].items],
            ) for level in sorted(inserted))

        if amount := sum(reward.coins for reward in rewards):
            await self.award_peak(
                user_id, mission_id, amount, source="level_up",
                metadata={"rewarded_levels": [reward.level for reward in rewards if reward.coins]},
            )
        return rewards

    async def award_peak(
        self, user_id: uuid.UUID, mission_id: uuid.UUID | None, amount: int, *,
        source: str = "mission", metadata: dict | None = None,
    ) -> None:
        balance = await self.wallet.get_or_create_peak_balance(user_id)
        before, after = await self.wallet.credit_peak_wallet(balance, amount)
        await self.wallet.create_peak_transaction(
            user_id, amount, before, after, source, event_id=mission_id, metadata=metadata,
            event_type="level.up" if source == "level_up" else "mission.claimed",
        )
