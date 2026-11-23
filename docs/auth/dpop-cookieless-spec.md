# Đăng nhập không cookie: token ngắn hạn + DPoP (hợp đồng BE ⇄ FE)

Mục tiêu: trình duyệt KHÔNG dùng cookie phiên. Token bị đánh cắp (XSS, log, mạng) phải vô dụng nếu không có khóa riêng không-trích-xuất-được nằm trong trình duyệt. Không có "bảo mật tuyệt đối"; đây là lớp phòng thủ nhiều tầng.

## Thành phần
1. **Khóa phiên (client)**: cặp khóa ECDSA P-256, `extractable:false` (WebCrypto), lưu `CryptoKey` trong IndexedDB. Không bao giờ rời trình duyệt. Mỗi đăng nhập tạo khóa mới.
2. **DPoP proof (client → mọi request có xác thực)**: header `DPoP: <JWT>`; JWT header `{typ:"dpop+jwt", alg:"ES256", jwk:<public JWK>}`; payload `{htm, htu, iat, jti, ath?}`.
   - `htm` = HTTP method viết hoa; `htu` = URL tuyệt đối đích, KHÔNG gồm query/fragment.
   - `iat` giây UNIX; server chấp nhận lệch ±60s. `jti` ngẫu nhiên ≥128 bit.
   - `ath` = base64url(SHA-256(access_token)) — BẮT BUỘC khi request mang access token; KHÔNG có ở /login, /google, /refresh (refresh dùng `rth` xem dưới).
3. **Access token**: JWT sống ngắn (`ACCESS_TOKEN_EXPIRE_MINUTES`, mặc định 10), claim `sid` (session id) và `cnf:{jkt}` = base64url(SHA-256 của JWK thumbprint RFC 7638 của khóa public). Gửi bằng `Authorization: DPoP <token>` (kèm header `DPoP`).
4. **Refresh token**: chuỗi ngẫu nhiên không rõ nghĩa, hash lưu DB (đã có `Sessions.refresh_token_hash`), thêm cột `dpop_jkt` (gắn với khóa phiên). Xoay vòng MỖI lần refresh. Gửi trong BODY JSON `{refresh_token}` của POST /auth/refresh cùng header `DPoP` (proof có `rth` = base64url(SHA-256(refresh_token)) thay cho `ath`) — KHÔNG bao giờ trong cookie/URL.
5. **Phát hiện tái sử dụng refresh**: giữ hash refresh cũ trong `previous_refresh_hash` + `previous_rotated_at`. Dùng lại refresh bound đã xoay sau 15 giây với proof của đúng khóa ⇒ thu hồi session, trả 401 `session_revoked`. Retry dùng cùng `operation_id` xem bên dưới. Với legacy unbound, token cũ bị từ chối và phiên vẫn hoạt động.
6. **Chống phát lại**: `jti` của proof lưu Redis `auth:dpop:jti:<jti>` TTL 120s; trùng ⇒ 401 `invalid_dpop_proof`. Nếu Redis lỗi, mặc định fail-closed. Cờ opt-in chỉ áp dụng cho GET được đánh dấu chỉ đọc và không nhạy cảm.
7. **WebSocket**: không dùng cookie/query token. Sau khi mở kết nối, client gửi frame đầu `{"type":"auth","token":<access>,"dpop":<proof với htm:"GET", htu:<ws url chuyển ws→http(s) không query>, ath>}`; server xác thực trong ≤5s và gửi `{"type":"auth_ok"}` trước dữ liệu khác. Lỗi xác thực đóng 4401, auth frame quá 8 KiB đóng 1009.
8. **Cache**: mọi response chứa token phải có `Cache-Control: no-store`.

## Endpoint (prefix /api/v1/auth)
- `POST /login`, `POST /google`, `POST /register-flow-nào-trả-token`: nếu request có header `DPoP` hợp lệ ⇒ chế độ DPoP: KHÔNG `Set-Cookie`, trả `{access_token, refresh_token, token_type:"DPoP", expires_in, session_id, expired_at}`; gắn `jkt` của proof vào session + vào `cnf`.
- `POST /refresh`: body `{refresh_token}` + header `DPoP` (rth). Kiểm `jkt` proof == `Sessions.dpop_jkt`. Trả cặp token mới. Client có thể gửi `operation_id` là UUID giữ nguyên theo thao tác để retry với proof mới tối đa 5 phút, nếu successor còn hiện hành.
- `POST /logout`: yêu cầu xác thực DPoP; thu hồi session; (chế độ cookie: xóa cookie như cũ).
- `GET /me`: xác thực như mọi API.
- Lỗi: 401 kèm `WWW-Authenticate: DPoP error="invalid_token"|"invalid_dpop_proof"|"use_dpop_proof"` và body `{detail, code}` với `code ∈ {invalid_token, invalid_dpop_proof, session_revoked, token_expired}`; client chỉ refresh khi `code=token_expired`.

## Tương thích (cờ cấu hình, mặc định an toàn cho giai đoạn chuyển đổi)
- `AUTH_ALLOW_COOKIE_COMPAT` (mặc định true; mục tiêu cuối false): còn chấp nhận cookie `access_token`/`refresh_token` như cũ cho web cũ.
- `AUTH_ALLOW_UNBOUND_BEARER` (mặc định true): `Authorization: Bearer` không `cnf` (mobile hiện tại) vẫn hoạt động. Token CÓ `cnf` thì BẮT BUỘC kèm DPoP proof hợp lệ; thiếu ⇒ 401.
- Đặt cờ `false` khi FE đã chuyển xong.

## Tầng bảo vệ bổ sung (FE)
CSP nghiêm (script-src không 'unsafe-inline' nếu khả thi, nonce), không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng, Trusted Types nếu khả thi, `Referrer-Policy: no-referrer`, token không bao giờ vào URL/log/Sentry/localStorage. Access token chỉ ở bộ nhớ (module closure); refresh token chỉ ở bộ nhớ + IndexedDB **được mã hóa bằng khóa không-trích-xuất** hoặc chỉ bộ nhớ nếu chấp nhận đăng nhập lại khi tải lại tab (xem phần FE).
