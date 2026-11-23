Đã nối Learning Hub với API thật. `404/501` hiện “Tính năng này đang được cập nhật”, còn lỗi mạng hoặc máy chủ có nút “Thử lại” ngay trong khối bị lỗi. Mọi đường dẫn API của Hub tập trung tại [endpoints.ts](/Users/huynh/codes/hoctap/studynest_fe/src/lib/learning-hub/endpoints.ts).

| Trang hoặc khối | API đã nối |
|---|---|
| `/review` và chặng ôn ở trang chủ | `/user/review/queue` và `/user/review/{id}/answer`. Hiện `due_count`, chặn bấm đúp và dùng lại `idempotency_key` khi gửi lại. |
| `/mastery` | `/user/mastery/courses` và `/user/courses/{id}/mastery`. Hiện trạng thái bằng chữ. “Ôn phần này” mở hàng đợi của khóa. |
| `/goals` và mục tiêu trên trang chủ | `/user/goals`, chi tiết và `/plan`. Tạo, sửa, xóa có xác nhận, hiển thị lịch từng ngày và tiến độ. Mục tiêu lộ trình dùng ID đơn combo có khóa còn quyền truy cập. |
| Lộ trình và báo cáo tuần | `/learning-paths/my`, chi tiết phiên bản và `/user/reports/weekly`. Báo cáo chia sẻ hoặc sao chép nguyên `share_text`. |
| Header, trang chủ và `/missions` | Dùng chung hook đọc `/gamification/missions` cho XP, cấp và Peak, cùng `/gamification/streak` cho chuỗi ngày. Điểm danh, nhận thưởng, kho mã và huy hiệu dùng API tương ứng. Kho mã rỗng hiện “Sắp có”, huy hiệu chưa đạt hiện mờ kèm nhãn. |

Mock chỉ chạy trong `development` khi đặt `NEXT_PUBLIC_HUB_DATA_SOURCE=mock`. Chế độ này mới hiện chip “Dữ liệu mẫu”.

**Tệp thay đổi.** Thêm `endpoints.ts`, `data-source.ts`, `errors.ts`, `badge-collection.tsx` và `test-learning-hub-api.cjs`. Sửa client, hook và các khối Learning Hub, hai route `/review` và `/goals`, `live-stats.tsx`, `sky-panel.tsx`, `my-learning-paths.tsx`, `modal.tsx`, `.env.example` và `test-learning-journey.cjs`. Đã gỡ mã rơi về mock và lịch học tự dựng, không xóa tệp.

**Kiểm tra.** `npx tsc --noEmit` đạt. Test hành trình đạt 9/9, kiểm tra điều hướng đạt và test API mới đạt 5/5, bao gồm hồi quy đồng bộ XP sau khi nhận thưởng. Chưa kiểm thử end-to-end với backend đang chạy hoặc kiểm tra giao diện bằng trình duyệt.