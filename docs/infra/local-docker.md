# Chạy Mây Mây local và chuyển database sang máy khác

## Chạy lần đầu

Cài Docker Desktop hoặc OrbStack với Docker Compose v2.24 trở lên. Mở terminal ở thư mục gốc của repo rồi chạy:

```bash
docker compose up -d
```

- Web Mây Mây ở [localhost:3000](http://localhost:3000).
- Swagger ở [localhost:8000/docs](http://localhost:8000/docs).
- Mailpit nhận email và OTP ở [localhost:18025](http://localhost:18025).

Lần đầu Compose build ứng dụng, tạo database, chạy migration và tải runtime chấm code. Xem trạng thái bằng `docker compose ps -a`. Khi cài xong runtime, `piston-runtimes` hiển thị `Exited (0)`. Nếu cần xem tiến độ, chạy `docker compose logs -f backend frontend piston-runtimes`.

Sau khi sửa code, chạy `docker compose up -d --build`. Dừng stack bằng `docker compose down`. Lệnh này giữ các volume dữ liệu.

## Tự giải phóng cổng trên Windows

Từ thư mục gốc, chạy bằng PowerShell:

```powershell
.\scripts\dev\up.ps1
```

Script tự dừng tiến trình Next.js và Uvicorn của repo đang giữ cổng web hoặc API, sau đó chạy `docker compose up -d`. Nếu cổng thuộc một ứng dụng khác hoặc container ngoài stack dev, thông báo sẽ chỉ rõ tiến trình hay container đang dùng cổng. Thêm `-Build` sau tên script khi cần build lại.

## Đổi cổng khi chạy song song

Mặc định web dùng cổng `3000` và API dùng `8000`. Nếu máy đang dùng các cổng này cho stack khác, thêm vào file `.env` ở thư mục gốc:

```dotenv
MAYMAY_DEV_WEB_PORT=3001
MAYMAY_DEV_API_PORT=8001
```

Sau khi đổi cổng, chạy `docker compose up -d --build` để Next.js nhận URL mới. CORS, callback và URL WebSocket được cập nhật theo hai biến trên.

## Xuất SQL ở máy nguồn

Chạy từ thư mục gốc khi PostgreSQL đang bật:

```bash
mkdir -p data/backups
(umask 077; docker compose exec -T postgres pg_dump \
  -U maymay_dev -d studynest_dev --format=plain --no-owner --no-privileges \
  > data/backups/studynest_dev.sql.partial) && \
  mv data/backups/studynest_dev.sql.partial data/backups/studynest_dev.sql
```

Chép `data/backups/studynest_dev.sql` sang máy đích qua kênh riêng vì file có thể chứa dữ liệu tài khoản và phiên đăng nhập. Nếu đã có bản dump, dùng file đó và thay đường dẫn trong lệnh nạp bên dưới. Dump gồm schema và dữ liệu PostgreSQL. File lưu trên R2, Redis và cấu hình tích hợp được quản lý riêng.

## Dữ liệu mẫu có sẵn trên GitHub

File [`data/fixtures/studynest_dev_catalog.sql`](../../data/fixtures/studynest_dev_catalog.sql) chứa schema PostgreSQL, 613 khóa học, 45 phiên bản combo và tài khoản giảng viên mẫu. Bản export đã loại dữ liệu đăng nhập, lịch sử chat, giao dịch, dữ liệu học tập cá nhân và tệp riêng. Tạo tài khoản học viên mới qua trang đăng ký và lấy mã xác thực trong Mailpit.

Tạo database `studynest_import_dev` theo bước bên dưới. Trên Windows PowerShell, nạp file có sẵn từ thư mục gốc bằng lệnh sau:

```powershell
cmd /c 'docker compose exec -T postgres psql -X --single-transaction -v ON_ERROR_STOP=1 -U maymay_dev -d studynest_import_dev < data\fixtures\studynest_dev_catalog.sql'
```

Trên macOS hoặc Linux, dùng lệnh nạp bên dưới và thay đường dẫn sau dấu `<` bằng `data/fixtures/studynest_dev_catalog.sql`.

## Nạp SQL ở máy đích

Dùng cùng nhánh mã nguồn hoặc phiên bản mới hơn có các migration tương ứng. Khởi động PostgreSQL và nạp vào database mới. Các lệnh dưới đây chạy từ thư mục gốc trên máy đích:

```bash
docker compose up -d --wait postgres
docker compose exec -T postgres createdb -U maymay_dev studynest_import_dev
docker compose exec -T postgres psql -X --single-transaction -v ON_ERROR_STOP=1 \
  -U maymay_dev -d studynest_import_dev < data/backups/studynest_dev.sql
docker compose exec -T postgres psql -X -U maymay_dev -d studynest_import_dev \
  -c 'SELECT version_num FROM alembic_version;'
```

Nếu muốn web dùng dữ liệu vừa nạp, đổi tên hai database trong cùng một giao dịch. Database cũ sẽ được giữ lại dưới tên `studynest_previous_dev`. Hai tên `studynest_import_dev` và `studynest_previous_dev` cần còn trống trước lần nạp. Nếu đã dùng các tên này, chọn tên khác và cập nhật nhất quán trong các lệnh.

```bash
docker compose stop frontend backend
docker compose exec -T postgres psql -X --single-transaction -v ON_ERROR_STOP=1 \
  -U maymay_dev -d postgres \
  -c 'ALTER DATABASE studynest_dev RENAME TO studynest_previous_dev;' \
  -c 'ALTER DATABASE studynest_import_dev RENAME TO studynest_dev;'
docker compose up -d
```

Mở web ở [localhost:3000](http://localhost:3000). Backend sẽ chạy các migration còn thiếu khi khởi động.

## Tích hợp tùy chọn

Đặt khóa dev hoặc sandbox trong `studynest_be/.env.docker.local`, dựa theo `studynest_be/.env.development.example`. Với Google OAuth hoặc PayPal, đặt thêm `NEXT_PUBLIC_URL_GOOGLE_LOGIN` hoặc `NEXT_PUBLIC_PAYPAL_CLIENT_ID` trong file `.env` ở thư mục gốc rồi chạy `docker compose up -d --build`.

Để bật Mây Mây Co-Pilot trong Docker dev với 9Router, thêm cấu hình sau vào `studynest_be/.env.docker.local` và điền khóa của môi trường dev:

```dotenv
AGENT_ENABLED=True
LLM_PROVIDER=9router
NINEROUTER_BASE_URL=https://9router.itup.io.vn/v1
NINEROUTER_API_KEY=
AGENT_MODEL=ag/gemini-3-flash
```

Chạy `docker compose up -d --wait backend` để áp dụng. Docker Compose đọc `.env.docker.local` và Git bỏ qua file này.
