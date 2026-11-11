"""Exact bundle-line refunds and releases; never guess an earning by shared transaction."""

from decimal import Decimal

from app.db.models.database import (
    CourseEnrollments,
    Courses,
    InstructorEarnings,
    PlatformWalletHistory,
    PlatformWallets,
    PurchaseItems,
    RefundRequests,
    Transactions,
    User,
    Wallets,
)
from app.libs.formats.datetime import now
from app.services.bundles import lock_purchase_user
from fastapi import HTTPException
from sqlalchemy import delete, func, select, update


class BundleSettlement:
    def __init__(self, db):
        self.db = db

    async def request(self, line, user_id, reason):
        await lock_purchase_user(self.db, user_id)
        earning = await self.db.scalar(
            select(InstructorEarnings)
            .where(InstructorEarnings.id == line.earning_id)
            .with_for_update()
        )
        purchase = await self.db.scalar(
            select(PurchaseItems)
            .where(PurchaseItems.id == line.purchase_item_id)
            .with_for_update()
        )
        if not purchase or purchase.user_id != user_id:
            raise HTTPException(403, "Bạn không sở hữu khoản mua này")
        if not earning or purchase.status != "completed" or line.paid <= 0:
            raise HTTPException(409, "Khoản mua không đủ điều kiện hoàn tiền")
        if earning.status != "holding" or earning.hold_until <= now():
            raise HTTPException(409, "Đã hết thời hạn hoàn tiền")
        if await self.db.scalar(
            select(RefundRequests.id).where(
                RefundRequests.purchase_item_id == purchase.id
            )
        ):
            raise HTTPException(409, "Đã có yêu cầu hoàn tiền cho khóa này")
        if not reason or len(reason.strip()) < 5 or len(reason) > 5000:
            raise HTTPException(422, "Vui lòng nhập lý do từ 5 đến 5000 ký tự")
        request = RefundRequests(
            purchase_item_id=purchase.id,
            user_id=user_id,
            instructor_id=line.instructor_id,
            refund_amount=line.paid,
            reason=reason.strip(),
            status="requested",
            created_at=now(),
        )
        self.db.add(request)
        await self.db.commit()
        return {
            "refund_id": request.id,
            "refund_amount": str(request.refund_amount),
            "message": "Đã gửi yêu cầu hoàn tiền theo phần giá thực trả của khóa",
        }

    async def review(self, line, refund_id, reviewer_id, role, action, reason=None):
        reviewer = await self.db.get(User, reviewer_id) if reviewer_id else None
        if not reviewer or reviewer.is_banned or reviewer.deleted_at:
            raise HTTPException(403, "Tài khoản duyệt không hoạt động")
        if role not in {"ADMIN", "LECTURER"} or (
            role == "LECTURER" and reviewer_id != line.instructor_id
        ):
            raise HTTPException(403, "Không có quyền xử lý yêu cầu")
        if action not in {"approve", "reject"}:
            raise HTTPException(422, "Thao tác không hợp lệ")
        # Course -> earning -> wallet -> treasury; NO KEY UPDATE permits FK inserts.
        await self.db.execute(
            select(Courses.id)
            .where(Courses.id == line.course_id)
            .with_for_update(key_share=True)
        )
        # Earning lock serializes refund processing with payout release.
        earning = await self.db.scalar(
            select(InstructorEarnings)
            .where(InstructorEarnings.id == line.earning_id)
            .with_for_update()
        )
        request = await self.db.scalar(
            select(RefundRequests)
            .where(
                RefundRequests.id == refund_id,
                RefundRequests.purchase_item_id == line.purchase_item_id,
            )
            .with_for_update()
        )
        if not request or not earning:
            raise HTTPException(404, "Không tìm thấy yêu cầu")
        allowed = (
            {"requested"}
            if role == "LECTURER"
            else {"requested", "instructor_rejected"}
        )
        if request.status not in allowed:
            raise HTTPException(409, "Yêu cầu đã được xử lý")
        timestamp = now()
        if role == "LECTURER":
            request.instructor_reviewed_at = timestamp
            request.instructor_comment = reason
        else:
            request.admin_reviewed_at = timestamp
            request.admin_comment = reason
        if action == "reject":
            if not reason or len(reason.strip()) < 5:
                raise HTTPException(422, "Cần nêu lý do từ chối")
            request.status = (
                "instructor_rejected" if role == "LECTURER" else "admin_rejected"
            )
        else:
            if earning.status != "holding":
                raise HTTPException(409, "Khoản doanh thu đã được xử lý")
            purchase = await self.db.scalar(
                select(PurchaseItems)
                .where(PurchaseItems.id == line.purchase_item_id)
                .with_for_update()
            )
            if purchase.status != "completed":
                raise HTTPException(409, "Khoản mua đã được xử lý")
            wallet = await self.db.scalar(
                select(Wallets)
                .where(Wallets.user_id == purchase.user_id)
                .with_for_update()
            )
            treasury = await self.db.scalar(
                select(PlatformWallets)
                .where(PlatformWallets.currency == "VND")
                .order_by(PlatformWallets.id)
                .limit(1)
                .with_for_update()
            )
            if (
                not wallet
                or wallet.currency != "VND"
                or not treasury
                or treasury.holding_amount < line.paid
            ):
                raise HTTPException(503, "Không đủ dữ liệu đối soát để hoàn tiền")
            refund_tx = Transactions(
                user_id=purchase.user_id,
                amount=line.paid,
                type="refund",
                direction="in",
                currency="VND",
                method="wallet",
                gateway="internal_wallet",
                status="completed",
                course_id=line.course_id,
                ref_id=purchase.id,
                description="Hoàn tiền khóa trong combo: " + line.title,
                created_at=timestamp,
                confirmed_at=timestamp,
            )
            self.db.add(refund_tx)
            wallet.balance = Decimal(wallet.balance or 0) + line.paid
            wallet.total_in = Decimal(wallet.total_in or 0) + line.paid
            treasury.holding_amount -= line.paid
            self.db.add(
                PlatformWalletHistory(
                    wallet_id=treasury.id,
                    amount=line.paid,
                    type="release",
                    note=f"Hoàn combo line {line.id} về ví học viên",
                )
            )
            purchase.status = "refunded"
            earning.status = "refunded"
            original = await self.db.get(Transactions, purchase.transaction_id)
            original.status = "refunded"
            request.status = "refunded"
            request.resolved_at = timestamp
            request.resolved_by = reviewer_id
            # Keep other ownership sources and all lesson progress intact.
            other = await self.db.scalar(
                select(PurchaseItems.id).where(
                    PurchaseItems.user_id == purchase.user_id,
                    PurchaseItems.course_id == line.course_id,
                    PurchaseItems.status == "completed",
                    PurchaseItems.id != purchase.id,
                )
            )
            if not other:
                removed = await self.db.execute(
                    delete(CourseEnrollments).where(
                        CourseEnrollments.user_id == purchase.user_id,
                        CourseEnrollments.course_id == line.course_id,
                    )
                )
                if removed.rowcount:
                    await self.db.execute(
                        update(Courses)
                        .where(Courses.id == line.course_id)
                        .values(
                            total_enrolls=func.greatest(
                                func.coalesce(Courses.total_enrolls, 0) - 1, 0
                            )
                        )
                    )
        if action == "approve" and not other:
            remaining = await self.db.scalar(
                select(CourseEnrollments.id)
                .join(Courses, Courses.id == CourseEnrollments.course_id)
                .where(
                    CourseEnrollments.user_id == purchase.user_id,
                    CourseEnrollments.status == "active",
                    Courses.instructor_id == line.instructor_id,
                )
                .limit(1)
            )
            if not remaining:
                await self.db.execute(
                    update(User)
                    .where(User.id == line.instructor_id)
                    .values(
                        student_count=func.greatest(
                            func.coalesce(User.student_count, 0) - 1, 0
                        )
                    )
                )
        await self.db.commit()
        return {
            "message": "Đã hoàn tiền đúng phần giá khóa học"
            if action == "approve"
            else "Đã từ chối yêu cầu",
            "refund_id": request.id,
            "status": request.status,
            "refund_amount": str(request.refund_amount),
        }

    async def release(self, line):
        earning = await self.db.scalar(
            select(InstructorEarnings)
            .where(InstructorEarnings.id == line.earning_id)
            .with_for_update()
        )
        if not earning or earning.status != "holding" or earning.hold_until > now():
            return False
        pending = await self.db.scalar(
            select(RefundRequests.id).where(
                RefundRequests.purchase_item_id == line.purchase_item_id,
                RefundRequests.status.in_(["requested", "instructor_rejected"]),
            )
        )
        if pending:
            return False
        wallet = await self.db.scalar(
            select(Wallets)
            .where(Wallets.user_id == line.instructor_id)
            .with_for_update()
        )
        treasury = await self.db.scalar(
            select(PlatformWallets)
            .where(PlatformWallets.currency == "VND")
            .order_by(PlatformWallets.id)
            .limit(1)
            .with_for_update()
        )
        if (
            not wallet
            or wallet.is_locked
            or wallet.currency != "VND"
            or not treasury
            or treasury.holding_amount < line.paid
        ):
            return False
        timestamp = now()
        tx = Transactions(
            user_id=line.instructor_id,
            amount=earning.amount_instructor,
            type="income",
            direction="in",
            currency="VND",
            method="wallet",
            gateway="internal_wallet",
            status="completed",
            course_id=line.course_id,
            ref_id=earning.transaction_id,
            description="Thu nhập khóa trong combo: " + line.title,
            created_at=timestamp,
            confirmed_at=timestamp,
        )
        self.db.add(tx)
        await self.db.flush()
        wallet.balance = Decimal(wallet.balance or 0) + earning.amount_instructor
        wallet.total_in = Decimal(wallet.total_in or 0) + earning.amount_instructor
        treasury.holding_amount -= line.paid
        treasury.platform_fee_total += earning.amount_platform
        self.db.add(
            PlatformWalletHistory(
                wallet_id=treasury.id,
                amount=line.paid,
                type="release",
                related_transaction_id=tx.id,
                note=f"Đối soát combo line {line.id}",
            )
        )
        if earning.amount_platform:
            self.db.add(
                PlatformWalletHistory(
                    wallet_id=treasury.id,
                    amount=earning.amount_platform,
                    type="fee",
                    related_transaction_id=tx.id,
                    note=f"Phí nền tảng combo line {line.id}",
                )
            )
        earning.status = "paid"
        earning.paid_at = timestamp
        earning.payout_reference = str(tx.id)
        await self.db.commit()
        return True
