from decimal import Decimal

import pytest

from app.db.models.database import LevelsConfig
from app.services.gamification.level_rewards import level_reward, xp_required
from app.services.gamification.profile_service import next_level_xp


@pytest.mark.parametrize(("level", "coins", "milestone", "kinds"), [
    (1, 0, "none", ()),
    (2, 25, "none", ()),
    (5, 200, "five", ("title",)),
    (10, 725, "ten", ("avatar_frame", "title", "emblem")),
    (15, 650, "five", ("title",)),
    (20, 1475, "ten", ("avatar_frame", "title", "emblem")),
    (21, 500, "none", ()),
    (22, 500, "none", ()),
    (55, 1600, "five", ("title",)),
    (1000, 50500, "ten", ("avatar_frame", "title", "emblem")),
])
def test_level_reward_schedule(level, coins, milestone, kinds):
    reward = level_reward(level)
    assert reward.coins == coins
    assert reward.milestone == milestone
    assert tuple(item.kind for item in reward.items) == kinds
    assert all(item.unlock_level == level and item.price is None for item in reward.items)
    assert reward.coupon is None


def test_coin_reward_is_positive_for_every_tested_level_above_one():
    assert all(level_reward(level).coins > 0 for level in range(2, 2001))


def test_configured_coins_are_preserved_but_milestone_items_still_apply():
    config = LevelsConfig(level=20, xp_required=1700, rewards_config={"reward_peak": 475})
    assert level_reward(20, config).coins == 475
    assert len(level_reward(20, config).items) == 3
    config.rewards_config = {"reward_peak": 0}
    assert level_reward(20, config).coins == 0
    assert level_reward(30, config).coins == 2000


def test_xp_has_no_terminal_level_and_ignores_config_after_20():
    config = LevelsConfig(level=20, xp_required=1725)
    assert xp_required(20, config) == 1725
    assert next_level_xp(20, config) == 1750
    assert next_level_xp(21, None) == 1800
    assert xp_required(1000) == 50700


def test_level_coupon_offer_is_opt_in_and_rounded_down_to_half_the_fee():
    assert level_reward(10).coupon is None
    assert level_reward(5, platform_fee=Decimal("0.239")).coupon is None
    coupon = level_reward(10, platform_fee=Decimal("0.239")).coupon
    assert (coupon.max_percent, coupon.valid_days) == (11, 30)


def test_default_settings_disable_level_coupons(monkeypatch):
    from app.core.settings import Settings

    monkeypatch.delenv("LEVEL_COUPON_REWARDS_ENABLED", raising=False)
    assert Settings(_env_file=None).LEVEL_COUPON_REWARDS_ENABLED is False


async def test_shop_endpoints_are_registered_and_require_authentication():
    from uuid import uuid4

    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for method, path, body in (
            ("GET", "levels", None),
            ("GET", "shop/items", None),
            ("POST", f"shop/items/{uuid4()}/purchase", {"idempotency_key": "test"}),
            ("GET", "inventory", None),
            ("PUT", "equipment", {"slot": "title", "item_id": None}),
        ):
            response = await client.request(method, f"/api/v1/gamification/{path}", json=body)
            assert response.status_code == 401


def test_legacy_claim_without_rewards_is_still_readable():
    from app.schemas.gamification.missions import LevelUp

    old = {"from": 1, "to": 2, "peak_bonus": 25}
    assert LevelUp.model_validate(old).model_dump(by_alias=True) == {**old, "rewards": []}


@pytest.mark.parametrize(("owned", "level", "balance", "reason"), [
    (False, 10, 2400, None),
    (False, 10, 2399, "Bạn không có đủ Coin."),
    (False, 9, 3000, "Bạn cần đạt cấp 10 để mua vật phẩm này."),
    (True, 10, 2400, "Bạn đã sở hữu vật phẩm này."),
])
def test_shop_listing_reports_purchase_eligibility(owned, level, balance, reason):
    from uuid import uuid4

    from app.db.models.shop import ShopItemRow
    from app.services.gamification.shop_items import serialize_item

    row = ShopItemRow(id=uuid4(), key="moon-ring", name="Vòng Ánh Trăng", description="Viền bạc.",
                      kind="avatar_frame", rarity="epic", price=2400, unlock_level=10,
                      source="shop", asset_key="moon-ring", is_active=True)
    item = serialize_item(row, owned=owned, level=level, balance=balance)
    assert item.purchasable == (reason is None)
    assert item.reason == reason


def test_catalog_migration_seeds_all_milestone_items_with_runtime_ids(monkeypatch):
    from pathlib import Path
    from unittest.mock import Mock

    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from sqlalchemy.dialects.postgresql import dialect

    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[3] / "alembic"))
    scripts = ScriptDirectory.from_config(config)
    revision = scripts.get_revision("aj34za678w901")
    assert revision.down_revision == "ai23yz567v890"
    op = Mock()
    op.get_context.return_value.as_sql = False
    monkeypatch.setattr(revision.module, "op", op)
    revision.module.seed_catalog()

    statement = op.execute.call_args.args[0].compile(dialect=dialect())
    assert "ON CONFLICT DO NOTHING" in str(statement)
    params = statement.params
    items = {params[f"key_m{idx}"]: params[f"id_m{idx}"] for idx in range(28)}
    assert "key_m28" not in params
    assert len(items) == 28
    for level in range(5, 51, 5):
        for item in level_reward(level).items:
            assert items[item.key] == item.catalog_values()["id"]
