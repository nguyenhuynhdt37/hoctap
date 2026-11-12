# Cấu hình hai tài khoản và khóa Toán lớp 1–12

Đã chuyển 8 khóa cũ của hai tài khoản chính sang Toán lớp 1–8, bổ sung 4 khóa lớp 9–12. Tài khoản thứ nhất phụ trách lớp 1–6, tài khoản thứ hai lớp 7–12. Không thay tên, email, mật khẩu hay vai trò. Bio và giới thiệu hướng về ôn Toán phổ thông, không thêm chứng chỉ hoặc thành tích.

Mỗi lớp có một khóa gán môn Toán, đúng một lớp và mục tiêu lấy lại gốc. Mỗi khóa có ba phần/bài đọc: kiến thức, ví dụ, bài luyện và đáp án. Đây là học phần củng cố, chưa phải nội dung trọn năm. Các khóa giữ trạng thái bản nháp, chờ rà soát và duyệt; chưa xuất bản hoặc mở bán. Giá cũ được giữ, bốn khóa mới chưa định giá (0 VND trong bản nháp). Ảnh, video quảng cáo và embeddings cũ được bỏ khỏi khóa mới để tránh hiển thị sai.

ID và slug tám khóa hiện có được giữ để bảo toàn liên kết và lịch sử giao dịch. Vì vậy URL cũ có thể còn tên nội dung trước đây. Nội dung cũ được chuyển vào các khóa lưu trữ có `deleted_at`, không xuất bản; giữ bài, tài nguyên, tiến độ cũ và bài đang học trong bản lưu trữ. Đăng ký hiện có vẫn gắn ID khóa cũ, tiến độ nội dung mới bắt đầu từ 0. Không sửa giao dịch, purchase items, ví hay quyền tài khoản.

Script: `studynest_be/scripts/configure_k12_accounts.py`. Chỉ nhận DB localhost, có dry-run, khóa transaction, kiểm tra taxonomy và chủ sở hữu. Lần chạy sau giữ nội dung đã tạo để không ghi đè chỉnh sửa bài học.

```sh
cd studynest_be
.venv/bin/python scripts/configure_k12_accounts.py
.venv/bin/python scripts/configure_k12_accounts.py --apply --backup backups/k12-refresh/before-refresh.dump
```

Bản sao lưu PostgreSQL trước chuyển đổi nằm tại `studynest_be/backups/k12-refresh/before-refresh.dump` (được gitignore). Không khôi phục toàn bộ dump lên DB đang có chỉnh sửa mới nếu chưa đối chiếu dữ liệu. Các bài đọc được hỗ trợ ở API lấy bài đang học và `LessonRenderer` dùng MarkdownRenderer/shared Button với semantic tokens Cloudy Blue.
