"""Treasury holds, platform promotion expenses and their reversals."""

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select

from app.db.models.billing import PlatformCouponCost
from app.db.models.database import PlatformWalletHistory, PlatformWallets
from app.libs.formats.datetime import VIETNAM_TIMEZONE


async def lock_treasury(db):
    treasury = await db.scalar(
        select(PlatformWallets).where(PlatformWallets.currency == "VND")
        .order_by(PlatformWallets.id).limit(1).with_for_update()
        .execution_options(populate_existing=True)
    )
    if treasury is None:
        raise HTTPException(503, "Chưa có ví đối soát nền tảng.")
    return treasury


async def check_coupon_budget(db, policy, amount: Decimal):
    """Call with the treasury row locked, before recording new expense."""
    budget = policy.monthly_platform_coupon_budget
    if budget is None or not amount:
        return
    start = datetime.now(VIETNAM_TIMEZONE).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    spent = await db.scalar(select(func.coalesce(func.sum(PlatformCouponCost.amount), 0)).where(
        PlatformCouponCost.created_at >= start,
    ))
    if spent + amount > budget:
        raise HTTPException(422, "Đã hết ngân sách ưu đãi của nền tảng trong tháng.")


def hold_payment(db, treasury, amount, *, transaction_id=None, note=None):
    if amount:
        treasury.holding_amount += amount
        db.add(PlatformWalletHistory(
            wallet_id=treasury.id, amount=amount, type="hold",
            related_transaction_id=transaction_id, note=note,
        ))


def release_payment(db, treasury, amount, transaction_id, *, platform_fee=Decimal(0), note=None):
    if treasury.holding_amount < amount:
        raise HTTPException(503, "Không đủ dữ liệu đối soát để giải phóng tiền.")
    treasury.holding_amount -= amount
    db.add(PlatformWalletHistory(
        wallet_id=treasury.id, amount=amount, type="release",
        related_transaction_id=transaction_id, note=note,
    ))
    if platform_fee:
        treasury.platform_fee_total += platform_fee
        db.add(PlatformWalletHistory(
            wallet_id=treasury.id, amount=platform_fee, type="fee",
            related_transaction_id=transaction_id, note=note,
        ))


def record_coupon_cost(db, purchase, amount, *, bundle_coupon_id=None):
    if purchase.coupon_sponsor == "platform" and amount > 0:
        db.add(PlatformCouponCost(
            purchase_item_id=purchase.id, discount_id=purchase.discount_id,
            bundle_coupon_id=bundle_coupon_id, amount=amount, created_at=datetime.now(UTC),
        ))


async def reverse_coupon_cost(db, purchase, refund_tx):
    if purchase.coupon_sponsor == "platform":
        cost = await db.get(PlatformCouponCost, purchase.id)
        if cost is None or cost.reversed_at is not None:
            raise HTTPException(503, "Không đủ dữ liệu đối soát chi phí ưu đãi.")
        cost.reversed_at = datetime.now(UTC)
        cost.refund_transaction_id = refund_tx.id
