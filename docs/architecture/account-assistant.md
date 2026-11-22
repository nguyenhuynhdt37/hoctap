# Hannes: trợ lý theo tài khoản

Hannes trên trang chủ và trang học dùng cùng runtime, quyền hạn và memory theo `user_id`. Những công cụ phụ thuộc bài học/editor/video chỉ khả dụng khi màn hình đã đăng ký đúng ngữ cảnh và backend xác minh quyền.

## Memory và context lưu ở đâu?

| Dữ liệu | Nơi lưu | Vòng đời |
| --- | --- | --- |
| Hội thoại và bản chữ voice | PostgreSQL: `tutor_chat_threads`, `tutor_chat_messages` | Theo tài khoản; không bị tác vụ dọn run/event xóa |
| Thông tin đã xác nhận, mục tiêu, cách giải thích | PostgreSQL: `learning_memory_items` | Mặc định `expires_at = NULL`; người dùng có thể xóa hoặc chọn thời hạn |
| Tóm tắt hội thoại | PostgreSQL: `agent_thread_summaries` | Bản dẫn xuất có nguồn message ID; có thể dựng lại từ lịch sử gốc |
| Cài đặt giọng, tốc độ và mic | PostgreSQL: `learning_memory_consent.voice_settings` | Riêng tài khoản, dùng chung các thiết bị |
| Phiên agent, snapshot màn hình | PostgreSQL: `agent_sessions` | Ngắn hạn, có revision và thời hạn; không phải nguồn memory dài hạn |
| Context gửi model | RAM của từng lượt xử lý | Dựng từ hồ sơ tối thiểu, memory liên quan, lịch sử/tóm tắt, bài học và công cụ được phép |
| Khóa chống chạy trùng, voice ticket, OAuth state | Redis | Có TTL; không giữ bản memory duy nhất |

Memory `scope=profile` dùng chung ở mọi trang; `course` và `lesson` chỉ được nạp vào đúng phạm vi đã kiểm tra quyền. Mặc định tạo memory mới ở phạm vi tài khoản. Nhận xét suy đoán về năng lực vẫn cần người dùng xác nhận; thông tin bền vững do model chọn từ lời tự thuật có thể được backend lưu tự động khi consent bật.

Hai migration `r56hi890d123` và `s67ij901e234` cho phép hội thoại tài khoản, bỏ thời hạn bắt buộc và giữ bản ghi memory khi khóa/bài nguồn bị xóa. Xóa hẳn tài khoản vẫn cascade dữ liệu thuộc tài khoản đó. Các lượt run/event kỹ thuật tiếp tục có thời hạn riêng; không dùng chúng thay lịch sử chat. Memory đã bị xóa trước migration không được tự hồi sinh.

PostgreSQL cần volume bền vững và backup có kiểm tra khôi phục/PITR để bảo vệ trước sự cố hạ tầng. Thay đổi này xử lý chính sách lưu và quyền sở hữu; không tự thiết lập dịch vụ backup.

## Voice dùng chung

Provider nằm ở root ứng dụng và được tách theo tài khoản. Thu nhỏ chỉ đổi cách hiển thị; không tháo hook audio/WebSocket. Thanh bên dưới có mic, mở lại và kết thúc. Đổi trang bằng điều hướng trong ứng dụng giữ cuộc gọi; tải lại hoặc đóng tab kết thúc kết nối.

Mặc định dùng giọng Aoede và nhịp tự nhiên `1×`, hỗ trợ yêu cầu nhịp `0.75–1.25×` và sáu giọng. Nhịp được yêu cầu trong system instruction trước cuộc gọi, không đổi playbackRate vì làm thay đổi cao độ. Đây là yêu cầu gần đúng, không phải bộ kéo giãn âm thanh. Mic tắt automatic gain, lọc nền có thời gian giữ 300 ms để không cắt âm tiết nhỏ; server giảm độ nhạy bắt đầu nói và đợi khoảng nghỉ 700 ms. Ngưỡng mặc định `0.012`; có nút khôi phục giọng gốc. Trình phát giữ PCM tốc độ gốc, đệm đầu 80 ms để giảm hụt âm thanh do gói đến lệch nhịp và thử khôi phục AudioContext khi bị trình duyệt tạm dừng. Cài đặt được tải trước khi cho chỉnh để tránh ghi đè lựa chọn bằng phản hồi API đến muộn. WebSocket dùng ticket một lần, hạn 60 giây, không đưa access token vào URL.

## SQL sandbox

`data.query_account` chỉ nhận SQL, không nhận `user_id`. Backend dựng hai bảng SQLite tạm `my_courses`, `my_progress` bằng truy vấn ORM đã lọc chủ sở hữu và quyền đăng ký. SQL của model không chạy trên PostgreSQL.

Mỗi bảng tối đa 500 dòng; kết quả tối đa 100 dòng. SQLite bật `query_only`, authorizer allowlist và giới hạn thực thi khoảng 250 ms. Chặn ghi dữ liệu, ATTACH, PRAGMA, bảng hệ thống, extension và hàm ngoài danh sách. Có cờ thông báo khi bản dữ liệu bị cắt. API `/chat-sql/*` cũ trả 410 sau xác thực để không bỏ qua sandbox.

## Kết nối GitHub

Nút kết nối mở popup OAuth, dùng PKCE S256 và state một lần gắn với `user_id` cùng phiên đăng nhập. Callback lưu GitHub ID/login và token mã hóa vào `assistant_github_connections`; token không đưa vào prompt hoặc frontend. Công cụ GitHub chỉ gọi GET ở host cố định, dùng credential của đúng tài khoản. Kết nối công khai không được coi là đã xác thực tài khoản.

Cấu hình OAuth App:

```dotenv
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/api/agent/github/callback
```

Đăng ký callback đúng URL, đặt `FRONTEND_URL` theo môi trường và giữ `SECRET_KEY` ổn định để giải mã token đã lưu. Không đưa secret vào biến `NEXT_PUBLIC_*`. OAuth App xin `read:user repo` để đọc repo trong quyền được cấp; ứng dụng không triển khai công cụ ghi/commit. Tham khảo [luồng OAuth chính thức của GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).


## Đăng nhập GitHub

`POST /auth/github/start` mở OAuth với `read:user user:email`, PKCE và cookie nonce HttpOnly hạn 10 phút. Dùng chung callback `/api/agent/github/callback` với kết nối trợ lý; purpose và state phân biệt hai luồng. `github_auth_identities` giữ GitHub numeric ID gắn với user ID ổn định. Chỉ liên kết email khi cả email GitHub và tài khoản có sẵn đã được xác minh; không liên kết qua email công khai chưa xác minh. Memory tiếp tục thuộc user ID.

Ngắt kết nối repo không xóa danh tính đăng nhập. Token repo và refresh token được mã hóa; backend khóa hàng khi gia hạn để tránh dùng lại refresh token đã xoay. Giữ `SECRET_KEY` ổn định và sao lưu qua hệ thống quản lý secrets. GitHub scope `repo` cho phép rộng hơn chỉ đọc ở phía GitHub; Hannes giới hạn công cụ ở GET. Chỉ đăng nhập không yêu cầu `repo`, nhưng GitHub có thể giữ quyền đã cấp trước cho cùng OAuth App.


## Khám phá repo đã liên kết

`integrations.github` cấp trạng thái kết nối mới nhất cho planner; `data.github_connection` dùng chung cho chat và voice. `mcp.github_list_repositories` gọi GET `/user/repos` bằng token của chính user, hỗ trợ `page`, `per_page` (tối đa 50), `ownership=owner|all`; không nhận user ID, username hay token từ model. Token chỉ nằm trong ContextVar của task, không truyền sang MCP subprocess hay prompt.

Yêu cầu ngắn như “list github” và “liệt kê repo github” chạy công cụ trực tiếp và dựng danh sách Markdown từ dữ liệu thật. Trả tên/link, nhãn riêng tư và trang tiếp theo; không coi trang đầu là toàn bộ tài khoản. Các yêu cầu có lọc hoặc chọn repo đi qua planner với schema công cụ hiện hành. Nội dung metadata luôn là dữ liệu không đáng tin về chỉ thị. Repo tổ chức vẫn tuân theo quyền OAuth/SSO của tổ chức.


## Tiến trình thực hiện trong chat

Mỗi assistant message có `activity` từ sự kiện runtime thật: đọc ngữ cảnh, phân tích yêu cầu, kế hoạch công khai, công cụ bắt đầu/kết thúc/lỗi và thời gian thực thi. `AgentActivity` dùng chung ở chat trang chủ và bài học, mở khi đang xử lý và thu gọn sau khi xong. Chi tiết có đầu vào và bản kết quả giới hạn; không hiển thị reasoning/thought, credential, nội dung patch đầy đủ hay token. Nhãn Bash chỉ dành cho công cụ shell thật, không biến SQL/GitHub thành lệnh shell giả.

Lịch sử activity được tái dựng từ AgentEvent kết thúc liên kết ID tin nhắn, lọc chủ sở hữu AgentRun. Không thêm bản lưu reasoning hoặc schema mới. Truy vấn giới hạn 50 message/4000 event; preview chỉ giữ 10 phần tử, 2000 ký tự mỗi chuỗi và loại khóa nhạy cảm. Callback SSE cập nhật activity ngay trong optimistic assistant message; history API khôi phục sau reload. Approval/dừng vẫn dùng runtime hiện có.


## Ảnh và nhập giọng nói

Chat trang chủ và bài học dùng agent đa phương thức. `POST /agent/attachments/image` xác minh ảnh, chuẩn hóa tối đa 1536 px/JPEG, bỏ EXIF và lưu dưới `private/users/<owner>/tutor-chat/`. Client nén trước upload, tối đa 3 ảnh/tin; chọn file, dán ảnh hoặc thả vào khung chat. Client không quyết định chủ sở hữu: backend chỉ đọc khóa ảnh riêng có cùng user ID, không tải URL tùy ý. Run liên kết user message bằng `input_message_id`; `TutorChatImages` giữ ảnh trong lịch sử. Khi hỏi tiếp, backend nạp ảnh của tin có ảnh gần nhất trong cùng thread trước thời điểm run, không dùng ảnh của thread/tài khoản khác.

Pixel ảnh được gửi trực tiếp vào model; OCR client không được tin hoặc dùng thay ảnh. Cấu hình local đang dùng `AGENT_VISION_PROVIDER=9router`, `AGENT_VISION_MODEL=ag/gemini-3.8-flash-low`; adapter gửi content image_url dạng data URI; ảnh dùng request không streaming. Giá trị mặc định trong Settings vẫn là Gemini để các môi trường chưa cấu hình không tự chuyển nhà cung cấp. Text chat giữ provider cũ. Ngân sách dự phòng 8192 input token/ảnh; chế độ giới hạn tiền tệ từ chối khi chưa có định giá ảnh. GIF dùng khung đầu; ảnh trong suốt được trải nền trắng trước JPEG.

Nút mic cạnh ô nhập ghi tối đa 60 giây, gửi âm thanh tạm đến `/agent/transcribe`, rồi điền bản chữ để người dùng sửa/gửi. Không tự gửi tin, không lưu audio vào R2/DB; server giới hạn 8 MB, 8 lượt/phút và 60 giây xử lý. Cuộc gọi voice là chế độ riêng: giữ bản chữ hai bên và nạp ảnh của cùng thread vào Gemini Live như image frames. Khi bấm gọi với ảnh đang chờ ở chat tài khoản, gửi ảnh trước rồi mới mở gọi; chỉ một chế độ dùng mic tại một thời điểm.


## Tránh tải thừa khi chat

Câu hỏi tên của chính người dùng ưu tiên tên đã xác nhận trong bộ nhớ, rồi mới dùng hồ sơ; không nạp ảnh, GitHub hoặc gọi model. Câu hỏi về bạn bè/tên vật trong ảnh vẫn dùng luồng thường. Không gắn ORM user sống vào context chạy qua rollback; lưu bản chiếu các trường hồ sơ cần thiết.

Khung chat ghép message hoàn tất từ SSE vào danh sách hiện tại. Chỉ tải đầy đủ lịch sử khi mở, xem trang cũ, chủ động tải lại hoặc lấy bản chữ sau cuộc gọi. Bộ nhớ và GitHub cập nhật lúc mở điều khiển/đổi dữ liệu/kết thúc OAuth, không chạy lại vì focus DevTools. Danh mục môn học cũng không revalidate khi focus.


## Bộ nhớ dài hạn do model lựa chọn

Khi consent bật, model chọn tối đa ba mệnh đề tự thuật bền vững trong tin nhắn hiện tại: tên gọi, công việc, sở thích, mục tiêu, cách học. Chat dùng trường `memories` trong cùng lượt chọn công cụ, không thêm lời gọi model trước khi trả lời. Voice hoàn tất transcript trước rồi chạy tác vụ trích chọn nền, tối đa hai tác vụ đồng thời/24 tác vụ chờ, timeout 12 giây. Thao tác nền là best effort: lỗi provider, quá tải hoặc tiến trình khởi động lại có thể làm một lượt chưa được trích chọn; không chặn âm thanh và không nhận đã lưu khi chưa ghi DB.

Backend chỉ lưu nguyên văn đoạn có trong tin nhắn user thuộc tài khoản/thread còn hoạt động. Câu hỏi, trích dẫn, giả định, chỉ thị công cụ, việc nhất thời, lời từ chối lưu và dữ liệu nhạy cảm bị kiểm tra lại. Không lưu suy diễn từ ảnh hoặc lời AI. Lựa chọn không hợp lệ không làm hỏng câu trả lời. Writer dùng khóa consent, kiểm tra lại quyền/tùy chọn sau model, chống trùng và giới hạn 100 mục xác nhận đang hiệu lực. PostgreSQL giữ dữ liệu theo tài khoản, mặc định không hết hạn; context là phần đọc có giới hạn, không phải nơi lưu duy nhất.

`source_type=model_selected_statement` phân biệt với xác nhận thủ công. Mỗi mục có quote/message nguồn và key chủ đề. Mục tự động mới có cùng key thay mục tự động cũ; không tự sửa mục thủ công. Khi xóa, content/evidence được xóa và `memory_key_hash` giữ dấu chặn theo chủ đề mà không giữ lời đã quên (`w01mn345i678`). Key do model chọn nên việc đồng nhất mọi cách diễn đạt không được bảo đảm tuyệt đối. Bộ nhận diện cũ còn là helper tương thích, không còn writer tự động của chat/voice.

## Phạm vi công cụ theo yêu cầu

`app/agent/routing.py` tách việc đang ở trang học khỏi việc hỏi nội dung bài. Câu hỏi cá nhân, memory, ảnh, GitHub, tiến độ hoặc kiến thức chung không mặc định RAG. Chỉ yêu cầu nội dung bài rõ ràng mới bắt buộc đối chiếu nguồn. Tool không liên quan bị loại khỏi danh sách cho model và chặn ở dispatcher. Phân loại phạm vi không thay thế kiểm tra quyền hiện có.

Với câu hỏi tiếp như “giải thích kỹ hơn”, backend đọc chủ đề user trước đó từ đúng thread/tài khoản, thay vì suy ra từ trang đang mở. Không có mốc trước thì trả câu hỏi làm rõ trực tiếp, không gọi model hoặc tìm bài. Đổi sang chủ đề cá nhân rồi hỏi tiếp không quay về RAG bài cũ. Cùng một truy vấn bài trong cùng run/revision được dùng lại kết quả đã xác minh. Các ngữ cảnh ngoài bài không tự tải toàn bộ transcript/resources/quiz của bài.

Agent nhận JSON hoàn chỉnh từ 9Router (`stream_override=False`); SSE của ứng dụng vẫn phát các bước tool trực tiếp. Các caller streaming khác giữ cấu hình cũ. Độ trễ provider còn biến động; đây không phải cam kết mọi lượt nhanh như nhau.


## Working context và session MCP workspace

Prompt được rút gọn theo request thay vì nạp toàn bộ bài; giữ lịch sử/nguồn gốc trong DB, không coi phần model thấy là kho lưu duy nhất. Video ưu tiên cửa sổ hiện tại hoặc trích đoạn tổng quan. Vòng cuối dành để trả lời, không bị next_offset ép phân trang vô hạn. Chi tiết và giới hạn ở `docs/verification/assistant-context-workspace.md`.

Ngoài MCP web/GitHub chỉ đọc, session workspace MCP cung cấp browser DOM snapshot, click/fill theo ID được xác nhận, và Bash trên Piston riêng. MCP v1 memory transport chuyển lời gọi qua đúng callback phiên, không tự có quyền OS. Browser không nhìn desktop/pixel video/iframe khác nguồn; Bash là workspace tạm với tệp tường minh, không phải repo checkout bền vững. Các tool nghiệp vụ vẫn giữ để xác minh quyền, điểm, tiến độ và điều khiển video chính xác.


## Semantic continuation checkpoints (supersedes extractive-only working context)

`semantic_compaction.py` now merges prior semantic state with complete new message/tool segments into typed goal/current-task/constraint/decision/completed/pending/fact/tool-result/uncertainty notes. Versioned JSON in AgentThreadSummary keeps a durable cursor, lease, pending coverage and owned evidence IDs. Recent turns are combined with this state rather than used as a substitute for history. Large tool bodies are consumed fully in resumable segments. Dedicated native Gemini compaction passed live semantic and PostgreSQL persistence checks; main chat/media model routes remain unchanged.

Partial backfills are explicit and can retrieve original thread evidence using memory.search_conversation/read_context_evidence. Background maintenance resumes pending cursors after restart. Semantic checkpoints remain separate from lifetime personal memory, and consent/thread deletion is checked again after model output. Details and actual provider failures are recorded in docs/verification/semantic-context-checkpoint.md.
