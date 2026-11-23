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


async def debit(db, user_id, price_coin, ref):
    return await CoinService(db).debit_for_purchase_async(user_id, price_coin, ref_id=ref)


async def test_refund_restores_each_kind_and_is_idempotent(db_session):
    user_id = await make_user(db_session, bonus=100, paid=100)
    service = CoinService(db_session)
    purchase = uuid4()
    await debit(db_session, user_id, 50, purchase)  # bonus 15, paid 35
    item = uuid4()
    await service.refund_async(user_id, bonus=15, paid=35, ref_id=item, debit_ref=purchase)
    await service.refund_async(user_id, bonus=15, paid=35, ref_id=item, debit_ref=purchase)
    balances = await service.get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (100, 100)


async def test_refund_without_a_matching_debit_is_rejected(db_session):
    user_id = await make_user(db_session, bonus=0, paid=0)
    with pytest.raises(HTTPException) as error:
        await CoinService(db_session).refund_async(user_id, bonus=0, paid=40, ref_id=uuid4(), debit_ref=uuid4())
    assert error.value.status_code == 409
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 0


async def test_refund_cannot_exceed_what_was_debited_across_items(db_session):
    user_id = await make_user(db_session, bonus=100, paid=100)
    service = CoinService(db_session)
    purchase = uuid4()
    await debit(db_session, user_id, 50, purchase)  # bonus 15, paid 35
    await service.refund_async(user_id, bonus=10, paid=20, ref_id=uuid4(), debit_ref=purchase)
    with pytest.raises(HTTPException) as error:
        await service.refund_async(user_id, bonus=10, paid=20, ref_id=uuid4(), debit_ref=purchase)
    assert error.value.status_code == 409
    balances = await service.get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (95, 85)


async def test_refund_of_zero_kind_writes_no_row(db_session):
    user_id = await make_user(db_session, bonus=0, paid=100)
    purchase = uuid4()
    await debit(db_session, user_id, 40, purchase)  # all paid (no bonus)
    await CoinService(db_session).refund_async(user_id, bonus=0, paid=40, ref_id=uuid4(), debit_ref=purchase)
    kinds = (await db_session.scalars(select(PeakTransactions.coin_kind).where(
        PeakTransactions.user_id == user_id, PeakTransactions.source == "refund"))).all()
    assert kinds == ["paid"]


async def test_refund_purchase_restores_coin_split_and_skips_legacy_vnd_purchases(db_session):
    from types import SimpleNamespace
    user_id = await make_user(db_session, bonus=100, paid=100)
    service = CoinService(db_session)
    tx = uuid4()
    await debit(db_session, user_id, 50, tx)  # bonus 15, paid 35
    item = SimpleNamespace(id=uuid4(), user_id=user_id, transaction_id=tx, course_snapshot={},
                           coin_bonus_used=15, coin_paid_used=35)
    assert await service.refund_purchase_async(item) is True
    balances = await service.get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (100, 100)
    legacy = SimpleNamespace(id=uuid4(), user_id=user_id, transaction_id=uuid4(), course_snapshot={},
                             coin_bonus_used=None, coin_paid_used=None)
    assert await service.refund_purchase_async(legacy) is False


async def test_refund_purchase_uses_bundle_order_as_debit_reference(db_session):
    from types import SimpleNamespace
    user_id = await make_user(db_session, bonus=0, paid=100)
    service = CoinService(db_session)
    order = uuid4()
    await debit(db_session, user_id, 30, order)
    item = SimpleNamespace(id=uuid4(), user_id=user_id, transaction_id=uuid4(),
                           course_snapshot={"bundle_order_id": str(order)}, coin_bonus_used=0, coin_paid_used=30)
    assert await service.refund_purchase_async(item) is True
    assert (await service.get_balances_async(user_id)).paid == 100


async def test_debit_paid_only_uses_paid_coin(db_session):
    user_id = await make_user(db_session, bonus=999, paid=100)
    with pytest.raises(HTTPException) as error:
        await CoinService(db_session).debit_paid_async(user_id, 150, source="withdraw_hold", ref_id=uuid4())
    assert error.value.status_code == 400
    balances = await CoinService(db_session).get_balances_async(user_id)
    assert (balances.bonus, balances.paid) == (999, 100)


async def test_debit_paid_reduces_balance_and_is_idempotent(db_session):
    user_id = await make_user(db_session, bonus=0, paid=100)
    service = CoinService(db_session)
    ref = uuid4()
    assert await service.debit_paid_async(user_id, 40, source="withdraw_hold", ref_id=ref) == 60
    assert await service.debit_paid_async(user_id, 40, source="withdraw_hold", ref_id=ref) == 60
    rows = await db_session.scalar(select(func.count()).select_from(PeakTransactions).where(
        PeakTransactions.user_id == user_id, PeakTransactions.source == "withdraw_hold"))
    assert rows == 1
