# 📦 StudyNest Ecosystem Monorepo - Backend, Web Client & Mobile App

![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-Web_Client-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-Mobile_App-000000?style=for-the-badge&logo=expo&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

Monorepo chứa toàn bộ mã nguồn của hệ sinh thái học tập **StudyNest**, bao gồm 3 dự án thành phần hợp nhất trong một kho lưu trữ duy nhất.

---

## 📂 Cấu Trúc Thư Mục Monorepo

```
hoctap/
├── studynest_be/       # FastAPI Python REST API & Docker Compose
├── studynest_fe/       # Web Client Next.js & Online Code Editor CodeMirror
├── db.sql             # Database đầy đủ, gồm gamification
└── mobile/             # Mobile Application Expo React Native (iOS & Android)
```

---

## 🚀 Khởi Chạy Từng Dự Án

Yêu cầu: Node.js 20.9 trở lên, pnpm, Python 3.11 và OrbStack đang chạy.

### 1. Cấu hình local lần đầu

Chạy từ thư mục gốc. Chỉ copy file mẫu nếu chưa có file cấu hình:

```bash
cp -n studynest_be/.env.example studynest_be/.env
cp -n studynest_fe/.env.example studynest_fe/.env.local
cp -n mobile/.env.example mobile/.env
```

Thay `JWT_SECRET` trong `studynest_be/.env` bằng chuỗi ngẫu nhiên.

### 2. Khởi chạy database, Redis, email local và trình chạy code

```bash
cd studynest_be
docker compose up -d --wait
```

Compose khởi tạo database từ `db.sql` ở thư mục gốc khi volume còn trống.
Dump đã có migration gamification; không cần chạy lại migration này sau import.

| Dịch vụ | Địa chỉ local |
| --- | --- |
| PostgreSQL + pgvector | `127.0.0.1:5433` |
| Redis | `127.0.0.1:6379` |
| Mailpit SMTP | `127.0.0.1:1025` |
| Hộp thư email/OTP | http://localhost:8025 |
| Piston API | http://localhost:4000 |

Mailpit giữ email trên máy để thử đăng ký/OTP, không gửi đến hộp thư thật.
### 3. Khởi chạy Backend API

```bash
cd studynest_be
uv venv .venv --python 3.11
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m alembic upgrade head
.venv/bin/python scripts/install_piston_runtimes.py
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger: http://localhost:8000/docs. Health check: http://localhost:8000/health.
Script Piston cài runtime theo dữ liệu bài học và bỏ qua runtime đã có.

### 4. Khởi chạy Web Client (terminal khác)

```bash
cd studynest_fe
pnpm install --frozen-lockfile
pnpm dev
```

Web: http://localhost:3000. Build production: `pnpm build`.

### 5. Khởi chạy Mobile App (terminal khác)

```bash
cd mobile
pnpm install --frozen-lockfile
pnpm dev
```

Lệnh dev cập nhật IP LAN và trỏ API đến cổng `8000`; điện thoại cần cùng mạng với máy.
Để dùng tunnel ngrok đã cấu hình tài khoản, chạy `pnpm dev:tunnel`.
Các module native như Rive cần development build; bundle JavaScript thành công
chưa thay thế việc kiểm tra ứng dụng trên thiết bị hoặc simulator.

### 6. Key dịch vụ ngoài (điền sau)

- Chat AI: đặt `LLM_PROVIDER=9router`, `NINEROUTER_BASE_URL=https://9router.itup.io.vn/v1`,
  `NINEROUTER_API_KEY` và `NINEROUTER_MODEL=gemini` trong `studynest_be/.env`.
  Model có thể đổi theo danh sách `/v1/models` của server 9Router.
  Trong **Admin → Cài đặt → AI · 9Router**, bấm **Kết nối lại / Tải model** để
  lấy danh sách mới, chọn model và **Lưu cấu hình AI**. Lựa chọn được lưu trong
  database và áp dụng từ yêu cầu AI tiếp theo trên các backend worker.
  **Auto** dùng combo `mixed` của 9Router để tự chuyển model theo cấu hình của nhóm;
  có thể đổi tên nhóm Auto bằng `NINEROUTER_AUTO_MODEL` trong `.env`.
  Key chỉ nằm ở backend, không đưa vào biến `NEXT_PUBLIC_*` hoặc `EXPO_PUBLIC_*`.
- Stream cho toàn bộ chat: `NINEROUTER_STREAM=True`. Web và mobile gửi
  `stream: true` tới `/chat-sql/complete` và `/tutor-chat/lessons/{id}/chat`.
  Backend trả SSE gồm `delta`, `done` (kết quả đã lưu) hoặc `error`; không tự
  gửi lại yêu cầu khi luồng đã trả một phần nội dung. Client cũ không gửi
  `stream` vẫn nhận JSON như trước. Các tác vụ JSON/SQL nội bộ gom đủ stream
  trước khi phân tích, không hiển thị dữ liệu nội bộ ra màn chat.
- Trợ giảng luôn nhận tên bài, khóa học và tối đa 6 lượt hội thoại gần nhất.
  Lời chào không gọi embedding; câu hỏi kiến thức và câu hỏi tiếp nối truy xuất
  lại nội dung gốc trong phạm vi đang chọn. Log `Tutor retrieval` ghi mode,
  phạm vi và số nguồn tìm được. Các trích dẫn được đối chiếu với nguồn thực tế.
- Embedding dùng **Gemini trực tiếp với key riêng**, không đi qua 9Router:
  `EMBEDDING_PROVIDER=gemini`, `EMBEDDING_MODEL=gemini-embedding-001`,
  `EMBEDDING_DIMENSIONS=1536`, `GOOGLE_API_KEY=...`.
  Gemini hỗ trợ giảm từ 3072 xuống 1536 chiều; backend chuẩn hóa L2.
  Tài liệu dùng `RETRIEVAL_DOCUMENT`, câu hỏi tìm kiếm dùng `RETRIEVAL_QUERY`.
  Khi thay model embedding, sao lưu database rồi chạy
  `.venv/bin/python scripts/reindex_embeddings.py --backup backups/<backup>.dump`.
  Chỉ reindex khi key/project Google đã hoạt động. Lỗi `CONSUMER_SUSPENDED`
  cần một project được Google khôi phục hoặc key từ project khác.
  Phân tích video trực tiếp bằng Gemini cũng cần `GOOGLE_API_KEY`.
  Để dùng lại chat Gemini trực tiếp, đặt `LLM_PROVIDER=gemini` và điền `GOOGLE_API_KEY_CHAT`.
- Google Login: client ID trong backend, `NEXT_PUBLIC_URL_GOOGLE_LOGIN` của web
  (biến này chứa client ID), và `EXPO_PUBLIC_GOOGLE_CLIENT_ID` của mobile.
  Web và backend cần dùng cùng Web OAuth client ID. Trong Google Cloud Console →
  Google Auth Platform → Clients → Web client → **Authorized JavaScript origins**,
  thêm `http://localhost` và `http://localhost:3000`; thêm `http://127.0.0.1:3000`
  nếu truy cập bằng địa chỉ đó. Không thêm đường dẫn `/login` vào origin.
  Lỗi `The given origin is not allowed for the given client ID` cần sửa tại Console;
  điền client secret vào `.env` không thay đổi danh sách origin này.
- Upload file: hỗ trợ `STORAGE_PROVIDER=r2` hoặc `google_drive`. Xem
  [hướng dẫn cấu hình R2](docs/r2-setup.md). File mới dùng provider đã chọn;
  link Drive cũ được giữ nguyên. Kiểm tra R2 bằng
  `.venv/bin/python scripts/check_r2.py` trong thư mục backend.
- Drive cũ/YouTube: file OAuth `studynest_be/app/core/secret/client_secret.json`;
  lần xác thực đầu sẽ tạo `token.json`. Cấu hình thêm `GOOGLE_ROOT_FOLDER_ID`.
- PayPal sandbox: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` của backend và
  `NEXT_PUBLIC_PAYPAL_CLIENT_ID` của web.

Khởi động lại các server sau khi đổi `.env`. Các file secret đã được bỏ qua bởi Git.

---

## 👨‍💻 Tác Giả

**Nguyễn Xuân Huỳnh** — [GitHub Profile](https://github.com/nguyenhuynhdt37)
