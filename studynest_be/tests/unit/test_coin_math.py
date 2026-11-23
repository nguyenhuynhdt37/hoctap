from decimal import Decimal

from app.services.coin_math import (
    allocate,
    gold_to_white_exchange,
    price_to_coin,
    purchase_cashback_bonus,
    split_payment,
    topup_to_coin,
)


def test_price_to_coin_rounds_up():
    assert price_to_coin(Decimal(500000), 10000) == 50
    assert price_to_coin(Decimal(500001), 10000) == 51
    assert price_to_coin(Decimal(1), 10000) == 1


def test_topup_keeps_remainder():
    assert topup_to_coin(Decimal(1_005_000), 10000) == (100, Decimal(5000))
    assert topup_to_coin(Decimal(9_999), 10000) == (0, Decimal(9999))


def test_split_respects_50_percent_cap_and_10_to_1_ratio():
    # 100 Coin vàng -> tối đa 50 Coin trắng (= 5 Coin vàng) + 95 Coin vàng
    assert split_payment(100, 500) == (50, 95)
    assert split_payment(100, 50) == (50, 95)
    # Có 37 Coin trắng -> chỉ trừ chẵn 30 Coin trắng (= 3 Coin vàng) + 97 Coin vàng
    assert split_payment(100, 37) == (30, 97)
    # Dưới 10 Coin trắng -> không trừ lẻ
    assert split_payment(100, 9) == (0, 100)
    assert split_payment(100, 0) == (0, 100)
    # Khóa 50 Coin vàng -> tối đa 25 Coin trắng -> chẵn 20 Coin trắng (= 2 Coin vàng) + 48 Coin vàng
    assert split_payment(50, 100) == (20, 48)


def test_purchase_cashback_bonus_returns_20_percent():
    assert purchase_cashback_bonus(100) == 20
    assert purchase_cashback_bonus(50) == 10
    assert purchase_cashback_bonus(0) == 0


def test_gold_to_white_exchange_is_5_to_1():
    assert gold_to_white_exchange(1) == 5
    assert gold_to_white_exchange(10) == 50
    assert gold_to_white_exchange(0) == 0
    assert gold_to_white_exchange(-5) == 0


def test_allocate_sums_to_total_with_remainder_last():
    parts = allocate(10, [Decimal(1)] * 3)
    assert sum(parts) == 10
    assert parts == [3, 3, 4]
    assert allocate(0, [Decimal(5), Decimal(5)]) == [0, 0]


def test_allocate_remainder_goes_to_last_positive_weight():
    assert allocate(7, [Decimal(1), Decimal(1), Decimal(0)]) == [3, 4, 0]
    assert allocate(5, [Decimal(0), Decimal(2)]) == [0, 5]


def test_split_earning_carries_the_remainder_between_earnings():
    from app.services.coin_math import split_earning

    assert split_earning(Decimal(9300), Decimal(150700), 10000) == (16, Decimal(0))
    assert split_earning(Decimal(0), Decimal(139300), 10000) == (13, Decimal(9300))
    assert split_earning(Decimal(0), Decimal(9999), 10000) == (0, Decimal(9999))
