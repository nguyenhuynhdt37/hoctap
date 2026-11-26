"""Service nghiệp vụ Ký Hợp Đồng Số (Mây Mây Digital Contract Studio)."""

from __future__ import annotations

import datetime
import hashlib
import logging
import math
import secrets
import time
import uuid
from typing import Any

from fastapi import Depends, HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.db.models.contracts import (
    ContractAuditLogs,
    ContractTemplates,
    DigitalContracts,
    UserDigitalCertificates,
)
from app.db.models.database import Courses, PlatformSettings, User
from app.db.sesson import get_session
from app.services.shares.contract_crypto import (
    _platform_secret_bytes,
    compute_document_hash,
    compute_hmac_seal,
    decrypt_private_key_pem,
    generate_platform_ca_cert,
    generate_signed_contract_pdf,
    issue_user_x509_cert,
    load_external_p12,
    sign_hash_with_private_key,
    verify_signature_with_cert,
)
from app.services.shares.mailer import MailerService

logger = logging.getLogger(__name__)

# Bộ nhớ OTP bảo mật (lưu SHA-256 hash, TTL 5 phút, cooldown 45s, tối đa 5 lần nhập sai)
_OTP_STORE: dict[str, dict[str, Any]] = {}
_OTP_TTL_SECONDS = 300
_OTP_RESEND_COOLDOWN_SECONDS = 45
_OTP_MAX_ATTEMPTS = 5


def _hash_otp(cache_key: str, otp_code: str) -> str:
    return hashlib.sha256(f"{cache_key}:{otp_code}".encode("utf-8")).hexdigest()


def _mask_email(email: str) -> str:
    if "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*" * max(1, len(local) - 1)
    else:
        masked_local = f"{local[:2]}{'*' * min(6, len(local) - 3)}{local[-1]}"
    return f"{masked_local}@{domain}"


def _fmt_money(value: float | int) -> str:
    return f"{int(round(value)):,}".replace(",", ".")


def _render_template(body: str, variables: dict[str, Any]) -> str:
    rendered = body
    for key, val in variables.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(val))
    return rendered


class DigitalContractService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def _get_or_create_platform_ca(self) -> UserDigitalCertificates:
        ca = await self.db.scalar(
            select(UserDigitalCertificates).where(
                UserDigitalCertificates.is_platform_ca.is_(True),
                UserDigitalCertificates.status == "active",
            )
        )
        if ca:
            return ca
        ca_data = generate_platform_ca_cert()
        ca = UserDigitalCertificates(
            user_id=None,
            is_platform_ca=True,
            serial_number=ca_data["serial_number"],
            subject_cn=ca_data["subject_cn"],
            issuer_cn=ca_data["issuer_cn"],
            public_key_pem=ca_data["public_key_pem"],
            certificate_pem=ca_data["certificate_pem"],
            encrypted_private_key=ca_data["encrypted_private_key"],
            key_salt=ca_data["key_salt"],
            key_iv=ca_data["key_iv"],
            valid_from=ca_data["valid_from"],
            valid_until=ca_data["valid_until"],
            status="active",
        )
        self.db.add(ca)
        await self.db.flush()
        return ca

    def _decrypt_ca_key(self, ca: UserDigitalCertificates) -> bytes:
        return decrypt_private_key_pem(
            ca.encrypted_private_key,
            ca.key_salt,
            ca.key_iv,
            _platform_secret_bytes().decode("utf-8", errors="ignore"),
        )

    async def _log_audit(
        self,
        contract_id: uuid.UUID,
        actor_id: uuid.UUID | None,
        action: str,
        ip: str | None = None,
        ua: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.db.add(
            ContractAuditLogs(
                contract_id=contract_id,
                actor_id=actor_id,
                action=action,
                ip_address=ip,
                user_agent=ua,
                details=details or {},
            )
        )

    # ============================================================
    # 0. KIỂM TRA NHANH TRẠNG THÁI HỢP ĐỒNG KHUNG GIẢNG VIÊN
    # ============================================================
    async def get_master_contract_status_async(self, user: User) -> dict[str, Any]:
        # Ưu tiên tìm bản đã đồng ký đủ 2 bên (countersigned) trước
        countersigned = await self.db.scalar(
            select(DigitalContracts)
            .where(
                DigitalContracts.party_b_user_id == user.id,
                DigitalContracts.contract_type == "LECTURER_MASTER",
                DigitalContracts.status == "countersigned",
            )
            .order_by(desc(DigitalContracts.countersigned_at), desc(DigitalContracts.signed_at))
            .limit(1)
        )
        if countersigned:
            return {
                "has_signed_master": True,
                "is_countersigned": True,
                "is_pending_countersign": False,
                "can_access_portal": True,
                "contract_id": str(countersigned.id),
                "contract_number": countersigned.contract_number,
                "status": countersigned.status,
                "signed_at": countersigned.signed_at,
                "countersigned_at": countersigned.countersigned_at,
            }

        # Nếu chưa đồng ký, kiểm tra bản Bên B đã ký đang chờ Bên A đồng ký
        pending = await self.db.scalar(
            select(DigitalContracts)
            .where(
                DigitalContracts.party_b_user_id == user.id,
                DigitalContracts.contract_type == "LECTURER_MASTER",
                DigitalContracts.status == "signed",
            )
            .order_by(desc(DigitalContracts.signed_at))
            .limit(1)
        )
        if pending:
            return {
                "has_signed_master": True,
                "is_countersigned": False,
                "is_pending_countersign": True,
                "can_access_portal": False,
                "contract_id": str(pending.id),
                "contract_number": pending.contract_number,
                "status": pending.status,
                "signed_at": pending.signed_at,
                "countersigned_at": None,
            }

        return {
            "has_signed_master": False,
            "is_countersigned": False,
            "is_pending_countersign": False,
            "can_access_portal": False,
            "contract_id": None,
            "contract_number": None,
            "status": None,
            "signed_at": None,
            "countersigned_at": None,
        }

    # ============================================================
    # 1. CHỨNG THƯ SỐ X.509 CHO GIẢNG VIÊN
    # ============================================================
    async def get_my_certificate_async(self, user: User) -> dict[str, Any]:
        cert = await self.db.scalar(
            select(UserDigitalCertificates)
            .where(
                UserDigitalCertificates.user_id == user.id,
                UserDigitalCertificates.status == "active",
            )
            .order_by(desc(UserDigitalCertificates.created_at))
        )
        if not cert:
            return {"has_certificate": False, "certificate": None}
        return {
            "has_certificate": True,
            "certificate": {
                "id": str(cert.id),
                "serial_number": cert.serial_number,
                "subject_cn": cert.subject_cn,
                "subject_email": cert.subject_email,
                "subject_cccd": cert.subject_cccd,
                "issuer_cn": cert.issuer_cn,
                "algorithm": cert.algorithm,
                "valid_from": cert.valid_from,
                "valid_until": cert.valid_until,
                "status": cert.status,
            },
        }

    async def issue_my_certificate_async(
        self, user: User, *, pin: str, cccd: str
    ) -> dict[str, Any]:
        clean_pin = (pin or "").strip()
        if len(clean_pin) < 6 or not clean_pin.isdigit():
            raise HTTPException(400, "Mã PIN ký số phải gồm ít nhất 6 chữ số.")

        clean_cccd = (cccd or user.citizenship_identity or "").strip()
        if len(clean_cccd) < 9:
            raise HTTPException(400, "Vui lòng nhập số CCCD/CMND hợp lệ (tối thiểu 9 ký tự).")

        # Thu hồi chứng thư cũ (nếu cấp lại)
        old_certs = (
            await self.db.execute(
                select(UserDigitalCertificates).where(
                    UserDigitalCertificates.user_id == user.id,
                    UserDigitalCertificates.status == "active",
                )
            )
        ).scalars().all()
        for old in old_certs:
            old.status = "revoked"

        ca = await self._get_or_create_platform_ca()
        ca_key_pem = self._decrypt_ca_key(ca)

        cert_data = issue_user_x509_cert(
            ca_cert_pem=ca.certificate_pem,
            ca_private_key_pem=ca_key_pem,
            fullname=user.fullname or user.email,
            email=user.email,
            cccd=clean_cccd,
            pin=clean_pin,
        )
        cert = UserDigitalCertificates(
            user_id=user.id,
            is_platform_ca=False,
            **cert_data,
            status="active",
        )
        self.db.add(cert)

        if not user.citizenship_identity:
            user.citizenship_identity = clean_cccd

        await self.db.commit()
        await self.db.refresh(cert)
        return {
            "message": "Đã cấp chứng thư số X.509 thành công!",
            "certificate": {
                "id": str(cert.id),
                "serial_number": cert.serial_number,
                "subject_cn": cert.subject_cn,
                "subject_email": cert.subject_email,
                "subject_cccd": cert.subject_cccd,
                "issuer_cn": cert.issuer_cn,
                "algorithm": cert.algorithm,
                "valid_from": cert.valid_from,
                "valid_until": cert.valid_until,
                "status": cert.status,
            },
        }

    # ============================================================
    # 2. TẠO BẢN THẢO HỢP ĐỒNG SỐ
    # ============================================================
    async def create_draft_async(
        self,
        user: User,
        *,
        contract_type: str,
        course_id: uuid.UUID | None = None,
        signer_cccd: str | None = None,
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        code = contract_type.upper().strip()
        if code not in ("LECTURER_MASTER", "COURSE_PUBLISHING", "COURSE_PURCHASE"):
            raise HTTPException(400, "Loại hợp đồng không hợp lệ.")

        # Với LECTURER_MASTER: mỗi giảng viên chỉ có 1 bản hợp đồng duy nhất
        if code == "LECTURER_MASTER":
            existing_master = await self.db.scalar(
                select(DigitalContracts)
                .where(
                    DigitalContracts.party_b_user_id == user.id,
                    DigitalContracts.contract_type == "LECTURER_MASTER",
                    DigitalContracts.status != "revoked",
                )
                .order_by(desc(DigitalContracts.signed_at), desc(DigitalContracts.created_at))
                .limit(1)
            )
            if existing_master:
                return await self.get_contract_detail_async(
                    existing_master.id, user, is_admin=False
                )

        tpl = await self.db.scalar(
            select(ContractTemplates)
            .where(
                ContractTemplates.code == code,
                ContractTemplates.is_active.is_(True),
            )
            .order_by(desc(ContractTemplates.created_at))
        )
        if not tpl:
            raise HTTPException(404, f"Chưa cấu hình mẫu hợp đồng cho loại {code}.")

        ps = (await self.db.execute(select(PlatformSettings))).scalars().first()
        platform_fee = float(getattr(ps, "platform_fee", 0.30) or 0.30)
        platform_fee_pct = round(platform_fee * 100, 1)
        instructor_share_pct = round((1.0 - platform_fee) * 100, 1)
        coin_vnd_rate = int(getattr(ps, "coin_vnd_rate", 10000) or 10000)
        hold_days = int(getattr(ps, "hold_days", 7) or 7)
        payout_min_balance = float(getattr(ps, "payout_min_balance", 100000) or 100000)
        payout_schedule = str(getattr(ps, "payout_schedule", "mon-wed-fri") or "mon-wed-fri")
        discount_max_percent = int(getattr(ps, "discount_max_percent", 90) or 90)
        max_discounts_per_course = int(getattr(ps, "max_discounts_per_course", 2) or 2)
        refund_max_courses = int(getattr(ps, "refund_max_courses_per_month", 3) or 3)
        course_min_price = float(getattr(ps, "course_min_price", 10000) or 10000)
        course_max_price = float(getattr(ps, "course_max_price", 20000000) or 20000000)
        activation_fee_vnd = 1_000_000
        activation_fee_coin = math.ceil(activation_fee_vnd / coin_vnd_rate)

        schedule_vi = {
            "mon-wed-fri": "Thứ 2, Thứ 4, Thứ 6 hàng tuần",
            "daily": "Hàng ngày",
            "weekly": "Hàng tuần",
            "monthly": "Hàng tháng",
        }.get(payout_schedule, payout_schedule)

        course: Courses | None = None
        if course_id:
            course = await self.db.get(Courses, course_id)
            if not course:
                raise HTTPException(404, "Không tìm thấy khóa học đính kèm hợp đồng.")

        now_utc = datetime.datetime.now(datetime.timezone.utc)
        now_vn = now_utc + datetime.timedelta(hours=7)
        rand_suffix = secrets.token_hex(3).upper()
        contract_number = f"HD-MM-{now_vn.strftime('%Y%m')}-{rand_suffix}"

        course_price_vnd = float(course.base_price or 0) if course else 0.0
        course_price_coin = math.ceil(course_price_vnd / coin_vnd_rate) if course_price_vnd > 0 else 0
        cccd_val = (signer_cccd or user.citizenship_identity or "Sẽ xác nhận khi ký").strip()

        terms_snapshot = {
            "contract_type": code,
            "template_version": tpl.version,
            "platform_fee": platform_fee,
            "platform_fee_pct": platform_fee_pct,
            "instructor_share_pct": instructor_share_pct,
            "coin_vnd_rate": coin_vnd_rate,
            "hold_days": hold_days,
            "payout_min_balance": payout_min_balance,
            "course_id": str(course.id) if course else None,
            "course_title": course.title if course else None,
            "course_price_vnd": course_price_vnd,
            "course_price_coin": course_price_coin,
            "lecturer_name": user.fullname or user.email,
            "lecturer_email": user.email,
        }

        variables = {
            "contract_number": contract_number,
            "signed_date": now_vn.strftime("%d/%m/%Y"),
            "lecturer_name": user.fullname or user.email,
            "lecturer_email": user.email,
            "signer_cccd": cccd_val,
            "lecturer_address": ", ".join(
                [p for p in [getattr(user, "district", None), getattr(user, "conscious", None)] if p]
            )
            or "Theo hồ sơ định danh điện tử",
            "platform_fee_pct": f"{platform_fee_pct:g}",
            "instructor_share_pct": f"{instructor_share_pct:g}",
            "coin_vnd_rate": _fmt_money(coin_vnd_rate),
            "hold_days": hold_days,
            "payout_min_balance": _fmt_money(payout_min_balance),
            "payout_min_coin": _fmt_money(math.ceil(payout_min_balance / coin_vnd_rate)),
            "payout_schedule": schedule_vi,
            "activation_fee_coin": _fmt_money(activation_fee_coin),
            "activation_fee_vnd": _fmt_money(activation_fee_vnd),
            "discount_max_percent": discount_max_percent,
            "max_discounts_per_course": max_discounts_per_course,
            "refund_max_courses_per_month": refund_max_courses,
            "course_min_price": _fmt_money(course_min_price),
            "course_max_price": _fmt_money(course_max_price),
            "course_title": course.title if course else "Toàn bộ khóa học thuộc sở hữu Giảng viên",
            "course_price_vnd": _fmt_money(course_price_vnd),
            "course_price_coin": _fmt_money(course_price_coin),
        }

        rendered = _render_template(tpl.body_markdown, variables)
        contract_title = (
            f"{tpl.title} — {course.title}" if course else tpl.title
        )

        contract = DigitalContracts(
            contract_number=contract_number,
            template_id=tpl.id,
            contract_type=code,
            title=contract_title,
            party_b_user_id=user.id,
            course_id=course.id if course else None,
            status="draft",
            rendered_content=rendered,
            terms_snapshot=terms_snapshot,
            signer_cccd=signer_cccd or user.citizenship_identity,
        )
        self.db.add(contract)
        await self.db.flush()
        await self._log_audit(
            contract.id,
            user.id,
            "created",
            ip=ip,
            ua=ua,
            details={"contract_type": code, "template_version": tpl.version},
        )
        await self.db.commit()
        await self.db.refresh(contract)

        return await self.get_contract_detail_async(contract.id, user, is_admin=False)

    # ============================================================
    # 3. GỬI OTP XÁC THỰC KÝ ĐIỆN TỬ
    # ============================================================
    async def request_sign_otp_async(
        self,
        contract_id: uuid.UUID,
        user: User,
        *,
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        contract = await self.db.get(DigitalContracts, contract_id)
        if not contract:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if contract.party_b_user_id != user.id:
            raise HTTPException(403, "Bạn không có quyền ký hợp đồng này.")
        if contract.status not in ("draft", "pending_otp"):
            raise HTTPException(400, "Hợp đồng không ở trạng thái chờ ký.")

        now_ts = time.time()
        cache_key = f"{contract.id}:{user.id}"
        existing = _OTP_STORE.get(cache_key)
        if existing:
            elapsed = now_ts - float(existing.get("last_sent_at", 0))
            if elapsed < _OTP_RESEND_COOLDOWN_SECONDS:
                wait_s = int(math.ceil(_OTP_RESEND_COOLDOWN_SECONDS - elapsed))
                raise HTTPException(
                    429,
                    f"Vui lòng đợi {wait_s} giây trước khi yêu cầu gửi lại mã OTP.",
                )

        otp_code = f"{secrets.randbelow(1_000_000):06d}"

        try:
            mailer = MailerService()
            await mailer.send_contract_signing_otp_email(
                email=user.email,
                fullname=user.fullname or user.email,
                code=otp_code,
                contract_number=contract.contract_number,
                contract_title=contract.title,
            )
        except Exception as exc:
            logger.exception("Không thể gửi email OTP ký hợp đồng cho %s: %s", user.email, exc)
            raise HTTPException(
                503,
                "Hệ thống gửi Email xác thực tạm thời gián đoạn. Vui lòng thử lại sau ít phút.",
            ) from exc

        _OTP_STORE[cache_key] = {
            "otp_hash": _hash_otp(cache_key, otp_code),
            "expires_at": now_ts + _OTP_TTL_SECONDS,
            "last_sent_at": now_ts,
            "attempts": 0,
        }

        contract.status = "pending_otp"
        await self._log_audit(contract.id, user.id, "otp_sent", ip=ip, ua=ua)
        await self.db.commit()

        masked_email = _mask_email(user.email)
        return {
            "message": f"Đã gửi mã OTP 6 chữ số tới hộp thư {masked_email}.",
            "email_sent": True,
            "masked_email": masked_email,
            "expires_in_seconds": _OTP_TTL_SECONDS,
            "resend_cooldown_seconds": _OTP_RESEND_COOLDOWN_SECONDS,
        }

    # ============================================================
    # 4. KÝ ĐIỆN TỬ (CLOUD PKI X.509 HOẶC UPLOAD .P12/.PFX)
    # ============================================================
    async def sign_contract_async(
        self,
        contract_id: uuid.UUID,
        user: User,
        *,
        signing_method: str,
        otp_code: str,
        signer_cccd: str,
        signer_tax_code: str | None = None,
        pin: str | None = None,
        p12_bytes: bytes | None = None,
        p12_password: str | None = None,
        signature_image_data: str | None = None,
        signature_type: str = "drawn",
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        contract = await self.db.get(DigitalContracts, contract_id)
        if not contract:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if contract.party_b_user_id != user.id:
            raise HTTPException(403, "Bạn không có quyền ký hợp đồng này.")
        if contract.status not in ("draft", "pending_otp"):
            raise HTTPException(400, "Hợp đồng đã được ký hoặc đã đóng.")

        # 1. Xác thực OTP (SHA-256 hash + giới hạn số lần nhập sai chống brute-force)
        cache_key = f"{contract.id}:{user.id}"
        stored = _OTP_STORE.get(cache_key)
        if not stored:
            raise HTTPException(400, "Vui lòng bấm gửi mã OTP xác thực qua Email trước khi ký.")
        if time.time() > float(stored["expires_at"]):
            _OTP_STORE.pop(cache_key, None)
            raise HTTPException(400, "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.")
        provided_otp = (otp_code or "").strip()
        if not secrets.compare_digest(
            _hash_otp(cache_key, provided_otp), str(stored["otp_hash"])
        ):
            stored["attempts"] = int(stored.get("attempts", 0)) + 1
            remaining = _OTP_MAX_ATTEMPTS - stored["attempts"]
            if remaining <= 0:
                _OTP_STORE.pop(cache_key, None)
                raise HTTPException(
                    400,
                    "Bạn đã nhập sai mã OTP quá 5 lần. Mã OTP đã bị hủy, vui lòng gửi lại mã mới.",
                )
            raise HTTPException(
                400,
                f"Mã OTP không chính xác (còn {remaining} lần thử).",
            )

        clean_cccd = (signer_cccd or user.citizenship_identity or "").strip()
        if len(clean_cccd) < 9:
            raise HTTPException(400, "Vui lòng nhập số CCCD/CMND hợp lệ để định danh người ký.")

        # 2. Mở khóa Private Key (Cloud PKI bằng PIN hoặc .p12 ngoài)
        cert_id: uuid.UUID | None = None
        cert_pem_snapshot: str
        private_key_pem: bytes
        cert_serial: str

        if signing_method == "external_p12":
            if not p12_bytes:
                raise HTTPException(400, "Vui lòng chọn tệp chứng thư số (.p12 / .pfx).")
            try:
                private_key_pem, cert_pem_snapshot, cert_serial, _ = load_external_p12(
                    p12_bytes, p12_password or ""
                )
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
        else:
            signing_method = "cloud_pki"
            cert = await self.db.scalar(
                select(UserDigitalCertificates)
                .where(
                    UserDigitalCertificates.user_id == user.id,
                    UserDigitalCertificates.status == "active",
                )
                .order_by(desc(UserDigitalCertificates.created_at))
            )
            if not cert:
                # Tự động cấp chứng thư X.509 lần đầu bằng chính mã PIN giảng viên vừa đặt
                if not pin or len(pin.strip()) < 6 or not pin.strip().isdigit():
                    raise HTTPException(
                        400,
                        "Chưa có chứng thư số. Vui lòng nhập mã PIN ký số (tối thiểu 6 chữ số) để hệ thống cấp chứng thư X.509 và ký ngay.",
                    )
                await self.issue_my_certificate_async(user, pin=pin.strip(), cccd=clean_cccd)
                cert = await self.db.scalar(
                    select(UserDigitalCertificates)
                    .where(
                        UserDigitalCertificates.user_id == user.id,
                        UserDigitalCertificates.status == "active",
                    )
                    .order_by(desc(UserDigitalCertificates.created_at))
                )
            if not cert:
                raise HTTPException(500, "Không thể khởi tạo chứng thư số cho tài khoản.")
            if not pin:
                raise HTTPException(400, "Vui lòng nhập mã PIN ký số để mở khóa chứng thư.")
            try:
                private_key_pem = decrypt_private_key_pem(
                    cert.encrypted_private_key,
                    cert.key_salt,
                    cert.key_iv,
                    pin.strip(),
                )
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
            cert_id = cert.id
            cert_pem_snapshot = cert.certificate_pem
            cert_serial = cert.serial_number

        # 3. Đóng băng nội dung & Ký mật mã RSA-PSS + HMAC Seal
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        signed_at_iso = now_utc.replace(microsecond=0).isoformat()

        updated_content = contract.rendered_content.replace(
            "Sẽ xác nhận khi ký", clean_cccd
        )
        updated_snapshot = dict(contract.terms_snapshot or {})
        updated_snapshot["signer_cccd"] = clean_cccd
        if signer_tax_code:
            updated_snapshot["signer_tax_code"] = signer_tax_code.strip()
        updated_snapshot["cert_serial"] = cert_serial
        updated_snapshot["signing_method"] = signing_method

        doc_hash = compute_document_hash(
            contract_number=contract.contract_number,
            rendered_content=updated_content,
            terms_snapshot=updated_snapshot,
            party_b_user_id=str(user.id),
            signed_at_iso=signed_at_iso,
        )
        digital_sig_b64 = sign_hash_with_private_key(doc_hash, private_key_pem)
        seal = compute_hmac_seal(doc_hash, digital_sig_b64)

        contract.rendered_content = updated_content
        contract.terms_snapshot = updated_snapshot
        contract.status = "signed"
        contract.certificate_id = cert_id
        contract.signing_method = signing_method
        contract.signer_cccd = clean_cccd
        contract.signer_tax_code = signer_tax_code.strip() if signer_tax_code else None
        contract.signature_image_data = signature_image_data
        contract.signature_type = signature_type
        contract.document_hash = doc_hash
        contract.digital_signature_b64 = digital_sig_b64
        contract.signature_seal = seal
        contract.certificate_pem_snapshot = cert_pem_snapshot
        contract.signer_ip = ip
        contract.signer_user_agent = ua
        contract.otp_verified_at = now_utc
        contract.signed_at = now_utc

        _OTP_STORE.pop(cache_key, None)

        await self._log_audit(
            contract.id,
            user.id,
            "signed",
            ip=ip,
            ua=ua,
            details={
                "signing_method": signing_method,
                "cert_serial": cert_serial,
                "document_hash": doc_hash,
            },
        )
        await self.db.commit()
        return await self.get_contract_detail_async(contract.id, user, is_admin=False)

    # ============================================================
    # 5. XÁC MINH TOÀN VẸN MẬT MÃ (SHA-256 + RSA-PSS + HMAC)
    # ============================================================
    async def verify_contract_integrity_async(
        self,
        contract: DigitalContracts,
        *,
        actor_id: uuid.UUID | None = None,
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        if contract.status not in ("signed", "countersigned", "revoked"):
            return {
                "valid": False,
                "status": contract.status,
                "reason": "Hợp đồng chưa được ký điện tử.",
            }

        signed_at_iso = (
            contract.signed_at.replace(microsecond=0).isoformat()
            if contract.signed_at
            else ""
        )
        recomputed_hash = compute_document_hash(
            contract_number=contract.contract_number,
            rendered_content=contract.rendered_content,
            terms_snapshot=contract.terms_snapshot or {},
            party_b_user_id=str(contract.party_b_user_id),
            signed_at_iso=signed_at_iso,
        )
        hash_ok = recomputed_hash == contract.document_hash
        seal_ok = (
            compute_hmac_seal(
                contract.document_hash or "", contract.digital_signature_b64 or ""
            )
            == contract.signature_seal
        )
        pki_ok = (
            verify_signature_with_cert(
                contract.document_hash or "",
                contract.digital_signature_b64 or "",
                contract.certificate_pem_snapshot or "",
            )
            if contract.certificate_pem_snapshot and contract.digital_signature_b64
            else False
        )
        all_valid = hash_ok and seal_ok and pki_ok

        if actor_id is not None:
            await self._log_audit(
                contract.id,
                actor_id,
                "verified",
                ip=ip,
                ua=ua,
                details={
                    "valid": all_valid,
                    "hash_ok": hash_ok,
                    "seal_ok": seal_ok,
                    "pki_ok": pki_ok,
                },
            )
            await self.db.commit()

        return {
            "valid": all_valid,
            "hash_match": hash_ok,
            "hmac_seal_valid": seal_ok,
            "pki_signature_valid": pki_ok,
            "contract_number": contract.contract_number,
            "status": contract.status,
            "document_hash": contract.document_hash,
            "signed_at": contract.signed_at,
            "countersigned_at": contract.countersigned_at,
            "cert_serial": (contract.terms_snapshot or {}).get("cert_serial"),
        }

    # ============================================================
    # 6. XUẤT PDF CÓ NHÚNG CHỮ KÝ SỐ PAdES + MÃ QR
    # ============================================================
    async def export_contract_pdf_async(
        self,
        contract_id: uuid.UUID,
        user: User,
        *,
        is_admin: bool = False,
        ip: str | None = None,
        ua: str | None = None,
    ) -> tuple[bytes, str]:
        contract = await self.db.get(DigitalContracts, contract_id)
        if not contract:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if not is_admin and contract.party_b_user_id != user.id:
            raise HTTPException(403, "Bạn không có quyền tải hợp đồng này.")

        party_b = await self.db.get(User, contract.party_b_user_id)
        ca = await self._get_or_create_platform_ca()
        ca_key_pem = self._decrypt_ca_key(ca)

        fe_base = (
            getattr(settings, "FRONTEND_URL", None) or "http://localhost:3000"
        ).rstrip("/")
        verify_url = f"{fe_base}/verify-contract/{contract.contract_number}"

        signed_str = (
            (contract.signed_at + datetime.timedelta(hours=7)).strftime("%d/%m/%Y %H:%M:%S +07")
            if contract.signed_at
            else "Chưa ký"
        )

        is_draft = contract.status not in ("signed", "countersigned")
        pdf_bytes = await generate_signed_contract_pdf(
            contract_number=contract.contract_number,
            title=contract.title,
            rendered_content=contract.rendered_content,
            signer_name=party_b.fullname if party_b else "Giảng viên",
            signer_email=party_b.email if party_b else "",
            signer_cccd=contract.signer_cccd,
            signed_at_str=signed_str,
            document_hash=contract.document_hash,
            cert_serial=(contract.terms_snapshot or {}).get("cert_serial"),
            signature_image_data=contract.signature_image_data,
            verify_url=verify_url,
            ca_private_key_pem=None if is_draft else ca_key_pem,
            ca_cert_pem=None if is_draft else ca.certificate_pem,
            is_countersigned=contract.status == "countersigned",
            is_draft=is_draft,
        )

        await self._log_audit(contract.id, user.id, "pdf_downloaded", ip=ip, ua=ua)
        await self.db.commit()

        filename = f"{contract.contract_number}.pdf"
        return pdf_bytes, filename

    # ============================================================
    # 7. TRUY VẤN DANH SÁCH & CHI TIẾT (LECTURER + ADMIN + PUBLIC)
    # ============================================================
    async def list_contracts_async(
        self,
        *,
        user: User | None = None,
        is_admin: bool = False,
        page: int = 1,
        limit: int = 12,
        search: str | None = None,
        status: str | None = None,
        contract_type: str | None = None,
    ) -> dict[str, Any]:
        stmt = (
            select(
                DigitalContracts,
                User.fullname.label("party_b_name"),
                User.email.label("party_b_email"),
                User.avatar.label("party_b_avatar"),
                Courses.title.label("course_title"),
            )
            .join(User, User.id == DigitalContracts.party_b_user_id)
            .outerjoin(Courses, Courses.id == DigitalContracts.course_id)
        )

        if not is_admin and user is not None:
            stmt = stmt.where(DigitalContracts.party_b_user_id == user.id)

        if status:
            stmt = stmt.where(DigitalContracts.status == status)
        if contract_type:
            stmt = stmt.where(DigitalContracts.contract_type == contract_type)
        if search:
            like = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(DigitalContracts.contract_number).like(like),
                    func.lower(DigitalContracts.title).like(like),
                    func.lower(func.coalesce(User.fullname, "")).like(like),
                    func.lower(func.coalesce(User.email, "")).like(like),
                )
            )

        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = (
            await self.db.execute(
                stmt.order_by(desc(DigitalContracts.created_at))
                .offset((page - 1) * limit)
                .limit(limit)
            )
        ).all()

        items = []
        for c, party_b_name, party_b_email, party_b_avatar, course_title in rows:
            items.append(
                {
                    "id": str(c.id),
                    "contract_number": c.contract_number,
                    "contract_type": c.contract_type,
                    "title": c.title,
                    "status": c.status,
                    "signing_method": c.signing_method,
                    "document_hash": c.document_hash,
                    "signed_at": c.signed_at,
                    "countersigned_at": c.countersigned_at,
                    "created_at": c.created_at,
                    "course_id": str(c.course_id) if c.course_id else None,
                    "course_title": course_title,
                    "party_b": {
                        "id": str(c.party_b_user_id),
                        "fullname": party_b_name,
                        "email": party_b_email,
                        "avatar": party_b_avatar,
                    },
                    "cert_serial": (c.terms_snapshot or {}).get("cert_serial"),
                }
            )

        return {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, math.ceil(total / limit)),
            "items": items,
        }

    async def get_contract_detail_async(
        self,
        contract_id: uuid.UUID,
        user: User,
        *,
        is_admin: bool = False,
    ) -> dict[str, Any]:
        c = await self.db.get(DigitalContracts, contract_id)
        if not c:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if not is_admin and c.party_b_user_id != user.id:
            raise HTTPException(403, "Bạn không có quyền xem hợp đồng này.")

        party_b = await self.db.get(User, c.party_b_user_id)
        course = await self.db.get(Courses, c.course_id) if c.course_id else None
        countersigner = (
            await self.db.get(User, c.countersigned_by) if c.countersigned_by else None
        )

        audit_rows = (
            await self.db.execute(
                select(ContractAuditLogs, User.fullname)
                .outerjoin(User, User.id == ContractAuditLogs.actor_id)
                .where(ContractAuditLogs.contract_id == c.id)
                .order_by(desc(ContractAuditLogs.created_at))
                .limit(30)
            )
        ).all()

        integrity = (
            await self.verify_contract_integrity_async(c)
            if c.status in ("signed", "countersigned", "revoked")
            else None
        )

        return {
            "id": str(c.id),
            "contract_number": c.contract_number,
            "contract_type": c.contract_type,
            "title": c.title,
            "status": c.status,
            "rendered_content": c.rendered_content,
            "terms_snapshot": c.terms_snapshot,
            "signing_method": c.signing_method,
            "signer_cccd": c.signer_cccd,
            "signer_tax_code": c.signer_tax_code,
            "signature_image_data": c.signature_image_data,
            "signature_type": c.signature_type,
            "document_hash": c.document_hash,
            "digital_signature_b64": c.digital_signature_b64,
            "cert_serial": (c.terms_snapshot or {}).get("cert_serial"),
            "signer_ip": c.signer_ip,
            "otp_verified_at": c.otp_verified_at,
            "signed_at": c.signed_at,
            "countersigned_at": c.countersigned_at,
            "countersigner_name": countersigner.fullname if countersigner else None,
            "revoked_at": c.revoked_at,
            "revoke_reason": c.revoke_reason,
            "created_at": c.created_at,
            "course": (
                {
                    "id": str(course.id),
                    "title": course.title,
                    "base_price": float(course.base_price or 0),
                }
                if course
                else None
            ),
            "party_b": {
                "id": str(c.party_b_user_id),
                "fullname": party_b.fullname if party_b else "Giảng viên",
                "email": party_b.email if party_b else "",
                "avatar": party_b.avatar if party_b else None,
            },
            "integrity": integrity,
            "audit_logs": [
                {
                    "id": str(log.id),
                    "action": log.action,
                    "actor_name": actor_name or "Hệ thống",
                    "ip_address": log.ip_address,
                    "details": log.details,
                    "created_at": log.created_at,
                }
                for log, actor_name in audit_rows
            ],
        }

    async def public_verify_by_number_async(self, contract_number: str) -> dict[str, Any]:
        c = await self.db.scalar(
            select(DigitalContracts).where(
                DigitalContracts.contract_number == contract_number.strip()
            )
        )
        if not c:
            raise HTTPException(404, "Không tìm thấy mã hợp đồng điện tử này trên hệ thống Mây Mây.")
        party_b = await self.db.get(User, c.party_b_user_id)
        integrity = await self.verify_contract_integrity_async(c)
        return {
            "contract_number": c.contract_number,
            "title": c.title,
            "contract_type": c.contract_type,
            "status": c.status,
            "signer_name": party_b.fullname if party_b else "Đối tác Mây Mây",
            "signing_method": c.signing_method,
            "signed_at": c.signed_at,
            "countersigned_at": c.countersigned_at,
            "revoked_at": c.revoked_at,
            "integrity": integrity,
        }

    # ============================================================
    # 8. QUẢN TRỊ ADMIN (STATS, COUNTERSIGN, REVOKE, TEMPLATES)
    # ============================================================
    async def get_admin_stats_async(self) -> dict[str, Any]:
        rows = (
            await self.db.execute(
                select(DigitalContracts.status, func.count(DigitalContracts.id)).group_by(
                    DigitalContracts.status
                )
            )
        ).all()
        counts = {st: int(cnt or 0) for st, cnt in rows}
        total_certs = (
            await self.db.scalar(
                select(func.count(UserDigitalCertificates.id)).where(
                    UserDigitalCertificates.is_platform_ca.is_(False),
                    UserDigitalCertificates.status == "active",
                )
            )
            or 0
        )
        return {
            "total": sum(counts.values()),
            "draft": counts.get("draft", 0) + counts.get("pending_otp", 0),
            "signed": counts.get("signed", 0),
            "countersigned": counts.get("countersigned", 0),
            "revoked": counts.get("revoked", 0),
            "active_certificates": int(total_certs),
        }

    async def admin_countersign_async(
        self,
        contract_id: uuid.UUID,
        admin: User,
        *,
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        c = await self.db.get(DigitalContracts, contract_id)
        if not c:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if c.status != "signed":
            raise HTTPException(400, "Chỉ có thể đồng ký các hợp đồng đã được Giảng viên ký.")

        ca = await self._get_or_create_platform_ca()
        ca_key_pem = self._decrypt_ca_key(ca)
        countersig = sign_hash_with_private_key(c.document_hash or "", ca_key_pem)

        c.status = "countersigned"
        c.countersigned_by = admin.id
        c.countersigned_at = datetime.datetime.now(datetime.timezone.utc)
        c.countersign_signature_b64 = countersig

        await self._log_audit(
            c.id,
            admin.id,
            "countersigned",
            ip=ip,
            ua=ua,
            details={"ca_serial": ca.serial_number},
        )
        await self.db.commit()
        return await self.get_contract_detail_async(c.id, admin, is_admin=True)

    async def admin_revoke_async(
        self,
        contract_id: uuid.UUID,
        admin: User,
        *,
        reason: str,
        ip: str | None = None,
        ua: str | None = None,
    ) -> dict[str, Any]:
        c = await self.db.get(DigitalContracts, contract_id)
        if not c:
            raise HTTPException(404, "Không tìm thấy hợp đồng.")
        if not (reason or "").strip():
            raise HTTPException(400, "Vui lòng nhập lý do thu hồi hiệu lực hợp đồng.")

        c.status = "revoked"
        c.revoked_by = admin.id
        c.revoked_at = datetime.datetime.now(datetime.timezone.utc)
        c.revoke_reason = reason.strip()

        await self._log_audit(
            c.id,
            admin.id,
            "revoked",
            ip=ip,
            ua=ua,
            details={"reason": reason.strip()},
        )
        await self.db.commit()
        return await self.get_contract_detail_async(c.id, admin, is_admin=True)

    async def list_templates_async(self) -> list[dict[str, Any]]:
        rows = (
            await self.db.execute(
                select(ContractTemplates).order_by(
                    ContractTemplates.code, desc(ContractTemplates.created_at)
                )
            )
        ).scalars().all()
        return [
            {
                "id": str(t.id),
                "code": t.code,
                "version": t.version,
                "title": t.title,
                "description": t.description,
                "body_markdown": t.body_markdown,
                "is_active": t.is_active,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
            for t in rows
        ]

    async def upsert_template_async(
        self,
        admin: User,
        *,
        code: str,
        version: str,
        title: str,
        description: str | None,
        body_markdown: str,
    ) -> dict[str, Any]:
        clean_code = code.upper().strip()
        clean_ver = version.strip()
        if clean_code not in ("LECTURER_MASTER", "COURSE_PUBLISHING", "COURSE_PURCHASE"):
            raise HTTPException(400, "Mã loại mẫu hợp đồng không hợp lệ.")

        # Tắt active các phiên bản cũ cùng code
        existing_all = (
            await self.db.execute(
                select(ContractTemplates).where(ContractTemplates.code == clean_code)
            )
        ).scalars().all()
        target = None
        for t in existing_all:
            if t.version == clean_ver:
                target = t
            else:
                t.is_active = False

        if target:
            target.title = title.strip()
            target.description = description
            target.body_markdown = body_markdown
            target.is_active = True
        else:
            target = ContractTemplates(
                code=clean_code,
                version=clean_ver,
                title=title.strip(),
                description=description,
                body_markdown=body_markdown,
                is_active=True,
                created_by=admin.id,
            )
            self.db.add(target)

        await self.db.commit()
        await self.db.refresh(target)
        return {
            "id": str(target.id),
            "code": target.code,
            "version": target.version,
            "title": target.title,
            "is_active": target.is_active,
        }
