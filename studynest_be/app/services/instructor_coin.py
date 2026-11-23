"""Thu nhập giảng viên được ghi bằng Coin thật; phần dư dưới 1 Coin ở lại `wallets.balance` và cộng dồn."""

from __future__ import annotations

import uuid
from decimal import Decimal

from app.db.models.database import Wallets
from app.services.coin_math import split_earning
from app.services.coin_service import EARNING_SOURCE, CoinService
from app.services.coupon_settlement import billing_policy



async def credit_instructor_earning_async(
    db, wallet: Wallets, amount_vnd: Decimal, *, earning_id: uuid.UUID,
) -> int:
    """Cộng một khoản thu nhập (VND) cho giảng viên dưới dạng Coin thật. Trả số Coin đã cộng.

    Gọi lại cho cùng `earning_id` không cộng thêm khi đã có Coin ghi sổ; khoản nhỏ hơn 1 Coin chỉ cộng vào
    phần dư nên người gọi phải giữ cờ trạng thái của khoản thu nhập như trước.
    """
    amount = Decimal(amount_vnd)
    coins = CoinService(db)
    if await coins._already_recorded(wallet.user_id, EARNING_SOURCE, earning_id, "paid"):
        return 0
    policy = await billing_policy(db)
    coin, remainder = split_earning(wallet.balance or 0, amount, policy.coin_vnd_rate)
    converted = Decimal(coin) * Decimal(policy.coin_vnd_rate)
    wallet.total_in = (wallet.total_in or 0) + amount
    wallet.total_out = (wallet.total_out or 0) + converted
    wallet.balance = remainder
    if coin > 0:
        await coins.credit_paid_async(wallet.user_id, coin, source=EARNING_SOURCE, ref_id=earning_id)
    return coin
