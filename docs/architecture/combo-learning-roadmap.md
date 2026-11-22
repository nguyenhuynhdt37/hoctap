# Combo là lộ trình học do giảng viên đăng bán

## Định nghĩa sản phẩm

Combo là một lộ trình học có thứ tự, do giảng viên xây dựng từ các khóa học của mình và bán với một giá trọn gói. Học viên khám phá mục tiêu, người dạy, các bước học rồi mua ngay trên trang combo. Không yêu cầu giảng viên tạo thêm một lộ trình admin độc lập để có thể bán combo.

- Giảng viên: đặt tên lộ trình, giới thiệu đối tượng/đầu vào/đầu ra, chọn ít nhất hai khóa đủ điều kiện, sắp xếp thứ tự, đặt giá và đăng bán. Mã ưu đãi thuộc combo của chính giảng viên.
- Học viên: xem giảng viên và thứ tự các khóa, nhận báo giá có trừ phần đã sở hữu, mua combo bằng luồng thanh toán hiện có.
- Thứ tự học là đề xuất của giảng viên. Việc sắp xếp không tự khóa các khóa phía sau hoặc thêm điều kiện tiên quyết.
- Sửa combo đã xuất bản tạo phiên bản mới; không sửa nội dung/thứ tự trong phiên bản cũ đã mua.

## Dữ liệu và điều hướng

Dùng `course_bundles` làm sản phẩm của giảng viên, `course_bundle_versions` lưu phiên bản và `course_bundle_items.position` lưu các bước học. Mảng `course_ids` gửi từ trình biên tập chính là thứ tự lộ trình. Danh sách và chi tiết trả thêm `instructor`, `course_count`; từng khóa có `position`.

`/combo` là danh mục lộ trình thương mại; `/combo/[slug]` là trang xem lộ trình và mua. `/lo-trinh` chuyển tới `/combo` để không còn hai danh mục khám phá cạnh tranh nhau. Các trang chi tiết và lịch sử theo dõi lộ trình tham khảo cũ vẫn được giữ để bảo toàn liên kết. Các bảng `learning_paths` cũ và trường `path_version_id` tương thích không phải điều kiện để giảng viên tạo combo.

## Phạm vi cập nhật

Đồng nhất danh mục, điều hướng và cách mô tả; thêm thao tác lên/xuống để giảng viên sắp xếp; giữ tên khóa đã chọn khi tìm kiếm; trình bày các bước học cùng giảng viên trên trang bán. Bổ sung tìm kiếm tên combo qua API danh sách.

Luồng ví, phân bổ giá, ưu đãi, quyền học và chính sách hoàn tiền đang có được giữ nguyên. Đây không phải triển khai thêm chính sách hoàn toàn bộ đơn, giỏ hàng nhiều sản phẩm hoặc một hệ thống tiến độ combo mới. Các mục chưa thực hiện trong kế hoạch Combo Commerce V2 cũ không được xem là hoàn tất bởi thay đổi này.

## Kiểm chứng

- TypeScript frontend: pass.
- PostgreSQL riêng `studynest_combo_v2_test`: 5 kiểm thử quyền giảng viên/combo và 35 kiểm thử lộ trình/combo hiện có pass. Bao gồm thứ tự mới, phiên bản cũ không đổi, tác giả, số khóa và tìm kiếm.
- Trình duyệt với phản hồi API giả lập: chuyển `/lo-trinh` sang `/combo`, tìm kiếm, hiển thị tác giả/thứ tự; màn hình rộng và mobile 390 px không tràn ngang, không có lỗi JavaScript. Không thực hiện thanh toán trong kiểm tra giao diện.
