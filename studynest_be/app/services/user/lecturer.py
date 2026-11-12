import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import (
    Role,
    Transactions,
    User,
    UserRoles,
    Wallets,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
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
            # 1) Kiểm tra đã là giảng viên chưa
            for ur in user.user_roles:
                if ur.role and ur.role.role_name == "LECTURER":
                    raise HTTPException(400, "Bạn đã là giảng viên rồi")

            # 2) Lấy ví
            wallet = await self.db.scalar(
                select(Wallets).where(Wallets.user_id == user.id)
            )
            if not wallet:
                raise HTTPException(404, "Không tìm thấy ví")

            if wallet.balance < FEE:
                raise HTTPException(
                    400, f"Bạn cần {FEE:,} VNĐ để đăng ký làm giảng viên"
                )

            # 3) Trừ tiền
            wallet.balance -= FEE
            wallet.updated_at = get_now()

            # 4) Lấy/tạo role LECTURER
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

            # 5) Thêm user role
            self.db.add(UserRoles(user_id=user.id, role_id=lecturer_role.id))

            # 6) Log transaction
            transaction = Transactions(
                id=uuid.uuid4(),
                user_id=user.id,
                amount=FEE,
                currency="VND",
                type="fee",
                method="wallet",
                direction="out",
                status="completed",
                description="Đăng ký trở thành giảng viên",
                created_at=get_now(),
            )
            self.db.add(transaction)
            await self.db.flush()

        # ============================
        #   Gửi thông báo sau commit
        # ============================
        await notification_service.create_notification_async(
            NotificationCreateSchema(
                user_id=user.id,
                roles=["USER", "LECTURER"],
                title="Trừ tiền đăng ký giảng viên 💰",
                content=f"Số tiền {FEE:,} VNĐ đã được trừ khỏi ví của bạn.",
                url="/lecturer/wallets",
                type="wallet",
                role_target=["USER", "LECTURER"],
                metadata={"transaction_id": str(transaction.id)},
                action="open_url",
            )
        )

        await notification_service.create_notification_async(
            NotificationCreateSchema(
                user_id=user.id,
                roles=["USER", "LECTURER"],
                title="Đăng ký giảng viên thành công 🎉",
                content="Bạn đã chính thức trở thành giảng viên.",
                url="/lecturer",
                type="lecturer",
                role_target=["USER", "LECTURER"],
                metadata={"transaction_id": str(transaction.id)},
                action="open_url",
            )
        )

        await notification_service.create_notification_async(
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
            )
        )

        return {"message": "Đăng ký giảng viên thành công"}
