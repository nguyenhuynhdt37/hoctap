# Triển khai đăng nhập Google theo `sub`

`POST /auth/google` nhận ID token như trước. Backend kiểm tra chữ ký, `aud`, `iss`, `email_verified is True` và DPoP theo cấu hình hiện hành. Khi tìm thấy `sub`, backend đăng nhập theo `user_id` đã lưu và giữ nguyên email hồ sơ. Tài khoản bị khóa hoặc đã xóa bị từ chối.

- Bảng `public.user_identities` dùng khóa chính `(provider, provider_subject)` và khóa duy nhất `(user_id, provider)`. Khóa ngoại trỏ về tài khoản. `email_at_link` ghi lại email lúc liên kết để đối chiếu nội bộ. Các khóa tạo index trên bảng mới, lúc bảng còn trống.
- Khi `sub` mới và email chưa dùng, backend tạo tài khoản không có mật khẩu, định danh và phiên trong cùng giao dịch. Khóa giao dịch theo `sub` và khóa dòng tài khoản xử lý các yêu cầu đồng thời.
- Khi `sub` mới và email đã dùng, backend chỉ tự nối tài khoản có dấu `google-oauth`, đã xác minh email nội bộ, dùng Gmail cá nhân (`@gmail.com`, token không có `hd`) và chưa có định danh Google. Việc nối diễn ra khi đăng nhập, trong giao dịch tạo phiên.
- Chủ sản phẩm cần duyệt phương án hỗ trợ cho tài khoản cũ dùng Workspace, email bên thứ ba hoặc từng đăng nhập Google vào tài khoản có mật khẩu. Dữ liệu cũ thiếu định danh để xác thực chủ Google trước đây. Người có phương thức đăng nhập cũ có thể tiếp tục dùng phương thức đó. Nếu cần khôi phục quyền đăng nhập Google, bộ phận hỗ trợ cần xác minh quyền sở hữu qua bằng chứng độc lập với email hiện tại. Đợt này chưa có luồng tự phục vụ để liên kết thủ công.
- Nếu email trong token đã đổi trước lần tự liên kết đầu tiên, backend chưa có dữ liệu để tìm hồ sơ cũ. Một email mới chưa dùng có thể tạo hồ sơ mới.
- Email OTP và GitHub có chính sách xác minh riêng. Các luồng đó vẫn cần được rà soát nếu mục tiêu là ngăn email đổi chủ cấp quyền qua mọi phương thức đăng nhập.

## Áp dụng migration

Chủ sản phẩm chạy các lệnh sau từ bản phát hành có revision mới. Xác nhận kết nối đích từ cấu hình triển khai và bản sao lưu trước khi bắt đầu. Chỉ bước `upgrade` thay đổi cơ sở dữ liệu.

```bash
cd studynest_be
.venv/bin/alembic heads
.venv/bin/alembic current
# Sau khi xác nhận current là ah12xy456u789
.venv/bin/alembic upgrade ai23yz567v890
.venv/bin/alembic current
```

`heads` và `current` sau upgrade phải là `ai23yz567v890`. Triển khai backend mới sau khi migration thành công. Trong lúc cập nhật các instance, tạm dừng lưu lượng đăng nhập Google để mọi yêu cầu được xử lý theo cùng chính sách khi mở lại.

`.venv/bin/alembic downgrade ah12xy456u789` xóa bảng định danh, bao gồm các liên kết đã tạo sau rollout. Nếu cần rollback ứng dụng, có thể giữ bảng để bảo toàn liên kết và tạm dừng đăng nhập Google trong thời gian backend cũ hoạt động.

## Chạy kiểm thử PostgreSQL

Chuẩn bị database thử riêng đã có schema tại revision `ah12xy456u789`. Đặt `GOOGLE_TEST_DB_URL` qua cấu hình cục bộ tới database `studynest_test_google` ở cổng `55432`. Chạy từ `studynest_be/`.

```bash
export DATABASE_ASYNC_URL="${GOOGLE_TEST_DB_URL:?Cần URL database thử riêng}"
export TEST_DATABASE_ASYNC_URL="$DATABASE_ASYNC_URL"
.venv/bin/python -c 'import os; from sqlalchemy.engine import make_url; u = make_url(os.environ["DATABASE_ASYNC_URL"]); assert (u.host, u.port, u.database) == ("127.0.0.1", 55432, "studynest_test_google")' &&
  .venv/bin/alembic upgrade ai23yz567v890 &&
  .venv/bin/python -m pytest -q tests/integration/test_google_login.py
```
