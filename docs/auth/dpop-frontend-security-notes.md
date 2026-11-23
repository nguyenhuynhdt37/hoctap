# Ghi chú bảo mật frontend DPoP

Access token DPoP gắn với khóa phiên và refresh token bị ràng buộc với cùng khóa. Sao chép chuỗi token sang máy khác chưa đủ để tạo proof mới khi khóa riêng WebCrypto là non-extractable. XSS chạy trong cùng origin vẫn có thể gọi bộ ký ngay trên trình duyệt, đọc dữ liệu phiên đang sử dụng, gửi dữ liệu ra ngoài hoặc thao tác với quyền người dùng. Nếu mã độc còn tồn tại trong origin, nó có thể tiếp tục dùng khóa ở đó. DPoP giảm khả năng mang token sang môi trường khác để dùng lại. Khi còn hỗ trợ cookie và Bearer legacy, các luồng đó có mô hình rủi ro riêng.

## Kết quả kiểm kê frontend

| Bề mặt | Kết quả |
| --- | --- |
| Markdown và HTML hiển thị | Bình luận, mô tả khóa học, bài học, đánh giá, nội dung AI và chat viết qua MarkdownRenderer đi qua allowlist `sanitize-html` trên cả SSR và client. Bản xem trước quiz tạo/sửa dùng cùng renderer thuần. HTML bị lỗi parser được escape thành chữ. |
| Trình soạn thảo | Tiptap lọc HTML thô, HTML sinh từ Markdown và HTML dán trước khi parse. Phần gạch chân escape nội dung. RichTextEditor lọc HTML nhận qua prop và callback. Đoạn code dùng `textContent`, và thao tác tạo link giới hạn scheme. Allowlist cho editor giữ các giá trị căn lề hữu hạn, markup task list và data URL chỉ cho một số định dạng ảnh raster. |
| Script và iframe | `dangerouslySetInnerHTML` còn lại tại root là script tĩnh dọn thuộc tính extension. Các sink nội dung còn lại nhận HTML đã lọc. Không thấy `eval()`, `new Function`, `document.write` hay `srcdoc` chạy trực tiếp trong mã frontend được rà. Nhãn ngôn ngữ `javascript:` là key tĩnh. Preview khóa học chỉ dựng URL embed HTTPS từ video ID YouTube hợp lệ. |
| Chuyển hướng | `/transaction` đọc query theo `URLSearchParams` và qua `sanitizeRedirect`. Đích hợp lệ là đường dẫn gốc nội bộ. Query hay hash mang tên credential trực tiếp bị từ chối. Các producer giao dịch đóng gói đích thành một tham số có encoding. Lộ trình, combo và tính năng lưu giảng viên kiểm tra URL hiện tại trước khi chuyển nó vào query đăng nhập. |
| Console và Sentry | Bỏ log URL đầy đủ của fetcher server, log Axios response đầy đủ và dữ liệu hồ sơ ở màn hình admin cập nhật người dùng, log URL upload và lỗi upload thô của RichTextEditor, cùng lỗi Axios thô khi lưu giảng viên. Không thấy SDK hay cấu hình Sentry trong frontend. Axios DPoP đang được cập nhật để cắt request và header khỏi lỗi trả cho caller. Các nơi log trong luồng auth và WebSocket cần được xác nhận khi tích hợp. |
| Web Storage | Không thấy access token hay refresh token được ghi vào localStorage/sessionStorage trong mã đã rà. Có `pending_verify_email` chứa email tại login. Các mục khác được thấy là tùy chọn sidebar, trạng thái đã xem tour và khóa idempotency giỏ combo. |

## Việc cần phối hợp trước khi bật DPoP

- Trong `components/user/login/index.tsx` và `components/user/email_authentication/index.tsx`, áp dụng bản vá dưới đây trước khi dùng đích cho router hoặc OAuth. Tìm thấy consumer trực tiếp ở hai file này và `/transaction`. Register và middleware hiện là nơi xây dựng đích hoặc dùng đường dẫn tĩnh. Khi ghi đích ở guard, middleware hoặc Axios, áp dụng cùng helper cho pathname + search trước khi encode để tránh chuyển tiếp query nhạy cảm. Chuyển email xác minh khỏi `localStorage` và giới hạn chuyển tiếp email qua URL.

  ```ts
  import { sanitizeRedirect } from "@/lib/auth/safe-redirect";

  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"));
  ```

- Trong hạ tầng phiên và học tập, kiểm lại mọi prop `accessToken` đi từ server layout/page sang client. Trang learning vẫn chuyển prop này trong lần kiểm kê cuối. Xác nhận cả URL handshake, lỗi WebSocket, RSC payload, dữ liệu log proxy và refresh theo từng chế độ. Backend bỏ qua cookie phiên trên WebSocket. Khi frontend cookie bỏ Bearer khỏi URL và chỉ mở socket, notification và Q&A thiếu credential mà backend chấp nhận. Kiểm thử điểm này trên cookie mode và bổ sung cơ chế xác thực phù hợp, chẳng hạn vé ngắn hạn, trước khi bật rộng. DPoP dùng auth frame như hợp đồng.
- GitHub hỗ trợ DPoP qua callback cùng tab. Trình duyệt giữ khóa tạm không trích xuất được và PKCE verifier trong IndexedDB. Trang callback xóa mã một lần khỏi thanh địa chỉ trước khi gửi yêu cầu đổi mã. Route `/api/storage/files/private/…` gọi xác thực backend. Link trực tiếp ở mục tài nguyên bài học không thể tự đính kèm header DPoP. Kiểm tra quyền truy cập bằng fetch có proof và xử lý tải về khi chuyển các trang này. Backend có route phát URL tải R2 ngắn hạn cho client đã xác thực. Nếu dùng, giữ URL tải trong đúng luồng và loại khỏi logging/telemetry.
- Nếu sau này cài Sentry, xử lý tại cả `beforeSend` và `beforeBreadcrumb`. Loại trường `Authorization`, `DPoP`, `access_token`, `refresh_token` và cookie theo tên không phân biệt hoa thường. Ưu tiên gửi danh sách trường an toàn như mã lỗi nội bộ cố định và status số. Bỏ request/response body, Axios config, query, fragment, URL ký và giá trị đã nhúng vào chuỗi hoặc dữ liệu serialize. Áp dụng cùng chính sách cho tracing/replay nếu bật, rồi kiểm tra payload đầu ra bằng giá trị giả. Với console, chỉ giữ ngữ cảnh tĩnh và mã trạng thái đã kiểm tra kiểu.

## Cấu hình URL công khai và WebSocket DPoP

- `NEXT_PUBLIC_URL_BACKEND` là URL đích của Next rewrite. Next chuyển `/api/<path>` thành `<backend>/api/v1/<path>`. Nếu URL backend có path gốc, ví dụ `http://backend:8000/mount`, frontend mặc định dùng prefix `/mount` khi ký.
- `NEXT_PUBLIC_DPOP_API_ORIGIN` là origin HTTP(S) công khai dùng để ký, gồm scheme, host và port nếu khác mặc định. Giá trị này phải trùng `PUBLIC_API_URL` phía backend. Để cấu hình origin riêng, dùng giá trị không có path, query, fragment hoặc thông tin đăng nhập. Khi để trống, frontend lấy origin từ `NEXT_PUBLIC_URL_BACKEND`.
- `NEXT_PUBLIC_DPOP_API_PATH_PREFIX` đặt prefix công khai trước `/api/v1` khi khác prefix của rewrite. Ví dụ với giá trị `/gateway`, request web `/api/auth/me?tab=profile` được ký thành `https://api.example.com/gateway/api/v1/auth/me`. Đặt giá trị rỗng rõ ràng nếu path công khai bắt đầu ngay bằng `/api/v1` còn URL backend có path gốc nội bộ. Trong development, frontend cảnh báo khi cấu hình sai định dạng hoặc origin HTTP/WS khác origin ký. Origin khác có thể hợp lệ với reverse proxy. Kiểm tra qua ingress rằng ASGI cung cấp path công khai đầy đủ hoặc backend khôi phục đúng prefix đã strip. Chỉ riêng việc khai báo `root_path` chưa xác nhận `raw_path` chứa prefix.
- Axios và `authedFetch` chỉ gắn DPoP cho rewrite cùng origin dưới `/api/` hoặc API trực tiếp có origin HTTP(S) và prefix khớp cấu hình. WebSocket DPoP dùng `NEXT_PUBLIC_URL_BACKEND_WS` nếu có, nếu không thì suy ra từ origin và prefix công khai. WebSocket chỉ gửi frame xác thực qua origin backend, origin công khai hoặc origin WS cấu hình chính xác. Production yêu cầu `wss:`.
- Backend gửi `{"type":"auth_ok"}` sau khi xác thực và kiểm quyền cho endpoint. Frontend tương thích với khung điều khiển `ready` của voice/dictation cũ và chuyển khung đó cho handler media. Socket im lặng như notifications, comments và gamification cần backend phát ACK. Client đóng và báo lỗi khi quá hạn chờ xác nhận. Close `4401` luôn là lỗi trong handshake.

## Phạm vi khắc phục sau kiểm toán

| ID | Phần cần theo dõi |
| --- | --- |
| DPOP-07 | Backend quyết định kết quả khi nhận lại refresh cookie cũ sau cửa sổ grace. Web Lock phía trình duyệt chỉ đồng bộ các client dùng chung lock. |
| DPOP-08 | Mất mạng, timeout, 5xx, lỗi đọc hồ sơ và phản hồi xác thực thiếu mã kết thúc phiên giữ trạng thái thử lại. Nếu backend đã xoay token nhưng client mất phản hồi lâu hơn cửa sổ grace, backend hiện vẫn có thể trả `401 session_revoked`. Khôi phục trường hợp này cần idempotency bền vững phía backend. |
| DPOP-13 | Helper frontend từ chối credential trong query WebSocket. Việc lọc log ASGI, ingress và Bearer URL legacy thuộc backend và vận hành. |
| DPOP-15 | Kiểm tra `htu` trên ingress thật cho HTTP và WS, gồm cấu hình strip prefix và alternate WS origin. |
| DPOP-16 | GitHub login và callback do luồng GitHub phụ trách. GitHub linking từ phiên DPoP cần hoàn tất trên API có proof và hợp đồng state ràng buộc phiên. |
| DPOP-17 | Backend cần triển khai ACK cho từng socket im lặng trước khi bật DPoP cho các luồng realtime đó. |
| DPOP-19 | Middleware đặt `Referrer-Policy: no-referrer` cho các trang DPoP. CSP enforce và nonce cần đợt rollout có kiểm thử production qua ingress theo hướng dẫn CSP. |

## Checklist triển khai

- [ ] Áp dụng migration backend và triển khai đồng nhất worker xác thực. Đặt public API origin để proof ký đúng origin và đường dẫn được FastAPI đối chiếu.
- [ ] Dùng HTTPS production và kiểm tra header CSP, referrer, HSTS, microphone qua ingress. Thu báo cáo theo [hướng dẫn CSP](csp-rollout.md).
- [ ] Smoke test hai chế độ trên build riêng. Kiểm tra login, verify, logout, refresh đa tab, tải lại tab, API stream, tài nguyên private, WebSocket, tình huống thu hồi và lỗi Redis. Xem GSI, GitHub và PayPal với popup hoặc callback thực tế.
- [ ] Kiểm tra Network, RSC, Web Storage, log ứng dụng, log ingress và telemetry bằng tài khoản kiểm thử. Xác nhận token không xuất hiện ở các bề mặt ngoài kênh truyền của giao thức.
- [ ] Cập nhật allowlist theo nguồn thực tế đã xác minh. Canary CSP enforce và DPoP theo các đợt riêng để xác định nguyên nhân nếu cần quay lui.
- [ ] Chỉ tắt tương thích cookie và Bearer sau khi xác nhận web, mobile, GitHub và WebSocket tương ứng đã chuyển.
