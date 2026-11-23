# Thanh toán bằng Coin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nạp tiền ra Coin thật, mua khóa học bằng Coin (trừ Coin thưởng trước, có trần), hoàn tiền đúng loại Coin, có nút "Mua Coin" trong `/shop`.

**Architecture:** Thêm số dư Coin thật (số nguyên) cạnh Coin thưởng hiện có (`user_peak_balances`). Một module thuần `coin_math` lo quy đổi/chia Coin; một `CoinService` lo trừ/cộng/hoàn trong transaction của người gọi. `checkout_wallet_async`, callback PayPal và hai nhánh hoàn tiền gọi `CoinService`. Giá khóa học vẫn lưu VND.

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL; Next.js, SWR, `pulsoicon-react`; pytest, `node --test` (`.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-23-coin-payments-design.md`

## Global Constraints

- Tỷ giá: **1 Coin = 10.000đ** (`coin_vnd_rate` mặc định 10000). Đổi giá khóa ra Coin: `ceil(vnd / rate)`. Đổi tiền nạp ra Coin: `floor(vnd / rate)`, phần dư vẫn ở `wallets.balance`.
- Trần Coin thưởng mỗi đơn: `bonus_coin_max_share` mặc định **0.30**; `bonus_use = min(số dư thưởng, floor(price_coin * share))`, `paid_use = price_coin - bonus_use`.
- Giảng viên nhận đủ theo giá VND như hiện tại; phần Coin thưởng là chi phí nền tảng.
- Trừ/cộng Coin, ghi sổ, tạo giao dịch và thu nhập giảng viên nằm trong **một transaction**; khóa dòng số dư (`with_for_update`) trước khi đọc.
- Backend: method async có hậu tố `_async` cho code mới; chỉ dùng `select()` kiểu SQLAlchemy 2; schema response có `model_config = {"from_attributes": True}`.
- Frontend: chỉ import icon từ `pulsoicon-react`; icon Coin là `Coins`; không hiện chữ "Peak"; không hardcode màu; chạy `node studynest_fe/tests/test-icon-source.cjs`.
- Migration mới nối sau head hiện tại `al56bc890y123` và phải idempotent.

## Review Focus

- Mua khi `paid_use` lớn hơn số dư Coin thật: từ chối 400, **không trừ gì** (kể cả Coin thưởng).
- Hai đơn mua đồng thời của cùng một người: không âm số dư, không trừ hai lần.
- Giá khóa không chia hết cho 10.000: làm tròn lên, `price_coin >= 1` khi giá > 0.
- Đơn có mã giảm giá: tính Coin trên số tiền **sau giảm** (`total_price`), không trên giá gốc.
- Hoàn tiền một đơn gồm nhiều khóa: hoàn đúng `coin_bonus_used`/`coin_paid_used` của từng dòng, tổng khớp đơn gốc, hoàn hai lần không cộng hai lần.
- Migrate số dư cũ chạy hai lần: không cộng Coin hai lần; số dư dưới 10.000đ không mất.
- Nạp tiền callback PayPal gọi lại hai lần cho cùng một giao dịch: chỉ cộng Coin một lần.

---

### Task 1: Quy đổi Coin (module thuần)

**Files:**
- Create: `studynest_be/app/services/coin_math.py`
- Test: `studynest_be/tests/unit/test_coin_math.py`

**Interfaces:**
- Produces: `price_to_coin(vnd: Decimal, rate: int) -> int` (làm tròn lên); `topup_to_coin(vnd: Decimal, rate: int) -> tuple[int, Decimal]` (Coin, phần dư VND); `split_payment(price_coin: int, bonus_balance: int, max_share: Decimal) -> tuple[int, int]` trả `(bonus_use, paid_use)`; `allocate(total: int, weights: list[Decimal]) -> list[int]` chia tỷ lệ, phần dư dồn dòng cuối, tổng luôn bằng `total`.

- [ ] **Step 1: Viết test** — `test_price_to_coin_rounds_up` (`price_to_coin(Decimal(500000),10000)==50`, `Decimal(500001)→51`, `Decimal(1)→1`); `test_topup_keeps_remainder` (`topup_to_coin(Decimal(1_005_000),10000)==(100, Decimal(5000))`); `test_split_respects_cap_and_balance` (price 100, thưởng 500, share 0.30 → `(30,70)`; thưởng 10 → `(10,90)`; thưởng 0 → `(0,100)`); `test_allocate_sums_to_total` (`allocate(10,[Decimal(1)]*3)` tổng 10 và phần dư ở cuối).
- [ ] **Step 2:** Chạy `cd studynest_be && .venv/bin/python -m pytest tests/unit/test_coin_math.py -q` → FAIL (module chưa có).
- [ ] **Step 3: Implement** bốn hàm trên trong `coin_math.py`, dùng `Decimal`, không float.
- [ ] **Step 4:** Chạy lại test → PASS.
- [ ] **Step 5: Commit** `feat(be): coin conversion helpers`.

### Task 2: Dữ liệu và migration

**Files:**
- Modify: `studynest_be/app/db/models/database.py` (`PlatformSettings`, `PurchaseItems`, `PeakTransactions`)
- Create: `studynest_be/app/db/models/coins.py` (model `UserPaidCoinBalances`)
- Create: `studynest_be/alembic/versions/am67cd901z234_paid_coin.py` (`down_revision = "al56bc890y123"`)
- Modify: `studynest_be/alembic/env.py` (import model mới nếu env liệt kê model)
- Test: `studynest_be/tests/unit/test_paid_coin_migration.py`

**Interfaces:**
- Produces: bảng `public.user_paid_coin_balances(user_id uuid PK FK user, balance int NOT NULL DEFAULT 0 CHECK (balance >= 0), version int DEFAULT 1, updated_at)`; `platform_settings.coin_vnd_rate int NOT NULL DEFAULT 10000 CHECK (>0)`, `platform_settings.bonus_coin_max_share numeric(4,3) NOT NULL DEFAULT 0.300 CHECK (between 0 and 1)`; `purchase_items.coin_bonus_used int`, `purchase_items.coin_paid_used int` (NULL với đơn cũ trả bằng VND); `peak_transactions.coin_kind varchar(10) NOT NULL DEFAULT 'bonus' CHECK (coin_kind IN ('bonus','paid'))`.

- [ ] **Step 1: Viết test** `test_migration_converts_balances_once`: dùng DB test/transaction rollback; tạo ví 1.255.000đ → sau `upgrade` có `paid=125`, `wallets.balance=5000`, một dòng `peak_transactions(coin_kind='paid', source='wallet_migration')`; chạy hàm chuyển lần hai → số dư không đổi. Test `test_head_is_single`: `alembic heads` chỉ có `am67cd901z234`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** model + migration. Chuyển số dư viết thành hàm `convert_wallets(conn, rate)` gọi từ `upgrade()`; idempotent bằng cách bỏ qua người dùng đã có dòng `source='wallet_migration'`. Chỉ chuyển ví `currency='VND'`, người **không** có vai trò LECTURER (ví giảng viên giữ VND để rút tiền). Trừ `floor(balance/rate)*rate` khỏi `wallets.balance`.
- [ ] **Step 4:** Chạy test → PASS; `alembic upgrade head` trên DB local → thành công.
- [ ] **Step 5: Commit** `feat(be): paid coin balance, settings and migration`.

### Task 3: CoinService

**Files:**
- Create: `studynest_be/app/services/coin_service.py`
- Test: `studynest_be/tests/unit/test_coin_service.py`

**Interfaces:**
- Consumes: `coin_math` (Task 1), model Task 2, `UserPeakBalances`, `PeakTransactions`.
- Produces: `class CoinService(db: AsyncSession)` với `async def get_balances_async(user_id) -> CoinBalances` (`bonus: int, paid: int`); `async def credit_paid_async(user_id, amount: int, *, source: str, ref_id: UUID | None) -> int` (trả số dư sau; idempotent theo `(source, ref_id)`); `async def debit_for_purchase_async(user_id, price_coin: int, *, ref_id: UUID) -> PaymentSplit` (`bonus_use, paid_use`; khóa dòng số dư; ném `HTTPException(400, "Không đủ Coin…")` **trước khi** thay đổi gì); `async def refund_async(user_id, *, bonus: int, paid: int, ref_id: UUID) -> None` (idempotent theo `ref_id`).

- [ ] **Step 1: Viết test** (DB test hoặc fake session như `test_levels_shop.py`): `test_debit_uses_bonus_first_within_cap`, `test_debit_rejects_without_touching_balances` (thiếu Coin thật → 400, cả hai số dư giữ nguyên), `test_credit_is_idempotent_per_ref`, `test_refund_restores_each_kind_and_is_idempotent`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** lấy `rate`/`max_share` từ `platform_settings`; ghi `PeakTransactions` với `coin_kind` đúng; cập nhật `total_spent`/`total_earned` của Coin thưởng như hiện tại.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): coin service`.

### Task 4: Nạp tiền ra Coin

**Files:**
- Modify: `studynest_be/app/services/shares/wallets.py` (`paypal_callback_async`, bước "TIỀN NẠP" quanh dòng 270–285)
- Test: `studynest_be/tests/unit/test_wallet_topup_coin.py`

**Interfaces:**
- Consumes: `topup_to_coin`, `CoinService.credit_paid_async`.

- [ ] **Step 1: Viết test**: nạp 1.005.000đ → `credit_paid_async(..., 100, source="topup", ref_id=transaction.id)` được gọi và `wallets.balance` tăng đúng **phần dư 5.000**; gọi callback lần hai cùng giao dịch → Coin không tăng thêm.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** thay đoạn cộng `wallet.balance` bằng: `coin, remainder = topup_to_coin(...)`; cộng Coin thật; chỉ cộng `remainder` vào `wallet.balance`/`total_in`. Với tài khoản có vai trò LECTURER giữ hành vi cũ (cộng VND). Ví hệ thống (`platform_wallet`) vẫn cộng đủ `amount`. Sửa nội dung thông báo thành "Bạn đã nạp {coin} Coin".
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): top-up credits paid coin`.

### Task 5: Mua khóa học bằng Coin

**Files:**
- Modify: `studynest_be/app/services/shares/transaction.py` (`checkout_wallet_async`, dòng 369–470; tương tự nơi mua combo trong `studynest_be/app/services/bundles.py` nếu cũng trừ `Wallets`)
- Test: `studynest_be/tests/unit/test_checkout_coin.py`

**Interfaces:**
- Consumes: `price_to_coin`, `split_payment`, `allocate`, `CoinService.debit_for_purchase_async`.

- [ ] **Step 1: Viết test**: `test_checkout_charges_bonus_then_paid` (giá sau giảm 500.000đ, thưởng 100, thật 100 → `bonus_use=15`, `paid_use=35`; `Transactions.currency` là "COIN" và `amount=50`); `test_checkout_insufficient_paid_changes_nothing`; `test_instructor_earning_uses_vnd_price` (thu nhập giảng viên bằng giá VND như trước); `test_purchase_items_record_split` (`coin_bonus_used`/`coin_paid_used` từng dòng cộng lại bằng tổng, chia bằng `allocate` theo `amounts.paid`).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** thay khối "Wallet" bằng gọi `CoinService.debit_for_purchase_async`; bỏ `wallet.balance -= total_price` và `ensure_wallet_balance` cho người học. Giữ `hold_payment(treasury, total_price)` như cũ và ghi phần Coin thưởng (`bonus_use * rate`) là chi phí nền tảng qua `record_coupon_cost`-tương tự trong `billing_ledger.py` (đọc `billing_ledger.py` để chọn đúng hàm; **cần test bảo toàn sổ**: sau mua, tổng giữ trong treasury trừ chi phí nền tảng khớp tiền thật đã nạp). `check_coupon_budget` giữ nguyên.
- [ ] **Step 4:** Chạy → PASS cùng `tests/integration/gamification` và `tests/unit` (không hỏng test cũ).
- [ ] **Step 5: Commit** `feat(be): pay courses with coin`.

### Task 6: Hoàn tiền đúng loại Coin

**Files:**
- Modify: `studynest_be/app/services/shares/refund.py` (hai nhánh cộng `wallet.balance += refund_amount` quanh dòng 810 và 966)
- Test: `studynest_be/tests/unit/test_refund_coin.py`

**Interfaces:**
- Consumes: `CoinService.refund_async`; `purchase.coin_bonus_used`/`coin_paid_used`.

- [ ] **Step 1: Viết test**: hoàn dòng có `bonus=15, paid=35` → `refund_async(bonus=15, paid=35)`; đơn cũ (cột NULL) → hành vi hoàn VND như cũ; duyệt hoàn hai lần → không cộng hai lần.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** ở cả hai nhánh: nếu `coin_paid_used is not None` thì hoàn Coin theo cột đã lưu, ngược lại giữ nhánh VND. `ref_id` = `purchase.id`.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): refund returns original coin kinds`.

### Task 7: API số dư và cài đặt admin

**Files:**
- Create: `studynest_be/app/api/v1/user/coins.py`, `studynest_be/app/schemas/user/coins.py`
- Modify: `studynest_be/app/main.py` (đăng ký router), `studynest_be/app/schemas/admin/platform_settings.py`, `studynest_be/app/services/admin/platform_settings.py`
- Test: `studynest_be/tests/unit/test_coin_api.py`

**Interfaces:**
- Produces: `GET /api/v1/user/coins` → `{ "bonus": int, "paid": int, "total": int, "rate_vnd": int, "bonus_max_share": float }`; `PlatformSettings` schema thêm `coin_vnd_rate: int (>0)` và `bonus_coin_max_share: float (0–1)`.

- [ ] **Step 1: Viết test**: route đã đăng ký và đòi đăng nhập (mẫu `test_shop_endpoints_are_registered_and_require_authentication` trong `tests/unit/gamification/test_levels_shop.py`); admin cập nhật `bonus_coin_max_share=1.5` → 422.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** theo mẫu 3 lớp trong `studynest_be/CLAUDE.md`; tags `["USER COINS"]`.
- [ ] **Step 4:** Chạy → PASS.
- [ ] **Step 5: Commit** `feat(be): coin balance api and admin settings`.

### Task 8: Frontend — số dư Coin và nút "Mua Coin"

**Files:**
- Modify: `studynest_fe/src/lib/learning-hub/endpoints.ts`, `studynest_fe/src/lib/learning-hub/shop-hooks.ts` (hook `useCoinBalances`), `studynest_fe/src/components/user/header/live-stats.tsx` (`CoinChip`), `studynest_fe/src/components/learning-hub/shop/shop-view.tsx`
- Create: `studynest_fe/src/components/learning-hub/shop/buy-coin-dialog.tsx`
- Test: `studynest_fe/tests/test-coin-payments.cjs`

**Interfaces:**
- Consumes: `GET /user/coins`; tạo thanh toán nạp đã có (`create_payment_async` trong `wallets.py`; tìm endpoint FE đang gọi bằng `grep -rn "wallets" studynest_fe/src/lib`).
- Produces: `useCoinBalances(): { bonus: number; paid: number; total: number; rateVnd: number; isLoading: boolean }`; `<BuyCoinDialog open onClose />` cho nhập số Coin, hiện số tiền VND = `coin * rateVnd`, rồi chuyển sang PayPal.

- [ ] **Step 1: Viết test** (mẫu loader trong `tests/test-levels-shop.cjs`): `useCoinBalances` ánh xạ đúng JSON; `coinToVnd(100, 10000) === 1_000_000`; dialog hiển thị "1.000.000 đ" khi nhập 100 Coin; `CoinChip` hiện tổng và có `aria-label` nêu hai loại.
- [ ] **Step 2:** `node studynest_fe/tests/test-coin-payments.cjs` → FAIL.
- [ ] **Step 3: Implement** theo Global Constraints (PulsoIcon `Coins`, token Cloudy Blue, `aria-label` cho nút chỉ có icon). Nút "Mua Coin" đặt cạnh số dư trong `shop-view.tsx`.
- [ ] **Step 4:** Chạy test mới, `node studynest_fe/tests/test-icon-source.cjs`, `npx tsc --noEmit` trong `studynest_fe` → đều pass.
- [ ] **Step 5: Commit** `feat(fe): coin balances and buy-coin dialog`.

### Task 9: Frontend — thanh toán và ví bằng Coin

**Files:**
- Modify: trang/thành phần thanh toán khóa học (tìm bằng `grep -rln "checkout" studynest_fe/src/components studynest_fe/src/app`), `studynest_fe/src/lib/navigation/user-nav.ts` (nhãn ví), các chỗ hiển thị số dư ví VND của học viên (`grep -rn "balance" studynest_fe/src/components/user/wallets`).
- Test: bổ sung vào `studynest_fe/tests/test-coin-payments.cjs`

**Interfaces:**
- Consumes: `useCoinBalances` (Task 8), `split_payment` logic nhân bản bằng hàm thuần `splitCoinPayment(priceCoin, bonus, maxShare) => { bonusUse, paidUse }` đặt trong `studynest_fe/src/lib/learning-hub/shop-logic.ts`.

- [ ] **Step 1: Viết test**: `splitCoinPayment(100, 500, 0.3)` → `{bonusUse:30, paidUse:70}`; `splitCoinPayment(100, 10, 0.3)` → `{10, 90}` (khớp backend Task 1).
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3: Implement** màn xác nhận hiện giá Coin, phần trừ Coin thưởng/thật, thiếu Coin thì khóa nút và gợi ý "Mua Coin". Ví của học viên hiển thị Coin; giữ VND cho giảng viên.
- [ ] **Step 4:** Chạy test, `test-icon-source.cjs`, `npx tsc --noEmit` → pass. Rồi duyệt tay trang thanh toán trong trình duyệt với tài khoản thử.
- [ ] **Step 5: Commit** `feat(fe): pay with coin at checkout`.

### Task 10: Kiểm tra toàn bộ

**Files:** không sửa file; chỉ chạy.

- [ ] **Step 1:** `cd studynest_be && .venv/bin/python -m pytest tests/unit tests/integration/gamification -q` → toàn bộ pass.
- [ ] **Step 2:** Trong `studynest_fe`: mọi `node tests/test-*.cjs` và `npx tsc --noEmit` → pass.
- [ ] **Step 3:** `cd studynest_be && .venv/bin/alembic heads` → đúng một head `am67cd901z234`.
- [ ] **Step 4:** Duyệt tay trên local: nạp tiền thử (PayPal sandbox) → mua một khóa bằng Coin → hoàn tiền → số dư hai loại khớp.
- [ ] **Step 5:** Báo cáo kết quả; chưa push cho đến khi chủ dự án đồng ý.

---

## Self-review

- **Phủ spec:** quy đổi (T1), dữ liệu + migrate số dư cũ + phần dư (T2), trừ thưởng trước + trần (T3, T5), giảng viên nhận đủ + chi phí nền tảng (T5), hoàn đúng loại (T6), nạp ra Coin (T4), admin chỉnh tỷ giá/trần (T2, T7), nút "Mua Coin" trong `/shop` (T8), giao diện thanh toán (T9). Chưa có task cho **định giá lại cửa hàng** vì spec để chủ dự án quyết.
- **Rủi ro lớn nhất:** T5 phần sổ cái (treasury giữ VND nhưng một phần đơn trả bằng Coin thưởng). Người làm phải đọc `billing_ledger.py` và có test bảo toàn trước khi sửa; nếu không bảo toàn được thì dừng và hỏi chủ dự án.
- **Nhất quán tên:** `price_to_coin`, `topup_to_coin`, `split_payment`, `allocate`, `CoinService.{get_balances_async, credit_paid_async, debit_for_purchase_async, refund_async}`, cột `coin_bonus_used`/`coin_paid_used`/`coin_kind`.
