# Đề xuất lộ trình học chính thức — chờ duyệt

Ngày lập: 11/11/2026. **Chưa ghi các lộ trình dưới đây vào DB.**

## Hiện trạng đã kiểm tra

- DB có 3 cấp học, đủ lớp 1–12, 15 môn và bảng liên kết môn–lớp.
- Catalog hiện có **0 khóa học chính thức công khai**. 16 lộ trình seed trước đây đều `is_active=false` và không dùng lại.
- Mô hình hiện tại: một lộ trình thuộc một môn; mỗi phiên bản có các chặng theo thứ tự; mỗi chặng có nhóm học phần và các khóa thay thế để người học chọn một. Một phiên bản published là bất biến.
- API và admin đã hỗ trợ lưu/sửa bản nháp chưa gắn khóa. Xuất bản vẫn yêu cầu đủ chặng, học phần và khóa hợp lệ. Chế độ minh họa đã bị loại bỏ; lộ trình cũ được lưu trữ khỏi danh sách quản lý.

## Cấu trúc đề xuất

**23 lộ trình, 82 chặng**: 76 chặng theo các cặp môn–lớp đang được cấu hình trong DB, cộng 6 chặng trình độ Tiếng Anh. Mỗi lộ trình có slug riêng không dùng tiền tố `demo-` hay `seed-shop-`. Tách môn kéo dài nhiều cấp học thành tuyến Tiểu học, THCS, THPT để học sinh tìm đúng điểm vào; kết thúc tuyến có gợi ý tuyến kế tiếp.

| # | Lộ trình | Chặng | Nội dung chính dự kiến |
|---|---|---|---|
| 1 | Toán Tiểu học | Lớp 1–5 | Số và phép tính → đo lường, hình học → phân số, số thập phân, giải bài toán. |
| 2 | Toán THCS | Lớp 6–9 | Số hữu tỉ → biểu thức/đại số → hàm số, hình học, thống kê và xác suất. |
| 3 | Toán THPT | Lớp 10–12 | Đại số, hình học → lượng giác, dãy số → hàm số, đạo hàm, tích phân và xác suất theo chương trình. |
| 4 | Tiếng Việt Tiểu học | Lớp 1–5 | Đọc viết ban đầu → đọc hiểu, từ/câu → viết đoạn, viết bài và giao tiếp. |
| 5 | Ngữ văn THCS | Lớp 6–9 | Đọc hiểu văn bản → tiếng Việt và viết → phân tích, nghị luận theo từng lớp. |
| 6 | Ngữ văn THPT | Lớp 10–12 | Đọc văn bản đa thể loại → lập luận, phân tích → nghị luận và diễn đạt nâng cao. |
| 7 | Tiếng Anh Tiểu học | Lớp 1–5 | Nghe nói gần gũi → từ vựng, mẫu câu → đọc viết và giao tiếp cơ bản. |
| 8 | Tiếng Anh THCS | Lớp 6–9 | Chủ đề đời sống → ngữ pháp và bốn kỹ năng → đọc viết, giao tiếp độc lập. |
| 9 | Tiếng Anh THPT | Lớp 10–12 | Bốn kỹ năng theo chương trình → đọc hiểu, viết, thuyết trình và luyện tập theo mục tiêu học đường. |
| 10 | Tiếng Anh theo trình độ | A1 → A2 → B1 → B2 → C1 → C2 | Tuyến học ngoài trục lớp: giao tiếp nền tảng → sử dụng độc lập → học thuật/chuyên sâu. Nhãn chỉ là **mục tiêu học**, chưa xác nhận đạt CEFR hoặc cấp chứng chỉ. |
| 11 | Tự nhiên và Xã hội Tiểu học | Lớp 1–3 | Bản thân, gia đình, trường học → cộng đồng → môi trường và thế giới tự nhiên gần gũi. |
| 12 | Khoa học Tiểu học | Lớp 4–5 | Vật chất, năng lượng, thực vật/động vật → cơ thể người, môi trường và ứng dụng. |
| 13 | Tin học và Công nghệ Tiểu học | Lớp 3–5 | Sử dụng thiết bị an toàn → thông tin, thao tác số → tư duy quy trình và sản phẩm đơn giản. |
| 14 | Khoa học tự nhiên THCS | Lớp 6–9 | Quan sát, đo đạc → vật chất và sự sống → năng lượng, Trái Đất → vận dụng liên môn. |
| 15 | Lịch sử và Địa lí Tiểu học | Lớp 4–5 | Địa phương và vùng miền → Việt Nam, bản đồ, lịch sử và môi trường. |
| 16 | Lịch sử và Địa lí THCS | Lớp 6–9 | Dòng thời gian lịch sử và không gian địa lí từ cơ bản đến vận dụng theo từng lớp. |
| 17 | Tin học THCS | Lớp 6–9 | Dữ liệu, mạng và an toàn số → ứng dụng văn phòng → thuật toán và lập trình cơ bản. |
| 18 | Tin học THPT | Lớp 10–12 | Tư duy thuật toán → dữ liệu và lập trình → dự án, định hướng nghề nghiệp số. |
| 19 | Vật lí THPT | Lớp 10–12 | Chuyển động, lực → dao động, sóng → điện, từ và chủ đề lớp 12 theo chương trình. |
| 20 | Hóa học THPT | Lớp 10–12 | Cấu tạo chất, phản ứng → hóa vô cơ/hữu cơ → ứng dụng và bài toán tổng hợp. |
| 21 | Sinh học THPT | Lớp 10–12 | Tế bào → cơ thể và chuyển hóa → di truyền, tiến hóa, sinh thái. |
| 22 | Lịch sử THPT | Lớp 10–12 | Phương pháp học sử → lịch sử Việt Nam/thế giới theo chủ đề → phân tích tư liệu. |
| 23 | Địa lí THPT | Lớp 10–12 | Bản đồ, địa lí tự nhiên → kinh tế xã hội → Việt Nam, khu vực và vận dụng số liệu. |

Nội dung trong bảng là **đề cương để biên tập**, chưa phải cam kết rằng đã có bài giảng hoặc chuẩn đầu ra được thẩm định. Mỗi chặng sẽ có: mục tiêu có thể kiểm tra, kiến thức đầu vào, chủ đề cốt lõi, khóa học được tuyển chọn, và điều kiện hoàn thành. Một học phần có thể gắn nhiều khóa thay thế; admin duyệt nội dung và thứ tự, không tự xếp theo doanh số/rating hay AI.

## Cách đưa vào DB sau khi duyệt

1. Backup DB local; kiểm tra lại 15 môn, 76 liên kết môn–lớp, slug và bản seed ẩn. Lập manifest 23 path/82 stage với ID ổn định, chạy dry-run và kiểm tra trùng trước khi ghi.
2. Ghi trong **một transaction**: `learning_paths` (`is_active=false`), `learning_path_versions` (`status=draft`, `created_by` là admin), rồi `learning_path_stages` theo thứ tự. Không gắn khóa seed vào `stage_course_options`. Chạy lại phải idempotent, không tạo phiên bản trùng.
3. Cho admin xem và chỉnh đề cương bản nháp. Khi có khóa thật đã duyệt, admin gán khóa cho từng nhóm học phần, kiểm tra đúng môn/lớp, nội dung và giá. Công khai từng lộ trình sau khi đủ chặng và khóa hợp lệ; không công khai đồng loạt.
4. Kiểm tra API danh sách/chi tiết, thứ tự chặng, điều hướng giữa các tuyến, học trên mobile và trang rỗng. Việc theo dõi lộ trình không tự mua khóa; combo giá bán được lập và duyệt riêng sau.

## Quyết định cần duyệt

- Chọn **23 tuyến theo cấp học** như bảng, hay **16 tuyến xuyên cấp** (mỗi môn một tuyến, riêng Tiếng Anh có thêm tuyến A1–C2). Đề xuất 23 tuyến để đúng cách người học tìm môn theo cấp/lớp.
- Chọn thời điểm hiển thị công khai: đề xuất giữ bản nháp trong admin đến khi có khóa học thật; nếu muốn hiện lộ trình nội dung trước, cần bổ sung chế độ “sắp ra mắt” và thay đổi quy tắc publish/API/UI để phân biệt rõ chặng chưa có khóa.
