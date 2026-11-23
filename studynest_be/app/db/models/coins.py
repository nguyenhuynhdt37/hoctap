from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.database import Base


class UserPaidCoinBalances(Base):
    """Số dư Coin thật (nạp bằng tiền). Coin thưởng nằm ở `user_peak_balances`."""

    __tablename__ = "user_paid_coin_balances"
    __table_args__ = (
        CheckConstraint("balance >= 0", name="chk_user_paid_coin_balances_positive"),
        {"schema": "public"},
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("public.user.id", ondelete="CASCADE"), primary_key=True)
    balance: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(True), nullable=False, server_default=func.now())
