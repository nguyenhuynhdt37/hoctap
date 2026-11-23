"""Cent-exact settlement against the pre-coupon sale price."""

from dataclasses import dataclass
from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models.database import PlatformSettings

CENT = Decimal(".01")
ZERO = Decimal("0.00")
Sponsor = Literal["platform", "instructor"]


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


async def billing_policy(db, *, lock: bool = False) -> PlatformSettings:
    stmt = select(PlatformSettings).order_by(PlatformSettings.updated_at.desc(), PlatformSettings.id).limit(1)
    if lock:
        stmt = stmt.with_for_update(read=True)
    policy = await db.scalar(stmt.execution_options(populate_existing=True))
    if policy is None or not 0 <= policy.platform_fee <= 1:
        raise HTTPException(503, "Cấu hình phí nền tảng chưa hợp lệ.")
    return policy


def coupon_cap(base: Decimal, fee: Decimal, sponsor: Sponsor, instructor_max: Decimal = Decimal(90)) -> Decimal:
    rate = fee / 2 if sponsor == "platform" else min(1 - fee, instructor_max / 100)
    return (base * rate).quantize(CENT, rounding=ROUND_DOWN)


def instructor_max_percent(policy: PlatformSettings) -> Decimal:
    return min(Decimal(policy.discount_max_percent), (1 - policy.platform_fee) * 100)


@dataclass(frozen=True)
class Settlement:
    base: Decimal
    paid: Decimal
    platform: Decimal
    instructor: Decimal
    discount: Decimal

    @property
    def has_revenue(self) -> bool:
        return self.paid > 0


def settle(
    base: Decimal,
    fee: Decimal,
    sponsor: Sponsor | None = None,
    requested: Decimal = ZERO,
    *,
    fixed: bool = False,
    instructor_max: Decimal = Decimal(90),
) -> Settlement:
    base = money(base)
    platform = money(base * fee)
    instructor = base - platform
    discount = ZERO
    if sponsor is not None:
        cap = coupon_cap(base, fee, sponsor, instructor_max)
        if fixed and requested > cap:
            raise HTTPException(422, "Mã giảm giá cố định vượt mức giảm cho phép.")
        discount = min(cap, money(max(ZERO, requested)))
        if sponsor == "platform":
            platform -= discount
        else:
            instructor -= discount
    return Settlement(base, base - discount, platform, instructor, discount)


def earning_for_purchase():
    from sqlalchemy import and_, or_

    from app.db.models.database import InstructorEarnings, PurchaseItems

    return or_(
        InstructorEarnings.purchase_item_id == PurchaseItems.id,
        and_(
            InstructorEarnings.purchase_item_id.is_(None),
            InstructorEarnings.transaction_id == PurchaseItems.transaction_id,
        ),
    )
