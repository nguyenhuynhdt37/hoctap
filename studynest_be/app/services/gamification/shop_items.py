from app.db.models.shop import ShopItemRow
from app.schemas.gamification.shop import ItemAsset, ShopItem

INSUFFICIENT_COINS = "Bạn không có đủ Coin."


def purchase_block(item: ShopItemRow, owned: bool, level: int, balance: int) -> str | None:
    if owned:
        return "Bạn đã sở hữu vật phẩm này."
    if item.source == "level_reward" or item.price is None:
        return "Đây là vật phẩm đặc quyền theo cấp và không bán bằng Coin."
    if not item.is_active:
        return "Vật phẩm này hiện không được bán."
    if item.unlock_level and level < item.unlock_level:
        return f"Bạn cần đạt cấp {item.unlock_level} để mua vật phẩm này."
    if balance < item.price:
        return INSUFFICIENT_COINS
    return None


def serialize_item(
    item: ShopItemRow, *, owned: bool, equipped: bool = False, level: int = 1, balance: int = 0,
) -> ShopItem:
    reason = purchase_block(item, owned, level, balance)
    return ShopItem(
        id=item.id, key=item.key, kind=item.kind, name=item.name, description=item.description,
        rarity=item.rarity, price=item.price, unlock_level=item.unlock_level,
        owned=owned, equipped=equipped, purchasable=reason is None, reason=reason, source=item.source,
        asset=ItemAsset(key=item.asset_key, palette=item.asset_palette),
    )
