"""Mua khóa học bằng Coin. Cần DB có dữ liệu mẫu (môn 'toan', danh mục 'lop-12'); rollback sau mỗi test."""

from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, update

from app.db.models.catalog import Subject
from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import (
    Categories,
    Courses,
    InstructorEarnings,
    PlatformSettings,
    PlatformWallets,
    PurchaseItems,
    Transactions,
    User,
    UserPeakBalances,
    Wallets,
)
from app.services.coin_service import CoinService
from app.services.shares.discounts import DiscountService
from app.services.shares.transaction import TransactionsService
from app.services.shares.wallets import WalletsService

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def no_event_bus(monkeypatch):
    """Không đẩy sự kiện thật vào Redis của backend đang chạy."""
    async def publish(*args, **kwargs):
        return None
    monkeypatch.setattr("app.services.shares.transaction.event_bus.publish", publish)


async def scenario(db, *, prices, bonus, paid):
    subject = await db.scalar(select(Subject).where(Subject.code == "toan"))
    category = await db.scalar(select(Categories).where(Categories.slug == "lop-12"))
    learner = User(fullname="Học viên", email=uuid4().hex + "@test.invalid", password="!disabled")
    teacher = User(fullname="Giảng viên", email=uuid4().hex + "@test.invalid", password="!disabled")
    db.add_all([learner, teacher])
    await db.flush()
    db.add_all([
        Wallets(user_id=learner.id, balance=Decimal(1_000_000), total_in=1_000_000, total_out=0,
                currency="VND", is_locked=False),
        UserPeakBalances(user_id=learner.id, current_balance=bonus, total_earned=bonus),
        UserPaidCoinBalances(user_id=learner.id, balance=paid),
    ])
    courses = []
    for price in prices:
        course = Courses(
            title="Coin test", slug="coin-test-" + uuid4().hex, category_id=category.id, subject_id=subject.id,
            instructor_id=teacher.id, is_published=True, approval_status="approved", currency="VND",
            base_price=price, total_enrolls=0,
        )
        db.add(course)
        courses.append(course)
    if not await db.scalar(select(PlatformWallets).where(PlatformWallets.currency == "VND").limit(1)):
        db.add(PlatformWallets(currency="VND", balance=10_000_000, total_in=10_000_000, total_out=0,
                               holding_amount=0, platform_fee_total=0))
    await db.execute(update(PlatformSettings).values(
        platform_fee=Decimal("0.3"), hold_days=7, coin_vnd_rate=10000, bonus_coin_max_share=Decimal("0.3")))
    await db.flush()
    await db.commit()
    return learner, courses


async def buy(db, learner, courses):
    return await TransactionsService(db).checkout_wallet_async(
        user=learner, course_ids=[c.id for c in courses], discount_code=None,
        wallets_service=WalletsService(db, embedding=None), discount_service=DiscountService(db),
    )


async def test_checkout_charges_bonus_then_paid_and_leaves_vnd_wallet_alone(db_session):
    learner, courses = await scenario(db_session, prices=[500_000], bonus=100, paid=100)
    receipt = await buy(db_session, learner, courses)
    balances = await CoinService(db_session).get_balances_async(learner.id)
    assert (balances.bonus, balances.paid) == (85, 65)
    wallet = await db_session.scalar(select(Wallets).where(Wallets.user_id == learner.id))
    assert wallet.balance == Decimal(1_000_000)
    tx = await db_session.get(Transactions, receipt["transaction_id"])
    assert tx.amount == Decimal(500_000)
    item = await db_session.scalar(select(PurchaseItems).where(PurchaseItems.transaction_id == tx.id))
    assert (item.coin_bonus_used, item.coin_paid_used) == (15, 35)


async def test_checkout_without_enough_paid_coin_changes_nothing(db_session):
    learner, courses = await scenario(db_session, prices=[500_000], bonus=100, paid=10)
    learner_id = learner.id  # service rollback expires ORM objects
    with pytest.raises(HTTPException) as error:
        await buy(db_session, learner, courses)
    assert error.value.status_code == 400
    balances = await CoinService(db_session).get_balances_async(learner_id)
    assert (balances.bonus, balances.paid) == (100, 10)
    assert await db_session.scalar(select(Transactions.id).where(Transactions.user_id == learner_id)) is None


async def test_instructor_earning_still_uses_the_full_vnd_price(db_session):
    learner, courses = await scenario(db_session, prices=[500_000], bonus=100, paid=100)
    await buy(db_session, learner, courses)
    earning = await db_session.scalar(select(InstructorEarnings).where(InstructorEarnings.instructor_id == courses[0].instructor_id))
    assert earning.amount_instructor + earning.amount_platform == Decimal(500_000)
    assert earning.amount_instructor == Decimal(350_000)


async def test_multi_course_order_splits_coin_across_items_and_sums_to_the_charge(db_session):
    learner, courses = await scenario(db_session, prices=[100_000, 200_000], bonus=5, paid=100)
    receipt = await buy(db_session, learner, courses)
    items = (await db_session.scalars(select(PurchaseItems).where(
        PurchaseItems.transaction_id == receipt["transaction_id"]))).all()
    assert len(items) == 2
    assert sum(i.coin_bonus_used for i in items) == 5
    assert sum(i.coin_paid_used for i in items) == 25
    balances = await CoinService(db_session).get_balances_async(learner.id)
    assert (balances.bonus, balances.paid) == (0, 75)
