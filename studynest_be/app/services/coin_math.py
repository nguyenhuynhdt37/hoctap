"""Quy đổi Coin <-> VND và chia Coin thưởng / Coin thật. Thuần Decimal, không chạm DB."""

from __future__ import annotations

from decimal import ROUND_CEILING, ROUND_FLOOR, Decimal


def price_to_coin(vnd: Decimal, rate: int) -> int:
    """Giá khóa học (VND) -> Coin, làm tròn lên."""
    return int((Decimal(vnd) / Decimal(rate)).to_integral_value(rounding=ROUND_CEILING))


def topup_to_coin(vnd: Decimal, rate: int) -> tuple[int, Decimal]:
    """Tiền nạp (VND) -> (Coin làm tròn xuống, phần dư VND)."""
    amount = Decimal(vnd)
    coin = int((amount / Decimal(rate)).to_integral_value(rounding=ROUND_FLOOR))
    return coin, amount - Decimal(coin) * Decimal(rate)


def split_payment(price_coin: int, bonus_balance: int, max_share: Decimal) -> tuple[int, int]:
    """Chia đơn thành (Coin thưởng, Coin thật): thưởng trước, chặn bởi trần và số dư."""
    cap = int((Decimal(price_coin) * Decimal(max_share)).to_integral_value(rounding=ROUND_FLOOR))
    bonus_use = max(0, min(bonus_balance, cap, price_coin))
    return bonus_use, price_coin - bonus_use


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
