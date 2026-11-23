from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import PeakTransactions, User, UserPeakBalances, Wallets, WithdrawalRequests
from scripts.reset_money_test_data import reset_money

pytestmark = pytest.mark.asyncio


async def seed(db):
    user = User(fullname="Người thử", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    db.add_all([
        Wallets(user_id=user.id, balance=Decimal(7702), total_in=Decimal(1_000_000), total_out=Decimal(500_000), currency="VND"),
        UserPaidCoinBalances(user_id=user.id, balance=123),
        UserPeakBalances(user_id=user.id, current_balance=50, total_earned=50),
        PeakTransactions(user_id=user.id, amount=123, type="credit", before_balance=0, after_balance=123,
                         source="earning_release", coin_kind="paid"),
        PeakTransactions(user_id=user.id, amount=50, type="credit", before_balance=0, after_balance=50,
                         source="daily_checkin", coin_kind="bonus"),
        WithdrawalRequests(lecturer_id=user.id, amount=Decimal(100_000), coin_amount=10, currency="VND", status="pending"),
    ])
    await db.flush()
    return user.id


async def state(db, user_id):
    wallet = await db.scalar(select(Wallets).where(Wallets.user_id == user_id))
    return {
        "vnd": (wallet.balance, wallet.total_in, wallet.total_out),
        "paid": await db.scalar(select(UserPaidCoinBalances.balance).where(UserPaidCoinBalances.user_id == user_id)),
        "paid_rows": await db.scalar(select(func.count()).select_from(PeakTransactions).where(
            PeakTransactions.user_id == user_id, PeakTransactions.coin_kind == "paid")),
        "bonus_rows": await db.scalar(select(func.count()).select_from(PeakTransactions).where(
            PeakTransactions.user_id == user_id, PeakTransactions.coin_kind == "bonus")),
        "bonus": await db.scalar(select(UserPeakBalances.current_balance).where(UserPeakBalances.user_id == user_id)),
        "withdrawal": await db.scalar(select(WithdrawalRequests.status).where(WithdrawalRequests.lecturer_id == user_id)),
        "user": await db.scalar(select(User.id).where(User.id == user_id)),
    }


async def test_dry_run_reports_but_changes_nothing(db_session):
    user_id = await seed(db_session)
    before = await state(db_session, user_id)
    report = await reset_money(await db_session.connection(), apply=False)
    assert report["wallets"] >= 1 and report["paid_balances"] >= 1 and report["pending_withdrawals"] >= 1
    assert await state(db_session, user_id) == before


async def test_apply_zeroes_money_but_keeps_users_and_bonus_coin(db_session):
    user_id = await seed(db_session)
    await reset_money(await db_session.connection(), apply=True)
    after = await state(db_session, user_id)
    assert after["vnd"] == (0, 0, 0)
    assert after["paid"] is None and after["paid_rows"] == 0
    assert after["bonus"] == 50 and after["bonus_rows"] == 1
    assert after["withdrawal"] == "rejected" and after["user"] == user_id


async def test_apply_twice_is_stable(db_session):
    user_id = await seed(db_session)
    await reset_money(await db_session.connection(), apply=True)
    first = await state(db_session, user_id)
    again = await reset_money(await db_session.connection(), apply=True)
    assert await state(db_session, user_id) == first
    assert again["wallets"] == 0 and again["paid_balances"] == 0 and again["pending_withdrawals"] == 0
