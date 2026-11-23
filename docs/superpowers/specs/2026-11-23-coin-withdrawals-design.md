# Thu nhập và rút tiền của giảng viên bằng Coin — thiết kế bổ sung

Ngày: 2026-11-23 · Trạng thái: **chờ duyệt** · Bổ sung cho `2026-11-23-coin-payments-design.md`

## Ý định

Chủ dự án chốt: dữ liệu hiện có đều là **dữ liệu thử**, nên **làm lại từ đầu** thay vì chuyển đổi số dư cũ.
Mọi giá trị trong ví đều là Coin; giảng viên **nhận thu nhập bằng Coin** và **rút theo số Coin**, tỷ giá 1 Coin = 10.000đ.
(Thay đổi so với thiết kế trước: giảng viên không còn giữ VND để rút.)

## Mục tiêu

- Thu nhập giảng viên hết thời gian giữ thì được cộng vào ví dưới dạng **Coin thật**.
- Giảng viên tạo yêu cầu rút **theo số Coin**; admin duyệt và chi trả VND = `Coin × 10.000đ` (PayPal như hiện tại).
- Coin thưởng không rút được.
- Không có số dư nào bị làm tròn mất tiền.

## Không phải mục tiêu

- Không viết lại quy trình chi trả PayPal và duyệt rút tiền của admin: chúng vẫn tính bằng VND.
- Không đổi cách tính thu nhập: `amount_instructor` vẫn là VND đầy đủ theo giá khóa học, phần Coin thưởng do nền tảng chịu.
- Không đổi lịch sử cũ (giao dịch, thu nhập đã trả).

## Điều không được xảy ra

- Giảng viên mất tiền vì làm tròn: thu nhập 139.300đ ra 13 Coin và **phần dư 9.300đ được giữ lại** để cộng dồn lần sau.
- Yêu cầu rút treo vĩnh viễn: bị từ chối thì Coin phải trả lại đúng.
- Rút nhiều hơn số Coin thật đang có, hoặc rút Coin thưởng.

## Thiết kế

**Đã chốt:** thu nhập thành Coin; rút theo Coin, chi trả `Coin × 10.000đ`; làm lại từ đầu vì là dữ liệu thử.

**Mình quyết (cần xem lại khi duyệt):**
1. **Giải phóng thu nhập** (`services/lecturer/earnings.py`): cộng `amount_instructor` vào một "ví VND lẻ" rồi đổi `floor(tổng / rate)` Coin thật qua `CoinService.credit_paid_async`; phần dư dưới 10.000đ ở lại `wallets.balance` và cộng dồn lần sau.
2. **Yêu cầu rút** (`services/shares/withdraw.py`, `request_withdraw_async`): nhận số Coin nguyên; tối thiểu `ceil(payout_min_balance / rate)` Coin (mặc định 10 Coin); trừ **Coin thật** (không dùng Coin thưởng) qua một hàm mới `CoinService.debit_paid_async`; lưu `withdrawal_requests.coin_amount` và `amount = coin_amount × rate` (VND dùng cho chi trả).
3. **Từ chối/hủy yêu cầu rút:** trả lại đúng `coin_amount` qua `CoinService.credit_paid_async` (idempotent theo mã yêu cầu).
4. **Giao diện giảng viên** (`/lecturer/wallets`, lịch sử rút tiền): số dư và số tiền rút hiển thị bằng Coin, kèm số VND sẽ nhận.
5. **Làm lại từ đầu (dữ liệu thử):** đặt mọi `wallets.balance`, `total_in`, `total_out` về 0; xóa `user_paid_coin_balances` và các dòng sổ `wallet_migration`; chuyển yêu cầu rút đang `pending` sang `rejected`. **Không xóa** người dùng, khóa học, giao dịch, thu nhập. Chạy một lần bằng script có kiểm tra số liệu trong một giao dịch.
6. **Metadata:** đổi `platform_settings.currency` thành `COIN` chỉ nếu bạn xác nhận ý "metadata" là nhãn này; mặc định **không đổi** (cột này dùng cho cổng thanh toán và báo cáo VND).

## Cách làm đã cân nhắc

- **A. Rút theo Coin, chi trả VND (khuyến nghị)** — sửa vừa phải, chi trả PayPal giữ nguyên.
- **B. Giảng viên vẫn nhận và rút VND** — đơn giản nhất nhưng trái ý chủ dự án. Loại.
- **C. Chi trả bằng Coin, không rút ra tiền** — giảng viên không bao giờ nhận tiền thật. Loại.

## Để người xây quyết

- Tên cột/hàm cụ thể, thông điệp lỗi, bố cục trang giảng viên.
- Cách xử lý yêu cầu rút `approved`/`payout_pending` đang dở (nếu có) khi chạy script reset.

## Rủi ro cần kiểm tra

- Mọi nơi đọc `wallets.balance` của giảng viên: `lecturer/wallets.py`, `payout.py`, thống kê admin, `lecturer.py:79`.
- `payout_single_earning` (tự chi trả từng khoản thu nhập, `allow_auto_withdraw`) đang tính VND; phải quyết nó có còn chạy không khi ví là Coin.
