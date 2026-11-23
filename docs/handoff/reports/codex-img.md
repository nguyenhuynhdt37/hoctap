Đã bổ sung hình ảnh cho cả 5 trang sau đăng nhập.

- **`/`** — Avatar học viên cạnh lời chào, ảnh khóa đang học trong hero, avatar giảng viên ở khóa đề xuất, ảnh cho các thẻ khóa học, combo, lộ trình, mục tiêu và ôn tập. Khối gia sư, báo cáo tuần và các trạng thái rỗng dùng hình thương hiệu Mây.
- **`/missions`** — Ảnh khóa từ API cho từng nhóm và từng nhiệm vụ theo chương. Nhiệm vụ hằng ngày có minh họa riêng theo loại. Kệ phần thưởng có biểu tượng XP và Peak, mã giảm giá dạng vé CSS, và linh vật Mây khi kệ trống.
- **`/review`** — Thẻ câu hỏi và màn hình bắt đầu dùng ảnh khóa nguồn. 
- **`/mastery`** — Ảnh bìa khóa đang chọn và ảnh nhỏ trên từng chương.
- **`/goals`** — Ảnh bìa mục tiêu theo khóa hoặc lộ trình, cùng ảnh nhỏ cho các khóa trong lịch lộ trình. Khi thiếu ảnh bìa lộ trình, giao diện dùng ảnh một khóa trong lộ trình hoặc cảnh thương hiệu.

Thêm hai bản cắt bỏ dấu góc trong `public/images/learning-hub/` gồm `academy-cover.webp` từ `scene-academy.jpg` và `welcome-cover.webp` từ `scene-welcome.jpg`.

**Cần backend** cung cấp danh sách huy hiệu của học viên kèm `image_url`. Kệ hiện hiển thị **Sắp có**.

**Kiểm tra** — `npx tsc --noEmit` và ESLint trên các tệp chỉnh sửa đều đạt. Đã kiểm tra CSS responsive, độ tương phản của các cặp màu mới và nhánh ảnh dự phòng. Chưa xác nhận trực quan ở 390 px và desktop vì kênh trình duyệt không kết nối được.