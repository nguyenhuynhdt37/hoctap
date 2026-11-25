"""Additive migration & seed cho Hệ thống Ký Hợp Đồng Số (Mây Mây Digital Contract Studio)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from app.db.models.contracts import (  # noqa: E402
    ContractAuditLogs,
    ContractTemplates,
    DigitalContracts,
    UserDigitalCertificates,
)
from app.db.sesson import AsyncSessionLocal, engine  # noqa: E402
from app.services.shares.contract_crypto import generate_platform_ca_cert  # noqa: E402

DEFAULT_TEMPLATES = [
    {
        "code": "LECTURER_MASTER",
        "version": "v1.0",
        "title": "Hợp đồng Khung Hợp tác Giảng viên Điện tử",
        "description": "Hợp đồng khung pháp lý giữa Nền tảng Mây Mây và Giảng viên khi kích hoạt tư cách đối tác giảng dạy.",
        "body_markdown": """## ĐIỀU 1. CÁC BÊN THAM GIA HỢP ĐỒNG
BÊN A (Nền tảng cung cấp hạ tầng giáo dục): Nền tảng Học tập Trực tuyến Mây Mây (May May Education Platform).
BÊN B (Giảng viên / Đối tác nội dung): {{lecturer_name}} — Email: {{lecturer_email}} — CCCD/Định danh: {{signer_cccd}}.
Ngày lập hợp đồng: {{signed_date}} · Số hợp đồng: {{contract_number}}.

## ĐIỀU 2. PHẠM VI HỢP TÁC & QUYỀN SỞ HỮU TRÍ TUỆ
- Bên B cam kết toàn bộ giáo trình, bài giảng video, câu hỏi trắc nghiệm và tài liệu đăng tải lên Mây Mây thuộc quyền sở hữu hợp pháp của Bên B và không xâm phạm quyền tác giả của bất kỳ bên thứ ba nào.
- Bên B cấp cho Bên A quyền không độc quyền để lưu trữ, phân phối, hiển thị và quảng bá khóa học của Bên B trên hệ thống Mây Mây.

## ĐIỀU 3. TỶ LỆ CHIA SẺ DOANH THU & KINH TẾ COIN
- Tỷ lệ chia sẻ doanh thu áp dụng tại thời điểm ký: Giảng viên hưởng {{instructor_share_pct}}% và Phí hạ tầng Nền tảng là {{platform_fee_pct}}%.
- Tỷ giá quy đổi đơn vị thanh toán Coin: 1 Coin = {{coin_vnd_rate}} VNĐ.
- Doanh thu từ học viên được giữ đối soát trong thời gian {{hold_days}} ngày để đảm bảo quyền lợi hoàn tiền minh bạch trước khi ghi có vào số dư Coin thật khả dụng của Bên B.
- Hạn mức rút tiền tối thiểu: {{payout_min_balance}} VNĐ (tương đương {{payout_min_coin}} Coin).

## ĐIỀU 4. CHÍNH SÁCH HOÀN TIỀN & KHUYẾN MÃI
- Bên B đồng ý tuân thủ quy trình xử lý hoàn tiền của Mây Mây khi học viên có yêu cầu hợp lệ trong thời hạn quy định.
- Mã giảm giá do Bên B phát hành được chịu sự giám sát minh bạch của Bên A nhằm bảo vệ trải nghiệm học viên.

## ĐIỀU 5. HIỆU LỰC CHỮ KÝ ĐIỆN TỬ
- Hai bên công nhận giá trị pháp lý của chữ ký điện tử theo chuẩn PKI X.509 / PAdES và mã băm SHA-256 gắn liền với hợp đồng này theo Luật Giao dịch điện tử 2023.
- Hợp đồng có hiệu lực kể từ thời điểm Bên B hoàn tất ký số và được lưu trữ bất biến trên hệ thống Mây Mây.""",
    },
    {
        "code": "COURSE_PUBLISHING",
        "version": "v1.0",
        "title": "Phụ lục Hợp đồng Phát hành & Phân phối Khóa học",
        "description": "Phụ lục cam kết bản quyền, định giá và chia sẻ doanh thu gắn trực tiếp với từng khóa học khi mở bán.",
        "body_markdown": """## ĐIỀU 1. THÔNG TIN KHÓA HỌC PHÁT HÀNH
- Số phụ lục điện tử: {{contract_number}} · Ngày lập: {{signed_date}}.
- Giảng viên sở hữu (Bên B): {{lecturer_name}} ({{lecturer_email}}) — CCCD: {{signer_cccd}}.
- Khóa học áp dụng: {{course_title}}.
- Giá niêm yết tại thời điểm ký: {{course_price_vnd}} VNĐ (≈ {{course_price_coin}} Coin).

## ĐIỀU 2. CAM KẾT CHẤT LƯỢNG & BẢN QUYỀN NỘI DUNG
- Bên B bảo đảm nội dung khóa học {{course_title}} chính xác, đầy đủ lộ trình học tập, không chứa nội dung vi phạm pháp luật hoặc sao chép trái phép.
- Bên A có quyền tạm ẩn hoặc yêu cầu chỉnh sửa nếu phát hiện vi phạm bản quyền hoặc phản hồi tiêu cực nghiêm trọng từ học viên.

## ĐIỀU 3. CHIA SẺ DOANH THU & ĐỐI SOÁT
- Doanh thu thực thu của khóa học được chia theo tỷ lệ Giảng viên {{instructor_share_pct}}% / Nền tảng {{platform_fee_pct}}%.
- Thời gian tạm giữ đối soát: {{hold_days}} ngày kể từ thời điểm học viên thanh toán thành công.

## ĐIỀU 4. XÁC NHẬN KÝ ĐIỆN TỬ
- Phụ lục này là bộ phận không tách rời của Hợp đồng Khung Giảng viên và có hiệu lực ngay khi Bên B hoàn tất ký điện tử.""",
    },
    {
        "code": "COURSE_PURCHASE",
        "version": "v1.0",
        "title": "Hợp đồng Điện tử Mua & Cấp phép Sử dụng Khóa học",
        "description": "Hợp đồng điện tử xác nhận giao dịch mua khóa học / cấp phép học liệu cho Giảng viên trên nền tảng Mây Mây.",
        "body_markdown": """## ĐIỀU 1. THÔNG TIN GIAO DỊCH & CÁC BÊN
- Số hợp đồng điện tử: {{contract_number}} · Ngày lập: {{signed_date}}.
- Bên cung cấp dịch vụ (Bên A): Nền tảng Học tập Trực tuyến Mây Mây.
- Bên mua / Giảng viên (Bên B): {{lecturer_name}} ({{lecturer_email}}) — CCCD: {{signer_cccd}}.
- Khóa học / Học liệu được mua: {{course_title}}.
- Giá trị giao dịch: {{course_price_vnd}} VNĐ (≈ {{course_price_coin}} Coin, tỷ giá 1 Coin = {{coin_vnd_rate}} VNĐ).

## ĐIỀU 2. QUYỀN SỬ DỤNG & BẢO MẬT HỌC LIỆU
- Bên B được cấp quyền truy cập trọn đời vào nội dung khóa học {{course_title}} trên tài khoản cá nhân đã đăng ký.
- Nghiêm cấm hành vi tải lậu, chia sẻ tài khoản hoặc thương mại hóa trái phép nội dung thuộc quyền sở hữu trí tuệ của tác giả gốc và Mây Mây.

## ĐIỀU 3. THANH TOÁN, HÓA ĐƠN & HOÀN TIỀN
- Giao dịch được ghi nhận minh bạch trên sổ cái điện tử Mây Mây và hỗ trợ xuất chứng từ PDF có chữ ký số.
- Chính sách hoàn tiền tuân thủ quy định hiện hành của Mây Mây (tối đa trong thời hạn đối soát {{hold_days}} ngày).

## ĐIỀU 4. GIÁ TRỊ PHÁP LÝ CHỮ KÝ ĐIỆN TỬ
- Hợp đồng được ký bằng chữ ký số chuẩn X.509 / PAdES và có thể tra cứu xác thực trực tuyến bất kỳ lúc nào qua mã QR trên tài liệu PDF.""",
    },
]


async def run_migration():
    print("▶ Đang tạo các bảng Hợp đồng số (additive)...")
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: ContractTemplates.__table__.create(
                sync_conn, checkfirst=True
            )
        )
        await conn.run_sync(
            lambda sync_conn: UserDigitalCertificates.__table__.create(
                sync_conn, checkfirst=True
            )
        )
        await conn.run_sync(
            lambda sync_conn: DigitalContracts.__table__.create(
                sync_conn, checkfirst=True
            )
        )
        await conn.run_sync(
            lambda sync_conn: ContractAuditLogs.__table__.create(
                sync_conn, checkfirst=True
            )
        )

    async with AsyncSessionLocal() as db:
        # 1. Đảm bảo có Mây Mây Platform CA
        ca = await db.scalar(
            select(UserDigitalCertificates).where(
                UserDigitalCertificates.is_platform_ca.is_(True),
                UserDigitalCertificates.status == "active",
            )
        )
        if not ca:
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
            db.add(ca)
            print(f"  ✔ Đã khởi tạo Mây Mây Digital CA (Serial: {ca.serial_number})")
        else:
            print(f"  ✔ Mây Mây Digital CA đã tồn tại (Serial: {ca.serial_number})")

        # 2. Seed 3 mẫu hợp đồng chuẩn
        seeded = 0
        for tpl in DEFAULT_TEMPLATES:
            existing = await db.scalar(
                select(ContractTemplates).where(
                    ContractTemplates.code == tpl["code"],
                    ContractTemplates.version == tpl["version"],
                )
            )
            if not existing:
                db.add(ContractTemplates(**tpl, is_active=True))
                seeded += 1
        await db.commit()
        print(f"  ✔ Seeded {seeded} mẫu hợp đồng mới (tổng {len(DEFAULT_TEMPLATES)} mẫu chuẩn).")


if __name__ == "__main__":
    asyncio.run(run_migration())
