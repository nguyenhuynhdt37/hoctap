# Triển khai CSP cho frontend Mây Mây

Next gửi `Content-Security-Policy-Report-Only` ở cả hai chế độ xác thực. Trình duyệt báo các vi phạm mà policy sẽ chặn khi enforce. `Referrer-Policy`, `X-Content-Type-Options` và `Permissions-Policy` có hiệu lực ngay. HSTS có hiệu lực trên HTTPS ở production và chỉ áp dụng cho hostname hiện tại. Mic vẫn được cấp quyền trên cùng origin để dùng thoại và nhập bằng giọng nói.

## Danh sách nguồn

| Chức năng | Nguồn và directive |
| --- | --- |
| Next App Router, JS, CSS, Be Vietnam Pro, Lora | `'self'`. `next/font/google` phục vụ font đã đóng gói từ `/_next/static/media/`. Script khởi tạo và CSS inline hiện cần `'unsafe-inline'`. `'unsafe-eval'` chỉ có ở development. |
| API, SSE, WebSocket | `connect-src` dùng `'self'` cho `/api/*`, origin HTTP(S) của `NEXT_PUBLIC_URL_BACKEND`, origin WS(S) của `NEXT_PUBLIC_URL_BACKEND_WS` và WS(S) tương ứng của backend cho luồng suy ra URL WebSocket. Development thêm WS(S) của `NEXT_PUBLIC_URL_FRONTEND` cho HMR. |
| Google Identity Services | `script-src https://accounts.google.com/gsi/client`, `style-src https://accounts.google.com/gsi/style`, `frame-src` và `connect-src https://accounts.google.com/gsi/`. |
| Ảnh | `img-src` dùng `'self'`, origin backend, `https://lh3.googleusercontent.com`, `https://ui-avatars.com`, `https://placehold.co`, `blob:` và `data:` cho bản xem trước. |
| YouTube và media | `script-src` cho `https://www.youtube.com/iframe_api` và `https://www.youtube.com/s/player/`. `frame-src` cho `https://www.youtube.com/embed/`. Media ở `public/` và `/api/storage/files/` dùng `'self'`. `media-src` cũng có origin backend và `blob:`. Tài nguyên do iframe YouTube tự tải chịu policy của tài liệu trong iframe. |
| Cloudflare R2, CDN | App dùng đường dẫn ổn định `/api/storage/files/`, FastAPI đọc R2. Với dữ liệu legacy hoặc CDN riêng đã xác minh, đặt `CSP_ASSET_ORIGINS` thành danh sách origin HTTPS phân cách bằng dấu phẩy. Config chỉ thêm chúng vào `img-src` và `media-src`. |
| Địa giới hành chính | `connect-src https://provinces.open-api.vn`. |
| PayPal và GitHub | Trang thanh toán và OAuth mở điều hướng hoặc popup cấp cao. PayPal không nạp SDK hay iframe ở frontend hiện tại. Các điều hướng này không cần thêm nguồn vào `script-src`, `frame-src` hoặc `connect-src`. |
| Piston | Frontend chạy code qua `/api/*`. FastAPI gọi `PISTON_URL`, nên origin của Piston không nằm trong CSP của giao diện. |

`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` và `form-action 'self'` đặt giới hạn cho đối tượng nhúng, base URL, nhúng trang và đích submit form. Kiểm tra Google GSI và các callback OAuth trong staging cùng với các directive này.

## Đọc báo cáo

1. Trong staging, xem header của response **Document** trong DevTools Network. Dùng tab Console hoặc Issues để đọc cảnh báo. Giá trị `disposition` là `report` khi policy chỉ báo cáo.
2. Để thu thập tập trung, đặt `CSP_REPORT_URL` thành URL HTTPS đầy đủ của collector đã được phê duyệt. URL dùng đường dẫn cố định, không chứa credential, query hoặc fragment. Khi có URL hợp lệ, Next gửi `Reporting-Endpoints` và hai directive `report-to`, `report-uri`. Collector hỗ trợ mảng Reporting API với `application/reports+json` và payload CSP cũ với `application/csp-report`. Repo chưa có collector. Khi biến này trống, dùng DevTools.
3. Gom nhóm theo `effectiveDirective` hoặc `effective-directive`, origin của `blockedURL` hoặc `blocked-uri`, route đã rút gọn và trình duyệt. Giá trị `inline` thường trỏ đến JS hoặc CSS inline. Báo cáo từ extension có thể nhận biết nhờ source như `chrome-extension:`. Xác minh trên profile trình duyệt sạch trước khi thay policy.
4. Ở collector, coi payload là dữ liệu không tin cậy. Chỉ lưu các trường cần để phân loại, bỏ query và fragment khỏi URL, bỏ `script-sample` và không ghi body thô. Tắt capture body ở gateway. Giới hạn kích thước, tốc độ và thời hạn lưu. Kiểm tra ngay cả với báo cáo cùng origin vì trình duyệt có thể gửi URL chi tiết hơn.

## Chuyển sang enforce

1. Dùng staging HTTPS cho từng build `cookie` và `dpop`. Kiểm tra điều hướng App Router, đăng nhập form và Google, xác minh OTP, các luồng GitHub còn tương thích, thanh toán PayPal và quay lại, transaction, bài học xem thử và YouTube, ảnh, tải tài nguyên, upload, Piston, đề xuất thoại, dictation, streaming và WebSocket. Kiểm tra Chrome, Firefox và Safari. Với video, phát đến khi iframe và SDK tải xong.
2. Tách script dọn thuộc tính extension trong root layout thành file tĩnh cùng origin hoặc truyền nonce cho script. Với Next App Router, chọn nonce ngẫu nhiên riêng mỗi request, cho Next nhận policy chứa nonce từ request để gắn vào bootstrap/hydration, và dùng cùng nonce trong response. Truyền nonce đến script cần thiết và kiểm thử lại cả GSI và YouTube. Với route tĩnh, đánh giá hash cho script inline có nội dung ổn định. Kiểm tra chi phí render động và cache khi chọn nonce.
3. Thử policy script mới trong Report-Only với nonce hoặc hash và bỏ `'unsafe-inline'` khỏi `script-src`. Theo dõi riêng phần `style-src` vì UI và thư viện cần style attrs. Thử thu hẹp inline CSS theo từng đợt. Cân nhắc thử Trusted Types sau khi kiểm kê Tiptap, thư viện highlight và SDK bên thứ ba. Production tiếp tục bỏ `'unsafe-eval'`.
4. Khi các luồng hợp lệ chạy sạch trên staging, đổi header sang `Content-Security-Policy` ở staging rồi canary production. Giữ telemetry, đối chiếu tỷ lệ lỗi đăng nhập, player và socket theo build. Nếu chặn nhầm luồng chính, quay lại policy Report-Only và xác minh nguồn hoặc nonce gây lỗi trước lần triển khai tiếp theo.
