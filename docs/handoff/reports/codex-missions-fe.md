Đã thay khối nhiệm vụ trên trang chủ bằng **Nhiệm vụ & cấp độ**, thêm trang `/missions`, mục **Nhiệm vụ** trong menu tài khoản và **Kệ phần thưởng**. Giao diện có đếm ngược đến 00:00 giờ Việt Nam, lọc theo khóa, liên kết vào chương hoặc bài trắc nghiệm, và thông báo lên cấp khi nhận thưởng.

- **File mới** gồm route `/missions`, hai component trong `src/components/learning-hub/missions/` và bốn file kiểu dữ liệu, API, mock, hook trong `src/lib/learning-hub/`.
- **File sửa** gồm các khối trang chủ, `home-api.ts`, menu tài khoản và luồng mở bài tại `/learning/[slug]`.
- **Dữ liệu** ưu tiên API thật qua DPoP. Endpoint trả `404/501` do chưa triển khai sẽ dùng mock có chip **Dữ liệu mẫu**. Lỗi mạng và lỗi máy chủ có nút **Thử lại**. Hero dùng XP thật từ API nhiệm vụ hoặc hồ sơ gamification hiện có.
- **Kiểm tra** đã qua `npx tsc --noEmit`, ESLint trên các file tạo và sửa, cùng kiểm tra mô phỏng đổi ngày, lên cấp, chống bấm đúp và hoàn tác khi nhận thưởng lỗi.

Chưa xác minh trực tiếp giao diện ở 390 px và luồng API thật vì phiên trình duyệt không kết nối được. Nút sao chép dùng chuỗi `code_masked` theo hợp đồng.