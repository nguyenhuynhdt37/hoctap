"""Platform-funded coupon expense, attributable to an individual purchase."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class PlatformCouponCost(Base):
    __tablename__ = "platform_coupon_costs"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_platform_coupon_cost_amount"),
        CheckConstraint(
            "(discount_id IS NOT NULL) <> (bundle_coupon_id IS NOT NULL)",
            name="ck_platform_coupon_cost_source",
        ),
        Index("ix_platform_coupon_costs_created_at", "created_at"),
        {"schema": "public"},
    )

    purchase_item_id: Mapped[UUID] = mapped_column(ForeignKey("public.purchase_items.id"), primary_key=True)
    discount_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.discounts.id"))
    bundle_coupon_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.bundle_coupons.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refund_transaction_id: Mapped[UUID | None] = mapped_column(ForeignKey("public.transactions.id"))
