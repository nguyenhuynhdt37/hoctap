import uuid
from datetime import datetime

from fastapi import Depends, HTTPException
from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.models.database import (
    CourseEnrollments,
    Courses,
    InstructorEarnings,
    PurchaseItems,
    RefundRequests,
    Transactions,
    User,
    Wallets,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.shares.notification import NotificationService


class RefundService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def get_user_refund_courses(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 10,
        search: str | None = None,
        refund_status: str | None = None,
        course_id: uuid.UUID | None = None,
        instructor_id: uuid.UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        order_by: str = "created_at",
        order_dir: str = "desc",
    ):
        """
        Lấy danh sách yêu cầu hoàn tiền của học viên (full filter + search + sort + paging).
        """

        try:
            ACTIVE_STATUSES = [
                "requested",
                "instructor_approved",
                "instructor_rejected",
                "admin_approved",
            ]

            offset = (page - 1) * limit

            # Alias người dạy
            Instructor = aliased(User)

            # =====================================================
            # MAIN QUERY
            # =====================================================
            query = (
                select(
                    RefundRequests,
                    PurchaseItems,
                    Courses,
                    Instructor,
                )
                .join(
                    PurchaseItems, PurchaseItems.id == RefundRequests.purchase_item_id
                )
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(Instructor, Instructor.id == Courses.instructor_id)
                .where(RefundRequests.user_id == user_id)
                .where(RefundRequests.status.in_(ACTIVE_STATUSES))
            )

            # ========================= FILTER =========================
            if refund_status:
                query = query.where(RefundRequests.status == refund_status)

            if course_id:
                query = query.where(Courses.id == course_id)

            if instructor_id:
                query = query.where(Instructor.id == instructor_id)

            # ========================= SEARCH =========================
            if search:
                s = f"%{search.lower()}%"
                query = query.where(
                    or_(
                        func.lower(Courses.title).like(s),
                        func.lower(Instructor.fullname).like(s),
                        func.lower(RefundRequests.reason).like(s),
                        func.cast(RefundRequests.id, String).like(s),
                    )
                )

            # ========================= DATE RANGE ======================
            if date_from and date_to:
                query = query.where(
                    RefundRequests.created_at.between(date_from, date_to)
                )

            # ========================= SORTING ========================
            valid_orders = {
                "created_at": RefundRequests.created_at,
                "refund_amount": RefundRequests.refund_amount,
                "status": RefundRequests.status,
            }
            sort_col = valid_orders.get(order_by, RefundRequests.created_at)
            sort_col = sort_col.asc() if order_dir.lower() == "asc" else sort_col.desc()
            query = query.order_by(sort_col)

            # ========================= PAGING ==========================
            query = query.offset(offset).limit(limit)

            rows = (await self.db.execute(query)).all()

            # =====================================================
            # COUNT — dùng alias mới
            # =====================================================
            Instructor2 = aliased(User)

            count_query = (
                select(func.count())
                .select_from(RefundRequests)
                .join(
                    PurchaseItems, PurchaseItems.id == RefundRequests.purchase_item_id
                )
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(Instructor2, Instructor2.id == Courses.instructor_id)
                .where(RefundRequests.user_id == user_id)
                .where(RefundRequests.status.in_(ACTIVE_STATUSES))
            )

            # Same filters as SELECT
            if refund_status:
                count_query = count_query.where(RefundRequests.status == refund_status)

            if course_id:
                count_query = count_query.where(Courses.id == course_id)

            if instructor_id:
                count_query = count_query.where(Instructor2.id == instructor_id)

            if date_from and date_to:
                count_query = count_query.where(
                    RefundRequests.created_at.between(date_from, date_to)
                )

            if search:
                s = f"%{search.lower()}%"
                count_query = count_query.where(
                    or_(
                        func.lower(Courses.title).like(s),
                        func.lower(Instructor2.fullname).like(s),
                        func.lower(RefundRequests.reason).like(s),
                        func.cast(RefundRequests.id, String).like(s),
                    )
                )

            total = await self.db.scalar(count_query) or 0

            # =====================================================
            # BUILD RESPONSE
            # =====================================================
            items = []
            for refund, item, course, instructor in rows:
                items.append(
                    {
                        "refund_id": str(refund.id),
                        "refund_status": refund.status,
                        "refund_amount": float(refund.refund_amount),
                        "refund_reason": refund.reason,
                        "requested_at": refund.created_at,
                        "instructor_reviewed_at": refund.instructor_reviewed_at,
                        "admin_reviewed_at": refund.admin_reviewed_at,
                        "purchase": {
                            "purchase_item_id": str(item.id),
                            "original_price": float(item.original_price),
                            "discounted_price": float(item.discounted_price),
                            "status": item.status,
                            "created_at": item.created_at,
                        },
                        "course": {
                            "course_id": str(course.id),
                            "title": course.title,
                            "thumbnail": course.thumbnail_url,
                        },
                        "instructor": {
                            "id": str(instructor.id),
                            "fullname": instructor.fullname,
                            "avatar": instructor.avatar,
                        },
                    }
                )

            return {
                "page": page,
                "limit": limit,
                "total": total,
                "items": items,
            }

        except Exception as e:
            print("Error get_user_refund_courses:", e)
            raise HTTPException(500, "Không thể lấy danh sách hoàn tiền.")

    # ==========================================================
    # 2) KHÓA HỌC CÒN CÓ THỂ YÊU CẦU REFUND
    # ==========================================================
    async def get_user_refundable_courses(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        limit: int = 10,
    ):
        """
        Lấy danh sách khóa học học viên còn có thể refund.
        Điều kiện:
        - purchase completed
        - không free
        - earnings.status = 'holding'
        - now < earnings.hold_until
        - KHÔNG có bất kỳ refund_requests nào từng tạo (cho purchase_item đó)
        """

        try:
            now = get_now()
            offset = (page - 1) * limit

            # ======== Lấy danh sách purchase_item đã từng refund để loại ========
            refunded_items = (
                (
                    await self.db.execute(
                        select(RefundRequests.purchase_item_id).where(
                            RefundRequests.user_id == user_id
                        )
                    )
                )
                .scalars()
                .all()
            )

            # =====================================================
            # QUERY chính: lấy khóa học CÒN CÓ THỂ REFUND
            # =====================================================
            base_query = (
                select(
                    PurchaseItems,
                    Courses,
                    User,
                    InstructorEarnings,
                )
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(User, User.id == Courses.instructor_id)
                .join(
                    InstructorEarnings,
                    InstructorEarnings.transaction_id == PurchaseItems.transaction_id,
                    isouter=False,  # cần earnings để check hold_until
                )
                .where(PurchaseItems.user_id == user_id)
                .where(PurchaseItems.status == "completed")
                .where(PurchaseItems.discounted_price > 0)
                .where(InstructorEarnings.status == "holding")
                .where(InstructorEarnings.hold_until > now)
            )

            if refunded_items:
                base_query = base_query.where(~PurchaseItems.id.in_(refunded_items))

            query = (
                base_query.order_by(PurchaseItems.created_at.desc())
                .offset(offset)
                .limit(limit)
            )

            rows = (await self.db.execute(query)).all()

            # COUNT
            count_query = (
                select(func.count())
                .select_from(PurchaseItems)
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(User, User.id == Courses.instructor_id)
                .join(
                    InstructorEarnings,
                    InstructorEarnings.transaction_id == PurchaseItems.transaction_id,
                    isouter=False,
                )
                .where(PurchaseItems.user_id == user_id)
                .where(PurchaseItems.status == "completed")
                .where(PurchaseItems.discounted_price > 0)
                .where(InstructorEarnings.status == "holding")
                .where(InstructorEarnings.hold_until > now)
            )

            if refunded_items:
                count_query = count_query.where(~PurchaseItems.id.in_(refunded_items))

            total = (await self.db.scalar(count_query)) or 0

            # BUILD DATA
            data = []
            for item, course, instructor, earnings in rows:
                data.append(
                    {
                        "purchase_item_id": str(item.id),
                        "purchase_date": item.created_at,
                        # deadline = thời điểm hold_until (tiền còn bị giữ)
                        "deadline": earnings.hold_until if earnings else None,
                        "can_refund": True,
                        "original_price": float(item.original_price),
                        "discounted_price": float(item.discounted_price),
                        "course": {
                            "course_id": str(course.id),
                            "title": course.title,
                            "thumbnail": course.thumbnail_url,
                        },
                        "instructor": {
                            "id": str(instructor.id),
                            "fullname": instructor.fullname,
                            "avatar": instructor.avatar,
                        },
                        "earnings": {
                            "status": earnings.status if earnings else None,
                            "hold_until": earnings.hold_until if earnings else None,
                        },
                    }
                )

            return {
                "page": page,
                "limit": limit,
                "total": total,
                "items": data,
            }

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            print(f"Error in get_user_refundable_courses: {e}")
            raise HTTPException(
                500, "Có lỗi xảy ra khi lấy danh sách khóa học có thể hoàn tiền."
            )

    # ==========================================================
    # 3) TẠO YÊU CẦU HOÀN TIỀN
    # ==========================================================
    async def create_refund_request(
        self,
        user_id: uuid.UUID,
        purchase_item_id: uuid.UUID,
        reason: str,
        notification_service: NotificationService,
    ):
        """
        Tạo yêu cầu refund:
        - purchase phải thuộc user
        - discounted_price > 0
        - purchase.status = completed
        - earnings.status = holding
        - now < earnings.hold_until (đang còn hạn refund)
        - chưa từng có refund_request nào cho purchase_item đó
        """

        from app.db.models.learning_paths import BundleOrderLine
        from app.services.bundle_settlement import BundleSettlement
        bundle_line = await self.db.scalar(select(BundleOrderLine).where(BundleOrderLine.purchase_item_id == purchase_item_id))
        if bundle_line:
            return await BundleSettlement(self.db).request(bundle_line, user_id, reason)

        # Legacy bulk transactions lack a reliable line-to-earning FK. Never guess.
        legacy_tx = await self.db.scalar(select(PurchaseItems.transaction_id).where(PurchaseItems.id == purchase_item_id, PurchaseItems.user_id == user_id))
        if legacy_tx:
            legacy_items = await self.db.scalar(select(func.count()).select_from(PurchaseItems).where(PurchaseItems.transaction_id == legacy_tx))
            legacy_earnings = await self.db.scalar(select(func.count()).select_from(InstructorEarnings).where(InstructorEarnings.transaction_id == legacy_tx))
            if legacy_items != 1 or legacy_earnings != 1:
                raise HTTPException(409, 'Đơn mua cũ cần đối soát theo từng khóa trước khi hoàn tiền; vui lòng liên hệ quản trị viên.')

        try:
            now = get_now()

            # ======================================================
            # 1) LOAD PURCHASE ITEM
            # ======================================================
            purchase_item = await self.db.scalar(
                select(PurchaseItems).where(PurchaseItems.id == purchase_item_id)
            )
            if not purchase_item:
                raise HTTPException(404, "Không tìm thấy đơn mua.")

            if purchase_item.user_id != user_id:
                raise HTTPException(403, "Bạn không sở hữu đơn mua này.")

            if purchase_item.status != "completed":
                raise HTTPException(400, "Đơn mua chưa hoàn tất, không thể hoàn tiền.")

            if purchase_item.discounted_price <= 0:
                raise HTTPException(400, "Khóa học miễn phí không hỗ trợ hoàn tiền.")

            # ======================================================
            # 2) LOAD COURSE + INSTRUCTOR
            # ======================================================
            course = await self.db.scalar(
                select(Courses).where(Courses.id == purchase_item.course_id)
            )
            if not course:
                raise HTTPException(404, "Không tìm thấy khóa học.")

            instructor_id = course.instructor_id

            # ======================================================
            # 3) CHECK EARNINGS (HOLDING + TRONG HẠN REFUND)
            # ======================================================
            earnings = await self.db.scalar(
                select(InstructorEarnings).where(
                    InstructorEarnings.transaction_id == purchase_item.transaction_id
                )
            )

            if not earnings:
                raise HTTPException(
                    400, "Không thể hoàn tiền vì không tìm thấy earnings."
                )

            if earnings.status != "holding":
                raise HTTPException(
                    400, "Khoản tiền này đã được xử lý, không thể hoàn tiền."
                )

            if not earnings.hold_until or earnings.hold_until <= now:
                raise HTTPException(400, "Đơn mua đã quá hạn hoàn tiền.")

            # ======================================================
            # 4) ĐÃ TỒN TẠI REFUND REQUEST CHƯA?
            # ======================================================
            existed = await self.db.scalar(
                select(RefundRequests.id).where(
                    RefundRequests.purchase_item_id == purchase_item_id
                )
            )
            if existed:
                raise HTTPException(
                    400, "Bạn đã gửi yêu cầu hoàn tiền cho đơn này rồi."
                )

            user = await self.db.get(User, user_id)
            # ======================================================
            # 5) TẠO REFUND REQUEST
            # ======================================================
            refund_request = RefundRequests(
                purchase_item_id=purchase_item_id,
                user_id=user_id,
                instructor_id=instructor_id,
                refund_amount=earnings.amount_instructor,
                reason=reason,
                status="requested",
                created_at=now,
            )

            self.db.add(refund_request)
            await self.db.commit()
            await self.db.refresh(refund_request)

            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=instructor_id,
                    roles=["LECTURER"],
                    title="Có yêu cầu hoàn tiền mới 📝",
                    content=f"{(user.fullname if user and user.fullname else user.id if user else user_id)} đã gửi yêu cầu hoàn tiền cho khóa học {course.title}.",
                    url="/lecturer/refund",
                    type="wallet",
                    role_target=["LECTURER"],
                    metadata={"transaction_id": str(purchase_item.transaction_id)},
                    action="open_url",
                )
            )

            return {
                "message": "Gửi yêu cầu hoàn tiền thành công.",
                "refund_id": str(refund_request.id),
                "refund_amount": float(refund_request.refund_amount),
                "status": refund_request.status,
                "reason": refund_request.reason,
                "deadline": earnings.hold_until,
            }

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            print("Error create_refund_request:", e)
            raise HTTPException(500, "Có lỗi khi tạo yêu cầu hoàn tiền.")

    async def get_refund_request_detail_async(
        self,
        refund_id: uuid.UUID,
        viewer_id: uuid.UUID,
        role: str,  # USER | LECTURER | ADMIN
    ):
        """
        Xem chi tiết yêu cầu hoàn tiền.
        """

        try:
            instructor_alias = aliased(User)

            query = (
                select(
                    RefundRequests,
                    PurchaseItems,
                    Courses,
                    instructor_alias,
                    InstructorEarnings,
                )
                .join(
                    PurchaseItems, RefundRequests.purchase_item_id == PurchaseItems.id
                )
                .join(Courses, PurchaseItems.course_id == Courses.id)
                .join(instructor_alias, instructor_alias.id == Courses.instructor_id)
                .join(
                    InstructorEarnings,
                    InstructorEarnings.transaction_id == PurchaseItems.transaction_id,
                    isouter=True,
                )
                .where(RefundRequests.id == refund_id)
            )

            row = (await self.db.execute(query)).first()
            if not row:
                raise HTTPException(404, "Không tìm thấy yêu cầu hoàn tiền.")

            refund, item, course, instructor, earnings = row

            # ============================
            # QUYỀN XEM
            # ============================
            if role == "USER" and refund.user_id != viewer_id:
                raise HTTPException(403, "Bạn không có quyền xem yêu cầu này.")

            if role == "LECTURER" and course.instructor_id != viewer_id:
                raise HTTPException(403, "Bạn không phải giảng viên của khóa học này.")

            # ============================
            # SỐ TIỀN HOÀN CHUẨN
            # ============================
            # Chỉ hoàn lại phần giảng viên nhận (không hoàn 30% platform fee)
            if earnings and earnings.amount_instructor is not None:
                refund_amount_real = float(refund.refund_amount)
            else:
                refund_amount_real = float(refund.refund_amount)  # fallback

            # ============================
            # RESPONSE
            # ============================
            return {
                "refund": {
                    "id": str(refund.id),
                    "status": refund.status,
                    "amount": refund_amount_real,  # ⭐ Số tiền hoàn thực tế
                    "reason": refund.reason,
                    "created_at": refund.created_at,
                    "instructor_reviewed_at": refund.instructor_reviewed_at,
                    "admin_reviewed_at": refund.admin_reviewed_at,
                    "resolved_at": refund.resolved_at,
                    "instructor_comment": refund.instructor_comment,
                    "admin_comment": refund.admin_comment,
                },
                "purchase": {
                    "purchase_item_id": str(item.id),
                    "original_price": float(item.original_price),
                    "discounted_price": float(item.discounted_price),
                    "status": item.status,
                    "created_at": item.created_at,
                    "discount_id": str(item.discount_id) if item.discount_id else None,
                },
                "course": {
                    "course_id": str(course.id),
                    "title": course.title,
                    "thumbnail": course.thumbnail_url,
                },
                "instructor": {
                    "id": str(instructor.id),
                    "fullname": instructor.fullname,
                    "avatar": instructor.avatar,
                },
                "earnings": {
                    "status": earnings.status if earnings else None,
                    "amount_instructor": (
                        float(earnings.amount_instructor)
                        if earnings and earnings.amount_instructor is not None
                        else None
                    ),
                    "amount_platform": (
                        float(earnings.amount_platform)
                        if earnings and earnings.amount_platform is not None
                        else None
                    ),
                    "hold_until": earnings.hold_until if earnings else None,
                    # ⭐ Thêm trường tổng số tiền refund thực tế
                    "refund_amount_real": refund_amount_real,
                },
            }

        except Exception as e:
            print("Error get_refund_request_detail:", e)
            raise

    # ==========================================================
    # GIẢNG VIÊN / ADMIN PHÊ DUYỆT / TỪ CHỐI
    # ==========================================================
    async def review_refund_request_async(
        self,
        refund_id: uuid.UUID,
        reviewer_id: uuid.UUID | None,
        role: str,  # "LECTURER" | "ADMIN"
        action: str,  # "approve" | "reject"
        reason: str | None = None,
        notification_service=None,
    ):
        from app.db.models.learning_paths import BundleOrderLine
        from app.services.bundle_settlement import BundleSettlement
        purchase_id = await self.db.scalar(select(RefundRequests.purchase_item_id).where(RefundRequests.id == refund_id))
        bundle_line = await self.db.scalar(select(BundleOrderLine).where(BundleOrderLine.purchase_item_id == purchase_id))
        if bundle_line:
            return await BundleSettlement(self.db).review(bundle_line, refund_id, reviewer_id, role, action, reason)

        if action == 'approve' and purchase_id:
            legacy_tx = await self.db.scalar(select(PurchaseItems.transaction_id).where(PurchaseItems.id == purchase_id))
            if legacy_tx:
                legacy_items = await self.db.scalar(select(func.count()).select_from(PurchaseItems).where(PurchaseItems.transaction_id == legacy_tx))
                legacy_earnings = await self.db.scalar(select(func.count()).select_from(InstructorEarnings).where(InstructorEarnings.transaction_id == legacy_tx))
                if legacy_items != 1 or legacy_earnings != 1:
                    raise HTTPException(409, 'Khoản hoàn của đơn cũ cần đối soát, không thể tự chọn doanh thu để hoàn.')

        try:
            now = get_now()

            # =====================================================
            # LOAD REFUND
            # =====================================================
            refund = await self.db.scalar(
                select(RefundRequests).where(RefundRequests.id == refund_id)
            )
            if not refund:
                raise HTTPException(404, "Không tìm thấy yêu cầu hoàn tiền.")

            # =====================================================
            # LOAD PURCHASE, COURSE, STUDENT
            # =====================================================
            purchase = await self.db.scalar(
                select(PurchaseItems).where(PurchaseItems.id == refund.purchase_item_id)
            )
            if not purchase:
                raise HTTPException(404, "Không tìm thấy đơn mua.")

            course = await self.db.scalar(
                select(Courses).where(Courses.id == purchase.course_id)
            )
            if not course:
                raise HTTPException(404, "Không tìm thấy khóa học.")

            student_user = await self.db.scalar(
                select(User).where(User.id == purchase.user_id)
            )
            if not student_user:
                raise HTTPException(404, "Không tìm thấy học viên.")

            # =====================================================
            # LOAD WALLET (ASYNC - KHÔNG LAZY LOAD)
            # =====================================================
            wallet = await self.db.scalar(
                select(Wallets).where(Wallets.user_id == student_user.id)
            )
            if not wallet:
                raise HTTPException(500, "Không tìm thấy ví học viên.")

            # =====================================================
            # LOAD TRANSACTION GỐC
            # =====================================================
            transaction_old = await self.db.scalar(
                select(Transactions).where(Transactions.id == purchase.transaction_id)
            )
            if not transaction_old:
                raise HTTPException(500, "Không tìm thấy transaction gốc.")

            # =====================================================
            # LOAD EARNINGS
            # =====================================================
            earnings = await self.db.scalar(
                select(InstructorEarnings).where(
                    InstructorEarnings.transaction_id == purchase.transaction_id
                )
            )

            # =====================================================
            # LOAD ENROLL (THU HỒI KHI HOÀN TIỀN)
            # =====================================================
            enrollment = await self.db.scalar(
                select(CourseEnrollments).where(
                    CourseEnrollments.course_id == purchase.course_id,
                    CourseEnrollments.user_id == student_user.id,
                )
            )

            # =====================================================
            # ===================  LECTURER PROCESS  ================
            # =====================================================
            if role == "LECTURER":

                if refund.instructor_id != reviewer_id:
                    raise HTTPException(403, "Bạn không phải giảng viên khóa học này.")

                if refund.status != "requested":
                    raise HTTPException(400, "Yêu cầu đã được xử lý.")

                # ------------------ REJECT ------------------
                if action == "reject":
                    if not reason:
                        raise HTTPException(400, "Vui lòng nhập lý do từ chối.")

                    refund.status = "instructor_rejected"
                    refund.instructor_reviewed_at = now
                    refund.instructor_comment = reason

                    await self.db.commit()

                    # notify học viên
                    if notification_service:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=student_user.id,
                                roles=["USER"],
                                title="Yêu cầu hoàn tiền bị từ chối ❌",
                                content=f"Giảng viên từ chối hoàn tiền: {reason}",
                                url=f"/refunds/{refund.id}",
                                type="refund",
                                role_target=["USER"],
                                metadata={"refund_id": str(refund.id)},
                                action="open_url",
                            )
                        )
                    return {"message": "Giảng viên đã từ chối yêu cầu hoàn tiền."}

                # ------------------ APPROVE ------------------
                if action == "approve":

                    refund_amount = refund.refund_amount

                    async with self.db.begin_nested():

                        # Update refund
                        refund.status = "instructor_approved"
                        refund.instructor_reviewed_at = now
                        refund.instructor_comment = reason or "Giảng viên phê duyệt."
                        refund.resolved_at = now
                        refund.resolved_by = reviewer_id

                        # Tạo transaction refund
                        refund_txn = Transactions(
                            user_id=student_user.id,
                            amount=refund_amount,
                            type="refund",
                            direction="in",
                            status="completed",
                            course_id=purchase.course_id,
                            ref_id=purchase.id,
                            description=f"Hoàn tiền khóa học '{course.title}'",
                            created_at=now,
                            confirmed_at=now,
                        )
                        self.db.add(refund_txn)
                        await self.db.flush()

                        # Ví học viên
                        wallet.balance += refund_amount
                        wallet.total_in += refund_amount
                        wallet.updated_at = now

                        # purchase -> refunded
                        purchase.status = "refunded"

                        # transaction gốc
                        transaction_old.status = "refunded"
                        transaction_old.updated_at = now

                        # earnings → refunded
                        if earnings:
                            earnings.status = "refunded"
                            earnings.paid_at = None
                            earnings.available_at = None
                            earnings.updated_at = now

                        # Thu hồi enroll + CẬP NHẬT THỐNG KÊ
                        if enrollment:
                            # ✅ GIẢM COURSES.TOTAL_ENROLLS
                            if course:
                                course.total_enrolls = max(
                                    (course.total_enrolls or 1) - 1, 0
                                )

                            # ✅ GIẢM USER.STUDENT_COUNT CHO INSTRUCTOR
                            # Chỉ giảm nếu user không còn enroll bất kỳ khóa học nào khác của instructor
                            instructor = await self.db.scalar(
                                select(User).where(User.id == course.instructor_id)
                            )
                            if instructor:
                                # Đếm số enrollment còn lại của user với instructor này (trừ course hiện tại)
                                remaining_enrollments = await self.db.scalar(
                                    select(func.count())
                                    .select_from(CourseEnrollments)
                                    .join(Courses, Courses.id == CourseEnrollments.course_id)
                                    .where(
                                        CourseEnrollments.user_id == student_user.id,
                                        Courses.instructor_id == instructor.id,
                                        CourseEnrollments.course_id != purchase.course_id,
                                    )
                                )
                                # Nếu không còn enrollment nào khác, giảm student_count
                                if remaining_enrollments == 0:
                                    instructor.student_count = max(
                                        (instructor.student_count or 1) - 1, 0
                                    )

                            await self.db.delete(enrollment)

                    # notify học viên
                    if notification_service:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=student_user.id,
                                roles=["USER"],
                                title="Hoàn tiền thành công 💸",
                                content=f"Bạn đã được hoàn {refund_amount:,} VND.",
                                url="/wallets/transactions",
                                type="refund",
                                role_target=["USER"],
                                metadata={"refund_id": str(refund.id)},
                                action="open_url",
                            )
                        )

                    # notify giảng viên
                    if notification_service:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=refund.instructor_id,
                                roles=["LECTURER"],
                                title="Đã xử lý hoàn tiền ✔️",
                                content=f"Bạn đã phê duyệt hoàn tiền {refund_amount:,} VND.",
                                url=f"/lecturer/refunds/{refund.id}",
                                type="refund",
                                role_target=["LECTURER"],
                                metadata={"refund_id": str(refund.id)},
                                action="open_url",
                            )
                        )

                    return {"message": "Hoàn tiền thành công (Giảng viên phê duyệt)."}

            # =====================================================
            # ===================  ADMIN PROCESS  ==================
            # =====================================================
            if role == "ADMIN":

                if refund.status == "instructor_approved":
                    raise HTTPException(400, "Yêu cầu đã được xử lý bởi giảng viên.")
                if (
                    refund.status == "admin_rejected"
                    or refund.status == "admin_approved"
                ):
                    raise HTTPException(400, "Yêu cầu đã được xử lý.")
                # ------------------ ADMIN REJECT ------------------
                if action == "reject":

                    if not reason:
                        raise HTTPException(400, "Admin phải nhập lý do từ chối.")

                    refund.status = "admin_rejected"
                    refund.admin_reviewed_at = now
                    refund.admin_comment = reason
                    # refund.resolved_by = reviewer_id
                    refund.resolved_at = now

                    await self.db.commit()

                    if notification_service:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=student_user.id,
                                roles=["USER"],
                                title="Yêu cầu hoàn tiền bị từ chối ❌",
                                content=f"Admin từ chối yêu cầu hoàn tiền: {reason}",
                                url=f"/refunds/{refund.id}",
                                type="refund",
                                role_target=["USER"],
                                metadata={"refund_id": str(refund.id)},
                                action="open_url",
                            )
                        )

                    return {"message": "Admin đã từ chối yêu cầu hoàn tiền."}

                # ------------------ ADMIN APPROVE ------------------
                if action == "approve":

                    refund_amount = refund.refund_amount

                    async with self.db.begin_nested():

                        refund.status = "admin_approved"
                        refund.admin_reviewed_at = now
                        refund.admin_comment = reason or "Admin phê duyệt."
                        refund.resolved_at = now
                        refund.resolved_by = reviewer_id

                        refund_txn = Transactions(
                            user_id=student_user.id,
                            amount=refund_amount,
                            type="refund",
                            direction="in",
                            status="completed",
                            course_id=purchase.course_id,
                            ref_id=purchase.id,
                            description=f"Hoàn tiền (Admin duyệt) khóa học '{course.title}'",
                            created_at=now,
                            confirmed_at=now,
                        )
                        self.db.add(refund_txn)
                        await self.db.flush()

                        wallet.balance += refund_amount
                        wallet.total_in += refund_amount
                        wallet.updated_at = now

                        purchase.status = "refunded"
                        transaction_old.status = "refunded"
                        transaction_old.updated_at = now

                        # Refund earnings
                        if earnings:
                            earnings.status = "refunded"
                            earnings.paid_at = None
                            earnings.available_at = None
                            earnings.updated_at = now

                        # Thu hồi enroll + CẬP NHẬT THỐNG KÊ
                        if enrollment:
                            # ✅ GIẢM COURSES.TOTAL_ENROLLS
                            if course:
                                course.total_enrolls = max(
                                    (course.total_enrolls or 1) - 1, 0
                                )

                            # ✅ GIẢM USER.STUDENT_COUNT CHO INSTRUCTOR
                            # Chỉ giảm nếu user không còn enroll bất kỳ khóa học nào khác của instructor
                            instructor = await self.db.scalar(
                                select(User).where(User.id == course.instructor_id)
                            )
                            if instructor:
                                # Đếm số enrollment còn lại của user với instructor này (trừ course hiện tại)
                                remaining_enrollments = await self.db.scalar(
                                    select(func.count())
                                    .select_from(CourseEnrollments)
                                    .join(Courses, Courses.id == CourseEnrollments.course_id)
                                    .where(
                                        CourseEnrollments.user_id == student_user.id,
                                        Courses.instructor_id == instructor.id,
                                        CourseEnrollments.course_id != purchase.course_id,
                                    )
                                )
                                # Nếu không còn enrollment nào khác, giảm student_count
                                if remaining_enrollments == 0:
                                    instructor.student_count = max(
                                        (instructor.student_count or 1) - 1, 0
                                    )

                            await self.db.delete(enrollment)

                    if notification_service:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=student_user.id,
                                roles=["USER"],
                                title="Hoàn tiền thành công 💸",
                                content=f"Bạn đã được hoàn {refund_amount:,} VND (Admin duyệt).",
                                url=f"/refunds/{refund.id}",
                                type="refund",
                                role_target=["USER"],
                                metadata={"refund_id": str(refund.id)},
                                action="open_url",
                            )
                        )

                    return {"message": "Admin đã phê duyệt hoàn tiền."}

            raise HTTPException(403, "Bạn không có quyền xử lý yêu cầu này.")

        except HTTPException:
            raise
        except Exception as e:
            print("[ERR review_refund_request_async]", e)
            raise HTTPException(500, "Không thể xử lý yêu cầu hoàn tiền.")

    # hàm lấy danh sách refund của admin và giảng viên

    async def get_all_refund_status_async(
        self,
        reviewer_id: uuid.UUID,
        role: str,  # ADMIN | LECTURER
        page: int = 1,
        limit: int = 20,
        search: str | None = None,
        refund_status: str | None = None,
        course_id: uuid.UUID | None = None,
        student_id: uuid.UUID | None = None,
        instructor_id: uuid.UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        order_by: str = "created_at",
        order_dir: str = "desc",
    ):
        """
        LECTURER: xem tất cả refund thuộc khóa học mình dạy
        ADMIN: xem tất cả refund của hệ thống
        """

        try:
            offset = (page - 1) * limit

            Student = aliased(User)
            Instructor = aliased(User)

            # ===================== SORT MAP =====================
            valid_orders = {
                "created_at": RefundRequests.created_at,
                "refund_amount": RefundRequests.refund_amount,
                "status": RefundRequests.status,
            }

            sort_col = valid_orders.get(order_by, RefundRequests.created_at)
            sort_col = (
                sort_col.desc() if order_dir.lower() == "desc" else sort_col.asc()
            )

            # ===================== BASE QUERY =====================
            query = (
                select(
                    RefundRequests,
                    PurchaseItems,
                    Courses,
                    Student,
                    Instructor,
                    InstructorEarnings,
                )
                .join(
                    PurchaseItems, PurchaseItems.id == RefundRequests.purchase_item_id
                )
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(Student, Student.id == RefundRequests.user_id)
                .join(Instructor, Instructor.id == RefundRequests.instructor_id)
                .join(
                    InstructorEarnings,
                    InstructorEarnings.transaction_id == PurchaseItems.transaction_id,
                    isouter=True,
                )
            )

            # ===================== ROLE FILTER =====================
            if role == "LECTURER":
                query = query.where(RefundRequests.instructor_id == reviewer_id)

            # ===================== FILTER =====================
            if refund_status:
                query = query.where(RefundRequests.status == refund_status)

            if course_id:
                query = query.where(Courses.id == course_id)

            if student_id:
                query = query.where(RefundRequests.user_id == student_id)

            if instructor_id:
                query = query.where(RefundRequests.instructor_id == instructor_id)

            if date_from and date_to:
                query = query.where(
                    RefundRequests.created_at.between(date_from, date_to)
                )

            # ===================== SEARCH =====================
            if search:
                s = f"%{search.lower()}%"
                query = query.where(
                    or_(
                        func.lower(RefundRequests.reason).like(s),
                        func.lower(Courses.title).like(s),
                        func.lower(Student.fullname).like(s),
                        func.cast(RefundRequests.id, String).like(s),
                    )
                )

            # ===================== SORT + PAGING =====================
            query = query.order_by(sort_col).offset(offset).limit(limit)

            rows = (await self.db.execute(query)).all()

            # ===================== COUNT QUERY =====================
            count_query = (
                select(func.count())
                .select_from(RefundRequests)
                .join(
                    PurchaseItems, PurchaseItems.id == RefundRequests.purchase_item_id
                )
                .join(Courses, Courses.id == PurchaseItems.course_id)
                .join(Student, Student.id == RefundRequests.user_id)
            )

            if role == "LECTURER":
                count_query = count_query.where(
                    RefundRequests.instructor_id == reviewer_id
                )

            if refund_status:
                count_query = count_query.where(RefundRequests.status == refund_status)

            if course_id:
                count_query = count_query.where(Courses.id == course_id)

            if student_id:
                count_query = count_query.where(RefundRequests.user_id == student_id)

            if instructor_id:
                count_query = count_query.where(
                    RefundRequests.instructor_id == instructor_id
                )

            if date_from and date_to:
                count_query = count_query.where(
                    RefundRequests.created_at.between(date_from, date_to)
                )

            total = await self.db.scalar(count_query) or 0

            # ===================== BUILD RESPONSE =====================
            items = []
            for refund, item, course, student, instructor, earnings in rows:
                items.append(
                    {
                        "refund_id": str(refund.id),
                        "status": refund.status,
                        "reason": refund.reason,
                        "refund_amount": float(refund.refund_amount),
                        "created_at": refund.created_at,
                        "student": {
                            "id": str(student.id),
                            "fullname": student.fullname,
                            "avatar": student.avatar,
                        },
                        "course": {
                            "id": str(course.id),
                            "title": course.title,
                            "thumbnail": course.thumbnail_url,
                        },
                        "instructor": {
                            "id": str(instructor.id),
                            "fullname": instructor.fullname,
                            "avatar": instructor.avatar,
                        },
                        "earnings": {
                            "status": earnings.status if earnings else None,
                            "hold_until": earnings.hold_until if earnings else None,
                            "amount_instructor": (
                                float(earnings.amount_instructor) if earnings else None
                            ),
                        },
                    }
                )

            return {
                "page": page,
                "limit": limit,
                "total": total,
                "items": items,
            }

        except Exception as e:
            print("[ERR get_all_refund_status_async]", e)
            raise HTTPException(500, "Không thể lấy danh sách hoàn tiền.")
