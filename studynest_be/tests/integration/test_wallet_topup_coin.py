from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import Role, User, UserRoles, Wallets
from app.services.shares.wallets import WalletsService

pytestmark = pytest.mark.asyncio


async def make_wallet(db, *, lecturer=False):
    user = User(fullname="Người nạp", email=f"{uuid4().hex}@test.invalid", password="!disabled")
    db.add(user)
    await db.flush()
    if lecturer:
        role_id = await db.scalar(select(Role.id).where(Role.role_name == "LECTURER"))
        db.add(UserRoles(user_id=user.id, role_id=role_id))
    wallet = Wallets(user_id=user.id, balance=Decimal(0), total_in=Decimal(0), currency="VND")
    db.add(wallet)
    await db.flush()
    return user.id, wallet


def service(db):
    return WalletsService(db, embedding=None)


async def paid(db, user_id):
    return await db.scalar(select(UserPaidCoinBalances.balance).where(UserPaidCoinBalances.user_id == user_id)) or 0


async def test_learner_topup_credits_coin_and_keeps_remainder_in_wallet(db_session):
    user_id, wallet = await make_wallet(db_session)
    coin = await service(db_session).credit_topup_async(wallet, transaction_id=uuid4(), amount=Decimal(1_005_000))
    assert coin == 100
    assert await paid(db_session, user_id) == 100
    assert wallet.balance == Decimal(5000) and wallet.total_in == Decimal(5000)


async def test_same_topup_applied_twice_credits_once(db_session):
    user_id, wallet = await make_wallet(db_session)
    tx = uuid4()
    await service(db_session).credit_topup_async(wallet, transaction_id=tx, amount=Decimal(1_005_000))
    await service(db_session).credit_topup_async(wallet, transaction_id=tx, amount=Decimal(1_005_000))
    assert await paid(db_session, user_id) == 100
    assert wallet.balance == Decimal(5000)


async def test_lecturer_topup_stays_in_vnd(db_session):
    user_id, wallet = await make_wallet(db_session, lecturer=True)
    coin = await service(db_session).credit_topup_async(wallet, transaction_id=uuid4(), amount=Decimal(300_000))
    assert coin == 0
    assert await paid(db_session, user_id) == 0
    assert wallet.balance == Decimal(300_000)
