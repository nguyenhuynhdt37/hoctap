Đã triển khai XP, nhiệm vụ ngày và nhiệm vụ theo khóa. Nhiệm vụ ngày reset lúc 00:00 giờ Việt Nam. Nhiệm vụ theo khóa được tạo khi mua và bổ sung khi GET cho các khóa còn quyền truy cập. Claim đồng thời chỉ ghi thưởng một lần, trả lại kết quả gốc khi gọi lại và hỗ trợ lên nhiều cấp. XP và Peak đã nhận được giữ khi hoàn tiền.

**Endpoint theo hợp đồng**

- `GET /api/v1/gamification/missions`
- `POST /api/v1/gamification/missions/{mission_id}/claim`
- `GET /api/v1/gamification/rewards/inventory`

**File chính** gồm hai migration `ae89uv123r456` và `af90vw234s567`, `database.py`, router và schema `missions.py`, `mission_service.py`, `mission_evidence.py`, `mission_subscriber.py`, `mission_clock.py`, `profile_service.py`, `balances.py`, các luồng điểm danh, streak và quiz, cùng `main.py`, `settings.py`, `.env.example` và các test liên quan. [Hợp đồng API](/Users/huynh/codes/hoctap/docs/superpowers/specs/2026-11-23-missions-api-contract.md)

| Pytest | Pass | Skip | Fail |
|---|---:|---:|---:|
| Bộ liên quan | 72 | 11 | 0 |
| Toàn bộ unit | 706 | 0 | 17 |

Cả 17 lỗi unit đều tái hiện trước thay đổi. Các ca PostgreSQL, gồm claim đồng thời, được skip vì thiếu `TEST_DATABASE_ASYNC_URL`. Alembic đã sinh SQL nâng cấp và hạ cấp đến head `af90vw234s567`.

Mặc định quiz qua chương ở 70%, nhiệm vụ học đều cần 3 ngày trong tuần và claim giới hạn 30 lượt/phút. Coupon đã có mô hình và inventory. Việc phát hành chờ tích hợp đối soát, với `MISSION_COUPON_REWARDS_ENABLED` mặc định tắt.