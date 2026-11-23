from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.shop import ShopItems, UserEquipment, UserItems
from app.schemas.gamification.shop import Equipment, ItemAsset, ShopItem


def purchase_block(item: ShopItems, level: int, balance: int, *, owned: bool = False) -> tuple[int, str] | None:
    if owned:
        return 409, "Bạn đã sở hữu vật phẩm này."
    if item.source == "level_reward":
        return 403, f"Vật phẩm này là phần thưởng khi đạt cấp {item.unlock_level}."
    if not item.is_active:
        return 404, "Vật phẩm hiện không được bán."
    if item.unlock_level is not None and level < item.unlock_level:
        return 403, f"Bạn cần đạt cấp {item.unlock_level} để mua vật phẩm này."
    if item.price is not None and balance < item.price:
        return 409, "Bạn không có đủ Coin để mua vật phẩm này."
    return None


def serialize_item(
    item: ShopItems, *, owned: bool, equipped: bool, level: int = 1, balance: int = 0,
) -> ShopItem:
    blocked = purchase_block(item, level, balance, owned=owned)
    return ShopItem(
        id=item.id, key=item.key, kind=item.kind, name=item.name, description=item.description,
        rarity=item.rarity, price=item.price, unlock_level=item.unlock_level, source=item.source,
        owned=owned, equipped=equipped, purchasable=blocked is None,
        reason=blocked[1] if blocked else None,
        asset=ItemAsset(key=item.asset_key, palette=item.asset_palette),
    )


def item_status(user_id: UUID):
    return (
        select(ShopItems, UserItems.item_id.is_not(None), UserEquipment.item_id.is_not(None))
        .outerjoin(UserItems, and_(UserItems.item_id == ShopItems.id, UserItems.user_id == user_id))
        .outerjoin(UserEquipment, and_(
            UserEquipment.item_id == ShopItems.id, UserEquipment.user_id == user_id,
        ))
    )


async def get_equipment(db: AsyncSession, user_id: UUID) -> Equipment:
    items = await db.scalars(
        select(ShopItems).join(UserEquipment, UserEquipment.item_id == ShopItems.id)
        .where(UserEquipment.user_id == user_id)
    )
    return Equipment(**{item.kind: serialize_item(item, owned=True, equipped=True) for item in items})
