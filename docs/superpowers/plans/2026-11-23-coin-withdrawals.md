# Thu nhập và rút tiền bằng Coin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thu nhập giảng viên được cộng bằng Coin thật, giảng viên rút theo số Coin (chi trả VND = Coin × 10.000đ), và dữ liệu thử được làm lại từ đầu.

**Architecture:** Một helper `InstructorCoin` đổi VND thu nhập thành Coin thật và cộng dồn phần dư dưới 1 Coin trong `wallets.balance`. `release_due_earnings_async`, `payout_single_earning` dùng helper này. Yêu cầu rút trừ Coin thật, lưu `withdrawal_requests.coin_amount`; từ chối/lỗi chi trả hoàn Coin. Chi trả PayPal vẫn tính VND.

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL; Next.js; pytest, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-23-coin-withdrawals-design.md` (bổ sung cho `2026-11-23-coin-payments-design.md`; mã nguồn Coin hiện có trong `app/services/coin_service.py`, `app/services/coin_math.py`).

## Global Constraints

- Tỷ giá lấy từ `platform_settings.coin_vnd_rate` (mặc định 10000); không hardcode.
- Thu nhập: `coin = floor((wallet.balance + earning_vnd) / rate)`; phần dư ở lại `wallets.balance` (không bao giờ mất tiền vì làm tròn).
- Rút tiền chỉ trừ **Coin thật**, không dùng Coin thưởng; tối thiểu `ceil(payout_min_balance / rate)` Coin.
- `withdrawal_requests.amount` vẫn là VND dùng để chi trả (`coin_amount × rate`); `coin_amount` NULL nghĩa là yêu cầu cũ tính bằng VND.
- Trừ/cộng Coin, ghi sổ và tạo yêu cầu nằm trong **một transaction**; hoàn Coin idempotent theo mã yêu cầu.
- **Test DB:** chỉ chạy test có DB trên `studynest_test` (container `studynest_test_pg`, cổng 55432). **Không bao giờ** trỏ `TEST_DATABASE_ASYNC_URL` vào DB phát triển (cổng 5433).
- Migration mới nối sau head hiện tại `am67cd901z234`, idempotent.
- Frontend: chỉ `pulsoicon-react` (icon Coin là `Coins`), không hiện chữ "Peak", chạy `node studynest_fe/tests/test-icon-source.cjs`.

## Review Focus

- Thu nhập cộng dồn phần dư qua nhiều lần (9.300đ dư + 150.700đ = đúng 16 Coin, dư 0).
- Giải phóng cùng một khoản thu nhập hai lần: chỉ cộng Coin một lần.
- Rút nhiều hơn Coin thật đang có, hoặc chỉ có Coin thưởng: 400, không trừ gì.
- Rút dưới mức tối thiểu (9 Coin) bị từ chối, 10 Coin được.
- Admin từ chối hai lần cùng một yêu cầu, hoặc chi trả lỗi sau khi đã từ chối: Coin chỉ hoàn một lần.
- Yêu cầu rút cũ (`coin_amount` NULL) vẫn hoàn bằng VND như trước.
- Script reset chạy `--dry-run` không đổi gì; chạy `--apply` hai lần cho cùng kết quả.

---

### Task 1: Môi trường test DB cô lập

**Files:** không sửa mã; ghi kết quả vào sổ.

- [ ] **Step 1:** Lấy mật khẩu từ container (không in ra): `docker exec studynest_test_pg printenv POSTGRES_PASSWORD`; dựng `TEST_DB=postgresql+asyncpg://test:<mật khẩu>@127.0.0.1:55432/studynest_test`.
- [ ] **Step 2:** Nâng schema lên head: `cd studynest_be && DATABASE_ASYNC_URL=$TEST_DB .venv/bin/alembic upgrade head`. Expected: chạy `aj34…`, `ak45…`, `al56…`, `am67…`, `alembic current` in `am67cd901z234 (head)`.
- [ ] **Step 3:** Chạy `TEST_DATABASE_ASYNC_URL=$TEST_DB .venv/bin/python -m pytest tests/integration/test_coin_service.py tests/integration/test_wallet_topup_coin.py tests/integration/test_checkout_coin.py tests/integration/test_become_instructor_coin.py -q`. Expected: pass; nếu thiếu dữ liệu mẫu (môn `toan`, danh mục `lop-12`) thì ghi rõ và bổ sung bằng seed trong DB test.
- [ ] **Step 4:** Chạy `tests/integration/test_paths_bundles.py` trên DB test để lấy mốc (đã biết 4 test coupon lỗi từ trước); ghi con số vào sổ. Không commit.

### Task 2: `CoinService.debit_paid_async` và cột `coin_amount`

**Files:**
- Modify: `studynest_be/app/services/coin_service.py`, `studynest_be/app/db/models/database.py` (`WithdrawalRequests`)
- Create: `studynest_be/alembic/versions/an78de012a345_withdrawal_coin_amount.py` (`down_revision = "am67cd901z234"`)
- Test: `studynest_be/tests/integration/test_coin_service.py`

**Interfaces:**
- Produces: `CoinService.debit_paid_async(user_id: UUID, amount: int, *, source: str, ref_id: UUID) -> int` (trả số dư Coin thật sau; chỉ Coin thật; khóa dòng số dư; ném `HTTPException(400, "Không đủ Coin…")` trước khi đổi gì; idempotent theo `(source, ref_id)`); cột `withdrawal_requests.coin_amount int NULL CHECK (coin_amount IS NULL OR coin_amount > 0)`.

- [ ] **Step 1: Test (đỏ):** `test_debit_paid_only_uses_paid_coin` (thật 100, thưởng 999, debit 150 → 400, cả hai số dư giữ nguyên), `test_debit_paid_reduces_balance_and_is_idempotent` (debit 40 hai lần cùng `ref_id` → còn 60, một dòng sổ).
- [ ] **Step 2:** Chạy trên DB test → FAIL (thiếu hàm).
- [ ] **Step 3: Implement** hàm trên, ghi `PeakTransactions(coin_kind="paid", type="debit", source=source, event_id=ref_id)`; thêm cột và migration.
- [ ] **Step 4:** Chạy → PASS; `DATABASE_ASYNC_URL=$TEST_DB alembic upgrade head` thành công.
- [ ] **Step 5: Commit** `feat(be): debit paid coin and withdrawal coin_amount`.

### Task 3: Thu nhập thành Coin

**Files:**
- Create: `studynest_be/app/services/instructor_coin.py`
- Modify: `studynest_be/app/services/lecturer/earnings.py` (`release_due_earnings_async`), `studynest_be/app/services/shares/payout.py` (`payout_single_earning`, dòng ~133 cộng `lecturer_wallet.balance`)
- Test: `studynest_be/tests/unit/test_instructor_coin.py`, `studynest_be/tests/integration/test_earning_release_coin.py`

**Interfaces:**
- Consumes: `CoinService.credit_paid_async`, `coin_math.topup_to_coin`.
- Produces: `async def credit_instructor_earning_async(db, wallet: Wallets, amount_vnd: Decimal, *, earning_id: UUID) -> int` (cộng `amount_vnd` vào `wallet.balance` rồi đổi `floor` ra Coin thật, trừ phần đã đổi khỏi `wallet.balance`; idempotent theo `earning_id`; trả số Coin cộng).

- [ ] **Step 1: Test (đỏ):** đơn vị — hàm thuần `split_earning(balance_vnd, amount_vnd, rate) -> (coin, remainder)`: `(9300, 150700)→(16, 0)`, `(0, 139300)→(13, 9300)`. Tích hợp — release một earning 139.300đ → Coin thật +13, `wallet.balance` = 9.300; release lại cùng earning → không đổi; `Transactions` loại `earning_release` ghi mô tả Coin.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** helper và thay hai chỗ cộng VND bằng helper; `payout_single_earning` dùng cùng helper (tự chi trả VND chỉ còn chạy khi `allow_auto_withdraw` bật và phải ghi chú đã không cộng ví VND nữa — nếu không thể giữ ngữ nghĩa, tắt đường này bằng cách `payout_all_eligible` trả `{"skipped": "coin_wallets"}` và ghi ruling vào sổ).
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): instructor earnings credited as coin`.

### Task 4: Yêu cầu rút theo Coin

**Files:**
- Modify: `studynest_be/app/services/shares/withdraw.py` (`request_withdraw_async` ~dòng 151–272, `check_can_withdraw_request_async`), schema và API gọi hàm này (tìm bằng `grep -rn request_withdraw_async studynest_be/app`)
- Test: `studynest_be/tests/integration/test_withdraw_coin.py`

**Interfaces:**
- Consumes: `CoinService.debit_paid_async` (Task 2), `platform_settings.coin_vnd_rate`, `payout_min_balance`.
- Produces: `request_withdraw_async(self, lecturer: User, coin_amount: int, notification_service)` tạo `WithdrawalRequests(amount=coin_amount*rate, coin_amount=coin_amount, currency="VND", status="pending")`; body API đổi thành `coin_amount: int` (> 0).

- [ ] **Step 1: Test (đỏ):** rút 10 Coin khi có 100 Coin thật → yêu cầu `amount == 100000`, `coin_amount == 10`, Coin thật còn 90, giao dịch `withdraw_hold` ghi Coin; 9 Coin → 400 (tối thiểu 10); 500 Coin khi chỉ có 100 → 400 và số dư nguyên; chỉ có Coin thưởng → 400; đã có yêu cầu `pending` → 400 như cũ.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** thay khối trừ ví VND (`wallet.balance -= amount_dec`) bằng `debit_paid_async(source="withdraw_hold", ref_id=withdraw.id)`; tính `minimum_coin = ceil(payout_min_balance / rate)`; cập nhật thông báo sang Coin.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): withdrawal requests in coin`.

### Task 5: Hoàn Coin khi từ chối hoặc chi trả lỗi

**Files:**
- Modify: `studynest_be/app/services/shares/withdraw.py` (nhánh từ chối `approve_or_deny_withdrawals_async` ~dòng 647–672 và nhánh `FAILED/BLOCKED/DENIED/RETURNED` trong `check_payout_status` ~dòng 962–990)
- Test: `studynest_be/tests/integration/test_withdraw_coin.py`

**Interfaces:**
- Consumes: `CoinService.credit_paid_async(user_id, amount, *, source, ref_id)` với `source="withdraw_refund"`, `ref_id=withdrawal.id`.

- [ ] **Step 1: Test (đỏ):** từ chối yêu cầu 10 Coin → Coin thật +10; từ chối lần hai → vẫn +10 một lần; chi trả `FAILED` sau đó → không hoàn thêm (cùng `ref_id`); yêu cầu cũ `coin_amount IS NULL` → hoàn `wallet.balance` bằng VND như trước.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** ở hai nhánh: nếu `w.coin_amount` không NULL thì `credit_paid_async`, ngược lại giữ logic VND cũ.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): refund coin on rejected or failed payouts`.

### Task 6: Giao diện giảng viên

**Files:**
- Modify: các trang/thành phần ví và rút tiền của giảng viên (tìm bằng `grep -rln "withdraw" studynest_fe/src`), `studynest_fe/src/lib/learning-hub/coin-logic.ts` (thêm `withdrawQuote`)
- Test: `studynest_fe/tests/test-coin-payments.cjs`

**Interfaces:**
- Consumes: `GET /api/v1/coins` (`useCoinBalances`).
- Produces: `withdrawQuote(coin: number, paidBalance: number, rateVnd: number, minVnd: number) => { vnd: number; valid: boolean; reason: string | null }`.

- [ ] **Step 1: Test (đỏ):** `withdrawQuote(10, 100, 10000, 100000)` → `{vnd: 100000, valid: true, reason: null}`; 9 Coin → không hợp lệ, lý do nêu "10 Coin"; 500 Coin khi có 100 → không hợp lệ, lý do nêu số dư Coin thật.
- [ ] **Step 2:** `node studynest_fe/tests/test-coin-payments.cjs` → FAIL.
- [ ] **Step 3: Implement** `withdrawQuote`; trang ví giảng viên hiển thị Coin thật và dòng VND sẽ nhận; form rút nhập số Coin, gửi `coin_amount`; lịch sử rút hiển thị Coin kèm VND. Theo Global Constraints về icon/màu.
- [ ] **Step 4:** Chạy test, `test-icon-source.cjs`, `npx tsc --noEmit` trong `studynest_fe` → pass.
- [ ] **Step 5: Commit** `feat(fe): lecturer wallet and withdrawals in coin`.

### Task 7: Script làm lại từ đầu dữ liệu thử

**Files:**
- Create: `studynest_be/scripts/reset_money_test_data.py`
- Test: `studynest_be/tests/integration/test_reset_money_test_data.py`

**Interfaces:**
- Produces: `async def reset_money(conn, *, apply: bool) -> dict` (chạy trong transaction của người gọi; `apply=False` chỉ đếm); CLI `python scripts/reset_money_test_data.py [--apply]` đọc `DATABASE_ASYNC_URL`, in số dòng bị ảnh hưởng, từ chối chạy nếu thiếu `--apply`.

- [ ] **Step 1: Test (đỏ):** trên DB test tạo ví có số dư, một `user_paid_coin_balances`, một dòng `peak_transactions(source='wallet_migration')`, một yêu cầu rút `pending`; `reset_money(apply=False)` → không đổi; `apply=True` → mọi `wallets.balance/total_in/total_out = 0`, bảng Coin thật trống cho các dòng đó, dòng `wallet_migration` bị xóa, yêu cầu rút thành `rejected`, người dùng/khóa học/giao dịch/thu nhập **không bị xóa**; chạy lần hai cho cùng kết quả.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** theo spec mục 5; kiểm tra số liệu trước khi commit transaction, hủy nếu lệch.
- [ ] **Step 4:** Chạy test → PASS; chạy CLI `--dry-run` trên DB test và đọc kết quả.
- [ ] **Step 5: Commit** `feat(be): reset script for money test data`.

### Task 8: Kiểm tra toàn bộ và chạy reset trên DB phát triển

- [ ] **Step 1:** `cd studynest_be && .venv/bin/python -m pytest tests/unit -q` → pass.
- [ ] **Step 2:** Trên DB test: `TEST_DATABASE_ASYNC_URL=$TEST_DB .venv/bin/python -m pytest tests/integration/test_coin_service.py tests/integration/test_wallet_topup_coin.py tests/integration/test_checkout_coin.py tests/integration/test_become_instructor_coin.py tests/integration/test_withdraw_coin.py tests/integration/test_earning_release_coin.py tests/integration/test_reset_money_test_data.py -q` → pass.
- [ ] **Step 3:** Trong `studynest_fe`: mọi `node tests/test-*.cjs` và `npx tsc --noEmit` → pass.
- [ ] **Step 4:** `alembic heads` → đúng một head `an78de012a345`.
- [ ] **Step 5:** Áp dụng migration lên DB phát triển (`alembic upgrade head`), chạy `python scripts/reset_money_test_data.py` ở chế độ dry-run, báo số liệu cho chủ dự án; chạy `--apply` **sau khi** chủ dự án đã thấy số liệu (đã được phép làm lại từ đầu, nhưng xem số dòng trước khi ghi).
- [ ] **Step 6:** Báo kết quả; chưa push cho đến khi chủ dự án đồng ý.

---

## Self-review

- **Phủ spec:** thu nhập → Coin và cộng dồn phần dư (T3), rút theo Coin thật + tối thiểu (T4), hoàn khi từ chối/lỗi (T5), `debit_paid_async` và `coin_amount` (T2), giao diện giảng viên (T6), reset dữ liệu thử (T7, T8), metadata `currency` mặc định không đổi (không có task, đúng spec), `allow_auto_withdraw` (quyết trong T3), môi trường test an toàn (T1).
- **Nhất quán tên:** `debit_paid_async`, `credit_paid_async`, `credit_instructor_earning_async`, `split_earning`, `withdrawQuote`, cột `coin_amount`, nguồn sổ `withdraw_hold`/`withdraw_refund`/`earning_release`.
- **Rủi ro:** T3 (đường tự chi trả `payout_single_earning`) có thể không giữ được ngữ nghĩa khi ví là Coin — người làm phải ghi ruling; T8 bước 5 ghi vào DB thật nên cần xem dry-run trước.
