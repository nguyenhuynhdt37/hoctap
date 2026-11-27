# Môi trường: development / test / production

Ba môi trường tách biệt hoàn toàn về **cấu hình, hạ tầng Docker, dữ liệu và key bên thứ ba**.

| | development | test | production |
|---|---|---|---|
| `APP_ENV` | `development` | `test` | `production` |
| File env (BE) | `studynest_be/.env.development` | `studynest_be/.env.test` | `studynest_be/.env.production` (server: `be.env`) |
| File env (FE) | `studynest_fe/.env.development` | — | build args trong compose / `.env.production` |
| Docker | `compose.yaml` cho toàn bộ web, `docker-compose.dev.yml` cho hạ tầng (project `maymay-dev`) | dùng chung container dev | `docker-compose.prod.yml` / `deploy/maymay` |
| Container | `maymay-dev-*` | `maymay-dev-db` | `studynest_*_prod`, `studynest_db`… |
| Postgres | `127.0.0.1:15433`, DB `studynest_dev` | cùng server, DB `studynest_test` | trong mạng Docker `postgres:5432`, DB `studynest` |
| Redis / Piston / Mail | `16379` / `14000` / Mailpit `11025` (UI `18025`) | như dev | `redis` / `piston` / SMTP thật |
| Volume | `maymay-dev_dev_*` (mới, riêng) | như dev | volume `studynest_be_*` cũ (external, giữ nguyên dữ liệu thật) |
| PayPal / R2 | sandbox / bucket `*-dev` | sandbox / bucket `*-test` | live / bucket production |

## Quy tắc được code ép (`studynest_be/app/core/env_guard.py`)

Backend **từ chối khởi động** khi:
- dev/test: DB trỏ host production (`PROD_DB_HOSTS`), tên DB không kết thúc `_dev`/`_test`, PayPal live, bucket R2 không có hậu tố `-dev`/`-test`, URL công khai trỏ `PROD_PUBLIC_HOSTS`.
- production: DB/Redis/URL là localhost, DB hoặc bucket dev/test, mail là Mailpit, CORS có `*`/localhost, `JWT_SECRET` < 32 ký tự hoặc là giá trị mẫu. (PayPal sandbox ở production chỉ cảnh báo.)

Mỗi môi trường chỉ đọc đúng file `.env.<APP_ENV>`; `.env` cũ chỉ còn là fallback cho development.

## Chạy toàn bộ web

```bash
docker compose up -d
```

Web mặc định dùng cổng `3000`, API dùng `8000` và Mailpit dùng `18025`. Backend tự chạy Alembic cho `studynest_dev` và nạp danh mục mẫu. Compose lấy cấu hình mặc định từ `studynest_be/.env.development.example` và đọc thêm `studynest_be/.env.docker.local` nếu có.

## Hot reload trên máy và chạy test

Dùng Node.js 20.9+, pnpm và Python 3.11. Từ thư mục gốc:

```bash
cp -n studynest_be/.env.development.example studynest_be/.env.development
cp -n studynest_be/.env.test.example studynest_be/.env.test
cp -n studynest_fe/.env.development.example studynest_fe/.env.development
make dev-up
cd studynest_be
python3.11 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd ..
make dev-migrate
(cd studynest_be && APP_ENV=development .venv/bin/python scripts/seed_catalog_v2.py)
(cd studynest_be && APP_ENV=development .venv/bin/python scripts/install_piston_runtimes.py)
```

Chạy `APP_ENV=development .venv/bin/python -m uvicorn app.main:app --reload --port 8000` trong thư mục `studynest_be`. Trong terminal khác, vào `studynest_fe` và chạy `pnpm install --frozen-lockfile` rồi `pnpm dev`. Cấu hình mẫu cho hot reload dùng web `3000` và API `8000`. Nếu các cổng này đang được dùng, chọn cổng trống và cập nhật URL frontend, backend, WebSocket và CORS tương ứng.

```bash
make dev-up        # bật hạ tầng dev
make dev-migrate   # BẮT BUỘC sau dev-up lần đầu: db.sql là snapshot cũ, cần Alembic lên schema mới nhất
make dev-reset     # xóa dữ liệu dev (không đụng prod)
APP_ENV=test pytest
make prod-config   # kiểm tra compose prod
make prod-up       # có bước xác nhận
```

## Chuyển dữ liệu dev cũ (tùy chọn)

Stack dev mới có DB trống (nạp từ `db.sql`). Nếu cần dữ liệu hiện có làm dữ liệu dev:

```bash
docker exec studynest_db pg_dump -U admin studynest | \
  docker exec -i maymay-dev-db psql -U maymay_dev -d studynest_dev
```

## Việc còn lại cần bạn làm

- Tạo key dev riêng: Google OAuth client, PayPal sandbox app, bucket R2 `studynest-dev`/`studynest-test`, key AI dev. Điền vào `.env.development`.
- Xóa `studynest_be/.env` cũ sau khi chắc chắn `.env.development`/`.env.production` đủ dùng.
- `studynest_fe/Dockerfile` còn default `NEXT_PUBLIC_PAYPAL_CLIENT_ID` và `NEXT_PUBLIC_URL_GOOGLE_LOGIN` cố định; nên truyền rõ qua build args theo môi trường.

## Đối chiếu với tài liệu chính thức (kiểm tra ngày 2026-11-26)

- **PayPal**: sandbox `https://api-m.sandbox.paypal.com`, live `https://api-m.paypal.com`; credential sandbox và live là hai bộ khác nhau. Khớp với cấu hình.
- **Next.js**: thứ tự ưu tiên `process.env` > `.env.<NODE_ENV>.local` > `.env.local` > `.env.<NODE_ENV>` > `.env`. `NEXT_PUBLIC_*` bị nhúng vào bundle lúc `next build`, nên prod phải truyền qua build args (compose đã làm). `.env.local` chặn mọi file khác nên đã đổi thành `.env.production.local`.
- **Cloudflare R2**: tên bucket 3–63 ký tự, chữ thường/số/gạch ngang. `studynest-dev`, `studynest-test` hợp lệ; tên phải duy nhất trong account.
- **Gemini embedding**: `gemini-embedding-001` hỗ trợ 128–3072 chiều, khuyến nghị 768/1536/3072; chiều khác 3072 phải tự chuẩn hóa vector. 1536 hợp lệ và `embedding.py` đã chuẩn hóa.
- **pydantic-settings**: `env_file` nhận nhiều file, file sau ghi đè file trước. Code hiện chỉ nạp một file theo `APP_ENV`.
- **DashScope**: key Singapore và Beijing khác nhau; model `qwen3.8-omni-flash-realtime` yêu cầu domain theo workspace thay vì `dashscope-intl`. Cần kiểm tra lại `DASHSCOPE_WS_URL` (xem cảnh báo ở trên).
