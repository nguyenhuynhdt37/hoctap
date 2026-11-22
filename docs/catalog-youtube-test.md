# Catalog YouTube phục vụ kiểm thử nội bộ

Theo yêu cầu ngày 14/11/2026: chủ yếu crawl metadata YouTube để làm dữ liệu test nội bộ, tối thiểu **6 khóa cho mỗi môn/lớp**. Đây là phạm vi riêng được chủ dự án cho phép; các bộ seed giả cũ vẫn không được khôi phục.

## Kết quả đã áp dụng

| Hạng mục | Kết quả |
| --- | ---: |
| Khóa đang công khai trong ứng dụng local | 452 |
| Khóa bổ sung trong đợt này | 431 |
| Bài video mới | 1.293 |
| Nhóm môn/lớp đạt tối thiểu 6 khóa | 76/76 |
| Môn học | 15 |
| Cấp lớp | 1–12 |
| Kênh YouTube nguồn trong đợt mới | 203 |
| Tài khoản giảng viên biên tập hiện có được phân bổ khóa | 8 |
| Ảnh còn thiếu ở khóa công khai | 0 |
| Khóa công khai còn thiếu trường thông tin bắt buộc trong kiểm kê | 0 |

Tổng số lượt khóa theo môn/lớp là 456. Số khóa độc lập là 452 vì hai khóa lập trình cũ cùng phù hợp lớp 10, 11 và 12. Mỗi nhóm hiện có đúng 6 khóa.

Mỗi khóa mới là một **tuyển chọn ngắn gồm 3 video**, không phải bản sao của cả playlist hoặc khóa đầy đủ do kênh nguồn phát hành. Tất cả khóa mới miễn phí. Giữ nguyên hai khóa lập trình có giá cũ. Không tạo lượt học, đánh giá hoặc chứng nhận giả.

## Thông tin trên từng khóa

- Tên khóa chứa môn, lớp và tiêu đề nội dung thật từ nguồn.
- Ảnh thumbnail YouTube của bài đầu; 8 khóa VTV7 thiếu ảnh đã được gán bộ ảnh Mây Mây hiện có.
- Mô tả phạm vi, 3 bài học cụ thể, tên kênh, liên kết nguồn và cách học.
- Mục tiêu dựa trên tên bài thực tế, yêu cầu đầu vào và đối tượng học.
- Giá, tiền tệ, ngôn ngữ, trình độ, lớp, môn, thời lượng và tài khoản biên tập.
- Từng bài có tiêu đề, video nhúng, thời lượng, tên tác giả/kênh và thời điểm kiểm tra metadata.
- 19 khóa VTV7 cũ được bổ sung mô tả nội dung theo manifest, mục tiêu, yêu cầu và đối tượng cụ thể.

Tài khoản giảng viên Mây Mây quản lý tuyển chọn; không được coi là tác giả video. Chỉ lấy metadata công khai và nhúng video từ YouTube, không tải media hoặc tự tạo transcript. Nội dung có thể khác bộ sách và năm học; phần mô tả nêu rõ đây là tư liệu tham khảo.

## Kiểm tra đã hoàn thành

- API catalog qua proxy giao diện: 76/76 bộ lọc môn/lớp trả về đủ 6 khóa.
- API thông tin chi tiết: 452/452 khóa trả HTTP 200.
- Ảnh: 452/452 URL trả ảnh hợp lệ, được giải mã và kiểm tra kích thước tối thiểu 320 × 180.
- 1.293 video mới có metadata tìm kiếm và oEmbed được kiểm tra; không có ID video trùng trong đợt crawl.
- 19 unit test liên quan importer, đối chiếu lớp/môn và tính toàn vẹn nguồn đã qua; Ruff qua trên các script/test mới.
- Chạy lại importer sau khi áp dụng tạo **0 khóa, 0 bài mới**, giữ nguyên báo cáo chứa ID đợt nhập.

Kiểm tra metadata/oEmbed không thay thế việc phát thử toàn bộ video. YouTube có thể thay đổi khả dụng hoặc quyền nhúng sau thời điểm kiểm tra.

## Tra cứu và tái chạy

- [Bảng độ phủ và thông tin đầy đủ 452 khóa](verification/course-catalog-audit.md).
- [Kiểm kê JSON](verification/course-catalog-audit.json).
- [Bằng chứng kiểm tra HTTP](verification/course-catalog-http.json).
- [Manifest video và nguồn](../data/lessons/youtube-test-catalog.json).
- [ID, đường dẫn và video của 431 khóa đã nhập](../data/lessons/youtube-test-import-report.json).

Từ thư mục `studynest_be/`:

```sh
# Crawl metadata, kiểm tra oEmbed, xem trước số khóa còn thiếu; không commit DB.
.venv/bin/python scripts/expand_youtube_test_catalog.py

# Áp dụng khi có nhóm chưa đủ 6 khóa. Giao dịch nhập toàn bộ thành công hoặc rollback.
.venv/bin/python scripts/expand_youtube_test_catalog.py --apply

# Tạo lại bảng thông tin đầy đủ và kiểm kê theo môn/lớp.
.venv/bin/python scripts/audit_course_catalog.py

# Bổ sung thông tin các khóa VTV7 đã nhập từ manifest.
.venv/bin/python scripts/enrich_vtv7_catalog_metadata.py --apply

# Gán ảnh cho các đợt VTV7, bao gồm các đợt nhập tiếp theo.
.venv/bin/python scripts/assign_vtv7_course_covers.py --apply
```

Importer chỉ bổ sung nhóm còn thiếu, dùng tài khoản admin/giảng viên đang có và giữ lịch sử đăng ký, giao dịch, học tập. Để rút đợt dữ liệu này khỏi danh sách, dùng ID trong import report để bỏ công khai; không xóa dữ liệu có lịch sử học hoặc thanh toán.
