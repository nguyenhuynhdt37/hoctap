"""Quy đổi Coin <-> VND và chia Coin thưởng / Coin thật. Thuần Decimal, không chạm DB."""

from __future__ import annotations

from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal

BONUS_COINS_PER_GOLD = 10
WHITE_PER_GOLD_EXCHANGE = 5
BONUS_MAX_COINS_SHARE = Decimal("0.50")
PURCHASE_CASHBACK_RATE = Decimal("0.20")


def price_to_coin(vnd: Decimal, rate: int) -> int:
    """Giá khóa học (VND) -> Coin vàng, làm tròn lên."""
    return int((Decimal(vnd) / Decimal(rate)).to_integral_value(rounding=ROUND_CEILING))


def topup_to_coin(vnd: Decimal, rate: int) -> tuple[int, Decimal]:
    """Tiền nạp (VND) -> (Coin vàng làm tròn xuống, phần dư VND)."""
    amount = Decimal(vnd)
    coin = int((amount / Decimal(rate)).to_integral_value(rounding=ROUND_FLOOR))
    return coin, amount - Decimal(coin) * Decimal(rate)


def split_payment(
    price_coin: int,
    bonus_balance: int,
    max_share: Decimal = BONUS_MAX_COINS_SHARE,
    bonus_per_gold: int = BONUS_COINS_PER_GOLD,
) -> tuple[int, int]:
    """Chia đơn thành (Coin trắng bị trừ, Coin vàng bị trừ).

    Tối đa dùng `floor(price_coin * max_share)` Coin trắng (mặc định 50% con số giá khóa học),
    quy đổi `bonus_per_gold` Coin trắng = 1 Coin vàng (mặc định 10:1), luôn trừ chẵn bội số 10.
    """
    if price_coin <= 0 or bonus_per_gold <= 0:
        return 0, max(0, price_coin)
    max_bonus_coins = int((Decimal(price_coin) * Decimal(max_share)).to_integral_value(rounding=ROUND_FLOOR))
    usable_bonus = max(0, min(bonus_balance, max_bonus_coins))
    bonus_gold_discount = min(usable_bonus // bonus_per_gold, price_coin)
    bonus_use = bonus_gold_discount * bonus_per_gold
    return bonus_use, price_coin - bonus_gold_discount


def purchase_cashback_bonus(price_coin: int, rate: Decimal = PURCHASE_CASHBACK_RATE) -> int:
    """Hoàn Coin trắng sau khi mua khóa học/combo thành công (mặc định 20% giá trị Coin vàng)."""
    if price_coin <= 0:
        return 0
    return int((Decimal(price_coin) * Decimal(rate)).to_integral_value(rounding=ROUND_FLOOR))


def gold_to_white_exchange(gold_amount: int, ratio: int = WHITE_PER_GOLD_EXCHANGE) -> int:
    """Đổi đồng vàng sang đồng trắng tại cửa hàng (1 đồng vàng = 5 đồng trắng)."""
    if gold_amount <= 0 or ratio <= 0:
        return 0
    return int(gold_amount) * int(ratio)


def allocate(total: int, weights: list[Decimal]) -> list[int]:
    """Chia `total` theo tỷ lệ `weights`; phần dư dồn vào dòng cuối có trọng số > 0, tổng luôn bằng `total`."""
    if not weights:
        return []
    weight_sum = sum(weights)
    positive = [index for index, weight in enumerate(weights) if weight > 0]
    if weight_sum <= 0:
        return [0] * (len(weights) - 1) + [total]
    last = positive[-1]
    shares = [
        0 if index == last else int((Decimal(total) * weight / weight_sum).to_integral_value(rounding=ROUND_FLOOR))
        for index, weight in enumerate(weights)
    ]
    shares[last] = total - sum(shares)
    return shares


def split_earning(balance_vnd: Decimal, amount_vnd: Decimal, rate: int) -> tuple[int, Decimal]:
    """Gộp phần dư VND đang giữ với khoản thu nhập mới, đổi `floor` ra Coin; trả (Coin, phần dư mới)."""
    return topup_to_coin(Decimal(balance_vnd) + Decimal(amount_vnd), rate)
