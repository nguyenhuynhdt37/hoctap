# Audit công cụ, context và memory của Mây Mây

> Snapshot trước triển khai MCP. Yêu cầu tiếp theo đã bổ sung công cụ và ngữ cảnh; trạng thái hiện tại xem [agent-lesson-context-mcp.md](../architecture/agent-lesson-context-mcp.md). Các số liệu nguồn video cũ vẫn là kết quả audit tại thời điểm kiểm tra.

Kiểm tra ngày 13/11/2026 trên workspace/backend local. Đây là audit thực trạng; không cài connector, không gửi bài lên GitHub và không thay đổi dữ liệu học viên. Chỉ đồng bộ hai cột còn thiếu (`user.promotional_email_opt_in`, `course_enrollments.archived_at`) trên DB thử `maymay_agent_verify_9f7095b1ed` để chạy lại tests.

## Kết luận

Chưa đủ khả năng cho use case trợ giảng tìm web và chấm bài từ GitHub. Runtime đang bật (`AGENT_ENABLED=True`) và có 32 công cụ nội bộ, nhưng không có MCP client/server configuration, web-search adapter hoặc GitHub connector trong backend. Công cụ được kết nối cho coding agent phát triển dự án không tự xuất hiện trong trợ giảng sản phẩm.

## Các khoảng trống

1. **Cao — chưa có web/GitHub.** Registry tại `app/agent/tools.py` chỉ có learning, knowledge, catalog, UI, video, editor, code attempts và memory. Không có tìm web, lấy repo/PR/file/commit, OAuth/GitHub App mapping hoặc assignment submission từ GitHub. `knowledge.search_lesson` là tìm dữ liệu nội bộ theo quyền; không phải search web. Piston hiện chạy file code theo bài tập nội bộ, chưa phải pipeline checkout repo/install dependencies/build/browser-test để chấm dự án web.
2. **Cao — nguồn bài chưa đủ để đối chiếu chính xác.** Khóa có tên chứa JavaScript trong DB local có 53 bài video, 51 bài có chunk có embedding/văn bản. Có 377 chunk và toàn bộ đang `source_kind=unknown`, `timestamps_verified=false`. Bài “Tại Sao Bạn Nên Chọn Khóa Học Này” có 0 chunk. Có vector không đồng nghĩa transcript thật hoặc mốc video đã kiểm chứng; cần ingestion nguồn thật trước khi hứa trả lời chính xác theo video.
3. **Vừa — nhãn context dễ gây hiểu nhầm.** `runtime.py:run_async` phát `context.resolved.sources` cố định gồm authorized_domain/client_screen/owned_thread. Frontend gắn authorized_domain thành “Nguồn bài học” dù mới có metadata bài, chưa retrieval transcript. Đây không phải citation thực; nên phân biệt metadata, nội dung đã truy xuất và nguồn ngoài.
4. **Vừa — nhìn thấy tab ghi chú không có nghĩa đọc được ghi chú.** Snapshot chỉ mang tab/panel/video/editor metadata, registry chưa có tool đọc note. Nội dung “phần này tôi cần học lại” trong ghi chú không tự vào prompt hoặc long-term memory. Cần read tool theo owner + lesson và timestamp nếu muốn use case học lại từ ghi chú.
5. **Vừa — context hội thoại dài có giới hạn rõ.** `conversation_context_async` dùng tối đa 200 tin gần nhất, 12 tin recent cắt từng tin ở 2.500 ký tự; phần cũ là trích đoạn lời học viên (tối đa 6.000 ký tự), không phải bản tóm tắt toàn bộ lời giải. Buffer code đang mở được lấy qua tool riêng; repo GitHub chưa có đường vào context.
6. **Thấp — UI memory chưa cập nhật ngay theo proposal.** Backend phát `memory.proposed`, nhưng MemoryControls không subscribe event này; danh sách tải lại khi mở modal hoặc sau thao tác. Consent badge tải lúc mount, chưa đồng bộ thay đổi từ tab khác. Quyền backend vẫn được kiểm tra; đây là vấn đề trạng thái hiển thị.

## Các nền tảng đã kiểm chứng

- Session/run ràng buộc user + auth session, idempotency và khóa active run; tool không đăng ký bị từ chối.
- Snapshot đánh dấu client-reported, giới hạn schema/revision; đọc code buffer riêng, patch cần preview + xác nhận. UI receipt không được dùng làm bằng chứng chấm điểm server.
- Chỉ đọc kết quả code/quiz thuộc người học và bài hiện tại; teacher solution/hidden tests không được đưa vào ngữ cảnh trợ giảng.
- Memory tắt mặc định khi chưa consent. Agent chỉ đề xuất, user confirm mới dùng; scope profile/course/lesson, evidence thuộc owner, expiry, xóa/tắt và tombstone chống tái tạo. Advisory lock bảo vệ race proposal/revocation. Xóa memory không xóa lịch sử chat.
- Có giới hạn token/call/deadline; giá trị usage và chi phí thực từ provider cần đánh giá riêng.

## Kiểm thử chạy trong lần audit

- 87 unit tests pass: runtime, memory/advisor, budgets, voice adapter, learning security, transcript provenance và tutor context.
- 25 integration tests pass trên PostgreSQL thử: memory lifecycle/isolation/concurrency, runtime receipts/approval/auth, code/quiz access và retrieval provenance. Lượt đầu bị schema drift của DB thử; kết quả pass là sau khi đồng bộ đúng hai cột nêu trên.
- Không chạy web-search/GitHub E2E vì các connector đó chưa được triển khai; không coi tests nội bộ là chứng nhận chất lượng chấm bài GitHub hoặc production.

## Thứ tự bổ sung để chấm bài GitHub

1. GitHub App/OAuth theo học viên, quyền đọc repo được chọn; xác thực bài nộp gắn lesson/assignment + commit SHA cố định. Public repo có thể đọc không cần kết nối tài khoản; private repo cần quyền riêng.
2. Tool đọc cây/file/diff với giới hạn dung lượng, nguồn owner/repo/path/SHA; không chạy script từ repo trong API process. Web search là nguồn ngoài có URL/ngày lấy, phân biệt với bài giảng.
3. Rubric do giảng viên khai báo; lấy code tại SHA, sandbox build/test riêng; bài web cần browser tests phù hợp. Model giải thích theo bằng chứng, điểm chính thức cần grading policy và kết quả test server, không dựa vào câu tự khai của repo.
4. Memory chỉ giữ mục tiêu/điểm cần ôn được xác nhận, tham chiếu kết quả attempt; không lưu token hoặc toàn bộ repository vào memory.
