from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select, update

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import (
    PlatformSettings, Transactions, User, UserPeakBalances, WithdrawalRequests,
)
from app.services.coin_service import CoinService
from app.services.shares.withdraw import WithdrawService

pytestmark = pytest.mark.asyncio


class Notifier:
    async def create_notification_async(self, *args, **kwargs):
        return None


async def lecturer(db, *, paid, bonus=0, topup=0):
    """`paid` là Coin thật có nguồn từ thu nhập (rút được); `topup` là Coin nạp bằng tiền (chỉ tiêu được)."""
    user = User(fullname="Giảng viên", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    db.add_all([UserPaidCoinBalances(user_id=user.id, balance=0),
                UserPeakBalances(user_id=user.id, current_balance=bonus, total_earned=bonus)])
    await db.execute(update(PlatformSettings).values(coin_vnd_rate=10000, payout_min_balance=Decimal(100000)))
    await db.flush()
    coins = CoinService(db)
    if paid:
        await coins.credit_paid_async(user.id, paid, source="earning_release", ref_id=uuid4())
    if topup:
        await coins.credit_paid_async(user.id, topup, source="topup", ref_id=uuid4())
    return user


async def request(db, user, coin):
    return await WithdrawService(db).request_withdraw_async(user, coin, Notifier())


async def test_withdrawing_coin_locks_coin_and_records_the_vnd_payout(db_session):
    user = await lecturer(db_session, paid=100)
    result = await request(db_session, user, 10)
    withdrawal = await db_session.get(WithdrawalRequests, result["withdrawal_id"])
    assert withdrawal.amount == Decimal(100_000) and withdrawal.coin_amount == 10 and withdrawal.status == "pending"
    assert (await CoinService(db_session).get_balances_async(user.id)).paid == 90
    hold = await db_session.scalar(select(Transactions).where(
        Transactions.user_id == user.id, Transactions.type == "withdraw_hold"))
    assert hold is not None and hold.ref_id == withdrawal.id


async def test_withdrawing_below_the_minimum_is_rejected(db_session):
    user = await lecturer(db_session, paid=100)
    user_id = user.id
    with pytest.raises(HTTPException) as error:
        await request(db_session, user, 9)
    assert error.value.status_code == 400 and "10 Coin" in error.value.detail
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100


async def test_withdrawing_more_than_the_paid_coin_changes_nothing(db_session):
    user = await lecturer(db_session, paid=100)
    user_id = user.id
    with pytest.raises(HTTPException) as error:
        await request(db_session, user, 500)
    assert error.value.status_code == 400
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100
    assert await db_session.scalar(select(func.count()).select_from(WithdrawalRequests).where(
        WithdrawalRequests.lecturer_id == user_id)) == 0


async def test_bonus_coin_cannot_be_withdrawn(db_session):
    user = await lecturer(db_session, paid=0, bonus=999)
    user_id = user.id
    with pytest.raises(HTTPException) as error:
        await request(db_session, user, 10)
    assert error.value.status_code == 400
    assert (await CoinService(db_session).get_balances_async(user_id)).bonus == 999


async def test_a_second_pending_request_is_rejected(db_session):
    user = await lecturer(db_session, paid=100)
    user_id = user.id
    await request(db_session, user, 10)
    with pytest.raises(HTTPException) as error:
        await request(db_session, user, 10)
    assert error.value.status_code == 400
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 90


async def test_check_can_request_reports_coin_balance_and_minimum(db_session):
    user = await lecturer(db_session, paid=100)
    result = await WithdrawService(db_session).check_can_withdraw_request_async(user)
    assert result["can_withdraw"] is True and result["balance"] == 100 and result["min_coin"] == 10
    assert result["rate_vnd"] == 10000


async def pending_request(db, user, coin):
    result = await request(db, user, coin)
    return await db.get(WithdrawalRequests, result["withdrawal_id"])


async def test_rejecting_a_request_returns_the_locked_coin(db_session):
    user = await lecturer(db_session, paid=100)
    user_id = user.id
    withdrawal = await pending_request(db_session, user, 10)
    await WithdrawService(db_session).approve_or_deny_withdrawals_async(
        False, Notifier(), reason="Sai thông tin", withdraw_ids=[withdrawal.id])
    assert withdrawal.status == "rejected"
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100


async def test_refund_helper_returns_coin_only_once_even_if_a_payout_fails_later(db_session):
    user = await lecturer(db_session, paid=100)
    user_id = user.id
    withdrawal = await pending_request(db_session, user, 10)
    service = WithdrawService(db_session)
    await service._refund_withdrawal_hold_async(withdrawal, None)
    await service._refund_withdrawal_hold_async(withdrawal, None)
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100


async def test_legacy_vnd_request_is_still_refunded_to_the_vnd_wallet(db_session):
    from app.db.models.database import Wallets

    user = await lecturer(db_session, paid=0)
    wallet = Wallets(user_id=user.id, balance=Decimal(0), total_in=Decimal(0), total_out=Decimal(200_000), currency="VND")
    db_session.add(wallet)
    legacy = WithdrawalRequests(lecturer_id=user.id, amount=Decimal(200_000), currency="VND", status="pending")
    db_session.add(legacy)
    await db_session.flush()
    await WithdrawService(db_session)._refund_withdrawal_hold_async(legacy, wallet)
    assert wallet.balance == Decimal(200_000) and wallet.total_out == Decimal(0)
    assert (await CoinService(db_session).get_balances_async(user.id)).paid == 0


async def test_coin_bought_with_money_cannot_be_withdrawn(db_session):
    user = await lecturer(db_session, paid=0, topup=100)
    user_id = user.id
    with pytest.raises(HTTPException) as error:
        await request(db_session, user, 10)
    assert error.value.status_code == 400 and "thu nhập" in error.value.detail
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100


async def test_only_earned_coin_counts_toward_what_can_be_withdrawn(db_session):
    user = await lecturer(db_session, paid=30, topup=100)
    user_id = user.id
    await request(db_session, user, 30)
    with pytest.raises(HTTPException):
        await request(db_session, user, 10)  # đã có yêu cầu chờ; và chỉ còn 0 Coin rút được
    info = await WithdrawService(db_session).check_can_withdraw_request_async(user)
    assert info["balance"] == 0 and info["paid_balance"] == 100
    assert (await CoinService(db_session).get_balances_async(user_id)).paid == 100


async def test_two_simultaneous_requests_cannot_exceed_what_was_earned(async_engine):
    """Hai yêu cầu song song (session riêng, commit thật trên DB test cô lập): chỉ một được tạo."""
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker

    factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with factory() as setup:
        user = await lecturer(setup, paid=30, topup=100)  # rút được 30, còn 100 Coin nạp không rút được
        user_id = user.id
        await setup.commit()

    async def attempt():
        async with factory() as session:
            lecturer_row = await session.get(User, user_id)
            try:
                await WithdrawService(session).request_withdraw_async(lecturer_row, 30, Notifier())
                await session.commit()
                return "ok"
            except HTTPException as error:
                await session.rollback()
                return error.status_code

    results = await asyncio.gather(attempt(), attempt())
    assert sorted(map(str, results)) == ["400", "ok"]
    async with factory() as check:
        assert (await CoinService(check).get_balances_async(user_id)).paid == 100
        assert await check.scalar(select(func.count()).select_from(WithdrawalRequests).where(
            WithdrawalRequests.lecturer_id == user_id)) == 1
