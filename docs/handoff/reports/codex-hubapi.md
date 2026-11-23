Đã triển khai 12 endpoint dưới `/api/v1` theo [hợp đồng Learning Hub](/Users/huynh/codes/hoctap/docs/superpowers/specs/2026-11-23-learning-hub-api-contract.md).

- **Ôn tập** — `GET /user/review/queue` và `POST /user/review/{item_id}/answer`. Hàng đợi có thêm bộ lọc `section_id`.
- **Năng lực** — `GET /user/mastery/courses` và `GET /user/courses/{course_id}/mastery`.
- **Mục tiêu** — `GET/POST /user/goals`, `GET/PATCH/DELETE /user/goals/{id}` và `GET /user/goals/{id}/plan`. Lịch tính động từ mốc cố định. Đích `path` dùng ID đơn combo đã mua.
- **Báo cáo và huy hiệu** — `GET /user/reports/weekly` và `GET /gamification/badges`.

**Migration** `ag01wx345t678_learning_hub.py` tạo `review_items`, `review_answers` và `study_goals`. `ah12xy456u789_learning_hub_lookup_indexes.py` tạo index đồng thời và là head mới. Đã chạy toàn bộ chuỗi migration và kiểm tra downgrade rồi upgrade lại trên Postgres nhúng 17.5 với pgvector 0.8.1. Mọi thao tác ghi chỉ chạy trên DB tạm.

| Kiểm thử | Pass | Skip | Fail | Loại khỏi lượt chạy |
|---|---:|---:|---:|---:|
| Toàn bộ `tests/unit` | 738 | 0 | 0 | 0 |
| `tests/integration` khi thiếu DB thử | 21 | 241 | 0 | 0 |
| Learning Hub và gamification trên DB nhúng | 85 | 0 | 0 | 2 |
| Lượt integration rộng trên DB nhúng | 273 | 2 | 16 | 16 |

Trong 6 ca lỗi được đối chiếu, 5 ca cũng lỗi ở head cũ. Sandbox chặn socket Docker và mở cổng nghe cục bộ, nên **kiểm thử tranh chấp vẫn cần Postgres độc lập hỗ trợ nhiều kết nối**.

**Lệnh cho chủ sản phẩm** sau khi xác nhận `DATABASE_ASYNC_URL` trỏ đúng DB đích

```bash
cd /Users/huynh/codes/hoctap/studynest_be
.venv/bin/python -m alembic current
.venv/bin/python -m alembic upgrade ah12xy456u789
.venv/bin/python -m alembic current
```