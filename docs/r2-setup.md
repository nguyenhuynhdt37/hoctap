# Cloudflare R2 cho Mây Mây

## Tạo tài khoản và bucket

1. Mở [Cloudflare Dashboard](https://dash.cloudflare.com/), tạo tài khoản hoặc đăng nhập.
2. Vào **Storage & databases → R2 → Overview**, hoàn tất checkout để bật R2.
   R2 có hạn mức miễn phí, nhưng vẫn là dịch vụ tính phí khi vượt hạn mức.
3. Chọn **Create bucket**, đặt tên `studynest`, storage class **Standard**.
4. Giữ bucket **private**. Không bật public `r2.dev` hay custom domain cho bucket này:
   ứng dụng lưu cả tài liệu khóa học và ảnh chat riêng tư trong cùng bucket.
5. Ở trang R2 Overview, trong **Account Details**, chọn **Manage** cạnh **API Tokens**.
   Tạo R2 API token với quyền **Object Read & Write**, chỉ cho bucket `studynest`.
6. Lưu **Access Key ID** và **Secret Access Key** ngay khi xuất hiện.
   **Account ID** là mã tài khoản Cloudflare, không phải email hay token.

Xem [hướng dẫn bắt đầu](https://developers.cloudflare.com/r2/get-started/),
[tạo access key](https://developers.cloudflare.com/r2/api/tokens/) và
[bảng giá](https://developers.cloudflare.com/r2/pricing/).

## Cấu hình backend

Điền trong `studynest_be/.env` (file không đưa lên Git):

```dotenv
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=studynest
R2_SIGNED_URL_TTL_SECONDS=300
```

Không đưa secret vào frontend/mobile. Trong thư mục `studynest_be`, chạy:

```sh
.venv/bin/python scripts/check_r2.py
```

Lệnh kiểm tra upload, tải lại bằng signed URL, đối chiếu nội dung và xóa file kiểm tra.
Sau khi điền cấu hình, khởi động lại backend. R2 là kho upload duy nhất.
Không cần cấu hình CORS của bucket cho luồng upload hiện tại vì backend thực hiện upload;
web/mobile tải qua signed URL sau bước kiểm tra quyền.

## Hành vi lưu trữ

- R2 là kho upload duy nhất; không còn provider hoặc nhánh fallback Google Drive.
- Dữ liệu cũ đã được chuyển; xem [báo cáo chuyển đổi](storage-migration-2026-11-10.md).
- Avatar, ảnh nội dung editor và thumbnail nằm dưới `public/`, phân theo người dùng/khóa học.
- Tài liệu bài học nằm dưới `private/courses/`; chỉ giảng viên sở hữu khóa học,
  học viên đã đăng ký hoặc người đăng nhập xem bài preview được cấp link.
- Ảnh chat và ảnh trong ghi chú nằm dưới `private/users/<user_id>/`; chỉ chủ sở hữu được cấp link.
- Database lưu đường dẫn ổn định `/api/storage/files/...`, không lưu signed URL hết hạn.
  Next.js proxy sang backend `/api/v1/storage/files/...`.
- Web nhận dữ liệu file trực tiếp từ backend, không bị redirect sang S3. Backend lấy
  file từ R2 và cache nội bộ; ảnh công khai hỗ trợ ETag/304, file riêng vẫn kiểm tra
  quyền ở mỗi request và trả `Cache-Control: private, no-store`.
- Mobile đổi đường dẫn ảnh công khai sang origin API của thiết bị. Khi tải tài liệu riêng,
  mobile dùng Bearer token gọi `/storage/urls/...` lấy signed URL trước khi tải file.
- Link R2 trực tiếp có hiệu lực mặc định 5 phút. Ai có link đã ký có thể đọc file trong thời gian đó.
- Backend ghi file bằng API S3 với SigV4; không tự tạo hoặc đổi quyền công khai của bucket.

## Cache và mạng nội bộ

Cache nằm trong `studynest_be/.cache/r2/`, không đưa lên Git hoặc phục vụ như thư mục static.
Tên file cache là hash của object key; metadata chứa MIME, dung lượng và SHA-256.
Upload thành công sẽ ghi cache; cache chưa có sẽ tải từ R2 qua TLS được xác minh.

Nếu mạng nội bộ thay chứng chỉ TLS bằng gateway doanh nghiệp, cung cấp bundle CA
đã được IT phê duyệt qua `R2_CA_BUNDLE=/duong/dan/ca-bundle.pem` rồi restart backend.
Giá trị này chỉ dùng cho kết nối backend → R2; không tắt kiểm tra chứng chỉ hoặc đổi
cấu hình tin cậy của hệ điều hành/trình duyệt. Chưa có CA hợp lệ thì đọc/ghi R2 trực
tiếp có thể thất bại; cache đã xác minh vẫn có thể phục vụ file hiện có.

Để làm ấm cache từ bản sao chuyển dữ liệu đã được kiểm tra, chạy trong thư mục backend:

```sh
.venv/bin/python scripts/warm_storage_cache.py
```

Script kiểm tra SHA-256 từng file với manifest trước khi đưa vào cache. Quyền truy cập
vẫn được áp dụng ở route download, kể cả khi file đã có sẵn trong cache.

## Cây thư mục và phục hồi

Xem [cấu trúc lưu trữ](storage-tree.md) và [báo cáo chuyển đổi](storage-migration-2026-11-10.md).
Bản ZIP gốc, database trước chuyển đổi và manifest được giữ trong nhánh
`private/backups/migrations/drive-to-r2/2026-11-10/` của R2.
Nhánh backup không có URL tải công khai trong ứng dụng; quản trị qua R2 Dashboard.
