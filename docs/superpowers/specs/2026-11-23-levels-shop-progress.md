# Tiến độ Cấp độ và Cửa hàng Mây

- Checkout bắt đầu tại `d49b086`, working tree sạch. Có sẵn `level_rewards.py`, `schemas/gamification/shop.py`, cấu hình cờ coupon và công thức XP được nối vào profile. Ba tệp model, repository và test được nhắc trong ghi chú tiếp tục chưa có trên checkout này.
- Đã đọc hai hợp đồng và xác nhận head Alembic ban đầu là `ai23yz567v890` với URL kiểm tra đã che mật khẩu, cổng `55432`. Sandbox trả `Operation not permitted` cho TCP đến cổng thử và từ chối socket Docker. Chưa tạo database hoặc chạy migration.
- Đã kiểm thử riêng công thức XP, lịch thưởng và cờ mặc định bằng `tests/unit/gamification/test_levels_shop.py` (15 pass). Lượt chạy toàn bộ unit ban đầu đang chạy.
- Route hồ sơ công khai hiện có là `GET /api/v1/profile/{user_id}`. Checkout khóa học và combo chưa dùng chung cơ chế coupon thưởng có giới hạn theo phí nền tảng. Cần giữ việc phát mã sau phần đối soát nằm ngoài phạm vi chỉnh sửa của brief.

## Các bước đã chạy

| Bước | Kết quả |
| --- | --- |
| Đọc lại checkout và chạy baseline | 746 pass, 0 fail |
| Kiểm thử công thức cấp độ | 15 pass riêng file |
| Thêm model và migration | Upgrade offline sinh SQL. Unit phát hiện test Google cố định head cũ, 760 pass và 1 fail |
| Nối cấp thưởng và backfill vào ví/claim | Đã sửa test Google để kiểm tra quan hệ cha-con. Toàn bộ unit 761 pass, 0 fail |
| Nối service, API và trang bị trong hồ sơ | Đợt kiểm tra gamification và Google 72 pass, 0 fail. Đang chạy lại toàn bộ unit sau khi thêm test catalog và API |

- Migration có revision `aj34za678w901`, cha `ai23yz567v890`. Catalog chứa 8 món bán bằng Coin và 20 món đặc quyền. Cột mốc sau cấp 50 sinh vật phẩm theo khóa ổn định.
- Tạo database thử qua asyncpg tại cổng 55432 cũng bị sandbox từ chối với `PermissionError: errno=1`. Việc xác minh SQL online và các race trên Postgres còn chờ môi trường thử có thể kết nối. Chưa ghi lên bất kỳ cơ sở dữ liệu nào.
- Đã xác minh offline cả hai chiều giữa `ai23yz567v890` và `aj34za678w901`, và mô hình query cửa hàng sinh được SQL PostgreSQL. Một lần chạy riêng `pytest tests/unit` có 768 pass. Integration gamification có 21 pass và 20 skip khi không có URL thử truy cập được.
- Khi có quyền truy cập container thử, tạo `studynest_test_shop` từ một schema thử có revision trước và pgvector. Đặt cả `DATABASE_ASYNC_URL` và `TEST_DATABASE_ASYNC_URL` trỏ tới database mới trên cổng 55432, kiểm tra URL đã che mật khẩu trước mỗi lệnh Alembic, rồi chạy `.venv/bin/alembic upgrade aj34za678w901` và `.venv/bin/python -m pytest tests/integration/gamification -rs`.
- Downgrade gỡ catalog, kho, trang bị và các mốc trong sổ thưởng cấp. Các giao dịch XP và Coin đã ghi được giữ trong sổ giao dịch.
- Lượt cuối sau thay đổi backfill kho mã thưởng, `pytest tests/unit tests/integration/gamification -q -rs`, có 789 pass, 20 skip, 0 fail. Hai lý do còn mở là quyền truy cập Postgres thử và tích hợp phát/dùng mã giảm giá trong checkout. Cờ coupon mặc định tắt và hiện chỉ tính mức ưu đãi dự kiến khi bật.
