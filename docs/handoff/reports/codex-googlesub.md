Đã chuyển `/auth/google` sang đăng nhập theo Google `sub`. Khi `sub` đã liên kết, backend mở đúng tài khoản dù email trong token đổi. Luồng vẫn kiểm tra `aud`, `iss`, `email_verified is True`, DPoP và trạng thái khóa hoặc xóa tài khoản.

**Thiết kế và chính sách cần duyệt.** Bảng `user_identities` tách định danh đăng nhập khỏi email hồ sơ. Hai ràng buộc duy nhất bảo đảm mỗi `(provider, sub)` thuộc một tài khoản và mỗi tài khoản chỉ có một định danh Google. Tài khoản mới, định danh và phiên được ghi trong cùng giao dịch.

Tài khoản Google cũ dùng Gmail cá nhân được tự nối ở lần đăng nhập tiếp theo nếu còn dấu `google-oauth`, email đã xác minh và khớp hồ sơ. Tài khoản có mật khẩu, Workspace hoặc email bên thứ ba cần dùng phương thức đăng nhập cũ hoặc được hỗ trợ xác minh quyền sở hữu. **Chủ sản phẩm cần duyệt phương án hỗ trợ nhóm này.** Dữ liệu cũ thiếu `sub`, nên chưa thể tự khôi phục an toàn nếu email đã đổi chủ hoặc đã thay đổi trước lần nối đầu tiên. Email OTP và GitHub vẫn cần được rà riêng về rủi ro đổi chủ email.

**Kiểm chứng**

- Unit pytest **746 pass, 0 fail**.
- SQL upgrade và downgrade chạy thành công trên PostgreSQL nhúng, gồm kiểm tra hai ràng buộc duy nhất, khóa ngoại và bảng trống sau upgrade.
- **17 test tích hợp chưa xác minh**, gồm đua hai đăng nhập cùng `sub`. Sandbox chặn kết nối tới `127.0.0.1:55432` với `PermissionError`. Cơ sở dữ liệu thật chưa bị ghi.

**File.** Đã thêm model `user_identity.py`, migration `ai23yz567v890_user_identities.py`, `tests/integration/test_google_login.py` và [tài liệu triển khai](/Users/huynh/codes/hoctap/docs/auth/google-identity-rollout.md). Đã sửa Alembic `env.py`, service/API/schema đăng nhập, `log_redaction.py` và các unit test Google, log redaction, Learning Hub.

**Lệnh cho chủ sản phẩm chạy** sau khi xác nhận kết nối đích và bản sao lưu. Head mới là `ai23yz567v890`.

```bash
cd studynest_be
.venv/bin/alembic heads
.venv/bin/alembic current
# Tiếp tục khi current là ah12xy456u789
.venv/bin/alembic upgrade ai23yz567v890
.venv/bin/alembic current
```