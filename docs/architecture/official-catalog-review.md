# Kiểm tra catalog chính thức — 11/11/2026

Quy trình sử dụng: [Quản lý catalog chính thức](official-catalog-workflow.md).

## Kết quả rà soát và sửa

- BE/FE không còn chế độ `is_demo`, trang showcase hay router `/test`. Migration `f67a89b01c23` đã có trên DB local và DB kiểm thử.
- Kiểm tra chỉ đọc DB local: 131 khóa thuộc prefix mẫu đều không công khai; 17 lộ trình và 32 combo thuộc prefix mẫu đều tắt hiển thị và có `deleted_at`. Không xóa lịch sử đăng ký, đơn hàng hoặc giao dịch.
- Gỡ 131 SVG mẫu còn sót trong `studynest_fe/public/demo/`. Tài liệu seed cũ chuyển sang thông báo ngừng sử dụng, bỏ hướng dẫn gọi script đã gỡ.
- Chặn ID khóa mẫu ngay khi lưu bản nháp lộ trình/combo qua API, bổ sung cho bộ lọc picker và kiểm tra lúc xuất bản/thanh toán đã có.
- Tên và mô tả OpenAPI dùng Mây Mây, bỏ nhãn backend demo.
- Xác nhận ẩn/hiện áp dụng ở root; bản nháp vẫn riêng tư. Coupon thuộc đúng một combo, không dùng coupon khóa lẻ. Slug trùng tự thêm 8 ký tự UUID; tạo mới không vô tình trở thành phiên bản của mục có sẵn.
- Điều hướng admin có bốn bước và mô tả: danh mục → khóa học → lộ trình → combo & ưu đãi.
- Sau khi lưu bản nháp, mở ngay bước kiểm tra nội dung/xuất bản; có nút quản lý mã combo tại đây. Hiển thị rõ trạng thái, công tắc và đường dẫn cuối cùng đã lưu.
- Danh sách admin chuyển sang bố cục thẻ trên màn nhỏ; footer Modal tự chia hàng, tránh ép nhiều nút vào một hàng.
- Picker khóa hiển thị lỗi có thử lại hoặc trạng thái không còn khả dụng thay vì tải vô hạn. Form combo giữ lựa chọn phiên bản lộ trình cũ khi phiên bản đó không nằm trong danh sách công khai hiện tại.

## Kiểm chứng trong phiên này

| Kiểm tra | Kết quả |
| --- | --- |
| PostgreSQL integration: catalog + paths/bundles | 56 passed; 6 warnings từ Pydantic, Google SDK và transaction fixture hiện có |
| Hồi quy mới | 4 ca chặn prefix khóa mẫu khi tạo nháp; 1 ca slug combo trùng tạo root độc lập |
| Nghiệp vụ có trong bộ integration | Coupon đúng combo, hết hạn/tắt/ngưỡng tiền, lượt cuối đồng thời, giảm sau owned credit, phân bổ/hoàn tiền, retry không thu hai lần, quyền admin, giữ đơn cũ khi ẩn |
| Web TypeScript | `npx tsc --noEmit` qua |
| Web production build | `npm run build` qua |
| Ruff | Các service path/bundle và test integration đã sửa qua |
| Giao diện component thực với API giả trong harness tạm ngoài repo | Xem desktop 1440px/mobile 390px, không tràn ngang; sửa nháp → lưu → kiểm tra → mã ưu đãi; nút xuất bản bị khóa khi thiếu khóa; xem form coupon |

Log: `/tmp/studynest-official-review-tests.log`, `/tmp/studynest-official-review-build.log`. Build còn cảnh báo baseline-browser-mapping cũ và convention middleware của Next.js.

Kiểm tra giao diện dùng component và CSS build thực, thay API bằng dữ liệu thử chỉ trong `/tmp`; không thêm route thử hoặc mock vào sản phẩm. Trang admin thật chuyển về đăng nhập khi không có phiên, nên phiên này chưa xác nhận E2E bằng tài khoản admin trong trình duyệt. Nghiệp vụ BE được chạy trên DB thử riêng. Không thay đổi dữ liệu nghiệp vụ local, không deploy production.
