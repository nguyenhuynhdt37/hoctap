from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.gamification.profile import XpState

ItemKind = Literal["avatar_frame", "title", "emblem"]
Rarity = Literal["common", "rare", "epic", "legendary"]
Milestone = Literal["none", "five", "ten"]


class ItemAsset(BaseModel):
    key: str
    palette: list[str] | None


class ShopItem(BaseModel):
    id: UUID
    key: str
    kind: ItemKind
    name: str
    description: str
    rarity: Rarity
    price: int | None = Field(description="Giá bằng Coin. Vật phẩm đặc quyền theo cấp có giá null.")
    unlock_level: int | None
    owned: bool
    equipped: bool
    purchasable: bool
    reason: str | None
    source: Literal["shop", "level_reward"]
    asset: ItemAsset


class Equipment(BaseModel):
    avatar_frame: ShopItem | None = None
    title: ShopItem | None = None
    emblem: ShopItem | None = None


class ShopOverview(BaseModel):
    balance: int = Field(description="Số dư Coin hiện tại")
    items: list[ShopItem]


class ShopInventory(ShopOverview):
    equipment: Equipment


class PurchaseRequest(BaseModel):
    idempotency_key: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]


class PurchaseResult(BaseModel):
    item: ShopItem
    balance: int = Field(description="Số dư Coin sau lần mua thành công")


class EquipRequest(BaseModel):
    slot: ItemKind
    item_id: UUID | None


class LevelCoupon(BaseModel):
    max_percent: int
    valid_days: int


class LevelRewardGrant(BaseModel):
    level: int
    coins: int
    items: list[ShopItem]


class LevelReward(LevelRewardGrant):
    xp_required: int
    milestone: Milestone
    coupon: LevelCoupon | None
    reached: bool
    granted: bool


class LevelsOverview(BaseModel):
    current: XpState
    max_level: None = None
    rewards: list[LevelReward]
