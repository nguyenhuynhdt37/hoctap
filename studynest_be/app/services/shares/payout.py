from decimal import Decimal
import base64

from fastapi import Depends
from fastapi.responses import RedirectResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.database import (
    Courses,
    InstructorEarnings,
    PlatformWallets,
    PurchaseItems,
    RefundRequests,
    Transactions,
    User,
    Wallets,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.instructor_coin import credit_instructor_earning_async
from app.services.shares.notification import NotificationService
from app.services.shares.paypal_service import PayPalService


class PayoutService:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        notification_service=Depends(NotificationService),
    ):
        self.db = db
        self.notification_service = notification_service

    # ==========================================================
    # 1) PAYOUT MỘT EARNING
    # ==========================================================
    async def payout_single_earning(self, earning: InstructorEarnings):
        from app.db.models.learning_paths import BundleOrderLine
        from app.services.bundle_settlement import BundleSettlement
        bundle_line = await self.db.scalar(select(BundleOrderLine).where(BundleOrderLine.earning_id == earning.id))
        if bundle_line:
            return await BundleSettlement(self.db).release(bundle_line)

        now = get_now()

        # 1. Load giảng viên
        lecturer = await self.db.scalar(
            select(User).where(User.id == earning.instructor_id)
        )
        if not lecturer:
            return False

        # 2. Load ví giảng viên
        lecturer_wallet = await self.db.scalar(
            select(Wallets).where(Wallets.user_id == lecturer.id)
        )
        if not lecturer_wallet:
            return False

        # 3. Load ví nền tảng
        platform_wallet = await self.db.scalar(select(PlatformWallets).limit(1))
        if not platform_wallet:
            return False

        amount = earning.amount_instructor

        # 4. Load transaction gốc
        origin_txn = await self.db.scalar(
            select(Transactions).where(Transactions.id == earning.transaction_id)
        )
        if not origin_txn:
            return False

        # 5. Load purchase_item + course từ transaction
        purchase_item = await self.db.scalar(
            select(PurchaseItems).where(
                PurchaseItems.transaction_id == earning.transaction_id
            )
        )
        course = None
        if purchase_item:
            course = await self.db.scalar(
                select(Courses).where(Courses.id == purchase_item.course_id)
            )

        # 6. Load buyer (người mua khóa học)
        buyer = await self.db.scalar(
            select(User)
            .join(Transactions, Transactions.user_id == User.id)
            .where(Transactions.id == earning.transaction_id)
        )

        try:
            # ----------------------------------------------------
            # Tạo transaction payout đầy đủ thông tin
            # ----------------------------------------------------
            description_lines = [
                "Thanh toán thu nhập khóa học",
            ]
            if course:
                description_lines[0] = f"Thanh toán thu nhập khóa học '{course.title}'"
            if buyer:
                description_lines.append(f"Học viên mua: {buyer.fullname}")
            if earning.created_at:
                description_lines.append(
                    f"Ngày ghi nhận earning: {earning.created_at.strftime('%d/%m/%Y')}"
                )
            description_lines.append(f"Số tiền nhận: {amount:,} VND")

            payout_txn = Transactions(
                user_id=lecturer.id,
                amount=amount,
                type="income",
                direction="in",
                currency="VND",
                method="wallet",
                gateway="wallet",
                status="completed",
                course_id=course.id if course else None,
                # ref_id: liên kết về transaction gốc (mua khóa học)
                ref_id=earning.transaction_id,
                description="\n".join(description_lines),
                created_at=now,
                confirmed_at=now,
            )
            self.db.add(payout_txn)
            await self.db.flush()

            # ----------------------------------------------------
            # Cộng tiền giảng viên
            # ----------------------------------------------------
            # Thu nhập ghi bằng Coin thật; phần dư dưới 1 Coin ở lại ví VND và cộng dồn.
            await credit_instructor_earning_async(
                self.db, lecturer_wallet, Decimal(amount), earning_id=earning.id)
            lecturer_wallet.updated_at = now

            # ----------------------------------------------------
            # Update earning
            # ----------------------------------------------------
            earning.status = "paid"
            earning.paid_at = now
            earning.payout_reference = str(payout_txn.id)
            earning.updated_at = now

            await self.db.commit()

            # ----------------------------------------------------
            # Gửi thông báo cho giảng viên
            # ----------------------------------------------------
            if self.notification_service:
                content_lines = [
                    f"Bạn vừa nhận {amount:,} VND.",
                ]
                if course:
                    content_lines[0] = (
                        f"Bạn vừa nhận {amount:,} VND từ khóa học '{course.title}'."
                    )
                if buyer:
                    content_lines.append(f"Học viên: {buyer.fullname}")
                if origin_txn.created_at:
                    content_lines.append(
                        f"Ngày mua: {origin_txn.created_at.strftime('%d/%m/%Y')}"
                    )

                await self.notification_service.create_notification_async(
                    NotificationCreateSchema(
                        user_id=lecturer.id,
                        roles=["LECTURER"],
                        title="Nhận thu nhập mới 🎉",
                        content="\n".join(content_lines),
                        url="/lecturer/wallets/transactions",
                        type="payout",
                        role_target=["LECTURER"],
                        metadata={
                            "earning_id": str(earning.id),
                            "course_id": str(course.id) if course else None,
                            "buyer_id": str(buyer.id) if buyer else None,
                            "origin_transaction_id": str(origin_txn.id),
                            "payout_transaction_id": str(payout_txn.id),
                        },
                        action="open_url",
                    )
                )

            return True

        except Exception as e:
            print("[ERR payout_single_earning]", e)
            await self.db.rollback()
            return False

    # ==========================================================
    # 2) PAYOUT TẤT CẢ EARNING ĐỦ ĐIỀU KIỆN
    # ==========================================================
    async def payout_all_eligible(self):
        now = get_now()

        # -------------------------------------------------------
        # Subquery: các transaction đang có refund "treo"
        # (requested / instructor_approved / admin_approved)
        # -------------------------------------------------------
        refund_tx_subq = (
            select(PurchaseItems.transaction_id)
            .join(
                RefundRequests,
                RefundRequests.purchase_item_id == PurchaseItems.id,
            )
            .where(
                RefundRequests.status.in_(
                    ["requested", "instructor_approved", "admin_approved"]
                )
            )
        )

        # -------------------------------------------------------
        # Lọc earning hợp lệ:
        #
        # - status = holding
        # - hold_until <= now
        # - paid_at IS NULL (chưa trả)
        # - transaction_id KHÔNG nằm trong các transaction đang refund treo
        #
        # => earning liên quan refund bị từ chối (admin_rejected) vẫn payout bình thường
        # -------------------------------------------------------
        rows = (
            (
                await self.db.execute(
                    select(InstructorEarnings)
                    .where(InstructorEarnings.status == "holding")
                    .where(InstructorEarnings.hold_until <= now)
                    .where(InstructorEarnings.paid_at.is_(None))
                    .where(~InstructorEarnings.transaction_id.in_(refund_tx_subq))
                    .order_by(InstructorEarnings.hold_until.asc())
                )
            )
            .scalars()
            .all()
        )

        success = 0

        for earning in rows:
            ok = await self.payout_single_earning(earning)
            if ok:
                success += 1

        return {"processed": len(rows), "paid": success}

    # ==========================================================

    async def paypal_connect_callback_async(
        self,
        code: str,
        paypal: PayPalService,
        user: User,
        state: str | None,
        return_url: str | None = None,
    ):
        """
        Xử lý callback PayPal OAuth (style try-escape):
        - Gọi get_userinfo_from_code -> trả email + payer_id
        - Nếu lỗi hoặc thiếu info -> redirect fallback
        - Nếu ok -> lưu vào DB rồi redirect FE với status success
        """

        redirect_uri = settings.PAYPAL_REDIRECT_URI or f"{settings.BACKEND_URL}/api/v1/lecturer/payout/callback"
        target_base = return_url or f"{settings.FRONTEND_URL}/lecturer/profile"

        # ==========================================
        # 1) SAFE TRY: đổi code -> userinfo (id_token hoặc userinfo API)
        # ==========================================
        try:
            token_data = await paypal.get_userinfo_from_code(code, redirect_uri)
        except Exception as e:
            print(f"❌ [PayPal Callback Error]: {e}")
            return RedirectResponse(
                f"{target_base}?paypal=connected&error=exchange"
            )

        # ==========================================
        # 2) Check data hợp lệ (chấp nhận có email hoặc payer_id khi scope=openid)
        # ==========================================
        email = token_data.get("email")
        raw_payer_id = (
            token_data.get("payer_id")
            or (token_data.get("raw_payload") or {}).get("sub")
        )
        payer_id = raw_payer_id.split("/")[-1] if raw_payer_id else None
        if not email and not payer_id:
            return RedirectResponse(
                f"{target_base}?paypal=connected&error=missing_info"
            )

        # ==========================================
        # 3) Lưu vào DB (chỉ ghi đè các trường PayPal trả về có giá trị)
        # ==========================================
        update_values = {}
        if email:
            update_values["paypal_email"] = email
        if payer_id:
            update_values["paypal_payer_id"] = payer_id

        try:
            await self.db.execute(
                update(User)
                .where(User.id == user.id)
                .values(**update_values)
            )
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            return RedirectResponse(
                f"{target_base}?paypal=connected&error=db"
            )

        # ==========================================
        # 4) Redirect FE (ưu tiên return_url từ signed state)
        # ==========================================
        if return_url:
            return RedirectResponse(f"{return_url}?paypal=connected&status=success")

        if state:
            try:
                decoded = base64.urlsafe_b64decode(state).decode("utf-8")
                if decoded.startswith(("http://", "https://")):
                    return RedirectResponse(f"{decoded}?status=success")
            except Exception:
                pass

        return RedirectResponse(
            f"{settings.FRONTEND_URL}/lecturer/profile?paypal=connected&status=success"
        )
