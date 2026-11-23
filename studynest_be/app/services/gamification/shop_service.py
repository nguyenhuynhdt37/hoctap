from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.database import (
    PlatformSettings,
    UserGamificationProfiles,
    UserPeakBalances,
)
from app.db.models.shop import ShopItemRow, UserItem
from app.repositories.gamification.balances import get_or_create_account_row
from app.repositories.gamification.shop import ShopRepository
from app.schemas.gamification.shop import (
    Equipment,
    EquipRequest,
    ItemKind,
    LevelReward,
    LevelsOverview,
    PurchaseResult,
    ShopInventory,
    ShopOverview,
)
from app.services.gamification.level_rewards import level_reward, xp_required
from app.services.gamification.profile_service import GamificationProfileService
from app.services.gamification.shop_items import (
    INSUFFICIENT_COINS,
    purchase_block,
    serialize_item,
)


class ShopService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ShopRepository(db)
        self.profiles = GamificationProfileService(db)

    async def levels(self, user_id: UUID, *, start: int | None = None, count: int = 12) -> LevelsOverview:
        profile = await self.profiles.backfill_levels(user_id)
        current = await self.profiles.xp_state(user_id, profile=profile)
        start = max(1, current.level - 2) if start is None else start
        next_milestone = (current.level // 10 + 1) * 10
        levels = sorted({*range(start, start + count), next_milestone})
        configs = await self.profiles.level_configs(min(start, next_milestone))
        fee = await self._coupon_fee()
        specs = {level: level_reward(level, configs.get(level), platform_fee=fee) for level in levels}
        keys = [item.key for spec in specs.values() for item in spec.items]
        catalog = {}
        if keys:
            catalog = {row.key: (row, owned, equipped) for row, owned, equipped in
                       await self.repo.items(user_id, only="all", keys=keys)}
        rewards = []
        for level, spec in specs.items():
            items = []
            for item in spec.items:
                row, owned, equipped = catalog.get(item.key, (None, False, False))
                if row is None:
                    row = ShopItemRow(**item.catalog_values())
                items.append(serialize_item(row, owned=owned, equipped=equipped))
            rewards.append(LevelReward(
                level=level, xp_required=xp_required(level, configs.get(level)), coins=spec.coins,
                items=items, milestone=spec.milestone, coupon=spec.coupon, reached=level <= current.level,
                granted=1 < level <= (profile.levels_rewarded_through if profile else 1),
            ))
        await self.db.commit()
        return LevelsOverview(current=current, rewards=rewards)

    async def _coupon_fee(self) -> Decimal | None:
        if not settings.LEVEL_COUPON_REWARDS_ENABLED:
            return None
        return await self.db.scalar(select(PlatformSettings.platform_fee).order_by(
            PlatformSettings.updated_at.desc(), PlatformSettings.id,
        ).limit(1))

    async def catalog(self, user_id: UUID, kind: ItemKind | None = None) -> ShopOverview:
        profile = await self.profiles.backfill_levels(user_id)
        balance = await self.profiles.peak_balance(user_id)
        items = [
            serialize_item(row, owned=owned, equipped=equipped, level=profile.level if profile else 1, balance=balance)
            for row, owned, equipped in await self.repo.items(user_id, kind=kind)
        ]
        await self.db.commit()
        return ShopOverview(balance=balance, items=items)

    async def inventory(self, user_id: UUID) -> ShopInventory:
        await self.profiles.backfill_levels(user_id)
        balance = await self.profiles.peak_balance(user_id)
        items = [serialize_item(row, owned=True, equipped=equipped) for row, _, equipped in
                 await self.repo.items(user_id, only="owned")]
        equipment = Equipment(**{item.kind: item for item in items if item.equipped})
        await self.db.commit()
        return ShopInventory(items=items, equipment=equipment, balance=balance)

    async def equipment(self, user_id: UUID) -> Equipment:
        rows = await self.repo.items(user_id, only="equipped")
        return Equipment(**{row.kind: serialize_item(row, owned=True, equipped=True) for row, _, _ in rows})

    async def purchase(self, user_id: UUID, item_id: UUID, key: str) -> PurchaseResult:
        try:
            profile = await get_or_create_account_row(self.db, UserGamificationProfiles, user_id, lock=True)
            wallet = await get_or_create_account_row(self.db, UserPeakBalances, user_id, lock=True)
            prior = await self.repo.purchase_by_key(user_id, key)
            if prior is not None:
                if prior.item_id != item_id:
                    raise HTTPException(409, "Khóa xác nhận đã dùng cho một yêu cầu mua khác.")
                response = PurchaseResult.model_validate(prior.purchase_result)
            else:
                item = await self.db.get(ShopItemRow, item_id, with_for_update={"read": True}, populate_existing=True)
                if item is None:
                    raise HTTPException(404, "Không tìm thấy vật phẩm.")
                owned = await self.db.get(UserItem, (user_id, item_id)) is not None
                before = wallet.current_balance
                if reason := purchase_block(item, owned, profile.level, before):
                    raise HTTPException(402 if reason == INSUFFICIENT_COINS else 409, reason)

                price = item.price
                assert price is not None  # purchase_block rejects all unpriced catalog entries.
                wallet.current_balance = before - price
                wallet.total_spent += price
                wallet.version += 1
                wallet.updated_at = datetime.now(UTC)

                response = PurchaseResult(item=serialize_item(item, owned=True), balance=wallet.current_balance)
                self.db.add(UserItem(
                    user_id=user_id, item_id=item_id, purchase_key=key, purchase_result=response.model_dump(mode="json"),
                ))
                await self.profiles.wallet.create_peak_transaction(
                    user_id, price, before, wallet.current_balance, "shop", event_id=item_id,
                    event_type="shop.item.purchased", transaction_type="debit",
                )
            await self.db.commit()
            return response
        except Exception:
            await self.db.rollback()
            raise

    async def equip(self, user_id: UUID, request: EquipRequest) -> Equipment:
        try:
            await get_or_create_account_row(self.db, UserGamificationProfiles, user_id, lock=True)
            if request.item_id is not None:
                if await self.db.get(UserItem, (user_id, request.item_id)) is None:
                    raise HTTPException(409, "Bạn chưa sở hữu vật phẩm này.")
                item = await self.db.get(ShopItemRow, request.item_id)
                if item.kind != request.slot:
                    raise HTTPException(409, "Vật phẩm không phù hợp với ô trang bị đã chọn.")
            await self.repo.set_equipment(user_id, request.slot, request.item_id)
            result = await self.equipment(user_id)
            await self.db.commit()
            return result
        except Exception:
            await self.db.rollback()
            raise
