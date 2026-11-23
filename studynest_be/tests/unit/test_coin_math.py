from decimal import Decimal

from app.services.coin_math import allocate, price_to_coin, split_payment, topup_to_coin


def test_price_to_coin_rounds_up():
    assert price_to_coin(Decimal(500000), 10000) == 50
    assert price_to_coin(Decimal(500001), 10000) == 51
    assert price_to_coin(Decimal(1), 10000) == 1


def test_topup_keeps_remainder():
    assert topup_to_coin(Decimal(1_005_000), 10000) == (100, Decimal(5000))
    assert topup_to_coin(Decimal(9_999), 10000) == (0, Decimal(9999))


def test_split_respects_cap_and_balance():
    assert split_payment(100, 500, Decimal("0.30")) == (30, 70)
    assert split_payment(100, 10, Decimal("0.30")) == (10, 90)
    assert split_payment(100, 0, Decimal("0.30")) == (0, 100)


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
