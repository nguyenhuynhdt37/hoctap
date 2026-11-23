# Thanh toán bằng Coin (Coin thật + Coin thưởng) — thiết kế

Ngày: 2026-11-23 · Trạng thái: **chờ duyệt** · Quy mô: dự án (đụng tiền)

## Ý định và lý do

Chủ dự án muốn bỏ ví VND ở phía học viên: **nạp tiền ra Coin, mọi thanh toán đều bằng Coin**.
Tỷ giá do chủ dự án chốt: **1.000.000đ = 100 Coin**, tức **1 Coin = 10.000đ**.

Hiện có hai thứ tách biệt: ví VND (`wallets`, dùng để mua khóa học) và Coin thưởng (`user_peak_balances`,
kiếm từ điểm danh/nhiệm vụ, chỉ tiêu ở cửa hàng đồ trang trí). Chủ dự án muốn Coin thưởng cũng mua được khóa
học, nhưng vẫn phân biệt với Coin thật để **dùng Coin thưởng trước, đỡ tốn Coin thật**.

## Mục tiêu

- Học viên nạp tiền (PayPal như hiện tại) → nhận Coin thật theo tỷ giá.
- Mua khóa học/combo bằng Coin: trừ Coin thưởng trước (có trần), phần còn lại trừ Coin thật.
- Giảng viên **luôn nhận đủ phần của mình** dù học viên trả bằng Coin thưởng.
- Hoàn tiền trả lại đúng loại Coin đã trừ.
- Cửa hàng `/shop` tiếp tục tiêu Coin thưởng; có nút "Mua Coin" trong `/shop`.

## Không phải mục tiêu

- Không đổi Coin ngược ra tiền cho học viên. Giảng viên vẫn rút VND như hiện tại.
- Không đổi cổng thanh toán (PayPal giữ nguyên, tính bằng VND).
- Không viết lại sổ cái thành một bảng chung (cách C đã bị loại).

## Điều không được xảy ra (anti-goal)

- Coin thưởng làm nền tảng lỗ vô hạn: bắt buộc có trần mỗi đơn.
- Lệch số dư: trừ/cộng Coin, ghi sổ và tính thu nhập giảng viên phải nằm trong **một transaction**.
- Mất tiền của người dùng khi migrate số dư VND cũ.

## Các cách đã cân nhắc

- **A. Giữ ví VND bên trong, chỉ đổi hiển thị** — ít code nhất nhưng Coin hiển thị lẻ và hai hệ đơn vị song song. Loại.
- **B. Hai số dư Coin riêng, trừ thưởng trước** — **được chọn** bởi chủ dự án. Rõ ràng, kiểm soát được chi phí, sửa vừa phải.
- **C. Một sổ cái chung, mỗi dòng gắn loại Coin** — sạch nhất nhưng phải viết lại nhiều phần đang chạy. Loại vì quá nặng.

## Thiết kế (cách B)

**Chủ dự án đã quyết:** tỷ giá 1 Coin = 10.000đ; có hai loại Coin; trừ Coin thưởng trước.

**Quyết định của mình (chủ dự án chưa phản đối, cần xem lại khi duyệt):**
1. Giá khóa học vẫn lưu VND; khi thanh toán đổi sang Coin bằng `ceil(giá / 10.000)`.
2. Trần Coin thưởng: **30% giá trị đơn**, cấu hình trong `platform_settings`. Phần thưởng giảm giá do nền tảng chịu.
3. Số dư ví VND cũ đổi thành Coin thật theo `floor(balance / 10.000)`; **phần dư dưới 10.000đ giữ lại ở `wallets.balance`** (không mất).
4. Nạp tiền: PayPal vẫn tính VND, callback cộng Coin thật theo `floor(số tiền / 10.000)`; phần dư cộng vào ví cũ.
5. Cửa hàng chỉ trừ Coin thưởng (giữ hành vi hiện tại).

**Dữ liệu**
- Thêm số dư Coin thật (số nguyên) cho mỗi người dùng; Coin thưởng giữ ở `user_peak_balances`.
- Sổ giao dịch Coin ghi rõ loại Coin (`bonus`/`paid`), số lượng, số dư trước/sau, nguồn (nạp, mua khóa, hoàn, cửa hàng).
- `platform_settings`: `coin_vnd_rate` (mặc định 10000), `bonus_coin_max_share` (mặc định 0.30).
- Migration chuyển số dư cũ, idempotent, ghi lại giao dịch chuyển đổi.

**Luồng mua khóa học** (sửa `checkout_wallet_async` trong `services/shares/transaction.py`)
1. Tính `price_coin = ceil(total_vnd / rate)`.
2. `bonus_use = min(số dư thưởng, floor(price_coin * max_share))`; `paid_use = price_coin - bonus_use`.
3. Nếu `paid_use` > số dư Coin thật → từ chối, không trừ gì.
4. Khóa dòng số dư, trừ hai loại, ghi sổ, ghi giao dịch mua, tính thu nhập giảng viên theo **giá VND đầy đủ**
   (như trước), trong một transaction. Phần Coin thưởng đã dùng là chi phí nền tảng, ghi vào sổ chi phí nền tảng
   (đã có `billing_ledger`/`platform expense`).

**Hoàn tiền** (`services/shares/refund.py`): hoàn lại đúng `bonus_use` vào Coin thưởng và `paid_use` vào Coin thật.
Cần lưu `bonus_use`/`paid_use` trên dòng mua để hoàn chính xác.

**Giao diện**
- Header: chip Coin hiện tổng (thật + thưởng), chi tiết hai loại khi mở.
- Trang `/shop`: số dư hai loại và nút "Mua Coin" (chọn gói hoặc nhập số tiền, chuyển sang PayPal).
- Trang thanh toán: hiện giá bằng Coin, phần trừ Coin thưởng/Coin thật trước khi xác nhận.
- Ví cũ và các nơi hiển thị VND của học viên đổi sang Coin; giữ VND cho giảng viên.
- Tuân thủ quy tắc PulsoIcon (icon Coin là `Coins`), Cloudy Blue token, không hiện chữ "Peak".

## Để người xây quyết

- Cách làm tròn khi giá khóa không chia hết (đề xuất làm tròn lên, ghi rõ ở trang thanh toán).
- Tên cột, tên bảng, cấu trúc API chi tiết, bố cục giao diện.
- Danh sách gói Coin gợi ý (ví dụ 10/50/100 Coin) nếu không dùng nhập số tự do.

## Rủi ro cần kiểm tra khi làm

- Mọi nơi đang đọc `wallets.balance` của học viên (`bundles.py`, `bundle_settlement.py`, `payout.py`, `withdraw.py`,
  thống kê admin) phải được rà để không đọc nhầm sau khi chuyển.
- Giá của cửa hàng được định cho Coin thưởng (150–5.200); với tỷ giá này một món 180 Coin tương đương 1,8 triệu đồng.
  Cần chủ dự án xác nhận có định giá lại cửa hàng không (ngoài phạm vi thiết kế này nếu chưa nói).
