# Cloudflare R2 cho StudyNest

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
STORAGE_PROVIDER=google_drive
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
Khi kiểm tra thành công, đổi `STORAGE_PROVIDER=r2` rồi khởi động lại backend.
Không cần cấu hình CORS của bucket cho luồng upload hiện tại vì backend thực hiện upload;
web/mobile tải qua signed URL sau bước kiểm tra quyền.

## Hành vi lưu trữ

- File mới dùng provider đã chọn. Link Drive cũ vẫn hoạt động; chưa tự sao chép hoặc xóa file cũ.
- Avatar, ảnh nội dung editor và thumbnail nằm dưới `public/`, cho phép xem không cần đăng nhập.
- Tài liệu bài học nằm dưới `private/courses/`; chỉ giảng viên sở hữu khóa học,
  học viên đã đăng ký hoặc người đăng nhập xem bài preview được cấp link.
- Ảnh chat nằm dưới `private/tutor_chat/`; chỉ chủ sở hữu được cấp link.
- Database lưu đường dẫn ổn định `/api/storage/files/...`, không lưu signed URL hết hạn.
  Next.js proxy sang backend `/api/v1/storage/files/...`.
- Mobile đổi đường dẫn ảnh công khai sang origin API của thiết bị. Khi tải tài liệu riêng,
  mobile dùng Bearer token gọi `/storage/urls/...` lấy signed URL trước khi tải file.
- Link R2 trực tiếp có hiệu lực mặc định 5 phút. Ai có link đã ký có thể đọc file trong thời gian đó.
- Backend ghi file bằng API S3 với SigV4; không tự tạo hoặc đổi quyền công khai của bucket.

## Chuyển dữ liệu Drive cũ

Đây là bước riêng sau khi kiểm tra R2 thật thành công: thống kê file/link đang được sử dụng,
sao lưu database, sao chép file, kiểm tra nội dung và cập nhật đường dẫn tương ứng.
Giữ file gốc trên Drive cho tới khi xác nhận quá trình chuyển hoàn tất.
