from decimal import Decimal

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.models.database import InstructorEarnings, Transactions, User, Wallets
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.instructor_coin import credit_instructor_earning_async
from app.services.shares.notification import NotificationService


class EarningsService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        notification_service: NotificationService = Depends(NotificationService),
    ):
        self.db = db
        self.notification_service = notification_service

    async def release_due_earnings_async(self) -> dict:
        """
        Giải phóng earnings:
        - Tìm tất cả InstructorEarnings.status = 'holding' và hold_until <= now
        - Cộng tiền vào ví giảng viên (wallets)
        - Tạo transaction type='earning_release'
        - Cập nhật earnings → status='pending', available_at = now
        """
        now = get_now()

        # 1) Lấy danh sách earnings đến hạn
        earnings = (
            (
                await self.db.execute(
                    select(InstructorEarnings).where(
                        InstructorEarnings.status == "holding",
                        InstructorEarnings.hold_until <= now,
                    )
                )
            )
            .scalars()
            .all()
        )

        if not earnings:
            return {
                "released_count": 0,
                "message": "Không có earnings nào đến hạn giải phóng.",
            }

        released_count = 0

        # 2) Xử lý từng earning trong 1 transaction lớn
        async with self.db.begin_nested():
            for earn in earnings:
                amount = Decimal(str(earn.amount_instructor or 0))
                if amount <= 0:
                    # Earning lỗi dữ liệu → bỏ qua
                    continue

                # 2.1 Lấy / tạo ví giảng viên
                wallet = await self.db.scalar(
                    select(Wallets).where(Wallets.user_id == earn.instructor_id)
                )
                if wallet is None:
                    wallet = Wallets(
                        user_id=earn.instructor_id,
                        balance=Decimal("0"),
                        total_in=Decimal("0"),
                        total_out=Decimal("0"),
                    )
                    self.db.add(wallet)
                    await self.db.flush()

                # 2.2 Cộng tiền vào ví giảng viên
                await credit_instructor_earning_async(self.db, wallet, amount, earning_id=earn.id)
                wallet.last_transaction_at = now
                wallet.updated_at = now

                # 2.3 Tạo transaction lịch sử ví
                tx = Transactions(
                    user_id=earn.instructor_id,
                    amount=amount,
                    type="earning_release",
                    currency="VND",
                    direction="in",
                    method="internal",
                    gateway="internal",
                    status="completed",
                    description=(
                        f"Giải phóng thu nhập khóa học (transaction_id={earn.transaction_id})"
                    ),
                    created_at=now,
                    confirmed_at=now,
                )
                self.db.add(tx)
                await self.db.flush()

                # 2.4 Cập nhật earnings
                earn.status = "pending"  # hoặc 'available' nếu bạn muốn
                earn.available_at = now
                earn.updated_at = (
                    now if hasattr(earn, "updated_at") else earn.created_at
                )

                released_count += 1

                # 2.5 Gửi thông báo cho giảng viên (không fail cả batch nếu noti lỗi)
                try:
                    instructor = await self.db.scalar(
                        select(User).where(User.id == earn.instructor_id)
                    )
                    if instructor:
                        roles = await AuthorizationService.get_list_role_in_user(
                            instructor
                        )
                        await self.notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=earn.instructor_id,
                                roles=roles,
                                title="Thu nhập khóa học đã được giải phóng 💰",
                                content=(
                                    f"Số tiền {amount:,.0f} VND từ doanh thu khóa học "
                                    f"đã được cộng vào ví của bạn."
                                ),
                                url="lecturer/wallet/transactions",
                                type="earning",
                                role_target=["LECTURER"],
                                metadata={
                                    "earning_id": str(earn.id),
                                    "transaction_id": str(tx.id),
                                },
                                action="open_url",
                            )
                        )
                except Exception:
                    # Log lại là được, không raise để khỏi rollback cả batch
                    # logger.warning(f"Không gửi được noti cho giảng viên {earn.instructor_id}: {e}")
                    pass

        await self.db.commit()

        return {
            "released_count": released_count,
            "message": f"Đã giải phóng {released_count} earnings.",
        }
