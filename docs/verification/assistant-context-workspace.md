# Ngữ cảnh có giới hạn và MCP workspace

## Sửa lượt chat dài/phụ đề (giai đoạn extractive, đã được thay thế)

Bản nén ngữ nghĩa hiện tại được mô tả tại `docs/verification/semantic-context-checkpoint.md`; phần dưới ghi lại bước rút gọn ban đầu. `context_compaction.py` dựng working context có giới hạn, giữ nguyên yêu cầu hiện tại và dữ liệu gốc trong DB. Chỉ giữ sáu tin gần nhất, bản trích lịch sử cũ ngắn, bộ nhớ liên quan, schema tool tối giản và trích đoạn kết quả công cụ. Việc rút gọn là extractive, có nhãn phần bị lược bỏ; không phải bản tóm tắt ngữ nghĩa bảo đảm giữ mọi chi tiết.

Không còn tự nạp cả sáu phần overview/transcript/resources/notes/exercises/quiz cho mỗi câu hỏi. Nội dung được đọc theo nhu cầu. Với video, công cụ phụ đề mặc định lấy khoảng 5.000 ký tự quanh thời điểm đang xem; yêu cầu tổng quan lấy sáu trích đoạn rải trên nguồn. `at_seconds` cho phép chọn mốc cụ thể. Đọc trang offset tường minh vẫn được hỗ trợ. `read_scope` và cờ rút gọn phân biệt trích đoạn với toàn văn; không tự nhận đã đọc hết.

Prompt thông thường nhắm tối đa 24.000 ký tự, editor 18.000 ký tự; không cắt yêu cầu user hoặc làm hỏng schema để ép vừa. Lượt đọc nguồn thông thường tối đa bốn vòng model, dành vòng cuối trả lời và không tiếp tục phân trang sau ba kết quả. Editor giữ tối đa sáu vòng với context nhỏ hơn. Không tăng ngân sách để che lỗi. Chào hỏi trả một câu; mặc định câu trả lời 3–5 câu/ba ý. Activity có sự kiện `context.compacted`, không chứa suy luận riêng tư.

## Công cụ dùng chung qua MCP thật

`workspace_mcp.py` dùng SDK MCP v1.30 hiện cài, handshake và call_tool qua memory transport. Cơ chế này không mở một endpoint điều khiển máy tính công khai. Browser callback gắn riêng với run/client đã xác thực, tiếp tục dùng action ID/revision/receipt/approval của runtime.

- `mcp.browser_snapshot`: DOM đang hiển thị, tên điều khiển và target ID mới. Loại chat của trợ lý, vùng đánh dấu riêng tư, mục ẩn, trường bí mật. Không đọc desktop, pixel ảnh/video hoặc iframe khác nguồn.
- `mcp.browser_click` / `mcp.browser_fill`: dùng snapshot/target ID và tên chính xác, cần xác nhận trước. Từ chối ID cũ, mục nhạy cảm, gửi form và điều hướng link sang trang khác. Fill không ghi đè khi người dùng đã gõ tiếp. Nghiệp vụ điểm/tiến độ/video vẫn ưu tiên các tool domain đã kiểm tra quyền, không suy ra DB từ DOM.
- `mcp.bash`: chỉ gọi runner Piston được cấu hình; không có shell máy chủ làm dự phòng. Chỉ truyền script và tối đa tám tệp tường minh, giới hạn thời gian 10 giây, RAM 128 MB, stdout/stderr có giới hạn. Workspace mới mỗi lần, không tự có repo, DB, cookie hay token app. Kết quả Bash không phải điểm chấm bài chính thức. Đây là nền tảng web/sandbox, chưa phải môi trường desktop/repo bền vững như một coding agent đầy đủ.

MCP là giao thức, không tạo bảo đảm cách ly; cách ly Bash đến từ Piston riêng và cấu hình mạng/runtime của deployment.

## Bằng chứng kiểm tra

- Unit: 318 ca trong nhóm routing/memory/context/MCP/voice/security/budget/provider; một fixture thiếu snapshot được phát hiện và sửa, bộ liên quan 40 ca chạy lại đạt. Không cộng các lượt chạy lặp vào tổng.
- PostgreSQL tách biệt: 49 ca đạt, gồm chat dài + ba trang phụ đề vẫn trả lời trong ngân sách; nội dung đầy đủ vẫn đọc qua API paging; toàn luồng MCP browser chờ receipt thật trước khi hoàn tất.
- Browser headless, DOM/ActionRegistry thật: vùng riêng tư/bí mật/ẩn không lọt snapshot; click cập nhật DOM; ID cũ bị chặn; không ghi đè người dùng gõ tiếp; fill cần approval. Chạy `node tests/browser/assistant-workspace.cjs` từ FE với Playwright/Chromium đã cài.
- MCP + Piston thật: script đọc đúng tệp gửi kèm, exit 0; tệp ghi ở lượt trước không tồn tại ở lượt kế tiếp; các biến credentials ứng dụng không có trong chương trình. Không dùng tài khoản hay repo thật làm fixture.
- Frontend TypeScript và `git diff --check` đạt.

Đây chưa phải phép đo lại toàn bộ cuộc hội thoại thật người dùng gửi. Timeout do provider vẫn có thể xảy ra; kiểm thử context xác minh ngăn phình prompt và cạn ngân sách do tự đọc phụ đề liên tục, không cam kết mọi lỗi mạng đã hết.
