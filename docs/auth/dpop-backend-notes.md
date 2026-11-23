# DPoP trên StudyNest Backend

Đặt `PUBLIC_API_URL` thành origin công khai mà client ký trong `htu`, gồm scheme và port nếu khác mặc định. Khi để trống, backend dùng `BACKEND_URL`. HTTP và WebSocket dùng cùng origin, với `ws` và `wss` tương ứng `http` và `https`. Bộ xác minh dùng đường dẫn ASGI và bỏ query. Nếu proxy loại prefix công khai khỏi đường dẫn ASGI, đặt `DPOP_STRIPPED_PUBLIC_PATH_PREFIX` thành prefix đã bị loại. Để trống nếu ASGI đã nhận đường dẫn công khai đầy đủ. Backend bỏ qua `Host` và các header chuyển tiếp khi dựng `htu`.

| Cấu hình | Mặc định | Hành vi |
|---|---:|---|
| `AUTH_ALLOW_COOKIE_COMPAT` | `True` | Phát và đọc cookie legacy, bật CORS credentials cho các origin đã cấu hình. |
| `AUTH_ALLOW_UNBOUND_BEARER` | `True` | Cho phép JWT không có `cnf` qua Bearer, refresh unbound trong JSON và token WebSocket legacy trên URL. |
| `AUTH_INTERNAL_REFRESH_SECRET` | Trống | Cho phép Next gọi refresh cookie server-to-server khi thiếu cả `Origin` và `Referer`. Dùng bí mật ngẫu nhiên có ít nhất 32 ký tự và gửi trong `X-Auth-Internal-Refresh`. Chỉ đặt bí mật phía server. |
| `DPOP_STRIPPED_PUBLIC_PATH_PREFIX` | Trống | Prefix đường dẫn công khai đã bị proxy loại, ví dụ `/edge`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10` | Thời hạn access token mới. |
| `DPOP_IAT_LEEWAY_SECONDS` | `60` | Cửa sổ chấp nhận `iat` theo hai chiều. |
| `DPOP_JTI_TTL_SECONDS` | `120` | TTL chống phát lại ít nhất bằng hai lần leeway. |
| `DPOP_JTI_FAIL_OPEN_ON_GET` | `False` | Chỉ áp dụng cho GET công khai hoặc không nhạy cảm, chỉ đọc, được đánh dấu tường minh bằng `get_current_identity(allow_read_fallback=True)`. Hiện chưa có route production dùng tùy chọn này. |

## Auth, OTP và refresh

- Bảo vệ mọi `POST`, `PUT`, `PATCH`, `DELETE` xác thực bằng cookie bằng `Origin` thuộc allowlist, hoặc origin của `Referer` khi không có `Origin`. Kiểm cả refresh cookie. Next middleware hiện cần gửi header bí mật trên request refresh nội bộ, hoặc chuyển sang chế độ DPoP. Nếu chưa tích hợp header, refresh cookie server-to-server thiếu origin trả 403. Cấu hình proxy bỏ header nội bộ từ lưu lượng công khai trước khi chuyển tiếp.
- `/register` giữ hash mật khẩu trong challenge `verify-email`. Đăng ký lại tài khoản chưa xác minh thay challenge và xóa mật khẩu cũ. `/verify-email` tiêu thụ challenge rồi mới kích hoạt mật khẩu. Request có thể gửi `new_password` để chọn mật khẩu ngay khi xác minh. `/refesh-email` thay challenge và bỏ hash cũ. Sau resend, client gửi `new_password` để có thể đăng nhập bằng mật khẩu về sau. Client hiện chỉ gửi email và mã vẫn xác minh và nhận phiên, sau đó có thể dùng đăng nhập OTP trên client có hỗ trợ. Luồng OTP đăng nhập yêu cầu tài khoản đã xác minh, với `purpose: "login"` hoặc alias mobile `"authenticate"`.
- Mỗi OTP còn hiệu lực 10 phút. Redis giới hạn phát theo IP và tài khoản, tối đa một lần/phút cho mỗi mục đích và năm lần/giờ cho mỗi email. Xác minh có tối đa năm lượt/challenge, ngân sách riêng theo tài khoản và IP cùng backoff tăng dần. Khi Redis lỗi, OTP trả 503. Dùng IP từ ASGI và chỉ cấu hình forwarded headers từ proxy tin cậy.
- `/login`, `/google`, `/verify-email` và `/verify-otp` phát phiên bound khi proof hợp lệ. `/logout` thu hồi SID của access token đã xác thực. Auth và refresh từ chối tài khoản đã xóa (401) hoặc bị khóa (403). Đường đăng nhập mật khẩu tiếp tục trả thông tin trạng thái cho người dùng đã xác thực mật khẩu.
- Refresh DPoP dùng JSON `{refresh_token}` và proof với `rth`. Khi cả JSON và cookie cùng hiện diện, JSON được ưu tiên. Refresh unbound từ JSON cần `AUTH_ALLOW_UNBOUND_BEARER`, refresh unbound từ cookie cần `AUTH_ALLOW_COOKIE_COMPAT`. Response unbound phát cookie nếu bật cookie compat.
- Retry trong 15 giây có thể nhận lại successor đang còn hiệu lực. Redis giữ AES-GCM ciphertext với khóa HKDF dẫn xuất từ `SECRET_KEY` (fallback `JWT_SECRET`) và xác thực cache key. Đồng bộ khóa trên worker. Sau 15 giây, chỉ reuse được chứng minh bằng đúng khóa DPoP mới thu hồi phiên. Token cookie liền trước bị từ chối và response không xóa cookie successor của tab khác.
- Client DPoP có thể gửi thêm `operation_id` là UUID ổn định cho một lần xoay. Giữ ID trước lần gửi đầu rồi dùng lại với proof mới khi retry. Backend lưu kết quả mã hóa và lịch sử hash trong cùng transaction với rotation. Cùng thao tác phục hồi refresh successor trong 5 phút nếu successor vẫn hiện hành. Khi hết cửa sổ hoặc successor đã xoay, backend trả 401 `invalid_token`. Khóa ngoại dọn lịch sử hash khi xóa phiên. Nếu giữ các row phiên hết hạn để tra cứu, dọn lịch sử của chúng theo batch trong job bảo trì DB. Lịch sử bắt đầu từ những lần xoay sau deploy. Các phiên cũ vẫn dùng hash liền trước đã có trong row.
- Redis lỗi khi kiểm JTI, lấy khóa refresh hoặc đọc grace trả 503. Backend kiểm proof và giải chuỗi grace trước khóa DB, rồi kiểm lại tài khoản, SID, binding và hash. Access API nhạy cảm như `/auth/me` luôn fail-closed. Tất cả response cấp token đặt `Cache-Control: no-store`.

| Body `code` (HTTP 401) | `WWW-Authenticate` |
|---|---|
| `invalid_token` | `DPoP error="invalid_token"` |
| `invalid_dpop_proof` | `DPoP error="invalid_dpop_proof"` hoặc `DPoP error="use_dpop_proof"` khi thiếu proof hoặc gửi sai scheme |
| `session_revoked` | `DPoP error="invalid_token"` |
| `token_expired` | `DPoP error="invalid_token"`. Đây là mã duy nhất để tự động refresh. |

## WebSocket và GitHub

- Các WebSocket DPoP đợi tối đa 5 giây cho frame `auth` và trả `{"type":"auth_ok"}` ngay khi hoàn tất xác thực, trước frame dữ liệu hoặc media. Frame auth quá 8 KiB đóng 1009 trước khi parse JSON. Lỗi xác thực đóng 4401. Đặt thêm trần message ở transport để giới hạn cấp phát bộ nhớ trước parser, ví dụ `--ws-max-size 32768` khi dùng Uvicorn websockets, sau khi kiểm với audio và ingress thực tế.
- Gamification kiểm SID, thời hạn và role trên task riêng mỗi 15 giây hoặc khi access token tới hạn. Voice và dictation DPoP dùng frame trực tiếp. Vé voice legacy là AES-GCM ciphertext chứa định danh phiên, nguồn credential và hạn access, đổi một lần bằng `GETDEL`. Vé voice cũ hết hiệu lực khi rollout. Cookie WebSocket cần Origin trong allowlist. Token Bearer trong URL chỉ dành cho client legacy.
- GitHub sign-in DPoP dùng `POST /auth/github/start` với proof và PKCE challenge, rồi `POST /auth/github/exchange` với proof, mã một lần và verifier. Callback OAuth dùng URL GitHub đã cấu hình. Đặt `FRONTEND_URL` đúng origin mở OAuth. State giữ 10 phút, quyền đổi mã giữ 60 giây. Hai endpoint POST giới hạn 120 yêu cầu/phút/IP cho mỗi endpoint.
- Luồng **liên kết repository** dùng `POST /agent/github/connect`. Callback DPoP gửi `postMessage` với `{type:"hannes:github-link-pending", handle}` cho opener ở `FRONTEND_URL`. Opener kiểm origin và cửa sổ nguồn, sau đó gọi `POST /agent/github/finish` với JSON `{handle}` và proof của cùng SID và khóa. Handle dùng một lần và hết hạn sau 60 giây. Callback cookie legacy hoàn tất trực tiếp bằng session đã khởi tạo.
- Bỏ query khỏi access log WebSocket và callback tại CDN, reverse proxy và frontend. ASGI lọc credential query kể cả tên percent-encoded và che code, state cùng handle trên callback GitHub. Nếu tầng quan sát thu thập payload hoặc header, lọc `authorize_url`, `Location`, handle và credential auth.

## Migration và triển khai

Triển khai worker auth đồng bộ sau khi schema lên head `ad78tu012q345`. Revision `ab56rs890n123` thêm mục đích OTP và mật khẩu chờ. OTP chưa có mục đích cần xin cấp lại. Revision `ac67st901p234` thêm lịch sử refresh và revision `ad78tu012q345` tạo các index phiên còn thiếu trong autocommit bằng `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.

Production đã áp dụng `y23op567k890` có thể tiếp tục từ revision hiện hành. Trên DB lớn chưa áp dụng revision đó, các lệnh sau thay cho phần upgrade của revision gốc. Chỉ thực hiện từ revision ngay trước nó (`x12no456j789`). Với schema đã thay đổi một phần, kiểm tra cấu trúc và tính hợp lệ của index trước khi chọn cách tiếp tục.

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE public.sessions
    ADD COLUMN dpop_jkt varchar,
    ADD COLUMN previous_refresh_hash text,
    ADD COLUMN previous_rotated_at timestamptz;
COMMIT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sessions_dpop_jkt
    ON public.sessions (dpop_jkt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_previous_refresh_hash
    ON public.sessions (previous_refresh_hash);
```

Chạy từng lệnh `CREATE INDEX CONCURRENTLY` ngoài transaction. Nếu build bị gián đoạn, kiểm tra `pg_index.indisvalid` cùng định nghĩa index. Xóa index lỗi bằng `DROP INDEX CONCURRENTLY` và tạo lại. Khi ba cột và hai index hợp lệ đã khớp revision gốc, stamp riêng `y23op567k890`, rồi áp dụng các revision sau. Trước downgrade, dừng cấp phiên bound, dừng worker phụ thuộc schema và thu hồi các phiên bound. Tắt cookie compat và Bearer legacy theo tiến độ di chuyển client.
