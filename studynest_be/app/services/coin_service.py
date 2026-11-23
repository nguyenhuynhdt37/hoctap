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
from app.services.coin_math import split_payment
from app.services.coupon_settlement import billing_policy

TOPUP_SOURCE = "topup"
PURCHASE_SOURCE = "course_purchase"
REFUND_SOURCE = "refund"


@dataclass(frozen=True)
class CoinBalances:
    bonus: int
    paid: int


@dataclass(frozen=True)
class PaymentSplit:
    bonus_use: int
    paid_use: int


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
        source: str, ref_id: uuid.UUID | None,
    ) -> None:
        self.db.add(PeakTransactions(
            user_id=user_id, amount=amount, type=direction, before_balance=before, after_balance=after,
            source=source, event_id=ref_id, coin_kind=kind,
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

    async def debit_for_purchase_async(
        self, user_id: uuid.UUID, price_coin: int, *, ref_id: uuid.UUID,
    ) -> PaymentSplit:
        """Trừ Coin thưởng trước (có trần), phần còn lại trừ Coin thật. Thiếu Coin thật thì không trừ gì."""
        if price_coin <= 0:
            return PaymentSplit(0, 0)
        policy = await billing_policy(self.db)
        paid, bonus = await self._lock_rows(user_id)
        bonus_use, paid_use = split_payment(price_coin, bonus.current_balance, policy.bonus_coin_max_share)
        if paid_use > paid.balance:
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ Coin. Cần {paid_use} Coin thật nhưng bạn chỉ có {paid.balance}.",
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
        return PaymentSplit(bonus_use, paid_use)

    async def refund_async(self, user_id: uuid.UUID, *, bonus: int, paid: int, ref_id: uuid.UUID) -> None:
        """Hoàn đúng loại Coin đã trừ; gọi lại với cùng `ref_id` không hoàn thêm."""
        paid_row, bonus_row = await self._lock_rows(user_id)
        if await self._already_recorded(user_id, REFUND_SOURCE, ref_id):
            return
        if bonus > 0:
            before = bonus_row.current_balance
            bonus_row.current_balance = before + bonus
            bonus_row.version += 1
            bonus_row.updated_at = func.now()
            self._record(user_id, "bonus", "credit", bonus, before, bonus_row.current_balance, REFUND_SOURCE, ref_id)
        if paid > 0:
            before = paid_row.balance
            paid_row.balance = before + paid
            paid_row.version += 1
            paid_row.updated_at = func.now()
            self._record(user_id, "paid", "credit", paid, before, paid_row.balance, REFUND_SOURCE, ref_id)
        await self.db.flush()
