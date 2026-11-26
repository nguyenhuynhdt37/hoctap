import uuid
from decimal import Decimal

from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.contracts import DigitalContracts
from app.db.models.database import (
    Role,
    Transactions,
    User,
    UserRoles,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.coin_math import price_to_coin
from app.services.coin_service import CoinService
from app.services.coupon_settlement import billing_policy
from app.services.shares.notification import NotificationService

SESSION = Depends(get_session)


class LecturerService:
    """Service quản lý học tập của người dùng."""

    def __init__(
        self,
        db: AsyncSession = SESSION,
    ):
        self.db = db

    async def get_instructor_courses_async(self, lecturer_id, user_id=None, **values):
        from app.schemas.user.instructors import InstructorCourseFilters
        from app.services.user.instructor_discovery import InstructorDiscoveryService

        values = {key: value for key, value in values.items() if value is not None}
        return await InstructorDiscoveryService(self.db).courses(
            lecturer_id, InstructorCourseFilters(**values), user_id
        )

    async def get_instructor_detail_async(self, lecturer_id):
        from app.services.user.instructor_discovery import InstructorDiscoveryService

        return await InstructorDiscoveryService(self.db).detail(lecturer_id)

    async def get_top4_instructors_async(self):
        from app.schemas.user.instructors import InstructorFilters
        from app.services.user.instructor_discovery import InstructorDiscoveryService

        return (
            await InstructorDiscoveryService(self.db).listing(
                InstructorFilters(sort="rating", limit=4, include_total=False)
            )
        )["items"]

    async def become_instructor_async(
        self, user: User, notification_service: NotificationService
    ):
        FEE = 1_000_000

        async with self.db.begin_nested():  # Transaction ACID full
            # 0) Khóa hàng user để chống trừ 100 Coin 2 lần nếu gửi trùng request đồng thời
            await self.db.scalar(
                select(User.id).where(User.id == user.id).with_for_update()
            )

            # 1) Kiểm tra đã là giảng viên chưa (truy vấn trực tiếp tránh lazy-load MissingGreenlet)
            existing_lecturer = await self.db.scalar(
                select(UserRoles.id)
                .join(Role, Role.id == UserRoles.role_id)
                .where(UserRoles.user_id == user.id, Role.role_name == "LECTURER")
                .limit(1)
            )
            if existing_lecturer is not None:
                raise HTTPException(400, "Bạn đã là giảng viên rồi")

            # 1b) BẮT BUỘC phải đã ký Hợp đồng Khung Giảng viên điện tử (LECTURER_MASTER)
            signed_contract = await self.db.scalar(
                select(DigitalContracts)
                .where(
                    DigitalContracts.party_b_user_id == user.id,
                    DigitalContracts.contract_type == "LECTURER_MASTER",
                    DigitalContracts.status.in_(["signed", "countersigned"]),
                )
                .order_by(desc(DigitalContracts.signed_at))
                .limit(1)
            )
            if not signed_contract:
                raise HTTPException(
                    400,
                    "Bạn cần hoàn tất ký Hợp đồng Khung Giảng viên điện tử trước khi kích hoạt tư cách Giảng viên.",
                )

            # 2) Trả phí bằng Coin (1.000.000đ quy đổi theo tỷ giá nền tảng = 100 Coin); thiếu Coin thật thì từ chối
            transaction_id = uuid.uuid4()
            policy = await billing_policy(self.db)
            fee_coin = price_to_coin(Decimal(FEE), policy.coin_vnd_rate)
            await CoinService(self.db).debit_for_purchase_async(
                user.id, fee_coin, ref_id=transaction_id
            )

            # 3) Lấy/tạo role LECTURER
            lecturer_role = await self.db.scalar(
                select(Role).where(Role.role_name == "LECTURER")
            )
            if not lecturer_role:
                lecturer_role = Role(
                    role_name="LECTURER",
                    details="Instructor of the system",
                )
                self.db.add(lecturer_role)
                await self.db.flush()

            # 4) Thêm user role
            self.db.add(UserRoles(user_id=user.id, role_id=lecturer_role.id))

            # 5) Log transaction trước rồi gắn liên kết 1-1 với Hợp đồng điện tử đã ký (đảm bảo thứ tự FK)
            transaction = Transactions(
                id=transaction_id,
                user_id=user.id,
                amount=FEE,
                currency="VND",
                type="fee",
                method="wallet",
                direction="out",
                status="completed",
                description=f"Đăng ký trở thành giảng viên ({fee_coin} Coin · HĐ {signed_contract.contract_number})",
                created_at=get_now(),
            )
            self.db.add(transaction)
            await self.db.flush()
            signed_contract.transaction_id = transaction_id
            await self.db.flush()

        # Commit tường minh toàn bộ giao dịch trừ Coin & cấp quyền LECTURER
        await self.db.commit()

        # ============================
        #   Gửi thông báo sau commit (best-effort, không làm fail phản hồi sau khi đã kích hoạt)
        # ============================
        notifications_to_send = [
            NotificationCreateSchema(
                user_id=user.id,
                roles=["USER", "LECTURER"],
                title="Trừ Coin đăng ký giảng viên",
                content=f"{fee_coin:,} Coin đã được trừ khỏi tài khoản của bạn cho HĐ {signed_contract.contract_number}.",
                url="/lecturer/wallets",
                type="wallet",
                role_target=["USER", "LECTURER"],
                metadata={"transaction_id": str(transaction_id)},
                action="open_url",
            ),
            NotificationCreateSchema(
                user_id=user.id,
                roles=["USER", "LECTURER"],
                title="Đăng ký giảng viên thành công",
                content="Bạn đã chính thức trở thành giảng viên Mây Mây.",
                url="/lecturer",
                type="lecturer",
                role_target=["USER", "LECTURER"],
                metadata={"transaction_id": str(transaction_id)},
                action="open_url",
            ),
            NotificationCreateSchema(
                user_id=None,
                roles=["ADMIN"],
                title=f"{user.fullname} đã trở thành giảng viên",
                content=f"Người dùng {user.fullname} đã đăng ký trở thành giảng viên.",
                url=f"/admin/lecturers/{user.id}",
                type="lecturer",
                role_target=["ADMIN"],
                metadata={"lecturer_id": str(user.id)},
                action="open_url",
            ),
        ]
        for payload in notifications_to_send:
            try:
                await notification_service.create_notification_async(payload)
            except Exception as noti_err:
                logger.warning(
                    f"[LecturerService][become] Không thể gửi thông báo sau kích hoạt: {noti_err}"
                )

        return {
            "message": "Đăng ký giảng viên thành công",
            "fee_coin": fee_coin,
            "transaction_id": str(transaction_id),
            "contract_number": signed_contract.contract_number,
        }
