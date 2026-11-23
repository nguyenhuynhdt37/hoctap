from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid5

from app.db.models.database import LevelsConfig
from app.schemas.gamification.shop import ItemKind, LevelCoupon, Milestone, Rarity

_ITEM_NAMESPACE = UUID("b73300e1-cf6c-4a21-8789-cf2e03ff0591")
_SEEDED_XP = (0, 100, 200, 300, 500, 750, 1000)
_TEN_THEMES = ("Bình Minh", "Trăng Non", "Cực Quang", "Nguyệt Quế", "Chân Trời")
_FIVE_TITLES = ("Bạn Của Mây", "Người Đón Gió", "Bạn Của Trăng", "Người Dẫn Mây", "Người Giữ Trời")


@dataclass(frozen=True)
class MilestoneItem:
    unlock_level: int
    kind: ItemKind
    name: str
    description: str
    rarity: Rarity
    asset_key: str
    price: None = None

    @property
    def key(self) -> str:
        return f"level-{self.unlock_level}-{self.kind}"

    def catalog_values(self) -> dict:
        return {
            "id": uuid5(_ITEM_NAMESPACE, self.key), "key": self.key, "kind": self.kind,
            "name": self.name, "description": self.description, "rarity": self.rarity,
            "price": self.price, "unlock_level": self.unlock_level, "source": "level_reward",
            "asset_key": self.asset_key,
        }


@dataclass(frozen=True)
class LevelRewardSpec:
    coins: int
    milestone: Milestone = "none"
    items: tuple[MilestoneItem, ...] = ()
    coupon: LevelCoupon | None = None


def xp_required(level: int, config: LevelsConfig | None = None) -> int:
    if level <= 1:
        return 0
    if level > 20:
        return 1700 + (level - 20) * 50
    if config is not None and config.xp_required > 0:
        return config.xp_required
    if level <= len(_SEEDED_XP):
        return _SEEDED_XP[level - 1]
    return 1100 + (level - 8) * 50


def level_reward(
    level: int, config: LevelsConfig | None = None, *, platform_fee: Decimal | None = None,
) -> LevelRewardSpec:
    if level <= 1:
        return LevelRewardSpec(0)

    coins = min(25 * (level - 1), 500)
    milestone: Milestone = "none"
    items: tuple[MilestoneItem, ...] = ()
    coupon = None
    description = f"Đặc quyền dành cho người học đạt cấp {level} tại Mây Mây."
    if level % 10 == 0:
        milestone = "ten"
        coins += level * 50
        theme = _TEN_THEMES[level // 10 - 1] if level <= 50 else f"Tầng Mây {level}"
        rarity: Rarity = "epic" if level < 50 else "legendary"
        items = (
            MilestoneItem(level, "avatar_frame", f"Khung {theme}", description, rarity, "milestone-frame"),
            MilestoneItem(level, "title", f"Danh hiệu {theme}", description, rarity, "milestone-title"),
            MilestoneItem(level, "emblem", f"Biểu tượng {theme}", description, rarity, "milestone-emblem"),
        )
        if platform_fee is not None and 0 < platform_fee <= 1 and (max_percent := int(platform_fee * 50)):
            coupon = LevelCoupon(max_percent=max_percent, valid_days=30)
    elif level % 5 == 0:
        milestone = "five"
        coins += level * 20
        name = _FIVE_TITLES[level // 10] if level <= 45 else f"Bạn Của Tầng Mây {level}"
        items = (MilestoneItem(level, "title", name, description,
                               "common" if level == 5 else "rare", "milestone-title"),)

    # Configured values are the total, including explicit zero.
    if level <= 20 and config is not None:
        values = config.rewards_config or {}
        for key in ("reward_peak", "peak", "peak_wallet"):
            if values.get(key) is not None:
                coins = int(values[key])
                break
    return LevelRewardSpec(coins, milestone, items, coupon)
