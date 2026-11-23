from collections.abc import Iterable
from typing import Literal
from uuid import UUID

from sqlalchemy import and_, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.shop import ShopItemRow, UserEquipment, UserItem
from app.schemas.gamification.shop import ItemKind


class ShopRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def items(
        self, user_id: UUID, *, kind: ItemKind | None = None, only: Literal["catalog", "owned", "equipped", "all"] = "catalog",
        keys: Iterable[str] | None = None,
    ) -> list[tuple[ShopItemRow, bool, bool]]:
        stmt = (
            select(ShopItemRow, UserItem.item_id.is_not(None), UserEquipment.item_id.is_not(None))
            .outerjoin(UserItem, and_(UserItem.user_id == user_id, UserItem.item_id == ShopItemRow.id))
            .outerjoin(UserEquipment, and_(UserEquipment.user_id == user_id, UserEquipment.item_id == ShopItemRow.id))
            .order_by(ShopItemRow.source.desc(), ShopItemRow.unlock_level.nulls_first(),
                      ShopItemRow.kind, ShopItemRow.key)
        )
        if only == "catalog":
            stmt = stmt.where(ShopItemRow.is_active.is_(True))
        elif only == "owned":
            stmt = stmt.where(UserItem.item_id.is_not(None))
        elif only == "equipped":
            stmt = stmt.where(UserEquipment.item_id.is_not(None))
        if kind is not None:
            stmt = stmt.where(ShopItemRow.kind == kind)
        if keys is not None:
            stmt = stmt.where(ShopItemRow.key.in_(keys))
        return [(item, owned, equipped) for item, owned, equipped in await self.db.execute(stmt)]

    async def grant_items(self, user_id: UUID, items: list[dict]) -> dict[str, ShopItemRow]:
        if not items:
            return {}
        # Future milestones are added lazily. Each batch inserts shared keys in
        # the same order to prevent cross-user lock inversions.
        await self.db.execute(insert(ShopItemRow).values(sorted(items, key=lambda item: (
            item["unlock_level"], item["kind"],
        ))).on_conflict_do_nothing())
        catalog = {item.key: item for item in await self.db.scalars(select(ShopItemRow).where(
            ShopItemRow.key.in_([item["key"] for item in items]),
        ))}
        await self.db.execute(insert(UserItem).values([
            {"user_id": user_id, "item_id": catalog[item["key"]].id} for item in items
        ]).on_conflict_do_nothing(index_elements=[UserItem.user_id, UserItem.item_id]))
        return catalog

    async def purchase_by_key(self, user_id: UUID, key: str) -> UserItem | None:
        return await self.db.scalar(select(UserItem).where(
            UserItem.user_id == user_id, UserItem.purchase_key == key,
        ))

    async def set_equipment(self, user_id: UUID, slot: ItemKind, item_id: UUID | None) -> None:
        if item_id is None:
            await self.db.execute(delete(UserEquipment).where(
                UserEquipment.user_id == user_id, UserEquipment.slot == slot,
            ))
        else:
            await self.db.execute(insert(UserEquipment).values(
                user_id=user_id, slot=slot, item_id=item_id,
            ).on_conflict_do_update(
                index_elements=[UserEquipment.user_id, UserEquipment.slot],
                set_={"item_id": item_id},
            ))
