from types import SimpleNamespace

import pytest

from app.services.gamification.level_rewards import level_reward, xp_required
from app.services.gamification.profile_service import next_level_xp


@pytest.mark.parametrize(
    ("level", "coins", "milestone", "item_count"),
    [(1, 0, "none", 0), (2, 25, "none", 0), (5, 200, "five", 1),
     (10, 725, "ten", 3), (20, 1475, "ten", 3), (21, 500, "none", 0),
     (55, 1600, "five", 1), (60, 3500, "ten", 3), (1_000_001, 500, "none", 0)],
)
def test_level_reward(level, coins, milestone, item_count):
    reward = level_reward(level)
    assert (reward.coins, reward.milestone, len(reward.items)) == (coins, milestone, item_count)
    assert reward.coupon is None
    assert all(item.unlock_level == level and item.price is None for item in reward.items)


def test_configured_coin_total_preserves_zero_and_seeded_milestones():
    config = SimpleNamespace(rewards_config={"reward_peak": 0, "peak": 999})
    assert level_reward(10, config).coins == 0
    config.rewards_config = {"peak": 225}
    assert level_reward(10, config).coins == 225
    assert level_reward(10, config).milestone == "ten"
    assert len(level_reward(10, config).items) == 3
    assert level_reward(30, config).coins == 2000


def test_level_xp_has_no_discontinuity_or_cap():
    assert xp_required(1) == 0
    assert [next_level_xp(level, None) for level in (19, 20, 21, 99)] == [1700, 1750, 1800, 5700]
    config = SimpleNamespace(xp_required=9001)
    assert next_level_xp(19, config) == 9001
    assert next_level_xp(20, config) == 1750


def test_coupon_offer_is_gated_and_rounded_down_to_the_fee_cap():
    from decimal import Decimal

    reward = level_reward(60, platform_fee=Decimal("0.259"))
    assert (reward.coupon.max_percent, reward.coupon.valid_days) == (12, 30)
    assert level_reward(55, platform_fee=Decimal("0.3")).coupon is None
    assert level_reward(60, platform_fee=Decimal("0.01")).coupon is None
