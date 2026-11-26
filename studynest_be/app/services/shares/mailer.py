# app/services/mailer.py
from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import settings
from app.services.user.learning_menu import (
    announcement_emails_enabled,
    promotional_emails_enabled,
)


class MailerService:
    """Service gửi email hệ thống (xác thực, reset mật khẩu, thông báo, v.v.)."""

    def __init__(self):
        base_dir = Path(__file__).resolve().parent.parent.parent  # -> app/
        template_dir = base_dir / "templates" / "emails"

        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=SecretStr(settings.MAIL_PASSWORD),
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_FROM_NAME="Mây Mây",
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_TLS,
            MAIL_SSL_TLS=settings.MAIL_SSL,
            USE_CREDENTIALS=bool(settings.MAIL_USERNAME and settings.MAIL_PASSWORD),
            VALIDATE_CERTS=bool(settings.MAIL_TLS or settings.MAIL_SSL),
            TEMPLATE_FOLDER=template_dir,
        )
        self.fastmail = FastMail(self.conf)

    async def send_verification_email(self, email: str, fullname: str, code: str):
        """Gửi email xác thực tài khoản."""
        message = MessageSchema(
            subject="Xác thực email - Mây Mây",
            recipients=[email],
            template_body={"fullname": fullname, "code": code},
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name="verify_email.html")
        return {"message": f"Đã gửi email xác thực đến {email}", "sent": True}

    async def send_login_otp_email(self, email: str, fullname: str, code: str):
        """Gửi email OTP đăng nhập."""
        message = MessageSchema(
            subject="Mã OTP đăng nhập - Mây Mây",
            recipients=[email],
            template_body={"fullname": fullname, "code": code},
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name="login_otp.html")
        return {"message": f"Đã gửi mã OTP đăng nhập đến {email}"}

    async def send_contract_signing_otp_email(
        self,
        email: str,
        fullname: str,
        code: str,
        contract_number: str,
        contract_title: str,
    ):
        """Gửi email OTP xác thực ký Hợp đồng Điện tử (chuẩn PKI X.509 / PAdES)."""
        safe_name = fullname or email
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #F7FAFD; color: #162333;">
          <div style="background: #FFFFFF; border: 1px solid #D8E6F4; border-radius: 16px; padding: 28px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #356FA7;">
              Mây Mây Digital Trust · PKI X.509
            </p>
            <h2 style="margin: 0 0 12px; font-size: 20px; color: #162333;">
              Mã OTP xác thực ký Hợp đồng Điện tử
            </h2>
            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #4A5F78;">
              Xin chào <strong>{safe_name}</strong>,<br/>
              Bạn đang thực hiện ký số văn bản pháp lý <strong>{contract_title}</strong>
              (Số hợp đồng: <code>{contract_number}</code>).
            </p>
            <div style="margin: 20px 0; padding: 18px; text-align: center; background: #EFF6FC; border: 1px solid #B7D4F0; border-radius: 12px;">
              <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #162333;">
                {code}
              </span>
            </div>
            <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: #4A5F78;">
              Mã xác thực có hiệu lực trong <strong>05 phút</strong> và chỉ sử dụng 01 lần cho giao dịch ký số này.
            </p>
            <p style="margin: 0; font-size: 12px; color: #7B8EA4;">
              Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai. Nếu bạn không yêu cầu ký hợp đồng, hãy bỏ qua email này và kiểm tra bảo mật tài khoản.
            </p>
          </div>
        </div>
        """
        message = MessageSchema(
            subject=f"[Mây Mây] Mã OTP ký Hợp đồng Điện tử {contract_number}",
            recipients=[email],
            body=html_body,
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message)
        return {"message": f"Đã gửi mã OTP xác thực ký hợp đồng tới {email}"}

    async def send_reset_password_email(
        self, email: str, fullname: str, reset_link: str, code: str | None = None
    ):
        """Gửi email đặt lại mật khẩu (kèm liên kết 1 chạm và mã OTP 6 chữ số)."""
        message = MessageSchema(
            subject="Đặt lại mật khẩu - Mây Mây",
            recipients=[email],
            template_body={
                "fullname": fullname,
                "reset_link": reset_link,
                "code": code or "",
            },
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name="reset_password.html")
        return {"message": f"Đã gửi email đặt lại mật khẩu đến {email}"}

    async def send_custom_email(
        self,
        subject: str,
        recipients: list[str],
        template_name: str,
        context: dict,
    ):
        """Gửi email tùy chỉnh (dùng chung cho thông báo hệ thống)."""
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            template_body=context,
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name=template_name)
        return {"message": f"Đã gửi email '{subject}' đến {', '.join(recipients)}"}

    async def send_course_announcement_email(
        self,
        db: AsyncSession,
        *,
        user_id,
        course_id,
        email: str,
        fullname: str,
        course_title: str,
        body: str,
    ):
        """Per-course announcement. Skips transport when the learner opted out."""
        if not await announcement_emails_enabled(db, user_id, course_id):
            return {"sent": False, "skipped": "announcement"}
        message = MessageSchema(
            subject=f"Thông báo mới: {course_title}",
            recipients=[email],
            template_body={
                "fullname": fullname,
                "course_title": course_title,
                "body": body,
            },
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(
            message, template_name="course_announcement.html"
        )
        return {"sent": True, "skipped": None}

    async def send_promotional_email(
        self,
        db: AsyncSession,
        *,
        user_id,
        email: str,
        fullname: str,
        subject: str,
        body: str,
    ):
        """Account promotional mail. Skips transport when the learner opted out."""
        if not await promotional_emails_enabled(db, user_id):
            return {"sent": False, "skipped": "promotional"}
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            template_body={"fullname": fullname, "body": body},
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name="promotional.html")
        return {"sent": True, "skipped": None}

    async def send_gift_claim_notice(
        self, *, email: str, fullname: str, course_title: str
    ):
        """Transactional gift notice. Preference opt-outs do not apply."""
        message = MessageSchema(
            subject=f"Bạn được tặng khóa học {course_title}",
            recipients=[email],
            template_body={"fullname": fullname, "course_title": course_title},
            subtype=MessageType.html,
        )
        await self.fastmail.send_message(message, template_name="gift_claim.html")
        return {"sent": True, "skipped": None}


# ✅ Dependency Injection để dùng trong router
def get_mailer_service() -> MailerService:
    return MailerService()
