# Mây Mây Agent Runtime V2 — hợp đồng vận hành

Runtime là module trong FastAPI. Tutor Chat/thread, RAG, Catalog, Piston và Gemini Live tiếp tục là các service/domain hiện có. Model chỉ đề xuất công cụ; backend quyết định quyền, approval, state và bằng chứng hoàn tất.

## Khởi chạy an toàn

`AGENT_ENABLED=false` mặc định. Chỉ bật sau khi chạy đầy đủ migration trên bản sao thử nghiệm và chọn cấu hình provider phù hợp. Production migration/deploy là thao tác riêng; tài liệu này không tuyên bố đã deploy.

| Cấu hình | Mặc định | Ý nghĩa |
|---|---:|---|
| `AGENT_RUN_MAX_SECONDS` | 240 | Deadline toàn run, gồm chờ approval |
| `AGENT_MODEL_TIMEOUT_SECONDS` | 90 | Timeout mỗi model call; không vượt deadline run |
| `AGENT_MAX_TOOL_CALLS` | 12 | Tổng số lần dispatch mỗi run |
| `AGENT_MAX_ITERATIONS` | 6 | Vòng gọi model tối đa |
| `AGENT_MAX_INPUT_TOKENS` | 40000 | Ngân sách input **ước lượng**, không phải usage/billing của provider |
| `AGENT_MAX_RUNS_PER_MINUTE` | 20 | Quota theo người dùng |
| `AGENT_MAX_SESSIONS_PER_HOUR` | 60 | Quota tạo phiên theo người dùng |
| `AGENT_EVENT_RETENTION_DAYS` | 30 | Retention payload run/event/tool và summary vận hành |
| `AGENT_MODEL` | rỗng | Theo model tutor/admin hiện tại; không giả định native function calling |

Lời chào và một số lệnh video/điều hướng đơn giản được giải bằng logic xác định. Các yêu cầu còn lại dùng adapter JSON đã validate với Pydantic. Không expose tool chưa đăng ký/không có capability frontend.

## HTTP và sự kiện

Auth dùng phiên đăng nhập hiện tại, Bearer hoặc cookie qua hệ thống auth sẵn có. `user_id` không nhận từ model/client. Agent session ID khác auth session ID và thread ID.

| API (sau `/api/v1`) | Input/kết quả |
|---|---|
| POST `/agent/sessions` | `page_instance_id`, `route`, course/lesson optional, `capabilities[]` → session |
| PUT `/agent/sessions/{id}/context` | Snapshot version1, revision tăng, timestamp có timezone, không chứa code content |
| POST `/agent/runs` | `session_id`, thread optional, message, idempotency key, channel → run |
| GET `/agent/runs/{id}` | State, response, usage ước lượng, final persisted `message` nếu đã hoàn tất |
| GET `/agent/runs/{id}/events?after=N` | SSE replay; `id:` là sequence; reconnect chỉ đọc, không dispatch lại |
| POST `/agent/runs/{id}/cancel` | Hủy các bước chưa hoàn tất; không giả định rollback |
| POST `/agent/runs/{id}/approvals/{id}` | `decision`, page instance, context revision |
| POST `/agent/runs/{id}/actions/{id}/receipt` | Receipt ràng buộc action/run/user/auth session/page/revision/lesson/expiry |
| GET `/agent/metrics` | Aggregate riêng của người dùng; không có chat/code/PII payload |

Event envelope: `{schema_version:1,id,run_id,sequence,type,timestamp,payload}`. Các event `run.started`, `context.resolved`, `plan.created/updated`, `tool.proposed/awaiting_approval/started/completed/failed/denied`, `ui.action_requested/receipt`, `message.delta`, `citation.validation`, `run.completed/partially_completed/cancelled/failed` dùng cùng semantics trên SSE và voice adapter.

`run.completed` chứa `message` đã lưu cho text. Voice tool run không ghi thêm cặp tin nhắn giả; voice relay lưu transcript thật và event tool run có `message:null`.

## Quyền và kiểm chứng

- Mọi tool kiểm tra lại phiên, trạng thái tài khoản và quyền bài học. Catalog chỉ lấy metadata công khai theo policy hiện hữu.
- Navigation yêu cầu ý định rõ trong lời người dùng, capability trên trang và receipt xác minh. Bài đích phải cùng khóa và được mở quyền.
- UI action không sử dụng selector hay thực thi script tùy ý. Snapshot là dữ liệu client có độ tin cậy thấp; backend kiểm tra course/lesson/exercise.
- Đọc code lấy buffer chưa lưu qua registered callback. Snapshot chỉ chứa file ID/revision/dirty/selection.
- Patch: đọc đúng file/revision → preview đã xác minh → approval hash của chính args → apply đúng revision → receipt. Không thể bỏ qua preview bằng lời model.
- Sample test receipt chỉ chứa gợi ý tìm bằng chứng. Backend đọc lại `CodeTestAttempt` thuộc chính người học/bài tập, sample mode, hash/revision và thời điểm tạo phù hợp; không tin PASS từ browser.
- Teacher solution và hidden tests không phải tool context của học sinh. Tool tài chính, shell, browser ngoài app không được đăng ký.
- Kết quả tool có envelope Pydantic `verified`, `evidence_kind`; editor read/patch có schema cụ thể. Client không được ghi đè trường authority.
- Câu hỏi bài học có bước retrieval bắt buộc ở runtime. Lỗi retrieval cho phép fallback có thông báo thiếu nguồn; không tự tạo citation. Số nguồn được cấp từ nguồn thật và inline index không hợp lệ được đánh dấu chưa xác minh.

## State, concurrency và recovery

PostgreSQL giữ `agent_sessions`, `agent_runs`, `agent_events`, `agent_tool_calls`, `agent_approvals`. Thread/message ID legacy được giữ. Event sequence cấp bằng atomic SQL update; transition thuộc backend.

Một active run trên mỗi user, bao gồm các tab và text/voice. Đây là chính sách cố ý thận trọng để tránh thao tác UI/editor xung đột. Duplicate idempotency key cùng payload trả run cũ; payload khác bị từ chối. Receipt trùng hoàn toàn có thể gửi lại; receipt khác cho cùng action bị từ chối.

Worker claim độc quyền `worker_id`, heartbeat mỗi10s. Maintenance mỗi15s dùng advisory lock để nhiều backend worker không chạy dọn trùng. Run vượt deadline hoặc heartbeat cũ hơn45s bị expired; tool/approval chờ bị đóng. **Không replay mutation** sau crash. Khi hủy/shutdown, hành động đã commit có thể vẫn còn và phải kiểm tra trạng thái thực trước retry.

Chuyển bài thủ công hủy run. Chuyển bài do navigation action đang chờ được chấp nhận đúng bài đích; receipt vẫn mang revision yêu cầu ban đầu. Revision UI thay đổi do chính action không đồng nghĩa rollback.

## Retention và hạn chế đã biết

Maintenance xóa payload run/event/tool đã terminal quá retention, giữ lịch sử Tutor Chat. Memory hết hạn được tombstone và xóa content/evidence. Summary vận hành cũ hoặc thread đã soft delete được xóa; không xóa tiến độ, enrollment hay giao dịch.

Các tests PostgreSQL dùng bản sao được chỉ định qua `TEST_DATABASE_ASYNC_URL`. Các tests tool/approval dùng fixture xác định, không được gọi là Live Voice/browser/Piston E2E. Provider selection smoke dùng metadata tổng hợp và model thật, không execute action; kết quả tại `docs/verification/agent-provider-selection.json`.

Provider usage/cost chính xác, tải đồng thời production, thiết bị Safari/iOS/microphone vật lý và độ tin cậy từng timestamp cần bằng chứng kiểm thử riêng. Không suy ra production-ready từ tests contract hoặc một số model probes.

## Ngân sách token và tiền

`AGENT_MAX_OUTPUT_TOKENS_TOTAL=12000` giữ tổng token output đã đặt chỗ; mỗi model request tối đa3000 và không retry sau phát nội dung. Input estimate, input byte-bound reservation, output reservation và provider-reported usage được lưu riêng trong `run.usage`, phản ánh qua event `budget.reserved`/`model.usage`. Không điền usage thực khi provider không gửi usage frame.

Giới hạn tiền tùy chọn: `AGENT_MAX_RUN_COST_USD`, `AGENT_MODEL_PRICES_JSON={"exact-model-id":{"input_per_million_usd":...,"output_per_million_usd":...}}`. Khi bật, model chưa có giá hợp lệ bị từ chối trước network call; input dùng upper bound theo UTF-8 bytes cộng overhead và output dùng max tokens đã gửi. Đây là admission theo giá operator khai báo, **không phải hóa đơn hay tiền thực đã thu**. Giá phải bao phủ các khoản charge của provider/router mà operator dùng. Nếu không khai báo giới hạn tiền, chỉ có token/call/deadline quota và trạng thái `monetary_limit_disabled_tokens_and_deadline_enforced`.

Voice tools fail closed khi bật monetary run cap vì phiên audio kéo dài không có charge accounting tương đương text; không tuyên bố hạn mức tiền voice đã được chứng nhận. `priced_reported_usage_usd` nếu có là phép tính từ usage provider báo và bảng giá khai báo, chưa phải đối soát hóa đơn. **Actual invoice accounting: NOT VERIFIED.**

Memory tools không lưu nội dung cá nhân vào tool/event/approval telemetry. Model nhận nội dung qua context tạm thời; durable telemetry chỉ giữ ID/scope/status/count. `memory.propose` tạo item pending theo consent + bằng chứng, event `memory.proposed` chỉ gửi ID để UI tải qua API có ownership. Chỉ user confirm API mới kích hoạt bộ nhớ.

## Ngữ cảnh bài và MCP public được bổ sung

Trạng thái hiện tại: [agent-lesson-context-mcp.md](agent-lesson-context-mcp.md). Runtime có 41 tools, gồm đọc đủ nội dung theo trang, ghi chú riêng, xác nhận hoàn thành có điều kiện và MCP tìm web/GitHub công khai. Không dùng token developer cho học viên; repo private và chấm điểm dự án qua sandbox chưa được triển khai.
