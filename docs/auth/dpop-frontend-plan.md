# Giai đoạn 2 — Frontend đăng nhập không cookie (DPoP) — kế hoạch & hợp đồng module

Tham chiếu giao thức: `docs/auth/dpop-cookieless-spec.md`, ghi chú backend: `docs/auth/dpop-backend-notes.md` (đọc cả hai trước khi làm).

## Nguyên tắc
- Cờ `NEXT_PUBLIC_AUTH_MODE = "cookie" | "dpop"` (mặc định `cookie` ⇒ app chạy y như cũ). Mọi thay đổi PHẢI chạy đúng ở CẢ HAI chế độ.
- Trang server hiện tại dùng `const store = await cookies(); fetcher(path, store)` ⇒ KHÔNG xác thực được khi không còn cookie. Cách chuyển: biến phần tải dữ liệu thành client-side (SWR + axios `api`), giữ nguyên component hiển thị. Cách này tự chạy cả hai chế độ (cookie mode: axios `withCredentials` như cũ).
- Token KHÔNG BAO GIỜ: vào URL, localStorage/sessionStorage, console/log/Sentry, props truyền từ server. Access token chỉ ở bộ nhớ (biến module). Refresh token + khóa phiên (CryptoKey non-extractable) ở IndexedDB (refresh token vô dụng nếu thiếu khóa vì đã gắn jkt).
- Đa tab: dùng `navigator.locks.request("maymay-auth-refresh", ...)` để single-flight refresh giữa các tab; backend có ân hạn 15s cho xoay vòng.

## Hợp đồng module (TẠO ĐÚNG đường dẫn/chữ ký này — các agent khác lập trình dựa trên nó)
`src/lib/auth/mode.ts`
- `export type AuthMode = "cookie" | "dpop"; export const AUTH_MODE: AuthMode; export const isDpopMode: boolean;`
`src/lib/auth/dpop.ts`
- `ensureSessionKey(): Promise<CryptoKeyPair>` (ECDSA P-256, extractable:false, lưu IndexedDB DB "maymay-auth" store "keys")
- `createDpopProof(opts:{method:string; url:string; accessToken?:string; refreshToken?:string}): Promise<string>` (htu = URL tuyệt đối bỏ query/fragment, iat giây, jti 128-bit ngẫu nhiên, `ath` khi có accessToken, `rth` khi có refreshToken; JWT ES256 chữ ký dạng r||s 64 byte; header {typ:"dpop+jwt",alg:"ES256",jwk})
- `rotateSessionKey(): Promise<CryptoKeyPair>` (tạo khóa MỚI mỗi lần đăng nhập), `clearSessionKey(): Promise<void>`
`src/lib/auth/session.ts`
- `getAccessToken(): string | null`
- `setSession(t:{access_token:string; refresh_token:string; expires_in?:number}): Promise<void>` (access → bộ nhớ; refresh → IndexedDB)
- `clearSession(): Promise<void>` (xóa bộ nhớ + IndexedDB token + khóa)
- `refreshSession(): Promise<boolean>` (single-flight + navigator.locks; POST /auth/refresh body {refresh_token} + header DPoP(rth); thành công ⇒ setSession; 401 code session_revoked/invalid ⇒ clearSession + phát sự kiện đăng xuất; lỗi mạng/5xx ⇒ KHÔNG xóa phiên, trả false)
- `bootstrapSession(): Promise<boolean>` (gọi khi tải trang: nếu có refresh token trong IndexedDB ⇒ refreshSession). AuthBootstrap dùng kết quả chi tiết để hiển thị hành động thử lại khi dịch vụ gián đoạn.
- `onSessionEvent(cb:(e:{type:"login"|"logout"|"refreshed"})=>void): () => void` (BroadcastChannel "maymay-auth" đồng bộ giữa tab)
`src/lib/utils/fetcher/client/axios.ts` (đã có; GIỮ default export `api` và mọi API cũ)
- dpop mode: request interceptor gắn `Authorization: DPoP <access>` và `DPoP` cho rewrite hoặc origin API đã cấu hình. Proof ký URL công khai bỏ query/fragment. Axios bỏ cookie và chặn redirect. HTTP 401 với `token_expired` cho phép refresh và gửi lại một lần. HTTP 401 với `invalid_token` hoặc `session_revoked` kết thúc phiên tương ứng. Cookie mode dùng luồng cũ.
- `export async function authedFetch(input: string, init?: RequestInit): Promise<Response>` cùng logic (dùng cho stream/SSE/fetch thô).
`src/lib/auth/ws.ts`
- `openAuthedWebSocket(url:string, opts?:{protocols?:string|string[]}): Promise<WebSocket>`: cookie mode ⇒ hành vi cũ; dpop mode ⇒ mở WS KHÔNG token trên URL, gửi frame đầu `{"type":"auth","token":<access>,"dpop":<proof htm:"GET", htu:URL http(s) bỏ query, ath>}`, chờ server xác nhận theo `docs/auth/dpop-backend-notes.md`, reject nếu 4401.
`src/hooks/auth/useAuthedSWR.ts`
- `useAuthedSWR<T>(path: string | null, options?: SWRConfiguration): SWRResponse<T>` dùng `api`; chờ `bootstrapSession()` xong mới fetch (state `authReady`); không fetch khi path=null.
- `useAuthReady(): boolean`
`src/components/auth/AuthBootstrap.tsx` ('use client'): gọi bootstrapSession một lần ở root layout, đồng bộ `useUserStore` (user từ GET /auth/me), lắng nghe sự kiện login/logout giữa các tab.
`src/components/auth/RequireAuth.tsx` ('use client'): `<RequireAuth roles?: ("USER"|"LECTURER"|"ADMIN")[] fallback?>`: đợi authReady; chưa đăng nhập ⇒ `router.replace('/login?redirect=…')`; sai vai trò ⇒ redirect như middleware hiện tại đang làm (đọc middleware.ts để giữ ĐÚNG quy tắc điều hướng theo vai trò); hiển thị skeleton trong lúc chờ (không nháy nội dung bảo vệ).
`src/lib/auth/logout.ts`: `logoutEverywhere()` gọi POST /auth/logout (đã xác thực) rồi clearSession + clear store + phát sự kiện.

## Chia việc (Giai đoạn 2A song song → 2B song song)
2A-1 CORE: src/lib/auth/*, axios.ts, refresh-session.ts, chat-stream/chat-events, luồng đăng nhập/đăng ký/Google/GitHub/OTP (các file login/register/email_authentication + hook/service gọi API auth), logout, user-loader, user store bootstrap.
2A-2 INFRA: hooks/auth/*, components/auth/*, middleware.ts (dual-mode), layouts bảo vệ (user/lecturer/admin/learning), websocket + providers (notification-ws, NotificationHydrator, hooks/websocket/*), root layout gắn AuthBootstrap.
2A-3 HARDENING: next.config (security headers + CSP Report-Only), kiểm kê dangerouslySetInnerHTML/XSS, Sentry/log scrubbing, tài liệu vận hành.
2B-1/2/3 CONVERT TRANG: user+share / lecturer / admin: mọi page.tsx còn dùng `cookies()`/`fetcher(…, store)` ⇒ chuyển sang client fetching với `useAuthedSWR` (giữ component hiển thị, giữ UI/UX, thêm skeleton/lỗi/Thử lại).
