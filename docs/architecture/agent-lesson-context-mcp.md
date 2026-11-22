# Trợ giảng: ngữ cảnh bài đang học và MCP cài sẵn

## Hành vi hiện tại

Runtime có 41 công cụ. Khi xử lý một lượt chat, backend xác thực bài trong snapshot theo user/course/lesson và lắp ngữ cảnh: bài đang mở, trạng thái hoàn thành đã lưu, mục tiêu/mục lục khóa, phần mô tả, transcript hoặc chunks đang có, tài liệu đã lập chỉ mục, ghi chú của chính học viên, yêu cầu bài code/câu hỏi công khai, hội thoại và memory đã xác nhận.

Không nạp vô hạn vào một prompt: mỗi phần nội dung là trang tối đa 12.000 ký tự với `next_offset` và tổng độ dài. `learning.get_lesson_content` đọc tiếp phần dài hoặc đọc bài khác trong cùng khóa nếu đã được phép. `learning.get_course_context` phân trang 100 bài, đánh dấu `active_lesson_id` và thứ tự chương/bài. Danh sách bài không tự cấp quyền đọc bài còn khóa. Nguồn được tách khỏi chỉ thị của hệ thống, đáp án/hidden tests/teacher solution không được đưa vào các phần công khai.

`learning.get_notes` đọc ghi chú hiện tại từ DB theo user + lesson, gồm mốc giây. Ghi chú không được biến thành bằng chứng nội dung giảng viên hoặc tự lưu vào long-term memory. Badge context hiển thị “Thông tin bài học” thay cho nhãn dễ hiểu nhầm “Nguồn bài học”.

Nếu chưa có transcript/chunks, `learning.fetch_video_transcript` có thể lấy phụ đề thật của video YouTube hiện tại, phân trang và lưu citation cho lượt trả lời. Không tự sinh transcript khi YouTube không cho lấy phụ đề; không sửa/index lại dữ liệu bài trong thao tác đọc này. Các nguồn cũ `unknown` vẫn được công khai là chưa xác minh, không tự nâng thành timestamp thật.

## Hoàn thành bài và đồng bộ màn hình

`learning.complete_lesson` là công cụ backend, chỉ nhận yêu cầu rõ của chính học viên cho bài hiện tại. Câu trích trong README, lời phủ định hoặc yêu cầu hoàn thành một bài khác không cấp phép tool này. Lệnh đơn giản được dispatch xác định; các yêu cầu nhiều bước vẫn qua planner và quyền backend.

- Đã hoàn thành: trả trạng thái đã lưu, không tạo lại giao dịch tiến độ.
- Bài đọc: dùng dịch vụ hoàn thành hiện có sau khi học viên yêu cầu.
- Code: phải có code đã lưu vượt qua điều kiện test của dịch vụ hiện có; sample test hoặc lời model tự khai không đủ.
- Quiz: cần attempt server đạt 80%; video có quiz cần attempt đạt 70%. Hash bộ câu hỏi phải khớp nội dung hiện tại, không dùng kết quả từ đề cũ.
- Video không có attempt: vẫn cần xem đủ 30% qua trình phát; luồng player tự ghi hoàn thành như hiện có. Agent không tạo bằng chứng thời lượng xem để vượt điều kiện này. Tool đọc lại trạng thái server sau đó.

Sự kiện tool thành công yêu cầu frontend revalidate curriculum, active lesson và navigation. Memory proposal mới cũng yêu cầu tải lại modal; trạng thái consent được kiểm tra lại khi cửa sổ được focus. Memory không tự confirm.

## MCP được đóng gói

Dùng MCP Python SDK v1 qua stdio thật giữa backend và `python -m app.agent.mcp_server`. Đây là server do Mây Mây đóng gói, không phải kết nối tài khoản GitHub của người dùng hay một cấu hình MCP của coding agent phát triển dự án.

| Công cụ trong runtime | Khả năng |
|---|---|
| `mcp.web_search` | Tìm web công khai bằng DDGS, tối đa 5 kết quả có URL/đoạn trích |
| `mcp.github_repository` | Đọc metadata repo công khai và phân giải nhánh/ref thành commit SHA |
| `mcp.github_tree` | Cây file tại commit cố định, phân trang |
| `mcp.github_read_file` | File UTF-8 tối đa 200 KB tại commit, 12.000 ký tự/trang |

GitHub chỉ dùng API host cố định, không theo redirect, không nhận server URL tùy ý, không chạy shell/script của repo. Loại path traversal, tệp credential và file binary/quá cỡ; có timeout/output cap. MCP child không nhận database/JWT/GitHub credentials của máy phát triển. Nguồn web/repo là nguồn ngoài, citation có URL; GitHub có commit SHA. Không gửi nội dung riêng của học viên trong query tìm web.

Không cần API key cho cấu hình public hiện tại. Repo private cần tích hợp cấp quyền riêng theo học viên; chưa triển khai OAuth/GitHub App trong thay đổi này. Chưa có pipeline sandbox build/browser-test để chấm điểm chính thức cho repository. Có thể đọc và nhận xét code theo yêu cầu bài học; không tuyên bố đã chạy test hoặc đạt bài chỉ từ việc đọc repo.

## Cài đặt và kiểm tra

Từ `studynest_be/`:

```sh
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python scripts/verify_agent_mcp.py
.venv/bin/python scripts/verify_agent_mcp.py --live
```

`AGENT_ENABLED` vẫn là cờ runtime hiện hữu. `AGENT_MCP_ENABLED=True` bật server được đóng gói; có thể tắt để loại MCP tools khỏi danh sách model. Không thêm URL MCP ngoài tùy ý. Khi đổi dependency cần khởi động lại worker; ứng dụng dev có reload đọc source mới. `GET /api/v1/agent/tools` yêu cầu đăng nhập và trả trạng thái handshake thực để frontend hiển thị badge.

## Bằng chứng

- MCP live: initialize/list_tools, web search MDN, resolve repo `octocat/Hello-World`, đọc cây và README đúng commit đều thành công.
- Model thật + auth/API/PostgreSQL/browser thật trên DB riêng: model tự chọn `mcp.web_search` cho câu hỏi MDN và `mcp.github_read_file` để đọc README; câu trả lời có citation và SHA thật. Không giả lập tool output hoặc UI receipt trong các kiểm tra này.
- Browser desktop/mobile: badge MCP thật, lệnh connect trả đúng trạng thái; yêu cầu hoàn thành code chưa pass bị từ chối, không có page error.
- Các tests contract/security, context pagination, note isolation, completion authority, memory, provenance được lưu trong `tests/unit/test_agent_mcp.py`, `tests/integration/test_agent_lesson_context.py` cùng các suite agent hiện có.

Mọi integration/browser test dùng `maymay_agent_verify_9f7095b1ed`, không sửa bài học hoặc tiến độ của người dùng thật. Không deploy production hoặc cấp quyền repo riêng tư.

Kết quả cuối: **108 unit tests, 33 PostgreSQL integration tests, 9 frontend tests và TypeScript pass**. Bằng chứng mạng thật: [MCP live smoke](../verification/agent-mcp-live-smoke.json), [model tự gọi tool](../verification/agent-mcp-real-model.json).
