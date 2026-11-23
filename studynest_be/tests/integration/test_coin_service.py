from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select, update

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import PeakTransactions, PlatformSettings, User, UserPeakBalances
from app.services.coin_service import CoinService

pytestmark = pytest.mark.asyncio


async def make_user(db, *, bonus=0, paid=0):
    user = User(fullname="Học viên Coin", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    db.add_all([
        UserPeakBalances(user_id=user.id, current_balance=bonus, total_earned=bonus),
        UserPaidCoinBalances(user_id=user.id, balance=paid),
    ])
    await db.flush()
    await db.execute(update(PlatformSettings).values(coin_vnd_rate=10000, bonus_coin_max_share=0.3))
    return user.id


async def test_debit_uses_bonus_first_within_cap(db_session):
    user_id = await make_user(db_session, bonus=500, paid=100)
    split = await CoinService(db_session).debit_for_purchase_async(user_id, 50, ref_id=uuid4())
    assert (split.bonus_use, split.paid_use) == (15, 35)
    balances = await CoinService(db_session).get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (485, 65)


async def test_debit_rejects_without_touching_balances(db_session):
    user_id = await make_user(db_session, bonus=500, paid=10)
    with pytest.raises(HTTPException) as error:
        await CoinService(db_session).debit_for_purchase_async(user_id, 50, ref_id=uuid4())
    assert error.value.status_code == 400
    balances = await CoinService(db_session).get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (500, 10)
    rows = await db_session.scalar(select(func.count()).select_from(PeakTransactions).where(
        PeakTransactions.user_id == user_id, PeakTransactions.source == "course_purchase"))
    assert rows == 0


async def test_credit_is_idempotent_per_ref(db_session):
    user_id = await make_user(db_session)
    ref = uuid4()
    service = CoinService(db_session)
    assert await service.credit_paid_async(user_id, 100, source="topup", ref_id=ref) == 100
    assert await service.credit_paid_async(user_id, 100, source="topup", ref_id=ref) == 100
    assert (await service.get_balances_async(user_id)).paid == 100


async def test_refund_restores_each_kind_and_is_idempotent(db_session):
    user_id = await make_user(db_session, bonus=100, paid=100)
    service = CoinService(db_session)
    ref = uuid4()
    await service.refund_async(user_id, bonus=15, paid=35, ref_id=ref)
    await service.refund_async(user_id, bonus=15, paid=35, ref_id=ref)
    balances = await service.get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (115, 135)


async def test_refund_of_zero_kind_writes_no_row(db_session):
    user_id = await make_user(db_session, bonus=0, paid=0)
    await CoinService(db_session).refund_async(user_id, bonus=0, paid=40, ref_id=uuid4())
    kinds = (await db_session.scalars(select(PeakTransactions.coin_kind).where(
        PeakTransactions.user_id == user_id, PeakTransactions.source == "refund"))).all()
    assert kinds == ["paid"]
