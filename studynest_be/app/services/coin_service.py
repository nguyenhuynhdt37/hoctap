"""Số dư và sổ cái Coin: Coin thật (nạp bằng tiền) và Coin thưởng.

Mọi hàm chạy trong transaction của người gọi (chỉ flush, không commit) và khóa dòng số dư trước khi đọc.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import PeakTransactions, UserPeakBalances
from app.db.sesson import get_session
from app.repositories.gamification.balances import get_or_create_account_row
from app.services.coin_math import (
    BONUS_COINS_PER_GOLD,
    BONUS_MAX_COINS_SHARE,
    WHITE_PER_GOLD_EXCHANGE,
    gold_to_white_exchange,
    split_payment,
)
from app.services.coupon_settlement import billing_policy

TOPUP_SOURCE = "topup"
EARNING_SOURCE = "earning_release"
WITHDRAW_HOLD_SOURCE = "withdraw_hold"
WITHDRAW_REFUND_SOURCE = "withdraw_refund"
PURCHASE_SOURCE = "course_purchase"
PURCHASE_CASHBACK_SOURCE = "purchase_cashback"
EXCHANGE_TO_WHITE_SOURCE = "exchange_to_white"
EXCHANGE_FROM_GOLD_SOURCE = "exchange_from_gold"
REFUND_SOURCE = "refund"


@dataclass(frozen=True)
class CoinBalances:
    bonus: int
    paid: int


@dataclass(frozen=True)
class PaymentSplit:
    bonus_use: int
    paid_use: int
    bonus_gold_discount: int = 0


class CoinService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def get_balances_async(self, user_id: uuid.UUID) -> CoinBalances:
        bonus = await self.db.scalar(select(UserPeakBalances.current_balance).where(UserPeakBalances.user_id == user_id))
        paid = await self.db.scalar(select(UserPaidCoinBalances.balance).where(UserPaidCoinBalances.user_id == user_id))
        return CoinBalances(bonus=bonus or 0, paid=paid or 0)

    async def _lock_rows(self, user_id: uuid.UUID) -> tuple[UserPaidCoinBalances, UserPeakBalances]:
        # Thứ tự khóa cố định (thật rồi thưởng) để hai giao dịch song song không khóa chéo nhau.
        paid = await get_or_create_account_row(self.db, UserPaidCoinBalances, user_id, lock=True)
        bonus = await get_or_create_account_row(self.db, UserPeakBalances, user_id, lock=True)
        return paid, bonus

    async def _already_recorded(
        self, user_id: uuid.UUID, source: str, ref_id: uuid.UUID | None, kind: str | None = None,
    ) -> bool:
        if ref_id is None:
            return False
        stmt = select(func.count()).select_from(PeakTransactions).where(
            PeakTransactions.user_id == user_id, PeakTransactions.source == source,
            PeakTransactions.event_id == ref_id,
        )
        if kind is not None:
            stmt = stmt.where(PeakTransactions.coin_kind == kind)
        return bool(await self.db.scalar(stmt))

    def _record(
        self, user_id: uuid.UUID, kind: str, direction: str, amount: int, before: int, after: int,
        source: str, ref_id: uuid.UUID | None, metadata: dict | None = None,
    ) -> None:
        self.db.add(PeakTransactions(
            user_id=user_id, amount=amount, type=direction, before_balance=before, after_balance=after,
            source=source, event_id=ref_id, coin_kind=kind, metadata_=metadata,
        ))

    async def credit_paid_async(
        self, user_id: uuid.UUID, amount: int, *, source: str, ref_id: uuid.UUID | None,
    ) -> int:
        """Cộng Coin thật; gọi lại với cùng (source, ref_id) không cộng thêm."""
        if amount <= 0:
            raise ValueError("amount must be positive")
        paid, _ = await self._lock_rows(user_id)
        if await self._already_recorded(user_id, source, ref_id, "paid"):
            return paid.balance
        before = paid.balance
        paid.balance = before + amount
        paid.version += 1
        paid.updated_at = func.now()
        self._record(user_id, "paid", "credit", amount, before, paid.balance, source, ref_id)
        await self.db.flush()
        return paid.balance

    async def withdrawable_paid_async(self, user_id: uuid.UUID) -> int:
        """Coin thật được phép rút: chỉ Coin có nguồn từ thu nhập (trừ số đã khóa để rút, cộng số đã hoàn).

        Coin nạp bằng tiền chỉ tiêu được, không rút ra tiền thật.
        """
        earned = await self._sum_kind(
            user_id, "paid", PeakTransactions.source == EARNING_SOURCE, PeakTransactions.type == "credit")
        held = await self._sum_kind(
            user_id, "paid", PeakTransactions.source == WITHDRAW_HOLD_SOURCE, PeakTransactions.type == "debit")
        refunded = await self._sum_kind(
            user_id, "paid", PeakTransactions.source == WITHDRAW_REFUND_SOURCE, PeakTransactions.type == "credit")
        balance = (await self.get_balances_async(user_id)).paid
        return max(0, min(balance, earned - held + refunded))

    async def debit_paid_async(
        self, user_id: uuid.UUID, amount: int, *, source: str, ref_id: uuid.UUID,
    ) -> int:
        """Trừ Coin thật (không dùng Coin thưởng), ví dụ khi rút tiền. Thiếu Coin thì từ chối, không trừ gì.

        Gọi lại với cùng (source, ref_id) không trừ thêm. Trả số dư Coin thật sau khi trừ.
        """
        if amount <= 0:
            raise ValueError("amount must be positive")
        paid, _ = await self._lock_rows(user_id)
        if await self._already_recorded(user_id, source, ref_id, "paid"):
            return paid.balance
        if paid.balance < amount:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ Coin thật. Cần {amount} Coin nhưng bạn chỉ có {paid.balance}.",
            )
        before = paid.balance
        paid.balance = before - amount
        paid.version += 1
        paid.updated_at = func.now()
        self._record(user_id, "paid", "debit", amount, before, paid.balance, source, ref_id)
        await self.db.flush()
        return paid.balance

    async def credit_bonus_async(
        self, user_id: uuid.UUID, amount: int, *, source: str, ref_id: uuid.UUID | None,
    ) -> int:
        """Cộng Coin trắng (ảo/thưởng); gọi lại với cùng (source, ref_id) không cộng thêm."""
        if amount <= 0:
            return (await self.get_balances_async(user_id)).bonus
        _, bonus = await self._lock_rows(user_id)
        if await self._already_recorded(user_id, source, ref_id, "bonus"):
            return bonus.current_balance
        before = bonus.current_balance
        bonus.current_balance = before + amount
        bonus.total_earned += amount
        bonus.version += 1
        bonus.updated_at = func.now()
        self._record(user_id, "bonus", "credit", amount, before, bonus.current_balance, source, ref_id)
        await self.db.flush()
        return bonus.current_balance

    async def exchange_gold_to_white_async(
        self, user_id: uuid.UUID, gold_amount: int,
    ) -> tuple[int, CoinBalances]:
        """Đổi đồng vàng sang đồng trắng (1 đồng vàng = 5 đồng trắng) trong một transaction atomic."""
        if gold_amount <= 0:
            raise HTTPException(status_code=400, detail="Số lượng đổi phải lớn hơn 0.")
        white_gained = gold_to_white_exchange(gold_amount, WHITE_PER_GOLD_EXCHANGE)
        paid, bonus = await self._lock_rows(user_id)
        if paid.balance < gold_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ số dư đồng vàng. Cần {gold_amount} nhưng bạn chỉ có {paid.balance}.",
            )
        ref_id = uuid.uuid4()
        paid_before = paid.balance
        paid.balance = paid_before - gold_amount
        paid.version += 1
        paid.updated_at = func.now()
        self._record(
            user_id, "paid", "debit", gold_amount, paid_before, paid.balance,
            EXCHANGE_TO_WHITE_SOURCE, ref_id, {"white_gained": white_gained, "ratio": WHITE_PER_GOLD_EXCHANGE},
        )
        bonus_before = bonus.current_balance
        bonus.current_balance = bonus_before + white_gained
        bonus.total_earned += white_gained
        bonus.version += 1
        bonus.updated_at = func.now()
        self._record(
            user_id, "bonus", "credit", white_gained, bonus_before, bonus.current_balance,
            EXCHANGE_FROM_GOLD_SOURCE, ref_id, {"gold_spent": gold_amount, "ratio": WHITE_PER_GOLD_EXCHANGE},
        )
        await self.db.flush()
        return white_gained, CoinBalances(bonus=bonus.current_balance, paid=paid.balance)

    async def debit_for_purchase_async(
        self, user_id: uuid.UUID, price_coin: int, *, ref_id: uuid.UUID,
    ) -> PaymentSplit:
        """Chiết khấu tối đa 50% lượng Coin trắng (10 Coin trắng = 1 Coin vàng), phần còn lại trừ Coin vàng."""
        if price_coin <= 0:
            return PaymentSplit(0, 0, 0)
        paid, bonus = await self._lock_rows(user_id)
        bonus_use, paid_use = split_payment(
            price_coin, bonus.current_balance, BONUS_MAX_COINS_SHARE, BONUS_COINS_PER_GOLD
        )
        bonus_gold_discount = bonus_use // BONUS_COINS_PER_GOLD
        if paid_use > paid.balance:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ Coin vàng. Cần {paid_use} Coin vàng nhưng bạn chỉ có {paid.balance}.",
            )
        if bonus_use:
            before = bonus.current_balance
            bonus.current_balance = before - bonus_use
            bonus.total_spent += bonus_use
            bonus.version += 1
            bonus.updated_at = func.now()
            self._record(user_id, "bonus", "debit", bonus_use, before, bonus.current_balance, PURCHASE_SOURCE, ref_id)
        if paid_use:
            before = paid.balance
            paid.balance = before - paid_use
            paid.version += 1
            paid.updated_at = func.now()
            self._record(user_id, "paid", "debit", paid_use, before, paid.balance, PURCHASE_SOURCE, ref_id)
        await self.db.flush()
        return PaymentSplit(bonus_use, paid_use, bonus_gold_discount)

    async def _sum_kind(self, user_id: uuid.UUID, kind: str, *conditions) -> int:
        return int(await self.db.scalar(
            select(func.coalesce(func.sum(PeakTransactions.amount), 0)).where(
                PeakTransactions.user_id == user_id, PeakTransactions.coin_kind == kind, *conditions)
        ) or 0)

    async def refund_async(
        self, user_id: uuid.UUID, *, bonus: int, paid: int, ref_id: uuid.UUID, debit_ref: uuid.UUID,
    ) -> None:
        """Hoàn đúng loại Coin đã trừ cho một khoản mua.

        `debit_ref` là mã đơn đã bị trừ Coin (giao dịch mua hoặc đơn combo); mỗi loại chỉ được hoàn tối đa
        số đã trừ trừ đi số đã hoàn của cùng đơn, và đơn không có dòng trừ thì bị từ chối. Gọi lại với cùng
        `ref_id` (mã khoản mua) không hoàn thêm.
        """
        paid_row, bonus_row = await self._lock_rows(user_id)
        if await self._already_recorded(user_id, REFUND_SOURCE, ref_id):
            return
        marker = {"debit_ref": str(debit_ref)}
        for kind, amount in (("bonus", bonus), ("paid", paid)):
            if amount <= 0:
                continue
            debited = await self._sum_kind(
                user_id, kind, PeakTransactions.source == PURCHASE_SOURCE,
                PeakTransactions.event_id == debit_ref, PeakTransactions.type == "debit")
            refunded = await self._sum_kind(
                user_id, kind, PeakTransactions.source == REFUND_SOURCE,
                PeakTransactions.metadata_["debit_ref"].astext == str(debit_ref))
            if amount > debited - refunded:
                raise HTTPException(409, "Số Coin hoàn vượt quá số Coin đã dùng cho đơn này.")
        if bonus > 0:
            before = bonus_row.current_balance
            bonus_row.current_balance = before + bonus
            bonus_row.version += 1
            bonus_row.updated_at = func.now()
            self._record(user_id, "bonus", "credit", bonus, before, bonus_row.current_balance,
                         REFUND_SOURCE, ref_id, marker)
        if paid > 0:
            before = paid_row.balance
            paid_row.balance = before + paid
            paid_row.version += 1
            paid_row.updated_at = func.now()
            self._record(user_id, "paid", "credit", paid, before, paid_row.balance,
                         REFUND_SOURCE, ref_id, marker)
        await self.db.flush()

    async def refund_purchase_async(self, purchase) -> bool:
        """Hoàn Coin cho một khoản mua đã trả bằng Coin. Trả False với khoản mua cũ (VND) để người gọi hoàn ví."""
        if purchase.coin_bonus_used is None and purchase.coin_paid_used is None:
            return False
        bundle_order = (purchase.course_snapshot or {}).get("bundle_order_id")
        debit_ref = uuid.UUID(str(bundle_order)) if bundle_order else purchase.transaction_id
        await self.refund_async(
            purchase.user_id, bonus=purchase.coin_bonus_used or 0, paid=purchase.coin_paid_used or 0,
            ref_id=purchase.id, debit_ref=debit_ref,
        )
        return True
