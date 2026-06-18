# Module 01 – Daily Check-in

## 1. Tổng quan

Module **Daily Check-in** cho phép người dùng điểm danh mỗi ngày để nhận phần thưởng Peak Wallet.

Hệ thống hỗ trợ:

- Chu kỳ linh hoạt: 7 ngày, 30 ngày, hoặc bất kỳ số ngày nào được cấu hình bởi Admin.
- Tích lũy streak (chuỗi liên tiếp).
- Phần thưởng không hardcode, lấy từ bảng cấu hình `daily_checkin_rewards_config`.
- Bảo vệ idempotent (chống cộng Peak 2 lần).
- Toàn bộ thao tác trong **1 Database Transaction**.

---

## 2. Business Rules

| # | Rule |
|---|------|
| 1 | Một user chỉ được check-in **1 lần / ngày** |
| 2 | Streak tính theo số ngày liên tiếp (dựa trên `checkin_date` hôm qua) |
| 3 | Chu kỳ tự động reset sau `cycle_days` lần check-in |
| 4 | Phần thưởng lấy từ `daily_checkin_rewards_config` theo `day_number` |
| 5 | Nếu `reward_type = peak_wallet`, cộng `reward_amount` vào `UserPeakBalances` |
| 6 | Sau mỗi check-in, ghi `PeakTransactions` và `GamificationActivityLogs` |
| 7 | `user_statistics.total_active_days` tăng 1 sau mỗi check-in thành công |
| 8 | Nếu đã check-in trong ngày → HTTP 409 `ALREADY_CHECKED_IN` |
| 9 | Race condition bị xử lý qua unique constraint + `IntegrityError` catch |

---

## 3. Database Flow (trong 1 Transaction)

```
POST /api/v1/gamification/checkin
│
├── 1. Validate user (not banned, not deleted)
├── 2. Lấy DailyCheckinEvents (is_active=True, trong thời hạn)
├── 3. Kiểm tra UserCheckins (user_id, event_id, checkin_date=today)
│      └─ Nếu đã tồn tại → raise 409
│
├── BEGIN NESTED TRANSACTION
│   ├── 4. Tính consecutive_day (lấy hôm qua + 1, hoặc 1)
│   ├── 5. Tính day_in_cycle = (total_checkins % cycle_days) + 1
│   ├── 6. Lấy DailyCheckinRewardsConfig[day_number]
│   ├── 7. INSERT user_checkins
│   ├── 8. Lấy/tạo UserGamificationProfiles → update streak
│   ├── 9. Lấy/tạo UserPeakBalances
│   ├── 10. credit_peak_wallet (nếu reward_type = peak_wallet)
│   ├── 11. INSERT peak_transactions (ledger)
│   ├── 12. INSERT gamification_activity_logs
│   └── 13. UPDATE/INSERT user_statistics (total_active_days += 1)
│
└── COMMIT → Trả CheckinClaimResponse
```

---

## 4. Sequence Diagram

```
Client → POST /checkin
         │
         ↓
    Router (daily_checkin.py)
         │  Depends(AuthorizationService) → get_current_user()
         │  Depends(DailyCheckinService)
         ↓
    DailyCheckinService.claim_checkin(user, request)
         │
         ├── _validate_user()
         ├── repo.get_active_event()
         ├── repo.get_today_checkin()  ← idempotent guard
         │
         ├── begin_nested() ──────────────────────────────────────────
         │   ├── repo.get_checkin_history()  → compute day_in_cycle
         │   ├── repo.get_consecutive_day()  → compute streak
         │   ├── repo.get_reward_by_day()
         │   ├── repo.create_checkin()
         │   ├── repo.get_or_create_gamification_profile()
         │   ├── repo.update_streak()
         │   ├── repo.get_or_create_peak_balance()
         │   ├── repo.credit_peak_wallet()
         │   ├── repo.create_peak_transaction()
         │   ├── repo.create_activity_log()
         │   └── repo.increment_active_days()
         │   ────────────────────────────────────────────────────────
         │
         ├── db.commit()
         └── return CheckinClaimResponse
```

---

## 5. API Specification

### 5.1 GET `/api/v1/gamification/checkin`

**Mô tả**: Lấy trạng thái check-in hiện tại của user.

**Auth**: Bearer Token hoặc Cookie `access_token`

**Response 200**:
```json
{
  "checked_today": false,
  "current_streak": 3,
  "best_streak": 7,
  "current_day_in_cycle": 4,
  "cycle_days": 7,
  "today_reward": {
    "day_number": 4,
    "reward_type": "peak_wallet",
    "reward_amount": 150,
    "reward_metadata": null
  },
  "next_reward": {
    "day_number": 5,
    "reward_type": "peak_wallet",
    "reward_amount": 200,
    "reward_metadata": null
  },
  "calendar": [
    { "day_number": 1, "checkin_date": "2026-06-15", "is_checked": true, "reward": {...} },
    ...
  ],
  "current_peak_balance": 450
}
```

**Error Codes**:

| HTTP | Code | Mô tả |
|------|------|-------|
| 401 | — | Chưa đăng nhập |
| 403 | `USER_DISABLED` | Tài khoản bị khóa/xóa |
| 404 | `NO_ACTIVE_EVENT` | Không có sự kiện Check-in đang hoạt động |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống |

---

### 5.2 POST `/api/v1/gamification/checkin`

**Mô tả**: Thực hiện Check-in và nhận phần thưởng.

**Auth**: Bearer Token hoặc Cookie `access_token`

**Response 200**:
```json
{
  "success": true,
  "message": "Check-in thành công! 🎉",
  "current_day": 4,
  "reward": {
    "day_number": 4,
    "reward_type": "peak_wallet",
    "reward_amount": 150,
    "reward_metadata": null
  },
  "current_peak_balance": 600,
  "current_streak": 4,
  "best_streak": 7,
  "calendar": [...]
}
```

**Error Codes**:

| HTTP | Code | Mô tả |
|------|------|-------|
| 401 | — | Chưa đăng nhập |
| 403 | `USER_DISABLED` | Tài khoản bị khóa/xóa |
| 404 | `NO_ACTIVE_EVENT` | Không có sự kiện |
| 409 | `ALREADY_CHECKED_IN` | Đã Check-in hôm nay rồi |
| 422 | `INVALID_REWARD` | Không tìm thấy cấu hình phần thưởng |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống |

---

## 6. DTOs

### CheckinStatusResponse

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `checked_today` | `bool` | Đã check-in hôm nay chưa |
| `current_streak` | `int` | Chuỗi streak hiện tại |
| `best_streak` | `int` | Chuỗi streak cao nhất |
| `current_day_in_cycle` | `int` | Ngày hiện tại trong chu kỳ (1-based) |
| `cycle_days` | `int` | Tổng số ngày của chu kỳ |
| `today_reward` | `RewardDTO?` | Phần thưởng hôm nay |
| `next_reward` | `RewardDTO?` | Phần thưởng ngày mai |
| `calendar` | `CalendarDayDTO[]` | Lịch check-in của chu kỳ |
| `current_peak_balance` | `int` | Số dư Peak Wallet |

### CheckinClaimResponse

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `success` | `bool` | Kết quả |
| `message` | `str` | Thông báo |
| `current_day` | `int` | Ngày trong chu kỳ vừa check-in |
| `reward` | `RewardDTO?` | Phần thưởng vừa nhận |
| `current_peak_balance` | `int` | Số dư sau khi nhận |
| `current_streak` | `int` | Streak sau check-in |
| `best_streak` | `int` | Streak cao nhất |
| `calendar` | `CalendarDayDTO[]` | Lịch được cập nhật |

### RewardDTO

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `day_number` | `int` | Ngày trong chu kỳ |
| `reward_type` | `str` | Loại phần thưởng |
| `reward_amount` | `int?` | Số lượng |
| `reward_metadata` | `dict?` | Metadata bổ sung |

### CalendarDayDTO

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `day_number` | `int` | Ngày trong chu kỳ (1-based) |
| `checkin_date` | `date?` | Ngày đã check-in |
| `is_checked` | `bool` | Đã check-in chưa |
| `reward` | `RewardDTO?` | Phần thưởng của ngày |

---

## 7. Tables liên quan

| Bảng | Vai trò |
|------|---------|
| `daily_checkin_events` | Config sự kiện Check-in (Admin quản lý) |
| `daily_checkin_rewards_config` | Config phần thưởng theo ngày |
| `user_checkins` | Runtime – bản ghi Check-in của user |
| `user_gamification_profiles` | Runtime – streak, level |
| `user_peak_balances` | Runtime – số dư Peak Wallet |
| `peak_transactions` | Ledger – nhật ký thay đổi Peak |
| `gamification_activity_logs` | Audit log – mọi action |
| `user_statistics` | Runtime – tổng ngày hoạt động |
