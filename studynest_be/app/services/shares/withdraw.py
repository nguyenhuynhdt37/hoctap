import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.database import (
    PlatformSettings,
    PlatformWalletHistory,
    PlatformWallets,
    Transactions,
    User,
    Wallets,
    WithdrawalRequests,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.coin_service import CoinService
from app.services.shares.currency_service import convert_vnd_to_usd
from app.services.shares.notification import NotificationService
from app.services.shares.paypal_service import PayPalService


class WithdrawService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    # # ============================================================
    # # LIST REQUESTS
    # # ============================================================
    # async def list_withdraw_requests(
    #     self,
    #     user: User,
    #     role: str,
    #     page: int = 1,
    #     limit: int = 20,
    #     search: str | None = None,
    #     status: str | None = None,
    #     amount_min: float | None = None,
    #     amount_max: float | None = None,
    #     date_from: datetime | None = None,
    #     date_to: datetime | None = None,
    #     order_by: str = "requested_at",
    #     order_dir: str = "desc",
    # ):
    #     try:
    #         offset = (page - 1) * limit

    #         # MAP SORT
    #         valid_sort = {
    #             "requested_at": WithdrawalRequests.requested_at,
    #             "amount": WithdrawalRequests.amount,
    #             "status": WithdrawalRequests.status,
    #         }
    #         sort_field = valid_sort.get(order_by, WithdrawalRequests.requested_at)
    #         sort_order = desc(sort_field) if order_dir == "desc" else asc(sort_field)

    #         # BASE QUERY
    #         query = select(
    #             WithdrawalRequests,
    #             User.id.label("lecturer_id"),
    #             User.fullname.label("lecturer_name"),
    #             User.email.label("lecturer_email"),
    #             User.avatar.label("lecturer_avatar"),
    #             User.bio.label("lecturer_bio"),
    #         ).join(User, User.id == WithdrawalRequests.lecturer_id)

    #         # ROLE FILTER
    #         if role == "LECTURER":
    #             query = query.where(WithdrawalRequests.lecturer_id == user.id)

    #         elif role == "ADMIN":
    #             if status:
    #                 query = query.where(WithdrawalRequests.status == status)

    #         # SEARCH
    #         if search:
    #             s = f"%{search}%"
    #             query = query.where(or_(User.fullname.ilike(s), User.email.ilike(s)))

    #         # AMOUNT RANGE
    #         if amount_min is not None:
    #             query = query.where(WithdrawalRequests.amount >= amount_min)

    #         if amount_max is not None:
    #             query = query.where(WithdrawalRequests.amount <= amount_max)

    #         # DATE RANGE
    #         if date_from:
    #             query = query.where(WithdrawalRequests.requested_at >= date_from)

    #         if date_to:
    #             query = query.where(WithdrawalRequests.requested_at <= date_to)

    #         # APPLY SORT
    #         query = query.order_by(sort_order)

    #         # TOTAL COUNT
    #         total = await self.db.scalar(
    #             select(func.count()).select_from(query.subquery())
    #         )

    #         # FETCH
    #         rows = await self.db.execute(query.offset(offset).limit(limit))
    #         rows = rows.fetchall()

    #         data = []
    #         for r in rows:
    #             withdraw, lecturer_id, name, email, avatar, bio = r
    #             data.append(
    #                 {
    #                     "id": str(withdraw.id),
    #                     "amount": float(withdraw.amount),
    #                     "currency": withdraw.currency,
    #                     "status": withdraw.status,
    #                     "requested_at": withdraw.requested_at,
    #                     "approved_at": withdraw.approved_at,
    #                     "paypal_batch_id": withdraw.paypal_batch_id,
    #                     "lecturer": {
    #                         "id": str(lecturer_id),
    #                         "fullname": name,
    #                         "email": email,
    #                         "avatar": avatar,
    #                         "bio": bio,
    #                     },
    #                 }
    #             )

    #         return {
    #             "page": page,
    #             "limit": limit,
    #             "total": total,
    #             "data": data,
    #         }

    #     except HTTPException:
    #         raise

    #     except Exception as e:
    #         print("❌ Error in list_withdraw_requests:", e)
    #         raise HTTPException(500, "Lỗi hệ thống khi lấy danh sách rút tiền.")

    # ============================================================
    # REQUEST WITHDRAW
    # ============================================================
    from decimal import ROUND_HALF_UP, Decimal

    async def request_withdraw_async(
        self,
        lecturer: User,
        coin_amount: int,
        notification_service: NotificationService,
    ):
        """Giảng viên rút theo số Coin thật; chi trả VND = Coin × tỷ giá. Coin bị khóa ngay khi tạo yêu cầu."""
        try:
            if not isinstance(coin_amount, int) or coin_amount <= 0:
                raise HTTPException(400, "Số Coin rút không hợp lệ.")

            settings = await self.db.scalar(select(PlatformSettings))
            if not settings:
                raise HTTPException(500, "Thiếu cấu hình nền tảng.")

            rate = int(settings.coin_vnd_rate)
            minimum_vnd = Decimal(str(settings.payout_min_balance or 100000))
            min_coin = -(-int(minimum_vnd) // rate)  # làm tròn lên
            if coin_amount < min_coin:
                raise HTTPException(400, f"Số Coin rút tối thiểu là {min_coin} Coin.")

            # Chặn pending
            existing = await self.db.scalar(
                select(WithdrawalRequests).where(
                    WithdrawalRequests.lecturer_id == lecturer.id,
                    WithdrawalRequests.status.in_(
                        ["pending", "approved", "payout_pending"]
                    ),
                )
            )
            if existing:
                raise HTTPException(400, "Bạn có yêu cầu trước đó chưa hoàn tất.")

            amount_vnd = Decimal(coin_amount) * Decimal(rate)

            withdrawable = await CoinService(self.db).withdrawable_paid_async(lecturer.id)
            if coin_amount > withdrawable:
                raise HTTPException(
                    400, f"Chỉ rút được Coin từ thu nhập giảng dạy. Bạn có thể rút tối đa {withdrawable} Coin.")

            # ============================================================
            # ATOMIC TRANSACTION
            # ============================================================
            async with self.db.begin_nested():
                withdraw = WithdrawalRequests(
                    lecturer_id=lecturer.id,
                    amount=amount_vnd,
                    coin_amount=coin_amount,
                    currency="VND",
                    status="pending",
                    requested_at=now(),
                )
                self.db.add(withdraw)
                await self.db.flush()

                # Khóa Coin thật (không dùng Coin thưởng); thiếu Coin thì từ chối, không đổi gì
                await CoinService(self.db).debit_paid_async(
                    lecturer.id, coin_amount, source="withdraw_hold", ref_id=withdraw.id)

                txn = Transactions(
                    user_id=lecturer.id,
                    amount=amount_vnd,
                    type="withdraw_hold",
                    direction="out",
                    status="completed",
                    method="wallet",
                    gateway="internal",
                    currency="VND",
                    ref_id=withdraw.id,
                    description=f"Khóa {coin_amount} Coin ({amount_vnd:,.0f} VND) để rút tiền.",
                    created_at=now(),
                )
                self.db.add(txn)
                await self.db.flush()
            # Notify ADMIN
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=None,
                    roles=["ADMIN"],
                    title="Yêu cầu rút tiền mới 💸",
                    content=f"Giảng viên {lecturer.fullname} yêu cầu rút {coin_amount} Coin ({amount_vnd:,.0f} VND).",
                    url="/admin/wallet/withdraw-requests",
                    type="withdraw_request",
                    role_target=["ADMIN"],
                    metadata={"withdrawal_id": str(withdraw.id)},
                )
            )

            # Notify LECTURER
            await notification_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=lecturer.id,
                    roles=["LECTURER"],
                    title="Yêu cầu rút tiền đã tạo",
                    content=f"{coin_amount} Coin đã được khóa.",
                    url="/lecturer/wallet/withdraw-history",
                    type="wallet",
                    role_target=["LECTURER"],
                )
            )

            return {
                "message": "Yêu cầu rút tiền đã được tạo và khóa Coin.",
                "withdrawal_id": str(withdraw.id),
                "coin_amount": coin_amount,
                "amount": float(amount_vnd),
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Lỗi hệ thống khi tạo yêu cầu rút tiền: {e}")

    async def check_can_withdraw_request_async(
        self,
        lecturer: User,
    ) -> dict:
        """Kiểm tra giảng viên có rút được không: không có yêu cầu đang chờ và đủ Coin thật tối thiểu."""
        try:
            pending = await self.db.scalar(
                select(WithdrawalRequests).where(
                    WithdrawalRequests.lecturer_id == lecturer.id,
                    WithdrawalRequests.status == "pending",
                )
            )
            has_pending = bool(pending)

            settings = await self.db.scalar(select(PlatformSettings))
            if settings is None:
                return {"pending": has_pending, "can_withdraw": False, "reason": "Thiếu cấu hình nền tảng."}

            rate = int(settings.coin_vnd_rate)
            min_coin = -(-int(settings.payout_min_balance or 0) // rate)
            coins = CoinService(self.db)
            balance = await coins.withdrawable_paid_async(lecturer.id)
            info = {"balance": balance, "paid_balance": (await coins.get_balances_async(lecturer.id)).paid,
                    "min_coin": min_coin, "rate_vnd": rate}

            if has_pending:
                return {"pending": True, "can_withdraw": False,
                        "reason": "Đang có yêu cầu rút tiền pending.", **info}
            if balance < min_coin:
                return {"pending": False, "can_withdraw": False,
                        "reason": f"Số Coin rút được ({balance}) nhỏ hơn mức tối thiểu {min_coin} Coin.", **info}
            return {"pending": False, "can_withdraw": True, "reason": None, **info}

        except Exception as e:
            print("❌ Error in check_pending_request_async:", e)
            return {"pending": False, "can_withdraw": False, "reason": "Lỗi hệ thống khi kiểm tra."}

    async def get_withdraw_list_async(
        self,
        user: User | None,
        role: str,
        page: int = 1,
        limit: int = 10,
        status: str | None = None,
        lecturer_id: uuid.UUID | None = None,
        search: str | None = None,
        order_by: str = "requested_at",
        order_dir: str = "desc",
    ):
        """
        Lấy danh sách yêu cầu rút tiền (ADMIN xem tất cả, LECTURER xem của mình)
        """
        try:
            offset = (page - 1) * limit

            # =========================
            # BASE QUERY
            # =========================
            query = select(
                WithdrawalRequests,
                User.fullname,
                User.email,
                User.avatar,
            ).join(User, User.id == WithdrawalRequests.lecturer_id)

            # =========================
            # ROLE FILTER
            # =========================
            if role == "LECTURER":
                query = query.where(WithdrawalRequests.lecturer_id == user.id)
            elif role == "ADMIN":
                if lecturer_id:
                    query = query.where(WithdrawalRequests.lecturer_id == lecturer_id)

            # =========================
            # FILTER BY STATUS
            # =========================
            if status:
                query = query.where(WithdrawalRequests.status == status)

            # =========================
            # SEARCH BY NAME / EMAIL
            # =========================
            if search:
                s = f"%{search.lower()}%"
                query = query.where(
                    func.lower(User.fullname).ilike(s) | func.lower(User.email).ilike(s)
                )

            # =========================
            # ORDER
            # =========================
            valid_order_fields = {
                "requested_at": WithdrawalRequests.requested_at,
                "amount": WithdrawalRequests.amount,
                "status": WithdrawalRequests.status,
            }

            field = valid_order_fields.get(order_by, WithdrawalRequests.requested_at)

            if order_dir.lower() == "asc":
                query = query.order_by(field.asc())
            else:
                query = query.order_by(field.desc())

            # =========================
            # PAGINATION
            # =========================
            query = query.limit(limit).offset(offset)

            rows = (await self.db.execute(query)).all()

            # =========================
            # TOTAL COUNT
            # =========================
            count_query = select(func.count()).select_from(
                select(WithdrawalRequests)
                .join(User, User.id == WithdrawalRequests.lecturer_id)
                .subquery()
            )

            # apply same filter for count
            if role == "LECTURER":
                count_query = count_query.where(
                    WithdrawalRequests.lecturer_id == user.id
                )
            elif role == "ADMIN" and lecturer_id:
                count_query = count_query.where(
                    WithdrawalRequests.lecturer_id == lecturer_id
                )

            if status:
                count_query = count_query.where(WithdrawalRequests.status == status)

            if search:
                count_query = count_query.where(
                    func.lower(User.fullname).ilike(s) | func.lower(User.email).ilike(s)
                )

            total = await self.db.scalar(count_query)

            # =========================
            # FORMAT OUTPUT
            # =========================
            data = []
            for wr, fullname, email, avatar in rows:
                data.append(
                    {
                        "id": str(wr.id),
                        "lecturer_id": str(wr.lecturer_id),
                        "fullname": fullname,
                        "email": email,
                        "avatar": avatar,
                        "reason": wr.reason,
                        "amount": wr.amount,
                        "currency": wr.currency,
                        "status": wr.status,
                        "requested_at": wr.requested_at,
                        "rejected_at": wr.rejected_at,
                    }
                )

            return {
                "page": page,
                "limit": limit,
                "total": total,
                "items": data,
            }
        except Exception as e:
            await self.db.rollback()
            print("❌ Error in get_withdraw_list_async:", e)
            raise HTTPException(500, f"Lỗi hệ thống khi lấy danh sách rút tiền. {e}")

    async def search_withdraw_lecturers_async(
        self,
        keyword: str | None,
        limit: int = 10,
    ):
        """
        Lấy danh sách giảng viên đang có trong bảng WithdrawalRequests,
        hỗ trợ search theo tên/email, limit 10.
        """
        try:
            # Base
            query = (
                select(
                    User.id,
                    User.fullname,
                    User.email,
                    User.avatar,
                )
                .join(WithdrawalRequests, WithdrawalRequests.lecturer_id == User.id)
                .group_by(User.id)
                .order_by(User.fullname.asc())
                .limit(limit)
            )

            # Search
            if keyword:
                s = f"%{keyword.lower()}%"
                query = query.where(
                    func.lower(User.fullname).ilike(s) | func.lower(User.email).ilike(s)
                )

            rows = (await self.db.execute(query)).all()

            return [
                {
                    "id": str(r.id),
                    "fullname": r.fullname,
                    "email": r.email,
                    "avatar": r.avatar,
                }
                for r in rows
            ]
        except Exception as e:
            await self.db.rollback()
            print("❌ Error in search_withdraw_lecturers_async:", e)
            raise HTTPException(500, f"Lỗi hệ thống khi tìm kiếm giảng viên. {e}")

    async def get_withdraw_request_by_id_async(self, request_id: uuid.UUID):
        try:
            query = (
                select(WithdrawalRequests)
                .where(WithdrawalRequests.id == request_id)
                .limit(1)
            )

            result = await self.db.execute(query)
            withdraw = result.scalars().first()
            if not withdraw:
                raise HTTPException(404, "Không tìm thấy yêu cầu rút tiền.")

            wallets = await self.db.scalar(
                select(Wallets).where(Wallets.user_id == withdraw.lecturer_id)
            )

            lecturer = await self.db.get(User, withdraw.lecturer_id)
            if not lecturer:
                raise HTTPException(404, "Không tìm thấy giảng viên.")
            return {
                "id": str(withdraw.id),
                "lecturer_id": str(withdraw.lecturer_id),
                "amount": float(withdraw.amount),
                "currency": withdraw.currency,
                "status": withdraw.status,
                "requested_at": withdraw.requested_at,
                "reason": withdraw.reason,
                "approved_at": withdraw.approved_at,
                "rejected_at": withdraw.rejected_at,
                "paypal_batch_id": withdraw.paypal_batch_id,
                "lecturer": {
                    "id": str(lecturer.id),
                    "fullname": lecturer.fullname,
                    "email": lecturer.email,
                    "avatar": lecturer.avatar,
                },
                "wallets": wallets,
            }
        except Exception as e:
            await self.db.rollback()
            print("❌ Error in get_withdraw_request_by_id_async:", e)
            raise HTTPException(
                500, f"Lỗi hệ thống khi lấy chi tiết yêu cầu rút tiền. {e}"
            )

    async def _refund_withdrawal_hold_async(self, w: WithdrawalRequests, wallet: Wallets | None) -> None:
        """Hoàn phần đã khóa của một yêu cầu rút: Coin thật nếu yêu cầu tính bằng Coin (idempotent theo mã yêu cầu),
        còn yêu cầu cũ tính bằng VND thì hoàn vào ví VND như trước."""
        if w.coin_amount is not None:
            await CoinService(self.db).credit_paid_async(
                w.lecturer_id, w.coin_amount, source="withdraw_refund", ref_id=w.id)
            return
        if wallet is None:
            return
        amount = Decimal(w.amount)
        wallet.balance = Decimal(wallet.balance or 0) + amount
        wallet.total_out = Decimal(wallet.total_out or 0) - amount

    async def approve_or_deny_withdrawals_async(
        self,
        approve: bool,
        notification_service: NotificationService,
        reason: str | None = None,
        withdraw_ids: list[uuid.UUID] | None = None,
        lecturer_id: uuid.UUID | None = None,
        all_pending: bool = False,
    ):
        """
        approve = True  → Admin duyệt
        approve = False → Admin từ chối
        """

        try:
            # =========================================
            # 1) Xác định danh sách cần xử lý
            # =========================================
            if not withdraw_ids and not lecturer_id and not all_pending:
                raise HTTPException(
                    400, "Thiếu tham số: withdraw_ids / lecturer_id / all_pending."
                )

            stmt = select(WithdrawalRequests).where(
                WithdrawalRequests.status == "pending"
            )

            # Lọc theo ID
            if withdraw_ids:
                stmt = stmt.where(WithdrawalRequests.id.in_(withdraw_ids))

            # Lọc theo giảng viên
            if lecturer_id:
                stmt = stmt.where(WithdrawalRequests.lecturer_id == lecturer_id)

            # all_pending → giữ nguyên

            result = await self.db.execute(stmt)
            withdrawals = result.scalars().all()

            if not withdrawals:
                raise HTTPException(404, "Không có yêu cầu pending nào để xử lý.")

            now_time = now()

            # =========================================
            # 2) Mở giao dịch ATOMIC
            # =========================================
            async with self.db.begin_nested():

                for w in withdrawals:

                    wallet: Wallets | None = await self.db.scalar(
                        select(Wallets).where(Wallets.user_id == w.lecturer_id)
                    )
                    if wallet is None and w.coin_amount is None:
                        raise HTTPException(500, "Ví giảng viên không tồn tại.")

                    if approve:
                        # === DUYỆT ===
                        w.status = "approved"
                        w.approved_at = now_time
                        w.error_message = None

                    else:
                        # === TỪ CHỐI → HOÀN TIỀN ===

                        w.status = "rejected"
                        w.rejected_at = now_time
                        w.error_message = reason or "Yêu cầu rút bị từ chối."

                        # Hoàn phần đã khóa (Coin hoặc VND tùy yêu cầu)
                        await self._refund_withdrawal_hold_async(w, wallet)

                        # Log transaction hoàn tiền
                        refund_txn = Transactions(
                            user_id=w.lecturer_id,
                            amount=float(w.amount),
                            type="withdraw_reject_refund",
                            direction="in",
                            status="completed",
                            method="wallet",
                            gateway="internal",
                            currency="VND",
                            ref_id=w.id,
                            description=f"Admin từ chối yêu cầu rút tiền. Hoàn lại {float(w.amount):,.0f} VND.",
                            created_at=now_time,
                        )
                        self.db.add(refund_txn)

            # =========================================
            # 3) Gửi thông báo sau khi commit
            # =========================================
            for w in withdrawals:
                await notification_service.create_notification_async(
                    NotificationCreateSchema(
                        user_id=w.lecturer_id,
                        roles=["LECTURER"],
                        title="Kết quả yêu cầu rút tiền",
                        content=(
                            f"Yêu cầu rút {float(w.amount):,.0f} VND của bạn đã "
                            + (
                                "được duyệt ✔️"
                                if approve
                                else f"bị từ chối ❌ — Lý do: {reason}"
                            )
                        ),
                        url=f"/lecturer/withdraw/{w.id}",
                        type="wallet",
                        role_target=["LECTURER"],
                        metadata={"withdrawal_id": str(w.id)},
                        action="open_url",
                    )
                )

            # =========================================
            # 4) Trả kết quả
            # =========================================
            return {
                "processed": len(withdrawals),
                "approve": approve,
                "reason": reason if not approve else None,
                "items": [
                    {
                        "id": str(w.id),
                        "lecturer_id": str(w.lecturer_id),
                        "amount": float(w.amount),
                        "status": w.status,
                        "approved_at": w.approved_at,
                        "rejected_at": w.rejected_at,
                        "error_message": w.error_message,
                    }
                    for w in withdrawals
                ],
            }

        except HTTPException:
            raise

        except Exception as e:
            await self.db.rollback()
            print("❌ Error approve_or_deny_withdrawals:", e)
            raise HTTPException(500, f"Lỗi hệ thống khi xử lý phê duyệt. {e}")

    async def process_payout_async(
        self,
        paypal: PayPalService,
        notification_service: NotificationService,
    ):
        # 1. Lấy danh sách ID các đơn APPROVED
        # Chúng ta chỉ lấy ID trước, sau đó vào vòng lặp mới fetch chi tiết + lock row
        stmt = select(WithdrawalRequests.id).where(
            WithdrawalRequests.status == "approved"
        )
        result = await self.db.execute(stmt)
        withdrawal_ids = result.scalars().all()

        if not withdrawal_ids:
            # Không print log ở đây để tránh spam log nếu chạy 5p/lần
            return []

        print(f"🚀 Bắt đầu xử lý {len(withdrawal_ids)} đơn rút tiền...")
        results_summary = []

        for w_id in withdrawal_ids:
            notify_plan = None

            # --- START ATOMIC TRANSACTION ---
            try:
                async with self.db.begin_nested():
                    # A. Fetch đơn hàng + Load sẵn Lecturer + LOCK ROW (with_for_update)
                    # Đây là cách chuẩn nhất để tránh lỗi Greenlet & Race Condition
                    stmt_item = (
                        select(WithdrawalRequests)
                        .options(
                            selectinload(WithdrawalRequests.lecturer)
                        )  # ✅ Load luôn Lecturer
                        .where(WithdrawalRequests.id == w_id)
                        .with_for_update()  # ✅ Khóa dòng này lại, thằng khác chờ
                    )
                    res_item = await self.db.execute(stmt_item)
                    current_w = res_item.scalars().first()

                    # Double check status
                    if not current_w or current_w.status != "approved":
                        continue

                    # Truy cập lecturer an toàn (vì đã selectinload)
                    lecturer = current_w.lecturer

                    if not lecturer or not lecturer.paypal_email:
                        current_w.status = "failed"
                        current_w.error_message = (
                            "Giảng viên chưa cập nhật PayPal Email"
                        )
                        current_w.completed_at = now()
                        print(f"❌ User {current_w.lecturer_id} thiếu PayPal email")
                        continue

                    # B. Chuyển trạng thái 'processing'
                    current_w.status = "processing"
                    await self.db.flush()  # Lưu tạm xuống DB để đánh dấu

                    # C. Tính toán tiền tệ
                    try:
                        # Giả sử amount là Decimal, convert sang float để tính toán rồi về lại Decimal
                        usd_value = await convert_vnd_to_usd(float(current_w.amount))
                        if not usd_value or usd_value <= 0:
                            raise ValueError("Tỷ giá không hợp lệ")

                        usd_decimal = Decimal(str(usd_value)).quantize(
                            Decimal("0.01"), rounding=ROUND_HALF_UP
                        )
                        usd_str = f"{usd_decimal:.2f}"
                    except Exception as ex:
                        current_w.status = "failed"
                        current_w.error_message = f"Lỗi convert tiền: {ex}"
                        continue

                    # D. Gọi PayPal API
                    try:
                        payout = await paypal.payout(
                            receiver_email=lecturer.paypal_email,
                            amount=usd_str,
                            currency="USD",
                        )
                        batch_id = payout["batch_header"]["payout_batch_id"]

                        # SUCCESS
                        current_w.paypal_batch_id = batch_id
                        current_w.status = "payout_pending"

                        # Lên plan bắn noti
                        notify_plan = {
                            "user_id": lecturer.id,
                            "roles": ["LECTURER"],
                            "title": "Đang xử lý thanh toán ⏳",
                            "content": f"Lệnh rút {float(current_w.amount):,.0f} VND đang được gửi sang PayPal (Batch: {batch_id}).",
                            "url": f"/lecturer/withdraw/{current_w.id}",
                            "type": "wallet",
                        }
                        results_summary.append(
                            {"id": w_id, "status": "success", "batch": batch_id}
                        )

                    except Exception as paypal_error:
                        # FAILED
                        print(f"❌ PayPal Error withdraw {w_id}: {paypal_error}")
                        current_w.status = "failed"
                        current_w.error_message = str(paypal_error)
                        current_w.completed_at = now()
                        # Logic hoàn tiền ví (nếu có) đặt ở đây...
                        results_summary.append(
                            {"id": w_id, "status": "failed", "error": str(paypal_error)}
                        )

                # --- COMMIT DB (Nhả lock) ---
                await self.db.commit()

                # --- GỬI NOTI (Sau khi commit) ---
                if notify_plan:
                    try:
                        await notification_service.create_notification_async(
                            NotificationCreateSchema(
                                user_id=notify_plan["user_id"],
                                roles=notify_plan["roles"],
                                title=notify_plan["title"],
                                content=notify_plan["content"],
                                url=notify_plan["url"],
                                type=notify_plan["type"],
                                action="open_url",
                                role_target=["LECTURER"],
                                metadata={"withdrawal_id": str(w_id)},
                            )
                        )
                    except Exception as e:
                        print(f"⚠️ Gửi noti lỗi: {e}")

            except SQLAlchemyError as db_err:
                await self.db.rollback()
                print(f"❌ DB Error withdraw {w_id}: {db_err}")
            except Exception as e:
                await self.db.rollback()
                print(f"❌ System Error withdraw {w_id}: {e}")

        print("🏁 Hoàn tất batch xử lý.")
        return results_summary

    async def check_payout_status(
        self, notification_service: NotificationService, paypal: PayPalService
    ):
        stmt = select(WithdrawalRequests).where(
            WithdrawalRequests.status == "payout_pending"
        )
        result = await self.db.execute(stmt)
        withdrawals = result.scalars().all()

        print(f"🔄 Bắt đầu kiểm tra {len(withdrawals)} yêu cầu payout...")

        for w in withdrawals:
            notify_plans = []  # 📝 Danh sách việc cần thông báo sau khi commit

            try:
                # --- 1. Check API PayPal ---
                try:
                    status = await paypal.get_payout_status(w.paypal_batch_id)
                    batch_status = status["batch_header"]["batch_status"]
                except Exception as e:
                    print(f"⚠️ PayPal API error: {e}")
                    continue

                if batch_status in ("PENDING", "PROCESSING"):
                    continue

                # --- 2. DB Transaction (Chỉ xử lý dữ liệu) ---
                async with self.db.begin_nested():
                    current_w = await self.db.get(WithdrawalRequests, w.id)
                    if not current_w:
                        continue

                    lecturer = await self.db.get(User, current_w.lecturer_id)
                    if not lecturer:
                        continue

                    transaction = await self.db.scalar(
                        select(Transactions).where(Transactions.ref_id == current_w.id)
                    )
                    if not transaction:
                        continue

                    # === CASE SUCCESS ===
                    if batch_status == "SUCCESS":
                        current_w.status = "paid"
                        current_w.completed_at = now()

                        # Trừ ví Admin
                        platform_wallet = await self.db.scalar(
                            select(PlatformWallets).limit(1).with_for_update()
                        )
                        amount_decimal = Decimal(current_w.amount)
                        platform_wallet.balance = (
                            Decimal(platform_wallet.balance) - amount_decimal
                        )
                        platform_wallet.total_out = (
                            Decimal(platform_wallet.total_out) + amount_decimal
                        )

                        # History
                        history = PlatformWalletHistory(
                            wallet_id=platform_wallet.id,
                            amount=amount_decimal,
                            type="out",
                            note=f"Thanh toán cho giảng viên {lecturer.email}",
                            related_transaction_id=transaction.id,
                            created_at=now(),
                        )
                        self.db.add(history)
                        await self.db.flush()  # Lấy ID để tạo link notification

                        # 📝 Lên kế hoạch bắn Notify (CHƯA BẮN NGAY)
                        notify_plans.append(
                            {
                                "user_id": lecturer.id,  # Gửi riêng cho GV
                                "roles": ["USER", "LECTURER"],
                                "title": "Rút tiền thành công ✅",
                                "content": f"Yêu cầu rút {float(current_w.amount):,.0f} VND đã được thanh toán.",
                                "url": "/lecturer/wallets",
                                "type": "system",
                            }
                        )
                        notify_plans.append(
                            {
                                "user_id": None,  # Gửi Admin
                                "roles": ["ADMIN"],
                                "title": "Payout thành công ✅",
                                "content": f"Đã thanh toán xong cho {lecturer.fullname}.",
                                "url": f"/admin/wallets/transactions/{history.id}",
                                "type": "system",
                            }
                        )

                    # === CASE FAILED ===
                    elif batch_status in ("FAILED", "BLOCKED", "DENIED", "RETURNED"):
                        current_w.status = "failed"
                        current_w.error_message = batch_status
                        current_w.completed_at = now()

                        amount_decimal = Decimal(current_w.amount)

                        # Hoàn tiền ví GV
                        lecturer_wallet = await self.db.scalar(
                            select(Wallets)
                            .where(Wallets.user_id == current_w.lecturer_id)
                            .with_for_update()
                        )
                        await self._refund_withdrawal_hold_async(current_w, lecturer_wallet)
                        if lecturer_wallet:
                            lecturer_wallet.last_transaction_at = now()

                        refund_trx = Transactions(
                            user_id=current_w.lecturer_id,
                            amount=amount_decimal,
                            type="withdraw_payout_failed_refund",
                            direction="in",
                            status="completed",
                            method="wallet",
                            gateway="internal",
                            currency="VND",
                            ref_id=current_w.id,
                            description=f"Hoàn tiền Payout lỗi ({batch_status})",
                            created_at=now(),
                        )
                        self.db.add(refund_trx)
                        await self.db.flush()

                        # 📝 Lên kế hoạch bắn Notify
                        notify_plans.append(
                            {
                                "user_id": lecturer.id,
                                "roles": ["USER", "LECTURER"],
                                "title": "Rút tiền thất bại ⚠️",
                                "content": f"Lỗi PayPal ({batch_status}). Tiền đã hoàn về ví.",
                                "url": f"/lecturer/wallets/transactions/{refund_trx.id}",
                                "type": "system",
                            }
                        )
                        notify_plans.append(
                            {
                                "user_id": None,
                                "roles": ["ADMIN"],
                                "title": "Payout thất bại ⚠️",
                                "content": f"Lỗi payout cho {lecturer.fullname}. Đã hoàn tiền ví.",
                                "url": f"/admin/users/{lecturer.id}",
                                "type": "system",
                            }
                        )

                # --- 3. COMMIT DB ---
                # Commit xong xuôi, tiền nong an toàn rồi mới đi bắn socket
                await self.db.commit()

                # --- 4. Gửi WebSocket (Fire & Forget) ---
                # Nếu đoạn này lỗi, user chỉ không nhận được noti, nhưng tiền vẫn đúng -> OK
                if notify_plans:
                    for plan in notify_plans:
                        try:
                            # Giả sử hàm create_notification_async của bạn lo cả việc lưu DB và bắn socket
                            await notification_service.create_notification_async(
                                NotificationCreateSchema(
                                    user_id=plan["user_id"],
                                    roles=plan["roles"],
                                    title=plan["title"],
                                    content=plan["content"],
                                    url=plan["url"],
                                    type=plan["type"],
                                    action="open_url",
                                )
                            )
                        except Exception as ns_e:
                            print(f"⚠️ Lỗi gửi notify cho {plan.get('user_id')}: {ns_e}")

                print(f"✅ Xử lý xong withdraw {w.id}")

            except SQLAlchemyError as db_err:
                await self.db.rollback()
                print(f"❌ DB Error: {db_err}")
            except Exception as e:
                await self.db.rollback()
                print(f"❌ Error: {e}")
