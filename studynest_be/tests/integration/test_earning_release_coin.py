from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select, update

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import PlatformSettings, User, Wallets
from app.services.instructor_coin import credit_instructor_earning_async

pytestmark = pytest.mark.asyncio


async def lecturer_wallet(db, balance):
    user = User(fullname="Giảng viên", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    wallet = Wallets(user_id=user.id, balance=Decimal(balance), total_in=Decimal(balance), total_out=Decimal(0), currency="VND")
    db.add(wallet)
    await db.execute(update(PlatformSettings).values(coin_vnd_rate=10000))
    await db.flush()
    return user.id, wallet


async def paid(db, user_id):
    return await db.scalar(select(UserPaidCoinBalances.balance).where(UserPaidCoinBalances.user_id == user_id)) or 0


async def test_earning_becomes_coin_and_keeps_the_remainder_in_the_wallet(db_session):
    user_id, wallet = await lecturer_wallet(db_session, 0)
    coin = await credit_instructor_earning_async(db_session, wallet, Decimal(139_300), earning_id=uuid4())
    assert coin == 13 and await paid(db_session, user_id) == 13
    assert wallet.balance == Decimal(9300)


async def test_remainder_carries_into_the_next_earning(db_session):
    user_id, wallet = await lecturer_wallet(db_session, 9300)
    coin = await credit_instructor_earning_async(db_session, wallet, Decimal(150_700), earning_id=uuid4())
    assert coin == 16 and wallet.balance == Decimal(0)
    assert await paid(db_session, user_id) == 16


async def test_releasing_the_same_earning_twice_credits_once(db_session):
    user_id, wallet = await lecturer_wallet(db_session, 0)
    earning = uuid4()
    await credit_instructor_earning_async(db_session, wallet, Decimal(139_300), earning_id=earning)
    await credit_instructor_earning_async(db_session, wallet, Decimal(139_300), earning_id=earning)
    assert await paid(db_session, user_id) == 13
    assert wallet.balance == Decimal(9300)
