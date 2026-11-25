import uuid
from io import BytesIO

import pandas as pd
from fastapi import Depends, HTTPException, Response
from sqlalchemy import asc, delete, desc, func, insert, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.services.shares.auth import revoke_user_sessions_async
from app.db.models.coins import UserPaidCoinBalances
from app.db.models.database import (
    Courses,
    CourseSections,
    InstructorEarnings,
    PlatformSettings,
    Role,
    Transactions,
    User,
    UserPeakBalances,
    UserRoles,
    Wallets,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.libs.formats.datetime import to_utc_naive
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.shares.notification import NotificationService


class LecturerService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def get_lecturers_async(
        self,
        is_verified_email: bool | None,
        is_banned: bool | None,
        search: str | None,
        sort_by: str,
        order: str,
        page: int,
        size: int,
    ):
        # 🔹 Base query: lấy user có role 'LECTURER' kèm số dư Coin thật & Coin thưởng
        paid_col = func.coalesce(UserPaidCoinBalances.balance, 0)
        bonus_col = func.coalesce(UserPeakBalances.current_balance, 0)

        stmt = (
            select(
                User,
                paid_col.label("paid_coins"),
                bonus_col.label("bonus_coins"),
            )
            .join(UserRoles, UserRoles.user_id == User.id)
            .join(Role, Role.id == UserRoles.role_id)
            .outerjoin(UserPaidCoinBalances, UserPaidCoinBalances.user_id == User.id)
            .outerjoin(UserPeakBalances, UserPeakBalances.user_id == User.id)
            .options(selectinload(User.user_roles).selectinload(UserRoles.role))
            .where(
                Role.role_name == "LECTURER",
                Role.role_name != "ADMIN",
                User.deleted_at.is_(None),
            )
            .group_by(User.id, UserPaidCoinBalances.balance, UserPeakBalances.current_balance)
        )

        # 🔹 Bộ lọc nâng cao
        if is_verified_email is not None:
            stmt = stmt.where(User.is_verified_email.is_(is_verified_email))
        if is_banned is not None:
            stmt = stmt.where(User.is_banned.is_(is_banned))
        if search:
            stmt = stmt.where(
                or_(
                    User.fullname.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.citizenship_identity.ilike(f"%{search}%"),
                )
            )

        # 🔹 Đếm tổng số giảng viên
        subquery = stmt.subquery()
        total_items = (
            await self.db.scalar(select(func.count()).select_from(subquery)) or 0
        )

        sort_fields = {
            "course_count": User.course_count,
            "rating_avg": User.rating_avg,
            "evaluated_count": User.evaluated_count,
            "student_count": User.student_count,
            "wallet_balance": paid_col,
        }

        sort_column = sort_fields.get(sort_by, getattr(User, sort_by, User.create_at))
        sort_expr = sort_column.asc() if order.lower() == "asc" else sort_column.desc()

        stmt = stmt.order_by(sort_expr).offset((page - 1) * size).limit(size)

        # 🔹 Thực thi truy vấn
        result = await self.db.execute(stmt)
        records = result.all()

        # 🔹 Map dữ liệu trả về
        lecturers = []
        for user, paid_coins, bonus_coins in records:
            paid_int = int(paid_coins or 0)
            bonus_int = int(bonus_coins or 0)
            lecturers.append(
                {
                    "id": user.id,
                    "fullname": user.fullname,
                    "email": user.email,
                    "avatar": user.avatar,
                    "bio": user.bio,
                    "citizenship_identity": user.citizenship_identity,
                    "birthday": user.birthday,
                    "conscious": user.conscious,
                    "district": user.district,
                    "course_count": user.course_count or 0,
                    "student_count": user.student_count or 0,
                    "evaluated_count": user.evaluated_count or 0,
                    "rating_avg": round(float(user.rating_avg or 0), 2),
                    "instructor_description": user.instructor_description,
                    "wallet_balance": paid_int,
                    "paid_coins": paid_int,
                    "bonus_coins": bonus_int,
                    "is_verified_email": user.is_verified_email,
                    "is_banned": user.is_banned,
                    "create_at": user.create_at,
                    "update_at": user.update_at,
                }
            )

        total_pages = (total_items + size - 1) // size

        return {
            "page": page,
            "size": size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "items": lecturers,
        }

    async def export_lecturers_async(self):
        """
        📘 Xuất danh sách giảng viên cùng thông tin ví.
        """
        stmt = (
            select(
                User,
                Wallets.balance.label("wallet_balance"),
            )
            .join(UserRoles, UserRoles.user_id == User.id)
            .join(Role, Role.id == UserRoles.role_id)
            .join(Wallets, Wallets.user_id == User.id, isouter=True)
            .options(selectinload(User.user_roles).selectinload(UserRoles.role))
            .where(
                Role.role_name == "LECTURER",
                Role.role_name != "ADMIN",
                User.deleted_at.is_(None),
            )
            .group_by(
                User.id,
                Wallets.balance,
            )
        )

        result = await self.db.execute(stmt)
        records = result.fetchall()

        if not records:
            raise Exception("Không có giảng viên nào để xuất Excel")

        lecturers = []
        for (
            user,
            wallet_balance,
        ) in records:
            lecturers.append(
                {
                    "Mã giảng viên": str(user.id),
                    "Họ tên": user.fullname,
                    "Email": user.email,
                    "CCCD": user.citizenship_identity,
                    "Ngày sinh": user.birthday,
                    "Địa chỉ": f"{user.district or ''}, {user.conscious or ''}",
                    "Ảnh đại diện": user.avatar,
                    "Bio": user.bio,
                    "Số khóa học": user.course_count or 0,
                    "Tổng học viên": user.student_count or 0,
                    "Số lượt đánh giá": user.evaluated_count or 0,
                    "Điểm trung bình": float(user.rating_avg or 0),
                    "Số dư ví (VNĐ)": float(wallet_balance or 0),
                    "Trạng thái Email": (
                        "✅ Đã xác minh"
                        if user.is_verified_email
                        else "❌ Chưa xác minh"
                    ),
                    "Bị cấm": "🚫 Có" if user.is_banned else "✅ Không",
                    "Ngày tạo tài khoản": user.create_at,
                }
            )

        # 🔹 Ghi Excel
        df = pd.DataFrame(lecturers)
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="GiangVien", index=False)

        output.seek(0)

        headers = {
            "Content-Disposition": 'attachment; filename="lecturers_with_payments.xlsx"'
        }

        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers,
        )

    async def delete_lecture_async(
        self, admin: User, lecturer_id: uuid.UUID, reason: str
    ):
        try:
            # 🔹 Subquery: user chỉ có role "user" (hoặc chưa có role)
            only_user_subq = (
                select(UserRoles.user_id)
                .join(Role, Role.id == UserRoles.role_id)
                .group_by(UserRoles.user_id)
                .having(
                    func.max(Role.role_name) != "ADMIN",
                )
            )

            # 🔹 Lấy user hợp lệ
            user = await self.db.scalar(
                select(User).where(
                    User.id == lecturer_id,
                    or_(
                        User.id.in_(only_user_subq),
                        ~User.id.in_(select(UserRoles.user_id)),
                    ),
                )
            )

            if not user:
                raise HTTPException(
                    status_code=403,
                    detail="Chỉ có thể xóa giảng viên thường (user)",
                )

            if user.id == admin.id:
                raise HTTPException(
                    status_code=409,
                    detail="Không thể xóa tài khoản của chính mình",
                )

            user.deleted_at = await to_utc_naive(get_now())
            user.deleted_until = reason or "Không có lý do cụ thể"
            user.update_at = await to_utc_naive(get_now())

            await revoke_user_sessions_async(self.db, user.id)
            await self.db.commit()
            await self.db.refresh(user)

            return {
                "message": "Xóa giảng viên thành công",
                "user_id": str(user.id),
                "deleted_at": user.deleted_at,
                "deleted_until": user.deleted_until,
            }

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giảng viên: {e}")

    async def get_lecturer_detail_async(
        self,
        lecturer_id: str,
        page: int = 1,
        page_size: int = 5,
    ):
        """Lấy chi tiết giảng viên kèm phân trang giao dịch."""
        # 1️⃣ Thông tin giảng viên
        lecturer: User | None = await self.db.scalar(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRoles.role))
            .where(User.id == lecturer_id)
        )
        if not lecturer:
            raise HTTPException(404, "Không tìm thấy giảng viên")

        # 2️⃣ Ví & Số dư Coin thực tế (UserPaidCoinBalances + UserPeakBalances + InstructorEarnings)
        wallet = await self.db.scalar(
            select(Wallets).where(Wallets.user_id == lecturer_id)
        )
        paid_coins = await self.db.scalar(
            select(UserPaidCoinBalances.balance).where(
                UserPaidCoinBalances.user_id == lecturer_id
            )
        )
        bonus_coins = await self.db.scalar(
            select(UserPeakBalances.current_balance).where(
                UserPeakBalances.user_id == lecturer_id
            )
        )
        total_earnings_vnd = await self.db.scalar(
            select(func.coalesce(func.sum(InstructorEarnings.amount_instructor), 0)).where(
                InstructorEarnings.instructor_id == lecturer_id
            )
        )
        ps = (await self.db.execute(select(PlatformSettings))).scalars().first()
        coin_vnd_rate = int(getattr(ps, "coin_vnd_rate", 10000) or 10000)

        # 3️⃣ Giao dịch (phân trang + sắp xếp)
        offset = (page - 1) * page_size
        tx_query = (
            select(Transactions)
            .where(Transactions.user_id == lecturer_id)
            .order_by(desc(Transactions.created_at))
            .offset(offset)
            .limit(page_size)
        )
        result_tx = await self.db.execute(tx_query)
        transactions = result_tx.scalars().all()

        # 5️⃣ Tổng số giao dịch để tính tổng trang
        total_tx = await self.db.scalar(
            select(func.count()).select_from(
                select(Transactions.id)
                .where(Transactions.user_id == lecturer_id)
                .subquery()
            )
        )

        # 6️⃣ Chuẩn hóa trả về
        return {
            "id": str(lecturer.id),
            "fullname": lecturer.fullname,
            "email": lecturer.email,
            "avatar": lecturer.avatar,
            "bio": lecturer.bio,
            "is_banned": lecturer.is_banned,
            "banned_reason": lecturer.banned_reason,
            "banned_until": lecturer.banned_until,
            "citizenship_identity": lecturer.citizenship_identity,
            "birthday": lecturer.birthday,
            "conscious": lecturer.conscious,
            "district": lecturer.district,
            "course_count": lecturer.course_count,
            "student_count": lecturer.student_count,
            "evaluated_count": lecturer.evaluated_count,
            "rating_avg": round(float(lecturer.rating_avg or 0), 2),
            "instructor_description": lecturer.instructor_description,
            "create_at": lecturer.create_at,
            "update_at": lecturer.update_at,
            "is_verified_email": lecturer.is_verified_email,
            "wallet": {
                "balance": int(paid_coins or 0),
                "paid_coins": int(paid_coins or 0),
                "bonus_coins": int(bonus_coins or 0),
                "coin_vnd_rate": coin_vnd_rate,
                "total_earnings_vnd": round(float(total_earnings_vnd or 0), 2),
                "total_in": round(float(wallet.total_in or 0), 2) if wallet else 0,
                "total_out": round(float(wallet.total_out or 0), 2) if wallet else 0,
                "last_transaction_at": wallet.last_transaction_at if wallet else None,
            },
            "transactions": [
                {
                    "id": str(tx.id),
                    "amount": round(float(tx.amount), 2),
                    "type": tx.type,
                    "method": tx.method,
                    "status": tx.status,
                    "transaction_code": tx.transaction_code,
                    "description": tx.description,
                    "created_at": tx.created_at,
                    "confirmed_at": tx.confirmed_at,
                }
                for tx in transactions
            ],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total_tx or 0,
                "total_pages": (
                    (total_tx + page_size - 1) // page_size if total_tx else 0
                ),
            },
        }

    # -------------------------------
    # 2️⃣ Hàm phụ: phân trang & sắp xếp khóa học
    # -------------------------------
    async def get_lecturer_courses_async(
        self,
        lecturer_id: str,
        page: int = 1,
        size: int = 5,
        sort_by: str = "created_at",
        order: str = "desc",
    ):
        """Phân trang + sắp xếp danh sách khóa học của giảng viên."""

        # kiểm tra giảng viên có tồn tại
        exists = await self.db.scalar(
            select(func.count()).select_from(User).where(User.id == lecturer_id)
        )
        if not exists:
            raise HTTPException(404, "Giảng viên không tồn tại")

        # danh sách cột hợp lệ để sắp xếp
        allowed_sort_fields = {
            "title": Courses.title,
            "views": Courses.views,
            "price": Courses.base_price,
            "total_enrolls": Courses.total_enrolls,
            "total_reviews": Courses.total_reviews,
            "rating": Courses.rating_avg,
            "created_at": Courses.created_at,
            "updated_at": Courses.updated_at,
        }
        sort_column = allowed_sort_fields.get(sort_by, Courses.created_at)
        sort_direction = desc if order.lower() == "desc" else asc

        # tổng số khóa học
        total_courses = await self.db.scalar(
            select(func.count())
            .select_from(Courses)
            .where(Courses.instructor_id == lecturer_id)
        )
        total_pages = (total_courses + size - 1) // size
        offset = (page - 1) * size

        # truy vấn dữ liệu
        result_courses = await self.db.execute(
            select(Courses)
            .options(
                selectinload(Courses.course_sections).selectinload(
                    CourseSections.lessons
                )
            )
            .where(Courses.instructor_id == lecturer_id)
            .order_by(sort_direction(sort_column))
            .offset(offset)
            .limit(size)
        )
        courses = result_courses.scalars().all()

        # trả về cấu trúc phân trang chuẩn
        return {
            "page": page,
            "size": size,
            "total_items": total_courses,
            "total_pages": total_pages,
            "sort_by": sort_by,
            "order": order,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "items": [
                {
                    "id": str(course.id),
                    "title": course.title,
                    "slug": course.slug,
                    "thumbnail": course.thumbnail_url,
                    "description": course.description,
                    "price": float(course.base_price or 0),
                    "rating_avg": float(course.rating_avg or 0),
                    "rating_count": float(course.rating_count or 0),
                    "total_reviews": float(course.total_reviews or 0),
                    "total_enrolls": course.total_enrolls or 0,
                    "views": course.views or 0,
                    "language": course.language,
                    "level": course.level,
                    "is_published": course.is_published,
                    "created_at": course.created_at,
                    "updated_at": course.updated_at,
                    "sections": [
                        {
                            "id": str(section.id),
                            "title": section.title,
                            "position": section.position,
                            "lessons": [
                                {
                                    "id": str(lesson.id),
                                    "title": lesson.title,
                                    "lesson_type": lesson.lesson_type,
                                    "position": lesson.position,
                                }
                                for lesson in section.lessons
                            ],
                        }
                        for section in course.course_sections
                    ],
                }
                for course in courses
            ],
        }

    async def ban_lecturer_async(self, admin: User, lecturer_id: uuid.UUID, schema):
        """Chặn giảng viên (role = 'LECTURER')."""
        try:
            # 1️⃣ Subquery: chỉ lấy user có role 'LECTURER'
            lecturer_subq = (
                select(UserRoles.user_id)
                .join(Role, Role.id == UserRoles.role_id)
                .group_by(UserRoles.user_id)
                .having(func.max(Role.role_name) == "LECTURER")
            )

            # 2️⃣ Lấy giảng viên hợp lệ
            lecturer = await self.db.scalar(
                select(User).where(
                    User.id == lecturer_id,
                    User.id.in_(lecturer_subq),
                )
            )

            if not lecturer:
                raise HTTPException(
                    403, "Chỉ được chặn người có vai trò giảng viên (lecturer)."
                )

            if lecturer.id == admin.id:
                raise HTTPException(409, "Không thể tự chặn chính mình.")

            if lecturer.is_banned:
                raise HTTPException(409, "Giảng viên đang trong thời gian bị chặn.")

            # 3️⃣ Thực hiện chặn
            lecturer.is_banned = True
            lecturer.banned_reason = schema.banned_reason
            if schema.is_block_permanently:
                lecturer.banned_until = None
            else:
                lecturer.banned_until = await to_utc_naive(schema.banned_until or get_now())
            lecturer.update_at = await to_utc_naive(get_now())

            await revoke_user_sessions_async(self.db, lecturer.id)
            await self.db.commit()
            await self.db.refresh(lecturer)

            # ✅ GỬI THÔNG BÁO CHO GIẢNG VIÊN
            notification_service = NotificationService(self.db)
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=lecturer.id,
                    title="⚠️ Tài khoản giảng viên bị tạm khóa",
                    content=f"Tài khoản của bạn đã bị tạm khóa. Lý do: {schema.banned_reason or 'Không có lý do cụ thể'}.",
                    type="account",
                    role_target=["LECTURER"],
                    url="/lecturer/settings",
                )
            )

            return {"message": "Đã chặn giảng viên thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi chặn giảng viên: {e}")

    async def unlock_ban_lecturer_async(self, admin: User, lecturer_id: uuid.UUID):
        """Gỡ chặn giảng viên."""
        try:
            # 1️⃣ Subquery: chỉ lấy user có role 'LECTURER'
            lecturer_subq = (
                select(UserRoles.user_id)
                .join(Role, Role.id == UserRoles.role_id)
                .group_by(UserRoles.user_id)
                .having(func.max(Role.role_name) == "LECTURER")
            )

            # 2️⃣ Lấy giảng viên hợp lệ
            lecturer = await self.db.scalar(
                select(User).where(
                    User.id == lecturer_id,
                    User.id.in_(lecturer_subq),
                )
            )

            if not lecturer:
                raise HTTPException(403, "Chỉ được mở chặn giảng viên.")

            if lecturer.id == admin.id:
                raise HTTPException(409, "Không thể tự mở chặn chính mình.")

            if not lecturer.is_banned:
                raise HTTPException(409, "Giảng viên chưa từng bị chặn.")

            # 3️⃣ Gỡ chặn
            lecturer.is_banned = False
            lecturer.banned_reason = None
            lecturer.banned_until = None
            lecturer.update_at = get_now()

            await self.db.commit()
            await self.db.refresh(lecturer)

            # ✅ GỬI THÔNG BÁO CHO GIẢNG VIÊN
            notification_service = NotificationService(self.db)
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=lecturer.id,
                    title="✅ Tài khoản giảng viên đã được mở khóa",
                    content="Tài khoản của bạn đã được mở khóa. Bạn có thể tiếp tục hoạt động bình thường.",
                    type="account",
                    role_target=["LECTURER"],
                    url="/lecturer/dashboard",
                )
            )

            return {"message": "Đã mở chặn giảng viên thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi mở chặn giảng viên: {e}")

    async def remove_instructor_rights_async(
        self,
        admin: User,
        lecturer_id: uuid.UUID,
    ):
        """Gỡ quyền giảng viên (LECTURER) của user."""
        try:
            # 1️⃣ Kiểm tra user có đúng role LECTURER không
            user_role = await self.db.scalar(
                select(UserRoles)
                .join(Role, Role.id == UserRoles.role_id)
                .where(UserRoles.user_id == lecturer_id, Role.role_name == "LECTURER")
            )

            if not user_role:
                raise HTTPException(403, "Chỉ được gỡ quyền giảng viên (LECTURER).")

            if lecturer_id == admin.id:
                raise HTTPException(
                    409, "Không thể tự gỡ quyền giảng viên của chính mình."
                )

            # 2️⃣ Thực hiện xóa quyền giảng viên
            await self.db.execute(
                delete(UserRoles).where(
                    UserRoles.user_id == lecturer_id,
                    UserRoles.role_id == user_role.role_id,
                )
            )

            await self.db.commit()

            # ✅ GỬI THÔNG BÁO CHO USER
            notification_service = NotificationService(self.db)
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=lecturer_id,
                    title="⚠️ Quyền giảng viên đã bị thu hồi",
                    content="Quyền giảng viên của bạn đã bị thu hồi bởi quản trị viên. Liên hệ hỗ trợ nếu bạn có thắc mắc.",
                    type="account",
                    role_target=["USER"],
                    url="/support",
                )
            )

            return {"message": "Đã gỡ quyền giảng viên thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi gỡ quyền giảng viên: {e}")

    async def add_instructor_rights_async(
        self,
        admin: User,
        user_id: uuid.UUID,
    ):
        """Cấp quyền giảng viên (LECTURER) cho user."""
        try:
            # 1️⃣ Kiểm tra user tồn tại
            user = await self.db.scalar(select(User).where(User.id == user_id))
            if not user:
                raise HTTPException(404, "Không tìm thấy người dùng cần cấp quyền.")

            if user.id == admin.id:
                raise HTTPException(409, "Không thể tự cấp quyền cho chính mình.")

            # 2️⃣ Lấy role giảng viên
            lecturer_role = await self.db.scalar(
                select(Role).where(Role.role_name == "LECTURER")
            )
            if not lecturer_role:
                raise HTTPException(
                    404, "Không tìm thấy role 'LECTURER' trong hệ thống."
                )

            # 3️⃣ Kiểm tra user đã có role giảng viên chưa
            has_role = await self.db.scalar(
                select(UserRoles).where(
                    UserRoles.user_id == user_id,
                    UserRoles.role_id == lecturer_role.id,
                )
            )
            if has_role:
                raise HTTPException(409, "Người dùng này đã là giảng viên.")

            # 4️⃣ Thêm quyền giảng viên
            await self.db.execute(
                insert(UserRoles).values(
                    user_id=user_id,
                    role_id=lecturer_role.id,
                    create_at=await to_utc_naive(get_now()),
                    update_at=await to_utc_naive(get_now()),
                )
            )
            await self.db.commit()

            # ✅ GỬI THÔNG BÁO CHO USER
            notification_service = NotificationService(self.db)
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=user_id,
                    title="🎉 Chúc mừng! Bạn đã được cấp quyền giảng viên",
                    content="Bạn đã được cấp quyền giảng viên. Bắt đầu tạo khóa học và chia sẻ kiến thức của bạn ngay!",
                    type="account",
                    role_target=["LECTURER"],
                    url="/lecturer/dashboard",
                )
            )

            return {"message": "Đã cấp quyền giảng viên thành công."}

        except HTTPException:
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi cấp quyền giảng viên: {e}")

    async def search_candidate_users_async(self, search: str | None = None, limit: int = 15):
        """Tìm thành viên đang hoạt động chưa có quyền LECTURER để thăng cấp 1 chạm."""
        lecturer_role = await self.db.scalar(
            select(Role).where(func.upper(Role.role_name) == "LECTURER")
        )
        lecturer_user_ids_subq = (
            select(UserRoles.user_id).where(UserRoles.role_id == lecturer_role.id)
            if lecturer_role
            else None
        )
        stmt = select(User).where(
            User.deleted_at.is_(None),
            User.is_banned.is_(False),
        )
        if lecturer_user_ids_subq is not None:
            stmt = stmt.where(User.id.not_in(lecturer_user_ids_subq))
        if search and search.strip():
            kw = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(func.coalesce(User.fullname, "")).ilike(kw),
                    func.lower(User.email).ilike(kw),
                )
            )
        rows = (
            await self.db.scalars(stmt.order_by(User.create_at.desc()).limit(limit))
        ).all()
        return [
            {
                "id": str(u.id),
                "fullname": u.fullname or "",
                "email": u.email,
                "avatar": u.avatar,
                "is_verified_email": bool(u.is_verified_email),
            }
            for u in rows
        ]

    async def create_lecturer_async(self, admin: User, payload):
        """Admin tạo mới tài khoản giảng viên trực tiếp kèm ví và role LECTURER."""
        from app.core.security import SecurityService

        email_clean = payload.email.strip().lower()
        existing = await self.db.scalar(
            select(User).where(func.lower(User.email) == email_clean)
        )
        if existing:
            raise HTTPException(409, "Email này đã tồn tại trong hệ thống.")

        now_utc = await to_utc_naive(get_now())
        hashed = await SecurityService.hash_password(payload.password)

        new_user = User(
            id=uuid.uuid4(),
            fullname=payload.fullname.strip(),
            email=email_clean,
            password_hash=hashed,
            bio=(payload.bio or "").strip() or None,
            instructor_description=(payload.instructor_description or "").strip() or None,
            conscious=(payload.conscious or "").strip() or None,
            district=(payload.district or "").strip() or None,
            is_verified_email=bool(payload.is_verified_email),
            email_verified_at=now_utc if payload.is_verified_email else None,
            is_banned=False,
            create_at=now_utc,
            update_at=now_utc,
        )
        self.db.add(new_user)
        await self.db.flush()

        # Tạo ví mặc định
        self.db.add(
            Wallets(
                id=uuid.uuid4(),
                user_id=new_user.id,
                balance=0,
                total_in=0,
                total_out=0,
                currency="VND",
                is_locked=False,
                kyc_verified=False,
                created_at=now_utc,
                updated_at=now_utc,
            )
        )

        # Gắn role LECTURER (và USER nếu có)
        roles = (
            await self.db.scalars(
                select(Role).where(func.upper(Role.role_name).in_(["LECTURER", "USER"]))
            )
        ).all()
        for r in roles:
            await self.db.execute(
                insert(UserRoles).values(
                    user_id=new_user.id,
                    role_id=r.id,
                    create_at=now_utc,
                    update_at=now_utc,
                )
            )

        await self.db.commit()
        return {
            "id": str(new_user.id),
            "fullname": new_user.fullname,
            "email": new_user.email,
            "message": "Đã tạo tài khoản giảng viên mới thành công.",
        }

    async def update_lecturer_async(self, admin: User, lecturer_id: uuid.UUID, payload):
        """Admin cập nhật đầy đủ hồ sơ giảng viên."""
        user = await self.db.scalar(
            select(User).where(User.id == lecturer_id, User.deleted_at.is_(None))
        )
        if not user:
            raise HTTPException(404, "Không tìm thấy giảng viên.")

        if payload.email is not None:
            email_clean = payload.email.strip().lower()
            if email_clean != (user.email or "").lower():
                dup = await self.db.scalar(
                    select(User).where(
                        func.lower(User.email) == email_clean, User.id != lecturer_id
                    )
                )
                if dup:
                    raise HTTPException(409, "Email này đã thuộc về tài khoản khác.")
                user.email = email_clean

        if payload.fullname is not None:
            user.fullname = payload.fullname.strip()
        if payload.bio is not None:
            user.bio = payload.bio.strip() or None
        if payload.instructor_description is not None:
            user.instructor_description = payload.instructor_description.strip() or None
        if payload.conscious is not None:
            user.conscious = payload.conscious.strip() or None
        if payload.district is not None:
            user.district = payload.district.strip() or None
        if payload.is_verified_email is not None:
            user.is_verified_email = bool(payload.is_verified_email)
            if payload.is_verified_email and not user.email_verified_at:
                user.email_verified_at = await to_utc_naive(get_now())

        user.update_at = await to_utc_naive(get_now())
        await self.db.commit()
        return {
            "id": str(user.id),
            "fullname": user.fullname,
            "email": user.email,
            "message": "Đã cập nhật hồ sơ giảng viên thành công.",
        }
