# Kế hoạch rà soát frontend — ưu tiên giảng viên

Ngày: 2026-11-11. Phạm vi đợt đầu: `studynest_fe`, đối chiếu API trong `studynest_be`.

Repository có nhiều thay đổi chưa commit từ trước. Các sửa chữa đợt này được thực hiện trực tiếp trên trạng thái hiện tại, không hoàn nguyên hoặc commit gộp công việc đang có.

## Đợt 1 — lỗi đã xác minh và sửa

| Mức | Luồng | Nguyên nhân và sửa chữa | Kiểm tra |
| --- | --- | --- | --- |
| P1 | Sửa khóa học | Effect theo `category_id` xóa `topic_id` ngay sau khi nạp dữ liệu. Chỉ xóa chủ đề trong sự kiện người dùng đổi danh mục. | Nạp khóa học vẫn giữ chủ đề; đổi danh mục xóa chủ đề cũ. |
| P1 | Sửa khóa học | Không xử lý lỗi SWR nên 403/404/500 dẫn đến spinner vô hạn. Thêm thông báo, thử lại và quay về danh sách. | Kiểm tra cả ba trạng thái lỗi và khôi phục dữ liệu sau thử lại. |
| P1 | Danh sách/sửa khóa học | Backend cho phép `category: null`, FE truy cập thẳng `category.id/name`. Cập nhật kiểu dữ liệu và xử lý danh mục trống. | Form nạp được khóa học không có danh mục; danh sách có nhãn thay thế. |
| P1 | Sửa bài học | Lỗi API bị coi là đang tải; loading lặp lại header của layout. Thêm thông báo lỗi/thử lại; bỏ header thừa. | Kiểm tra 403/404/500 của endpoint chi tiết. |
| P1 | Tài liệu bài học | Route `/lecturer/lessons/[id]/resources` truyền ID qua path nhưng component chỉ đọc query. Ưu tiên path ID và giữ tương thích `/lecturer/resources?lesson_id=…`. | Kiểm tra key API của cả hai dạng URL. |
| P1 | Câu hỏi video | Nút từ bảng chương dẫn tới `/lessons/[id]/quiz` không tồn tại. Chuyển tới `/lecturer/quizzes-lesson` cùng `lesson_id`, `course_id`. | Gọi callback và kiểm tra URL đích. |
| P1 | Tìm kiếm khóa học | Header ghi `keyword`, danh sách đọc `search`; state không cập nhật khi điều hướng trong cùng trang; chuỗi tìm kiếm chưa encode. Thống nhất `search`, giữ đọc URL cũ, đồng bộ state khi URL tìm kiếm thay đổi. | Kiểm tra header, ký tự `&`, URL cũ, điều hướng tìm kiếm lần hai và reset trang. |
| P1 | Bảng chương | `keepPreviousData` có thể hiện chương của khóa trước; thiếu course ID vẫn hiện bảng thao tác. Bỏ giữ dữ liệu khác khóa và thêm trạng thái yêu cầu chọn khóa học. Sao chép mảng trước khi sort response. | Kiểm tra cấu hình cache và không gọi API khi thiếu ID. |
| P2 | Phân trang khóa học | `parseInt` nhận page âm, NaN, số lẻ. Chỉ nhận số nguyên dương an toàn, mặc định 1. | URL page không hợp lệ và giữ page hợp lệ khi mở trang. |

## Đợt 2 — lỗi đã thấy, cần triển khai tiếp

1. **P1 — Lọc HTML dùng chung**: `components/shared/markdown-renderer/index.tsx` đưa HTML thẳng vào `dangerouslySetInnerHTML`, bao gồm nhánh nội dung bắt đầu bằng `<`, `isHtml`, fallback khi parse lỗi và underline placeholder. Các preview quiz còn chèn HTML trực tiếp. Cần chọn sanitizer chạy nhất quán trên SSR/browser, giữ định dạng Tiptap và bảng, kiểm tra payload event handlers/URL nguy hiểm. Đây là phần dùng chung, ảnh hưởng cả giảng viên và học viên.
2. **P1 — Chuyển trang sau đăng nhập**: login và email authentication dùng `redirect` từ query trực tiếp. Chuẩn hóa thành đường dẫn nội bộ trước `router.push`, kiểm tra scheme, protocol-relative và backslash. Kiểm tra cả Google login.
3. **P2 — Xem trước bài học**: `chapters/index.tsx` dẫn tới `/lecturer/lessons/[id]/preview` nhưng chưa có route. Bổ sung màn hình preview chỉ đọc bằng API có kiểm tra quyền sở hữu; kiểm tra riêng video/quiz/code/article. Tránh dùng luồng học viên làm phát sinh tiến độ học hoặc yêu cầu ghi danh của giảng viên.
4. **P2 — Thống kê khóa học**: tổng học viên/doanh thu/đánh giá đang được tính bằng `data.courses` của trang hiện tại. Cần endpoint tổng hợp theo giảng viên hoặc đổi nhãn rõ phạm vi hiện tại; đối chiếu dashboard trước khi thay API.

## Đợt 3 — kiểm thử tích hợp bằng dữ liệu kiểm thử

- Giảng viên có/không có khóa học; tài khoản khác chủ sở hữu; session hết hạn; 403/404/500.
- Tạo/sửa khóa học qua đủ các bước, phân loại giáo dục, đổi danh mục và chủ đề, thumbnail, upload lỗi và thử lại.
- Chương/bài học: tạo/đổi tên/xóa, kéo thả cùng/khác chương và rollback khi API lỗi; chuyển nhanh giữa hai khóa học.
- Video/quiz/code: lưu nội dung, upload, xử lý dữ liệu chưa có, quản lý câu hỏi và tài liệu.
- Học viên: phân trang, lọc, chi tiết, export; đặc biệt URL page/limit sai và trạng thái API lỗi.
- Ví/hoàn tiền/rút tiền: đối chiếu số dư và chiều giao dịch với backend; dùng dữ liệu kiểm thử cho các hành động thay đổi tài chính.
- Desktop/mobile: navigation, bảng tràn ngang, modal, thông báo; dùng semantic tokens và shared UI theo Cloudy Blue.

## Xác minh và giới hạn

- `cd studynest_fe && npm run typecheck`
- `cd studynest_fe && npm run test:lecturer`
- `cd studynest_fe && npm run build`
- `node scripts/test-refresh-session.cjs`
- `node scripts/test-chat-stream.cjs`
- `git diff --check`

`test:lecturer` thực thi lifecycle state/effect và kiểm tra phần tử/callback của component, giả lập SWR/router/UI để không gọi API thật. Đây là kiểm tra hồi quy logic, chưa thay thế kiểm thử trình duyệt có đăng nhập, hình ảnh giao diện hoặc tích hợp upload/thanh toán.

Build hiện có cảnh báo `middleware` deprecated, baseline-browser-mapping cũ và thiếu `metadataBase`; các cảnh báo này không làm build thất bại. Chưa chuyển convention hoặc nâng dependency trong đợt sửa lỗi này.


## Bổ sung — runtime trang hồ sơ giảng viên

Người dùng báo `NotFoundError: removeChild` tại `/lecturer/profile` khi lưu.

- Đã tái hiện cùng lỗi trên Chrome có đăng nhập: mô phỏng tiện ích dịch di chuyển Text node trong nhãn nút sang phần tử `<font>`, rồi kích hoạt trạng thái loading của nút dùng chung. React cố xóa Text node trực tiếp khỏi button và crash toàn trang. Chưa xác định tiện ích cụ thể trong lần lỗi ban đầu của người dùng.
- `ui/button.tsx`: luôn giữ phần tử `<span>` cho nhãn, kể cả khi đổi sang `loadingText`; React cập nhật nội dung bên trong phần tử ổn định.
- `shared/tiptap_editor/index.tsx`: tắt bản extension trùng trong StarterKit v3; bỏ transaction căn lề trễ vốn phát `onUpdate` ngay khi mở editor và làm hồ sơ tự dirty; đồng bộ prop im lặng, xử lý cả nội dung rỗng.
- Kiểm tra trình duyệt thực trên URL được báo: nhãn bị bọc bởi translator, lưu loading, phản hồi 503 giữ bản nháp, thử lại 200, refresh, Chỉnh sửa/Hủy năm lần. Các request PUT hồ sơ được giả lập trong tab, không ghi hồ sơ thật.
- Kịch bản tái chạy: `scripts/browser/test-lecturer-profile.js` (hàm async để chạy bằng evaluate_script trong tab đã đăng nhập). Kiểm tra này chưa xác nhận lưu dữ liệu vào DB thật.

- Xác minh bổ sung: build production bằng `next build --webpack` thành công; phát hiện và sửa kiểu `params/searchParams` thành Promise trong trang chi tiết học viên cho Next 16. `typecheck`, kiểm tra hồi quy giảng viên, session/chat stream và `git diff --check` đều thành công.
