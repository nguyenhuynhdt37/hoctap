# Kiểm toán đăng nhập DPoP trước production

Rà soát tĩnh working tree ngày 23/11/2026 theo bốn tài liệu và danh sách tệp được giao. Có **2 High, 11 Medium, 5 Low và 2 Info**. Hai phát hiện High nằm ở luồng OTP đã có trước DPoP. DPoP ràng buộc phiên với khóa do client chọn, nên vẫn cấp phiên hợp lệ nếu luồng OTP xác thực sai chủ tài khoản. Đối chiếu các điểm hồi quy với `HEAD` của cùng tệp.

**Kết luận phát hành.** Chưa nên coi đợt triển khai đã qua cổng bảo mật. Ưu tiên xử lý DPOP-01/02 và lỗi duy trì phiên DPOP-04/07/08, xác nhận bảo vệ CSRF khi còn cookie, rồi kiểm chứng SSR/RSC, CORS và chính sách log ở môi trường triển khai.

## Phát hiện

Đường dẫn trong bảng tính từ gốc repo. **Cao** nghĩa là nhánh mã, hành vi và các điều kiện nêu trong bảng đã được truy vết. Điều kiện vận hành như quyền đọc Redis, cấu hình ingress và nguồn URL của caller cần xác minh riêng. Các đoạn vá minh họa thay đổi phòng thủ tương ứng, chưa được tích hợp hay chạy.

| ID | Mức độ | Bằng chứng | Mô tả và mức chắc chắn | Kịch bản và điều kiện | Sửa đề xuất |
| --- | --- | --- | --- | --- | --- |
| DPOP-01 | **High** | `studynest_be/app/services/shares/auth.py:216–254`, `:309–344`, `:956–969` | **Cao.** Đăng ký lưu mật khẩu trước khi xác minh email. Đăng nhập OTP tự đặt `is_verified_email=True` cho bản ghi đó và giữ nguyên mật khẩu đã lưu. Nhánh OTP có từ `HEAD` ở cùng tệp, dòng 877–890. | Một người đăng ký trước bằng email của nạn nhân với mật khẩu họ biết. Sau đó chủ email dùng mã OTP thật để đăng nhập. Từ thời điểm đó, mật khẩu do người đăng ký trước chọn đăng nhập được cùng tài khoản, kể cả để tạo phiên DPoP với khóa riêng của họ. | Chặn xác minh ngầm qua OTP đăng nhập ngay lúc này. Hoàn tất đăng ký bằng mã xác minh riêng và mật khẩu do chủ email chọn sau khi chứng minh quyền sở hữu. [Vá 01](#vá-01) |
| DPOP-02 | **High** | `studynest_be/app/core/security.py:93–96`, `studynest_be/app/api/v1/shares/auth.py:229–254`, `studynest_be/app/services/shares/auth.py:843–884`, `:923–969` | **Cao với mã.** OTP có sáu chữ số, hiệu lực 10 phút. Handler không có ngân sách thử theo tài khoản/challenge, và kiểm tra bằng `SELECT` rồi `DELETE` không kiểm số hàng đã xóa. Có từ `HEAD`. Hiệu quả của lớp giới hạn bên ngoài chưa được xác minh. | Người không có hộp thư có thể yêu cầu mã cho tài khoản đã biết rồi thử nhiều mã trong thời hạn nếu ingress cho phép đủ lưu lượng. Với mã đúng và hai request cùng đọc trước lần xóa đầu tiên, mỗi request có thể tạo phiên với khóa riêng vì request thứ hai vẫn đi tiếp sau khi xóa 0 hàng. | Giới hạn phát và thử OTP theo tài khoản/challenge kết hợp IP, tách mục đích, tiêu thụ nguyên tử với `DELETE … RETURNING`. [Vá 02](#vá-02) |
| DPOP-03 | **Medium** | `studynest_be/app/core/deps.py:94–96`, `:174–177`, `studynest_be/app/api/v1/shares/auth.py:52–90`, `:103–155`, `studynest_be/app/services/shares/auth.py:118–125` | **Cao.** Xác thực cookie HTTP và nhánh refresh cookie thiếu kiểm tra Origin/CSRF trong các handler. `SameSite=Lax` so theo site, còn các POST logout và cảnh báo nhận request không body. | Một origin cùng site nhưng chưa được tin cậy, chẳng hạn subdomain bị chiếm quyền, có thể khiến trình duyệt đang đăng nhập gửi POST đến đích có cookie và thu hồi toàn bộ phiên. Việc trình duyệt chặn đọc response qua CORS vẫn cho phép tác dụng phụ của POST đơn giản. Điều kiện là không có lớp CSRF khác ở ingress. | Kiểm exact Origin và token CSRF cho thao tác cookie. Bảo vệ cả refresh và endpoint cấp cookie. Middleware Next gọi refresh server-to-server cần danh tính dịch vụ hoặc cơ chế CSRF tương ứng. [Vá 03](#vá-03) |
| DPOP-04 | **Medium** | `studynest_be/app/api/v1/gamification/websocket.py:28–54`, `:57–70`, `studynest_be/app/core/deps.py:238–257` | **Cao.** Gamification kiểm quyền một lần trước khi vào room. Vòng lặp và đường broadcast không kiểm lại `sid`, `exp` hay role. | Một socket đã xác thực có thể tiếp tục nhận sự kiện riêng sau khi thiết bị bị thu hồi, JWT hết hạn hoặc mất role, cho đến khi kết nối bị ngắt ở một lớp khác. | Gắn subscription với `sid`, đóng theo `exp` và khi thu hồi, kiểm định kỳ ở task độc lập với frame của client. [Vá 04](#vá-04) |
| DPOP-05 | **Medium** | `studynest_be/app/core/settings.py:94–98`, `studynest_be/app/core/security.py:228–242`, `:274–288`, `studynest_be/app/services/shares/auth.py:524–546`, `studynest_be/app/api/v1/user/agent.py:140–159` | **Cao.** Redis lỗi làm HTTP GET bỏ kiểm tra từng thấy `jti` theo mặc định. JWT, chữ ký, `ath`, phiên và thời hạn vẫn được kiểm. Một số GET vừa trả PII vừa có tác dụng phụ, như `/auth/me` gọi tạo ví nếu thiếu. | Nếu cặp access JWT và proof của một GET đã lộ, người giữ cặp có thể đọc lại tài nguyên trong cửa sổ `iat` và thời hạn JWT khi replay store báo lỗi. Proof ràng buộc path và method, nên truy vấn cùng path được xét quyền theo dữ liệu query của endpoint. POST và WebSocket không được fallback này. | Fail-closed cho GET xác thực, hoặc dùng kho chống replay có tính nhất quán. [Vá 05](#vá-05) |
| DPOP-06 | **Medium** | `studynest_be/app/services/shares/auth.py:99–116`, `:710–744`, `:756–762`, `studynest_be/app/api/v1/user/tutor_chat.py:319–327` | **Cao.** Grace cache lưu access JWT và refresh token dạng JSON plaintext trong Redis 15 giây. Voice ticket legacy cũng lưu JWT gốc trong Redis 60 giây. | Quyền đọc Redis trong cửa sổ TTL cho phép lấy cặp legacy đang có hiệu lực. Refresh legacy hiện hành có thể duy trì truy cập qua nhiều lần xoay. Cặp DPoP bị lộ vẫn cần khóa để tạo proof mới. TTL của key cũng không quyết định thời gian lưu bản sao hoặc telemetry. | Mã hóa kết quả grace bằng AEAD với khóa riêng ngoài Redis, hoặc đáp ứng idempotency bằng dữ liệu bền vững đã mã hóa. Voice ticket có thể lưu định danh và mốc hết hạn tối thiểu, sau đó xác thực lại phiên. [Vá 06](#vá-06) |
| DPOP-07 | **Medium** | `studynest_be/app/services/shares/auth.py:660–672`, `:674–685`, `:721–754`, `studynest_fe/src/middleware.ts:45–69`, `studynest_fe/src/lib/utils/fetcher/client/refresh-session.ts:31–51` | **Cao, hồi quy cookie.** Tái sử dụng hash liền trước sau 15 giây thu hồi toàn phiên cả khi `dpop_jkt IS NULL`. `HEAD` ở cùng tệp, dòng 655–675, chỉ từ chối token cũ khi grace cache hết hạn. Web Lock của client không bao trùm refresh do Next middleware phát. | Middleware hoặc tab khác gửi lại cookie refresh cũ sau khi tab đầu đã xoay trên 15 giây, trong khi chưa có lần xoay thứ hai. Tab đầu bị đăng xuất dù giữ refresh mới. Người giữ refresh legacy liền trước cũng có thể gây đăng xuất theo điều kiện đó. | Giữ hành vi legacy cho request cũ và áp dụng thu hồi theo proof cho phiên bound. Dùng kết quả refresh idempotent để phân biệt retry hợp lệ với reuse khi giữ cả hai chế độ. [Vá 07](#vá-07) |
| DPOP-08 | **Medium** | `studynest_fe/src/lib/auth/session.ts:30–34`, `:221–249`, `:265–267`, `:275–342`, `studynest_fe/src/components/auth/AuthBootstrap.tsx:40–56`, `:87–88` | **Cao.** Lỗi mạng/timeout để lại `attempt.sentAt`. Sau 13 giây, mọi lần refresh trả `false` trước khi gửi request. Bootstrap bỏ qua kết quả boolean, có thể coi lỗi là trạng thái khách. | Máy offline trong lần bootstrap, hoặc tab bị ngắt trong lúc gửi refresh và mở lại sau 13 giây. Ngay cả khi request ban đầu chưa từng đến backend và refresh token vẫn còn hiệu lực, reload cũng không thể khôi phục phiên. | Hỗ trợ idempotency bền vững theo thao tác đã gửi và phân biệt mất phiên với lỗi tạm thời trên FE. [Vá 08](#vá-08) |
| DPOP-09 | **Medium** | `studynest_be/alembic/versions/y23op567k890_dpop_sessions.py:13–30` | **Cao về cách lấy khóa.** Cột nullable không default có thể thêm nhanh, nhưng tạo hai index thường ngay trong migration. `ALTER TABLE` giữ khóa mạnh tới commit nếu cùng transaction. Downgrade cập nhật cả tập phiên bound. Thời gian chặn phụ thuộc DB thực tế. | Trên bảng sessions lớn hoặc khi có transaction đang mở, DDL có thể đợi khóa và chặn các request đăng nhập/refresh. Sau khi lấy khóa, bảng có thể tiếp tục bị chặn trong lúc quét tạo index. | Tách transaction thêm cột và tạo index, dùng `CONCURRENTLY`, bỏ index `dpop_jkt` nếu đo đạc cho thấy không cần, giới hạn thời gian đợi khóa. Downgrade theo trình tự dừng cấp bound, thu hồi, dừng worker phụ thuộc cột rồi bỏ schema. [Vá 09](#vá-09) |
| DPOP-10 | **Medium** | `studynest_be/app/core/deps.py:234–268`, `studynest_be/app/core/security.py:203–218`, `studynest_be/app/api/v1/gamification/websocket.py:28–33`, `:45–48`, `studynest_be/app/services/user/tutor_voice.py:215–223` | **Cao về tầng ứng dụng.** `receive_json()` nhận và parse toàn bộ message trước giới hạn JWT/proof. Gamification nhận text vô hạn ở tầng ứng dụng sau xác thực. Timeout 5 giây không ngắt parser đồng bộ đang chạy. Giới hạn transport chưa xác minh. | Nhiều kết nối chưa xác thực gửi message dưới trần transport nhưng lớn hơn nhiều so với frame auth bình thường, làm tăng CPU và bộ nhớ trước khi bị từ chối. | Giới hạn message trước khi parse, giới hạn kích thước ở ASGI và concurrency của handshake ở ingress. [Vá 10](#vá-10) |
| DPOP-11 | **Medium** | `studynest_be/app/core/deps.py:142–165`, `:197–206`, `:224–227`, `studynest_be/app/services/shares/auth.py:660–672`, `:721–757`, `studynest_be/app/api/v1/shares/auth.py:93–109` | **Cao về các điểm kiểm tra.** HTTP auth và refresh kiểm phiên nhưng không áp dụng `is_banned`/`deleted_at`. Kiểm role chung chỉ đọc role. Voice có kiểm riêng tại `studynest_be/app/services/user/tutor_voice.py:396–399`. | Nếu thao tác khóa/xóa tài khoản vẫn để phiên active, trình duyệt cũ hoặc API client tiếp tục được xác thực và xoay refresh. Middleware/guard chuyển trang theo cờ ban, nhưng API trong phạm vi như danh sách phiên vẫn dùng danh tính đó. Chưa xác minh thao tác khóa bên ngoài phạm vi có thu hồi mọi phiên hay không. | Thu hồi phiên nguyên tử khi khóa hoặc xóa và áp dụng kiểm trạng thái ở auth/refresh. Giữ một đường có kiểm soát để frontend đọc thông tin trạng thái phục vụ trang `/banned`. [Vá 11](#vá-11) |
| DPOP-12 | **Medium** | `studynest_fe/src/lib/auth/ws.ts:24–45`, `:51–70`, `:114–131`, `studynest_fe/next.config.ts:57–60`, `:90–94` | **Cao về helper.** URL WS bất kỳ đúng scheme đều có thể nhận access JWT và proof trong frame. Helper không giới hạn origin hoặc yêu cầu WSS trong production. Các caller tạo URL nằm ngoài phạm vi. | Nếu một caller đưa vào URL từ nguồn không đáng tin hoặc cấu hình nhầm tới một host khác, trình duyệt có thể mở socket đến host đó và gửi cặp token/proof. JWT bound tự nó vẫn cần khóa. CSP Report-Only không chặn lần gửi. | Pin origin WebSocket đáng tin cậy và bắt buộc WSS với build production trước khi đọc token hoặc tạo proof. [Vá 12](#vá-12) |
| DPOP-13 | **Low** | `studynest_be/app/core/deps.py:78–83`, `studynest_be/app/core/settings.py:92–93`, `studynest_be/app/core/log_redaction.py:5–27`, `studynest_be/app/api/v1/user/agent.py:176–186`, `studynest_be/app/api/v1/gamification/websocket.py:43–54` | **Cao về mã.** Bearer legacy được chấp nhận từ query, còn bộ lọc chỉ khớp tên query dạng thô và lọc dict theo tên. Query alias percent-encoded được parser giải mã trước lookup. `exc_info` và string chứa cookie/subprotocol không có bộ lọc chuyên biệt. Route OAuth dùng `code`/`state`, ngoài regex. Log Gamification ghi email, ID room và có nhánh nội suy exception. | Credential trong handshake URL có thể vào access log của reverse proxy trước lọc ASGI. Trong log ASGI có URL thô, tên tham số được percent-encode có thể lọt regex. OAuth callback có thể để code/state trong log URL nếu URL được ghi. Không xác nhận log của production đã chứa các giá trị đó. | Bỏ credential khỏi URL và loại toàn bộ query khỏi log handshake/OAuth ở ingress và ASGI. Chỉ ghi event, status và ID cần thiết, bỏ email và exception thô ở Gamification. [Vá 13](#vá-13) |
| DPOP-14 | **Low** | `studynest_be/app/api/v1/shares/auth.py:76–84`, `studynest_be/app/services/shares/auth.py:72–78`, `:113–116`, `:660–670`, `studynest_be/app/core/deps.py:132–137` | **Cao.** Cờ Bearer và cookie tách đúng khi dùng access JWT. Đối với refresh không bound trong JSON, điều kiện là cookie **hoặc** Bearer bật. | Khi tắt Bearer nhưng giữ cookie, client đang có refresh legacy vẫn gửi nó qua body để refresh và nhận cookie, dù access JWT hiện tại bị từ chối khi gửi qua Bearer. Biện pháp vận hành tắt đường refresh JSON legacy cần thêm kiểm tra. | Kiểm cờ đúng theo nguồn refresh khi phiên không bound và đặt hợp đồng phát token legacy rõ ràng. [Vá 14](#vá-14) |
| DPOP-15 | **Low** | `studynest_be/app/core/security.py:159–170`, `studynest_fe/src/lib/auth/http.ts:1–8`, `studynest_fe/next.config.ts:108–114`, `docs/auth/dpop-backend-notes.md:3` | **Cao về mã, tác động có điều kiện.** Backend pin origin, ghép `raw_path` hoặc `path` và không ghép `root_path` nếu đường dẫn đó thiếu prefix. FE giả định rewrite cố định `/api/*` → `/api/v1/*`. | Khi proxy bỏ prefix công khai và ASGI server chỉ truyền prefix trong `root_path`, proof ký URL công khai bị 401 nếu `raw_path` không chứa prefix. Hành vi thực của chiến lược proxy hiện tại chưa xác minh. | Dùng mapping public prefix đã cấu hình và xác định bằng test qua đúng ASGI server/ingress. [Vá 15](#vá-15) |
| DPOP-16 | **Low** | `studynest_be/app/api/v1/user/agent.py:169–186`, `studynest_be/app/services/shares/github_auth.py:39–45`, `:122–147`, `studynest_be/app/core/deps.py:60–96`, `studynest_fe/src/lib/utils/fetcher/client/axios.ts:24–36` | **Cao.** GitHub login phát phiên cookie có nonce. Callback liên kết GitHub gọi `get_current_user()` trực tiếp trên navigation OAuth, nơi browser không đính kèm DPoP. | Người dùng thuần DPoP có thể bắt đầu liên kết nhưng callback thiếu credentials hợp lệ. Nếu dùng Axios DPoP làm caller GitHub login start, `credentials: omit` cũng ngăn lưu nonce cookie. Phụ thuộc cookie của GitHub login đã được ghi trong tài liệu. | Dùng state một lần ràng buộc `sid`/`jkt`, khi callback hoàn tất để origin FE xác nhận và đổi kết quả bằng request có proof. [Vá 16](#vá-16) |
| DPOP-17 | **Low** | `studynest_fe/src/lib/auth/ws.ts:103–137`, `studynest_be/app/core/deps.py:264–276`, `studynest_be/app/api/v1/gamification/websocket.py:28–48` | **Cao.** Client coi bất kỳ message nào là xác nhận kết nối. Socket phi media còn resolve bằng timer khi transport vẫn `OPEN`, kể cả chưa nhận ACK xác thực. Gamification chưa phát ACK. | Backend từ chối nhưng close frame đến muộn hơn timer client, hoặc server gửi frame lỗi trước khi đóng. Caller có thể nhận một socket đã xác thực thất bại và chỉ thấy lỗi sau đó. | Thống nhất `auth_ok` sau auth và role. Timer cần reject nếu ACK chưa đến, đồng thời giữ riêng frame media đầu khi cần. [Vá 17](#vá-17) |
| DPOP-18 | **Info** | `studynest_be/app/services/shares/auth.py:674–685`, `:723–754`, `docs/auth/dpop-backend-notes.md:30` | **Cao, giới hạn đã ghi.** DB chỉ nhớ refresh hash liền trước, grace chain phụ thuộc Redis và đọc tối đa năm kết quả. | Sau khi phiên đã xoay hai lần và cache token đầu hết hạn, gửi token đầu bị từ chối nhưng phiên không bị thu hồi vì không thể tra từ token cũ. Giới hạn này làm mất tín hiệu reuse, chưa tạo khả năng dùng lại token đó. | Giữ lịch sử hash được index theo vòng đời phiên, xác minh proof/ràng buộc trước khi thu hồi để tránh DoS từ token bound bị lộ đơn lẻ. [Vá 18](#vá-18) |
| DPOP-19 | **Info** | `studynest_fe/next.config.ts:24–39`, `:45–72`, `:90–106`, `docs/auth/dpop-cookieless-spec.md:30–31` | **Cao.** CSP đang Report-Only, có `unsafe-inline` cho script và endpoint báo cáo tùy env. Referrer mặc định là `strict-origin-when-cross-origin`, trong khi spec yêu cầu `no-referrer`. Việc allowlist đủ nguồn phụ thuộc build và cấu hình thật. | XSS có sẵn trong cùng origin vẫn gọi được WebCrypto bằng key handle và gửi dữ liệu. Report-Only chỉ có thể ghi nhận vi phạm. Không xác định được một XSS từ các tệp được giao. | Enforce CSP đã kiểm thử, dùng nonce cho script và đặt referrer policy theo spec. [Vá 19](#vá-19) |
| DPOP-20 | **Medium** | `studynest_be/app/services/shares/auth.py:674–685`, `:697–744`, `:764–770`, `studynest_be/app/core/security.py:274–285`, `studynest_be/app/core/deps.py:197–202` | **Cao về thứ tự thao tác.** Refresh lấy khóa DB trước khi kiểm proof và gọi Redis để đánh dấu JTI hoặc đọc tiếp grace chain. `blocking_timeout=10` của Redis lock chỉ áp dụng lúc lấy Redis lock. Handler không đặt thời hạn đợi khóa DB. | Khi Redis chậm trong lúc phục vụ refresh hợp lệ, row phiên vẫn bị khóa. Các thao tác khác cần cập nhật row, gồm cập nhật `updated_at` từ HTTP auth, có thể xếp hàng. Với refresh bound bị lộ, request thiếu khóa vẫn có thể tranh khóa row trong thời gian kiểm proof, dù không xoay được token. Chưa xác minh các timeout cấp DB/client. | Kiểm tra proof và đường đọc Redis dựa trên một bản đọc không khóa, rồi chỉ khóa khi tái kiểm tra dữ liệu và ghi. Đặt timeout hữu hạn cho Redis và khóa DB. [Vá 20](#vá-20) |

## Checklist và các kiểm soát đạt

| Mục | Kết quả và bằng chứng |
| --- | --- |
| 1. Proof | **ĐẠT** kiểm `typ=dpop+jwt`, `alg=ES256`, public EC P-256, từ chối `d`, JOSE `crit`/`b64`, JSON trùng member và base64url sai. Kiểm điểm curve, chữ ký `r\|\|s` 64 byte trên hai segment gốc. `htm` phải khớp method HTTP, WS dùng `GET`. `htu` lấy origin từ cấu hình, không đọc `Host`/`X-Forwarded-*`. Hostname không phân biệt hoa thường, cổng mặc định 80/443, path rỗng thành `/`, giữ trailing slash và delimiter đã encode, giải mã unreserved và viết hoa hex còn lại. Query/fragment không nằm trong target và bị từ chối nếu nằm trong claim. `htu` không ràng buộc query theo hợp đồng. `iat` phải có kiểu `int` chính xác, ±60 giây mặc định. FE tạo JTI ngẫu nhiên 128 bit. Redis `SET NX EX` từ chối trùng và dùng TTL ít nhất hai lần leeway. `ath` bắt buộc cho access, `rth` cho refresh, proof cấp phiên không mang cả hai. Thumbprint dùng các chuỗi `crv,kty,x,y` theo thứ tự lexicographic, JSON UTF-8/ASCII không khoảng trắng, SHA-256 và base64url không pad. `x/y` kiểu số bị bác bỏ khi decode. Bằng chứng `studynest_be/app/core/security.py:121–170`, `:173–250`, `:253–288`, `studynest_fe/src/lib/auth/dpop.ts:53–91`. Ngoại lệ GET khi Redis lỗi và mapping proxy ở DPOP-05/15. |
| 2. Access JWT | **ĐẠT** chữ ký xác minh với đúng một `algorithms=[self.algorithm]`, mặc định HS256, không chọn theo `alg` từ token. Với cấu hình HS256, `none` hoặc thuật toán khác bị loại. Bắt buộc `exp/sub/sid`. `verify_exp=False` chỉ hoãn kiểm hạn đến `_validate_session`, nơi `exp <= time.time()` bị từ chối trước khi trả identity. `exp` phải là `int`. Không thấy đường chấp nhận JWT hết hạn qua dependency này. Mỗi request xác thực kiểm `sid + user_id`, `is_revoked=False`, hạn phiên, và `dpop_jkt` trong DB. Cache nằm trên `request.state` để tránh đốt lại JTI trong cùng request. Có `cnf` thì buộc scheme DPoP, `jkt` hợp lệ và khớp proof lẫn row. Thiếu `cnf` thì kiểm cờ theo scheme và từ chối phiên bound. `studynest_be/app/core/settings.py:88–98`, `studynest_be/app/core/security.py:48–70`, `studynest_be/app/core/deps.py:108–179`. Vòng đời WS và trạng thái người dùng xem DPOP-04/11. |
| 3. Refresh | **ĐẠT** cập nhật hash trước/hash mới/hạn trong cùng transaction, giữ `sid` và khóa `SELECT … FOR UPDATE`. Redis lock tuần tự hóa cùng hash, query thứ hai tìm previous hash sau khi DB recheck predicate. Cùng token, proof DPoP mới và grace cache còn thì request thứ hai nhận đúng successor hiện hành. Refresh token ngẫu nhiên 64 byte đầu vào, DB lưu SHA-256. Các phép so khớp trong ứng dụng dùng `hmac.compare_digest` trên ASCII. SQL tra cứu equality qua hash, không có bảo đảm constant-time ở tầng database. Proof `rth` và `jkt` được kiểm trước cấp lại hoặc thu hồi. Khi DB đã commit mà Redis set lỗi, request đầu vẫn có thể trả token mới. Nếu mất luôn response thì retry không có bản kết quả, và request đến sau grace có thể thu hồi. `studynest_be/app/core/security.py:72–79`, `:121–127`, `studynest_be/app/services/shares/auth.py:660–770`. Xem DPOP-06/07/08/14/18/20 về dữ liệu cache, độ bền và khóa hàng. |
| 4. Cookie compat, CSRF, CSWSH và CORS | **ĐẠT một phần.** Cookie `HttpOnly`, `SameSite=Lax`, `Secure` khi `FRONTEND_URL` bắt đầu bằng `https://`. Cookie WS yêu cầu Origin có mặt và so khớp cả origin qua phép `in` trên tập cấu hình, không so theo hậu tố hay substring. Origin giả từ client ngoài browser không tự cấp cookie của nạn nhân. Origin literal `null` hoặc `*` không có tác dụng wildcard trong phép so khớp, nhưng cấu hình nên từ chối các giá trị mơ hồ và chuẩn hóa scheme/host/port thành browser origin. Có danh sách localhost cố định, kể cả khi chạy production. Giới hạn danh sách này vào development nếu production không dùng. Voice/dictation có kiểm riêng. Thiếu Origin chỉ hữu ích cho client có credential tường minh, cookie thường vẫn qua guard chung. POST cookie còn DPOP-03. `studynest_be/app/core/deps.py:31–42`, `:75–96`, `studynest_be/app/services/shares/auth.py:118–125`, `studynest_be/app/services/user/tutor_voice.py:30–37`, `:360–393`, `studynest_be/app/agent/dictation.py:138–166`. CORS credentials + origin allowlist là hành vi tài liệu mô tả, `studynest_be/app/core/settings.py:92`, `:129–131` và `docs/auth/dpop-backend-notes.md:5–8`. Wiring `CORSMiddleware`, regex, response header và lớp ingress nằm ngoài phạm vi nên chưa đánh dấu ĐẠT cho CORS thực tế. |
| 5. WebSocket | **ĐẠT** timeout tổng 5 giây cho xác thực chung. Frame `auth` dùng scheme DPoP. Lỗi proof, token, role hoặc timeout đóng `4401` sau accept. Gamification và voice yêu cầu `USER/LECTURER/ADMIN`. Dictation gọi xác thực frame không truyền danh sách role rồi gọi `AgentService.principal_async()`, triển khai của principal nằm ngoài phạm vi. Voice recheck sau khoảng 30 giây khi có frame, dictation sau 15 giây và có idle timeout 15 giây. Vai trò và thu hồi Gamification xem DPOP-04. Voice và dictation có giới hạn audio 16 KiB và giới hạn text control sau khi nhận frame. Dictation dùng vé một lần hoặc frame, chặn query. Voice chặn query credential, vé một lần qua `GETDEL`. Nhánh từ chối trước accept có thể là HTTP handshake rejection thay vì close frame 4401. Query Bearer legacy ở gateway chung phụ thuộc cờ và lộ URL theo DPOP-13. `studynest_be/app/core/deps.py:78–93`, `:234–276`, `studynest_be/app/api/v1/gamification/websocket.py:28–54`, `studynest_be/app/services/user/tutor_voice.py:50–61`, `:198–223`, `:360–399`, `studynest_be/app/agent/dictation.py:51–84`, `:138–191`, `:192–206`. Xem thêm DPOP-10/12/17. |
| 6. Log, cache và PII | **ĐẠT một phần.** Access/refresh response và hai endpoint vé trong phạm vi có `Cache-Control: no-store`. Auth log tại replay store/refresh không nội suy credential. `AccessCredentials` loại token/proof khỏi `repr`. Voice ghi loại exception, dictation dùng lỗi chung cho lỗi bất ngờ. Axios DPoP loại config/request gốc khỏi lỗi trả caller, bỏ `input` trong chi tiết validation 422. Response thành công vẫn chứa dữ liệu nghiệp vụ và config tùy caller. Chưa thấy log console trực tiếp của auth helper. DPOP-06/13 ghi thiếu sót Redis, query, email và exception. `studynest_be/app/core/deps.py:45–49`, `:270–275`, `studynest_be/app/core/security.py:99–118`, `:279–285`, `studynest_be/app/services/shares/auth.py:113–125`, `:727–731`, `:756–770`, `studynest_be/app/api/v1/user/agent.py:260–270`, `studynest_be/app/api/v1/user/tutor_chat.py:313–327`, `studynest_be/app/services/user/tutor_voice.py:448–454`, `studynest_be/app/agent/dictation.py:196–199`, `studynest_fe/src/lib/utils/fetcher/client/axios.ts:45–74`. Chưa xác minh việc cài `SecretFilter`, Uvicorn/ingress thực tế, exception render ngoài handler và telemetry. |
| 7. Frontend credential và chuyển hướng | **ĐẠT một phần.** Access ở bộ nhớ và được gửi tạm thời qua BroadcastChannel theo origin. IDB lưu private `CryptoKey` ECDSA non-extractable, AES-GCM 256-bit non-extractable, IV ngẫu nhiên 96 bit và refresh ciphertext trong cùng record, AAD là ID record. Bảo vệ khỏi đọc riêng ciphertext hoặc xuất khóa qua WebCrypto. Script đang chạy cùng origin đọc được handle và có thể giải mã/ký. Login tạo key mới và stage trước khi ghi atomically, logout xóa access/key và IDB đúng ID trong luồng thành công. Mất cả record buộc đăng nhập lại. Record lỗi/khóa giải mã mất khả năng sử dụng cũng làm refresh thất bại, hiện thiếu trạng thái phục hồi cụ thể. Web Locks, IDB lease/revision và BroadcastChannel giới hạn race. Khi ký proof cục bộ thì dùng snapshot access/key, retry chỉ cùng ID. Các lỗi offline và peer/socket xem DPOP-08/12/17. Axios và `authedFetch` chỉ tự gắn auth cho origin web hiện tại dưới `/api/`, bỏ cookie và chặn redirect. Proof ký `/api/v1` ở API origin đã cấu hình, path chuẩn hóa và bỏ query. Axios giữ proof do caller cung cấp chỉ ở session endpoint cùng origin. Không thấy tự gắn Authorization cho mọi URL hay đưa DPoP token vào URL ở các helper này. `sanitizeRedirect` chặn đích ngoài, slash kép, backslash/control và credential param trực tiếp. Cookie middleware/Axios cookie vẫn chép query gốc vào `redirect`, nên nên dùng cùng sanitizer để tránh truyền tiếp credential đã có sẵn trên URL. Bằng chứng `studynest_fe/src/lib/auth/dpop.ts:13–46`, `:53–91`, `studynest_fe/src/lib/auth/login.ts:10–27`, `studynest_fe/src/lib/auth/logout.ts:13–26`, `studynest_fe/src/lib/auth/storage.ts:7–16`, `:55–79`, `studynest_fe/src/lib/auth/session.ts:24–28`, `:65–105`, `:139–218`, `:275–342`, `studynest_fe/src/lib/auth/http.ts:1–15`, `studynest_fe/src/lib/utils/fetcher/client/axios.ts:14–42`, `:95–105`, `:108–148`, `studynest_fe/src/lib/utils/fetcher/client/chat-stream.ts:4–22`, `studynest_fe/src/lib/utils/fetcher/client/chat-events.ts:1–47`, `studynest_fe/src/lib/auth/safe-redirect.ts:1–37`, `studynest_fe/src/components/auth/AuthBootstrap.tsx:95–104`, `studynest_fe/src/middleware.ts:32–38`, `:81–94`. |
| 8. Middleware, SSR và CSP | **ĐẠT** client guard giữ skeleton đến khi bootstrap và kiểm role/ban trước khi render children, hook SWR chia cache theo user ID. Middleware DPoP đi tiếp ngay, cookie mode vẫn kiểm bằng `/auth/me`. Guard client chỉ điều khiển render. Server Component có thể chạy và props có thể được serialize vào RSC trước guard. Trong các module được đọc, credential DPoP đến từ bộ nhớ/IDB phía browser. Chưa có bằng chứng rò rỉ dữ liệu qua SSR, cũng chưa thể xác nhận layout/page, bundle hay RSC payload vì nằm ngoài phạm vi. CSP có nguồn API/WS, Google GSI, YouTube và asset cấu hình, Report-Only và không chứng minh đủ nguồn runtime. `studynest_fe/src/middleware.ts:7–22`, `:45–94`, `studynest_fe/src/components/auth/RequireAuth.tsx:27–49`, `studynest_fe/src/components/auth/UserRouteGuard.tsx:9–14`, `studynest_fe/src/hooks/auth/useAuthedSWR.ts:19–30`, `studynest_fe/next.config.ts:24–72`, `:90–114`. Xem DPOP-19. |
| 9. Migration | **ĐẠT** cột nullable giúp các phiên cũ giữ trạng thái unbound. Downgrade đánh dấu revoked cho mọi row có `dpop_jkt` trước khi bỏ binding. **Có rủi ro khóa** theo DPOP-09. Worker cũ chưa hiểu bound JWT là lý do phải rollout đồng bộ, và cần dừng phát phiên bound trước downgrade. `studynest_be/alembic/versions/y23op567k890_dpop_sessions.py:13–30`, `docs/auth/dpop-backend-notes.md:25–29`. |
| 10. Cookie mặc định | **ĐẠT một phần.** FE mặc định `cookie`. Axios gửi credential như cũ, refresh dùng body `{}` và Web Lock, middleware vẫn chạy luồng cookie, login/refresh legacy còn phát cookie và GitHub cookie vẫn dùng nonce. Logout hiện yêu cầu phiên đã xác thực và `session_id` nếu gửi phải khớp `sid`, tránh thu hồi theo ID đơn lẻ. Cookie WS cần Origin khớp. Cookie do proxy Next phát chỉ thuộc host nhận response vì `set_cookie` không đặt `Domain`. Với socket trực tiếp khác host, `openAuthedWebSocket` ở cookie mode chỉ mở transport, nên caller cần credential legacy tường minh hoặc phải dùng socket cùng host để có cookie. Chưa xác minh caller trong production. Hồi quy đã xác nhận từ `HEAD` là DPOP-07. Refresh khi cả body và cookie cùng có token đã đổi thứ tự ưu tiên sang body. Client cũ thuộc phạm vi gửi `{}` nên vẫn chọn cookie. `studynest_fe/src/lib/auth/mode.ts:1–4`, `studynest_fe/src/lib/utils/fetcher/client/axios.ts:14–19`, `:89–115`, `studynest_fe/src/lib/utils/fetcher/client/refresh-session.ts:30–53`, `studynest_fe/src/middleware.ts:15–39`, `:45–69`, `studynest_fe/src/lib/auth/ws.ts:51–70`, `:114–117`, `studynest_be/app/core/deps.py:78–96`, `studynest_be/app/services/shares/auth.py:118–125`, `studynest_be/app/api/v1/shares/auth.py:52–90`, `studynest_be/app/services/shares/github_auth.py:39–57`, `:122–139`. |

## Đoạn vá đề xuất

Các đoạn dưới đây minh họa điểm tích hợp. Tên hàm mới chỉ các phần cần triển khai cùng bản vá.

### Vá 01

Chặn dùng OTP đăng nhập để kích hoạt tài khoản pending. Trong flow xác minh đăng ký, nhận mật khẩu do chủ email chọn và lưu sau khi tiêu thụ mã xác minh, cùng transaction với kích hoạt. Áp dụng cho pending account đã tồn tại.

```python
# verify_otp_login_async, trước khi cấp phiên
if not user.is_verified_email:
    raise HTTPException(403, "Hãy hoàn tất xác minh đăng ký.")

# verify_email_async, sau khi tiêu thụ challenge đăng ký
user.password = await self.security.hash_password(schema.new_password)
user.is_verified_email = True
```

### Vá 02

Đếm lần thử nguyên tử bằng kho dùng chung, kể cả khi biết email nhưng chưa có mã đúng. Giới hạn phát mã riêng để cấp lại mã không đặt lại toàn bộ ngân sách theo tài khoản. Tách challenge đăng ký và đăng nhập bằng trường `purpose`.

```python
await limit_otp_attempt(account_id=user.id, challenge_id=verification.id, ip=ip)
# Sau khi so sánh code, tiêu thụ đúng challenge đã kiểm
used = await self.db.scalar(delete(EmailVerifications).where(
    EmailVerifications.id == verification.id,
    EmailVerifications.expired_at > get_now(),
).returning(EmailVerifications.id))
if used is None:
    raise AuthError("invalid_token")
```

### Vá 03

Gọi guard cho cookie fallback HTTP, `/auth/refresh` có nguồn cookie và POST phát cookie. Giữ `SameSite=Lax` nếu callback OAuth cần top-level navigation. Xác thực request nội bộ của Next riêng, vì request đã tự chuyển tiếp cookie của người dùng.

```python
if request.method not in {"GET", "HEAD", "OPTIONS"} and uses_session_cookie:
    if not authenticated_internal_request(request):
        if not exact_trusted_web_origin(request.headers.get("origin")):
            raise HTTPException(403, "Origin không hợp lệ")
        await validate_session_csrf_token(request)
```

### Vá 04

Chạy task giám sát độc lập với vòng nhận frame. Hủy task và bỏ socket khỏi room trong `finally`. Fan-out sự kiện auth revoke theo `sid` đến các worker để thu hồi ngay.

```python
async def watch_session(websocket):
    while await AuthorizationService.get_require_role_ws(websocket, ALLOWED_ROLES):
        identity = websocket.state.access_identity
        remaining = identity.expires_at - time.time()
        await asyncio.sleep(max(0, min(15, remaining)))
```

### Vá 05

```python
# settings.py
DPOP_JTI_FAIL_OPEN_ON_GET: bool = False

# authenticate_dpop, khi kho chống replay gián đoạn
except RedisError:
    raise HTTPException(503, "Chưa thể xác thực yêu cầu.") from None
```

### Vá 06

Tách key mã hóa khỏi Redis, gắn ciphertext với cache key và xác thực dữ liệu trước khi tra `session_id`. Với voice, redeem bằng `GETDEL` và kiểm lại phiên, loại credential, thời hạn access và role.

```python
sealed = grace_cipher.seal(json.dumps(result).encode(), aad=cache_key.encode())
await redis.set(cache_key, sealed, ex=REFRESH_GRACE_SECONDS)

# Payload mới của voice ticket
binding = {"sid": str(identity.sid), "uid": str(identity.user_id),
           "exp": identity.expires_at, "scheme": credentials.scheme}
```

### Vá 07

```python
if previous_hash_matches and grace_expired:
    if session.dpop_jkt is None:
        raise AuthError("invalid_token")  # Giữ phiên legacy đã xoay thành công
    session.is_revoked = True
    await self.db.commit()
    raise AuthError("session_revoked")
```

### Vá 08

ID thao tác phải tồn tại từ lúc gửi lần đầu. Backend lưu kết quả đã mã hóa trong cùng transaction với rotation, khớp với phiên, hash đầu vào, ID thao tác và khóa DPoP. Mỗi lần retry ký JTI mới. Nếu successor đã xoay tiếp, hồi phục dựa trên revision hiện hành hoặc trả kết quả yêu cầu đăng nhập lại rõ ràng. Retry cùng thao tác phải được phân biệt với reuse ngay cả vượt cửa sổ 15 giây.

```typescript
const attempt = await claimOrLoadRefreshAttempt(record.id, session.revision);
const outcome = await sendDpopRefresh(token, freshProof, attempt.operationId);
if (outcome.kind === "retryable") setStatus("unavailable");
if (outcome.kind === "reauthenticate") await clearMatchingSession(record.id);
```

### Vá 09

Dùng revision hoặc transaction riêng cho hai bước. Dọn index không hợp lệ trước khi retry một lần tạo concurrent thất bại. Khi downgrade, có thể thu hồi các phiên bound theo batch trước khi bỏ cột, sau khi đã dừng cấp mới.

```python
# Revision thêm cột
op.execute("SET LOCAL lock_timeout = '2s'")
# Revision tạo index sau khi transaction thêm cột đã commit
with op.get_context().autocommit_block():
    op.create_index("idx_sessions_previous_refresh_hash", "sessions",
                    ["previous_refresh_hash"], schema="public",
                    postgresql_concurrently=True)
```

### Vá 10

Trần ứng dụng bảo vệ parser. Trần transport mới giới hạn message đang được server đệm và giải nén. Định cỡ trần transport theo cả frame auth và audio.

```python
text = await websocket.receive_text()
if len(text) > 13_000 or len(text.encode("utf-8")) > 13_000:
    raise AuthError("invalid_token")
frame = json.loads(text)
```

### Vá 11

```python
# Trong transaction khóa hoặc xóa tài khoản
await db.execute(update(Sessions).where(Sessions.user_id == user.id)
                 .values(is_revoked=True))

# Trước khi cấp refresh hoặc quyền API thông thường
if user.deleted_at or user.is_banned:
    raise AuthError("session_revoked")
```

### Vá 12

Chuẩn hóa danh sách origin từ cấu hình thành origin WS trước phép so khớp. Cho phép local WS bằng cấu hình development.

```typescript
if (!trustedSocketOrigins.has(socketUrl.origin) ||
    (process.env.NODE_ENV === "production" && socketUrl.protocol !== "wss:")) {
  throw new WebSocketConnectionError();
}
```

### Vá 13

Dùng path đã làm sạch ở access logger của ASGI và ingress, ghi status bằng field riêng. Thay query credential bằng vé phù hợp cho client legacy, và bỏ các header nhạy cảm khỏi log ở dạng có cấu trúc lẫn string.

```python
def access_log_path(request_target: str) -> str:
    return request_target.partition("?")[0]

logger.info("Gamification socket closed user_id={}", user.id)
```

### Vá 14

```python
elif proof is not None:
    raise AuthError("invalid_dpop_proof")
elif not (settings.AUTH_ALLOW_COOKIE_COMPAT if from_cookie
          else settings.AUTH_ALLOW_UNBOUND_BEARER):
    raise AuthError("invalid_token")
```

### Vá 15

Dùng prefix tin cậy chỉ khi mode triển khai quy định `raw_path` đã bị strip. Validate tại startup, tránh dùng forwarded header do client gửi.

```python
if settings.PUBLIC_PATH_STRIPPED_BY_PROXY:
    path = settings.PUBLIC_API_PATH_PREFIX + path
return origin + path
```

### Vá 16

Callback chỉ lưu kết quả OAuth tạm thời theo handle một lần, TTL ngắn. FE đổi handle bằng DPoP đang giữ hoặc khóa đã stage từ trước khi đi OAuth. Chỉ sau khi khớp state, phiên và khóa mới lưu liên kết hoặc cấp phiên.

```python
# POST /github/finish, sau khi xác thực DPoP
pending = await consume_oauth_result_once(handle, sid=identity.sid, jkt=identity.jkt)
await complete_github_link(db, identity.user_id, pending)
```

### Vá 17

```python
# Sau kiểm tra auth thành công, trước khi phát dữ liệu riêng
await websocket.send_json({"type": "auth_ok"})
```

```typescript
if (isDpopMode && awaitingAuth && type === "auth_ok") finish();
// Timer khi chưa có ACK gọi fail, không gọi finish.
```

### Vá 18

Ghi history trong transaction xoay, giữ tới khi phiên hết hạn hoặc bị dọn. Khớp proof và chủ phiên trước hành động thu hồi.

```python
db.add(SpentRefreshHash(session_id=session.id, token_hash=token_hash,
                        rotated_at=rotated_at))
```

### Vá 19

Sinh nonce theo response và chuyển nonce sang các script Next. Thiết lập header enforce sau khi nguồn cần thiết đã được kiểm trên build production.

```typescript
headers.set("Content-Security-Policy", verifiedPolicyWithNonce(nonce));
headers.set("Referrer-Policy", "no-referrer");
```

### Vá 20

Snapshot và các phép gọi Redis chạy trước row lock. Sau khi lấy khóa, kiểm lại toàn bộ `sid`, `jkt`, `is_revoked`, thời hạn, hash hiện tại và previous hash. Nếu snapshot đã cũ, đọc lại và quyết định theo revision, không tiêu thụ cùng proof thêm một lần.

```python
snapshot = await read_refresh_session(token_hash)
await verify_refresh_proof_and_claim_jti(snapshot, request, token)
cached = await read_grace_chain_with_deadline(token_hash)
await db.execute(text("SET LOCAL lock_timeout = '2s'"))
session = await lock_and_reread_session(snapshot.id)
return await rotate_or_return_current_grace(session, snapshot, cached)
```

## Giả định và giới hạn

- Chỉ đọc mã và tài liệu trong phạm vi người dùng liệt kê. Không chạy PoC, test login, truy vấn dữ liệu thật, dựng dịch vụ hay áp dụng bản vá. Tệp báo cáo là thay đổi duy nhất của đợt rà soát.
- CORS và cài log filter thực tế, reverse proxy/ASGI, Redis ACL/AOF, giới hạn kết nối và OTP ngoài ứng dụng, thao tác admin khóa tài khoản, `AgentService.principal_async()`, caller WebSocket, Server Component/layout, bundle/RSC và các route ngoài phạm vi chưa được xác minh. Mục checklist liên quan ghi rõ phần có thể kết luận từ mã.
- Đánh giá JWT dựa trên cấu hình mặc định HS256, khóa ký đủ mạnh và bí mật, và worker hiểu `cnf`. Đánh giá khóa browser dựa trên WebCrypto và ngữ cảnh HTTPS production. Không kiểm tra nội dung `.env` thật.
- Trước khi bật production cần xác nhận qua hai build cookie/DPoP và qua ingress thật, đặc biệt response CORS với origin tin cậy và origin lạ, refresh đồng thời, mất phản hồi refresh, thu hồi socket đang mở, log truy cập, RSC của trang có dữ liệu nhạy cảm và thời gian giữ khóa migration.

## Phát hiện ưu tiên

1. **DPOP-01 và DPOP-02, High.** OTP có thể kích hoạt mật khẩu do người đăng ký trước chọn. Kiểm OTP cũng thiếu ngân sách thử ở handler và tiêu thụ mã nguyên tử.
2. **DPOP-03 và DPOP-04, Medium.** POST dùng cookie thiếu kiểm tra CSRF tại ứng dụng. WebSocket Gamification mở sẵn vẫn nhận sự kiện sau khi phiên bị thu hồi.
3. **DPOP-06, DPOP-07 và DPOP-08, Medium.** Redis lưu cặp token plaintext. Retry cookie trễ có thể thu hồi cả phiên khỏe, còn một lần mất mạng có thể làm phiên DPoP mắc kẹt sau reload.
4. **DPOP-05 và DPOP-09, Medium.** Redis lỗi cho phép GET có proof hợp lệ bỏ kiểm replay. Migration tạo index thường có thể giữ khóa bảng sessions trong quá trình lên phiên bản.
