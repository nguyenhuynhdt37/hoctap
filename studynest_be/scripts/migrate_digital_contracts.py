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
        "version": "v1.1",
        "title": "Hợp đồng Khung Hợp tác Giảng viên Điện tử",
        "description": "Hợp đồng khung pháp lý đầy đủ 9 Điều khoản và 3 Bảng biểu chuẩn hệ thống Mây Mây giữa Nền tảng và Giảng viên.",
        "body_markdown": """Hôm nay, ngày {{signed_date}}, tại Hệ thống Giao dịch Điện tử Mây Mây (May May Education Platform), chúng tôi gồm có:

## ĐIỀU 1. THÔNG TIN PHÁP LÝ CÁC BÊN THAM GIA HỢP ĐỒNG
| Hạng mục | BÊN A (Nền tảng Mây Mây) | BÊN B (Giảng viên / Đối tác) |
| --- | --- | --- |
| Tên tổ chức / Cá nhân | Nền tảng Học tập Trực tuyến Mây Mây | {{lecturer_name}} |
| Thư điện tử định danh | admin@maymay.edu.vn | {{lecturer_email}} |
| Giấy tờ pháp lý / CCCD | Chứng thư Mây Mây Digital CA (X.509) | {{signer_cccd}} |
| Địa chỉ liên hệ | Hệ thống Giáo dục Trực tuyến Việt Nam | {{lecturer_address}} |
| Vai trò hợp tác | Đơn vị cung cấp hạ tầng, thanh toán & phân phối | Tác giả, chủ sở hữu nội dung & giảng dạy |

## ĐIỀU 2. ĐỐI TƯỢNG VÀ PHẠM VI HỢP TÁC
- Bên A cung cấp cho Bên B hạ tầng công nghệ giảng dạy (Studio quản lý bài giảng Video, hệ thống AI tạo bài tập tương tác Quiz/Listening/Speaking/Flashcards, cổng thanh toán Coin và hệ thống đối soát doanh thu).
- Bên B đăng tải, giảng dạy, cập nhật nội dung khóa học và chịu trách nhiệm toàn diện về tính chính xác, tính hợp pháp và bản quyền của toàn bộ học liệu đăng tải.

## ĐIỀU 3. BẢNG BIỂU TÀI CHÍNH, CHIA SẺ DOANH THU & KINH TẾ COIN
Toàn bộ thông số tài chính dưới đây được trích xuất trực tiếp từ Cấu hình Hệ thống Mây Mây tại thời điểm ký kết ({{signed_date}}):

| Khoản mục tài chính | Giá trị áp dụng | Ghi chú & Cơ chế thực hiện |
| --- | --- | --- |
| Phí kích hoạt Giảng viên | {{activation_fee_coin}} Coin (≈ {{activation_fee_vnd}} VNĐ) | Thu 01 lần duy nhất, hiệu lực trọn đời |
| Tỷ lệ doanh thu Bên B (Giảng viên) | {{instructor_share_pct}}% doanh thu thực thu | Ghi có tự động vào sổ cái sau khi hết thời hạn đối soát |
| Phí hạ tầng Bên A (Nền tảng) | {{platform_fee_pct}}% doanh thu thực thu | Bao gồm hạ tầng máy chủ, AI, thanh toán & hỗ trợ |
| Tỷ giá quy đổi đơn vị Coin | 1 Coin = {{coin_vnd_rate}} VNĐ | Áp dụng thống nhất cho nạp, thanh toán và rút Coin |
| Thời gian tạm giữ đối soát | {{hold_days}} ngày kể từ khi thanh toán | Bảo đảm xử lý yêu cầu hoàn tiền hợp lệ của học viên |
| Hạn mức rút tiền tối thiểu | {{payout_min_coin}} Coin (≈ {{payout_min_balance}} VNĐ) | Rút từ số dư Coin thật khả dụng về tài khoản nhận tiền |
| Lịch xử lý giải ngân | {{payout_schedule}} | Admin đối soát ví và phê duyệt giải ngân minh bạch |
| Khung giá niêm yết khóa học | {{course_min_price}} – {{course_max_price}} VNĐ | Bên B chủ động định giá trong khung cho phép |

## ĐIỀU 4. CHÍNH SÁCH KHUYẾN MÃI, MÃ GIẢM GIÁ VÀ HOÀN TIỀN
- Bên B được chủ động phát hành tối đa {{max_discounts_per_course}} mã giảm giá đang hoạt động cho mỗi khóa học với mức giảm tối đa {{discount_max_percent}}%. Bên A có quyền giám sát, tạm tắt mã giảm giá nếu phát hiện dấu hiệu gian lận hoặc gây ảnh hưởng trải nghiệm học viên.
- Trong thời hạn đối soát {{hold_days}} ngày, nếu học viên gửi yêu cầu hoàn tiền hợp lệ (tối đa {{refund_max_courses_per_month}} khóa/tháng theo chính sách nền tảng) và được Bên A phê duyệt, phần doanh thu tạm giữ tương ứng của đơn hàng đó sẽ được hoàn trả cho học viên.

## ĐIỀU 5. QUYỀN SỞ HỮU TRÍ TUỆ VÀ BẢN QUYỀN HỌC LIỆU
- Bên B khẳng định là chủ sở hữu hợp pháp hoặc có đầy đủ quyền cấp phép đối với toàn bộ video, giáo trình, hình ảnh, âm thanh và bài tập đăng tải lên Mây Mây.
- Bên B cấp cho Bên A quyền không độc quyền để lưu trữ, mã hóa truyền phát, hiển thị và quảng bá khóa học của Bên B trên hệ thống Mây Mây trong suốt thời gian khóa học được mở bán.

## ĐIỀU 6. BẢNG QUYỀN LỢI, NGHĨA VỤ VÀ CHẾ TÀI XỬ LÝ VI PHẠM
| Hạng mục | Nghĩa vụ cam kết | Biện pháp xử lý khi vi phạm |
| --- | --- | --- |
| Bản quyền nội dung | Không sao chép trái phép, không vi phạm thuần phong mỹ tục | Gỡ khóa học ngay lập tức; Bên B chịu trách nhiệm pháp lý |
| Chất lượng giảng dạy | Đảm bảo đầy đủ lộ trình, hỗ trợ giải đáp học viên | Tạm dừng phân phối hoặc yêu cầu hoàn thiện nội dung |
| Gian lận giao dịch / Voucher | Không tự mua/tạo đơn ảo trục lợi Coin thưởng hoặc trợ giá | Khóa tài khoản vĩnh viễn và đóng băng số dư vi phạm |
| Bảo mật dữ liệu học viên | Không thu thập, mua bán thông tin cá nhân học viên trái phép | Thu hồi hợp đồng, chấm dứt hợp tác & bồi thường thiệt hại |

## ĐIỀU 7. NGHĨA VỤ THUẾ VÀ KÊ KHAI THU NHẬP
- Mỗi bên tự chịu trách nhiệm kê khai và nộp các khoản thuế phát sinh từ phần doanh thu thực nhận của mình theo quy định pháp luật thuế hiện hành tại Việt Nam.
- Hệ thống Mây Mây cung cấp đầy đủ lịch sử giao dịch, chứng từ rút tiền và bản PDF hợp đồng điện tử để phục vụ công tác đối soát và kê khai.

## ĐIỀU 8. HIỆU LỰC CHỮ KÝ ĐIỆN TỬ VÀ TÍNH TOÀN VẸN DỮ LIỆU
- Hai bên thống nhất công nhận giá trị pháp lý của hợp đồng điện tử này theo Luật Giao dịch điện tử số 20/2023/QH15.
- Hợp đồng được bảo vệ bởi 03 lớp mật mã: (1) Mã băm toàn văn SHA-256, (2) Chữ ký số bất đối xứng RSA-PSS theo chứng thư X.509 định danh Bên B, và (3) Dấu niêm phong HMAC-SHA256 kèm chữ ký số PAdES nhúng trực tiếp trong tệp PDF.
- Bất kỳ sự thay đổi nào dù chỉ một ký tự sau thời điểm ký sẽ làm sai lệch mã băm SHA-256 và bị hệ thống xác thực công khai cảnh báo ngay lập tức.

## ĐIỀU 9. ĐIỀU KHOẢN THI HÀNH VÀ GIẢI QUYẾT TRANH CHẤP
- Hợp đồng có hiệu lực kể từ thời điểm Bên B hoàn tất ký điện tử và thanh toán phí kích hoạt {{activation_fee_coin}} Coin.
- Mọi tranh chấp phát sinh được ưu tiên giải quyết thông qua thương lượng trên cơ sở hồ sơ nhật ký pháp lý (Audit Trail) lưu trữ trên hệ thống; trường hợp không đạt được thỏa thuận sẽ được đưa ra Tòa án có thẩm quyền tại Việt Nam giải quyết.""",
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

        # 2. Seed / nâng cấp 3 mẫu hợp đồng chuẩn
        seeded = 0
        for tpl in DEFAULT_TEMPLATES:
            existing_all = (
                await db.execute(
                    select(ContractTemplates).where(
                        ContractTemplates.code == tpl["code"]
                    )
                )
            ).scalars().all()
            found = None
            for old in existing_all:
                if old.version == tpl["version"]:
                    found = old
                else:
                    old.is_active = False
            if not found:
                db.add(ContractTemplates(**tpl, is_active=True))
                seeded += 1
            else:
                found.title = tpl["title"]
                found.description = tpl["description"]
                found.body_markdown = tpl["body_markdown"]
                found.is_active = True
        await db.commit()
        print(f"  ✔ Seeded {seeded} mẫu hợp đồng mới (tổng {len(DEFAULT_TEMPLATES)} mẫu chuẩn).")


if __name__ == "__main__":
    asyncio.run(run_migration())
