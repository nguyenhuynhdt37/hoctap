# Quản lý catalog chính thức

Trang quản lý chung có điều hướng **Cấp học & môn → Khóa học → Lộ trình → Combo & ưu đãi**.

- Khóa học: tìm theo tên để gán lớp, môn, đơn vị; không cần nhập UUID.
- Lộ trình: soạn từng chặng, học phần và các khóa thay thế. Chọn môn trước khi thêm chặng; môn và đường dẫn giữ ổn định sau khi tạo.
- Combo: chọn khóa, giá VND, liên kết một bản lộ trình đã công khai nếu cần; cấu hình mã riêng ngay từ hàng combo.

Điều hướng có số thứ tự và mô tả từng bước. Lưu bản nháp sẽ mở ngay phần kiểm tra: xem đường dẫn cuối cùng, các nội dung còn thiếu rồi xuất bản khi sẵn sàng. Combo có lối vào mã ưu đãi ngay trong phần kiểm tra. Danh sách đổi sang thẻ trên màn nhỏ; các nút hộp thoại tự chia hàng.

## Bản nháp, phiên bản và hiển thị

Có thể lưu bản nháp khi chưa đủ mô tả, chặng hoặc khóa. **Sửa bản nháp** cập nhật cùng bản, không sinh phiên bản mỗi lần lưu. **Tạo phiên bản mới** dùng ID lộ trình/combo rõ ràng và giữ đường dẫn. Danh sách admin chỉ hiện phiên bản mới nhất của mỗi mục; **Lịch sử** chứa các bản trước. Xuất bản kiểm tra nội dung và khóa, nhãn trình độ nếu có, giá và phạm vi combo. Bản đã xuất bản cùng cấu trúc con là bất biến; không xuất bản bản cũ hơn phiên bản đã công khai.

Công tắc hiển thị nằm ở cấp lộ trình/combo. Tắt công tắc dừng khám phá, theo dõi mới hoặc mua mới; giữ quyền theo dõi đã có, enrollment và đơn đã mua. Bản nháp luôn riêng tư dù công tắc bật. Một bản nháp mới không làm mất bản published hiện tại trên trang bán.

Không còn trường `is_demo`, nút tạo minh họa, trang showcase hoặc router `/test`. Migration `f67a89b01c23` lưu trữ các root seed/minh họa cũ bằng `deleted_at`; lịch sử giao dịch và đăng ký không bị xóa. Đường dẫn reserved của khóa seed cũ vẫn bị chặn trong catalog và checkout. Script tạo dữ liệu hình ảnh/khóa mẫu đã được gỡ.

## Đường dẫn tự động

Khi tạo mới, có thể để trống slug để sinh từ tên tiếng Việt. Backend chuẩn hóa và kiểm tra duy nhất trong DB; nếu trùng thêm 8 ký tự UUID. Cùng slug khi tạo mới tạo mục độc lập, không vô tình thêm phiên bản vào mục cũ. Khóa học, cây danh mục, môn/lớp, đơn vị, lộ trình và combo cùng dùng cơ chế này. Mã taxonomy có ý nghĩa nghiệp vụ vẫn phải duy nhất; không tự thay đổi mã trùng.

## Mã ưu đãi combo

Mỗi mã thuộc đúng một combo, không dùng lại coupon khóa lẻ. Quản trị được tạo/sửa, lên lịch bắt đầu/kết thúc, bật/tắt, chọn phần trăm hoặc tiền cố định, ngưỡng thanh toán, mức giảm tối đa, tổng lượt và lượt mỗi tài khoản. Mã không phân biệt chữ hoa/thường; tên mã duy nhất trên bảng combo. Mã đã có đơn giữ nguyên tên, có thể điều chỉnh chính sách hoặc tắt.

Báo giá trừ phần giá combo của các khóa đã sở hữu trước; chỉ áp dụng tối đa một mã lên số còn phải trả. Giảm tối đa bằng số còn phải trả. Tổng sau giảm được phân bổ xuống các khóa chưa sở hữu theo tỷ trọng và phần dư nhỏ nhất 0.01 VND; tổng các dòng luôn bằng số trừ ví. Quote hash gắn nội dung báo giá, người mua và coupon. Checkout khóa coupon, kiểm tra thời hạn, trạng thái, hạn mức và quyền sở hữu lại trong cùng transaction. Mua lặp cùng idempotency key trả đơn cũ. Lượt coupon đã dùng không được trả lại khi hoàn tiền.

Đơn và snapshot từng khóa lưu mã/tiền giảm thực tế; hoàn tiền và doanh thu dùng số thực trả từng dòng. Tắt mã hoặc chỉnh chính sách không thay đổi các đơn trước đó.

Các API quản trị dưới `/admin/learning-paths` và `/admin/bundles` yêu cầu ADMIN đang hoạt động. Sửa bản nháp dùng `PUT /versions/{id}`; tạo phiên bản mới dùng POST kèm `path_id`/`bundle_id`. Quản lý coupon dùng `/admin/bundles/{bundle_id}/coupons`; người mua gửi `coupon_code` khi quote và checkout.
