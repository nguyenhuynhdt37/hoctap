# Kiểm tra đối kháng Agent — memory, advisor và voice

## Lỗi đã sửa và bằng chứng

**Race giữa ghi memory và thu hồi consent.** Trước sửa, `propose_async` có thể đọc consent đang bật, đợi truy cập/evidence, rồi commit nội dung sau khi request khác đã tắt consent và xóa memory. Nay mọi mutation memory dùng transaction advisory lock theo user, kể cả khi chưa có consent row. Consent và các row khóa được đọc mới từ database. Test PostgreSQL mở hai connection độc lập, dừng proposal sau admission, cho revocation chạy đồng thời, xác minh revocation đợi proposal rồi xóa nội dung cuối cùng và tắt consent.

**Xác nhận conflict làm thay đổi tombstone đã xóa.** Proposal thay thế một memory có thể được tạo trước khi memory cũ bị xóa; trước sửa, confirm chuyển tombstone cũ từ `deleted` sang `superseded`. Nay chỉ thay thế memory đang `confirmed` và chưa hết hạn; trạng thái được kiểm tra lại lúc confirm. Proposal cũ bị từ chối 409 sau khi target bị xóa. Nội dung/evidence đã xóa không được khôi phục, fingerprint bị xóa hoặc superseded không tự tạo lại. Confirm lặp của item đã confirmed trả cùng item.

**Summary dẫn xuất tái xuất hiện sau khi tắt memory.** Trước sửa, mỗi lượt conversation có thể tạo lại bảng summary dù consent đã tắt và summary vừa bị xóa. Nay context cùng thread vẫn dùng các tin nhắn được phép đọc làm context tạm thời, nhưng chỉ persist summary projection khi consent đang bật. Projection creation và việc thu hồi consent được serialize cùng lock. Kiểm thử xác minh không có projection khi tắt, có khi bật và không tái tạo sau thu hồi.

**Advisor context không giới hạn số chương.** Nay chỉ lấy tối đa 101 chương để phát hiện vượt giới hạn, trả tối đa 100 chương và công khai limitation khi bị cắt. Tiêu đề được chuẩn hóa và giới hạn độ dài. Advisor vẫn dùng tiêu chí metadata xác định, không có model hoặc tool tài chính để tuân theo prompt injection trong câu hỏi. Test yêu cầu bịa `98% fit` và checkout không tạo phần trăm hoặc giao dịch; goal alignment vẫn `unknown`.

## Các boundary đã đọc

- `agent/memory.py`, `agent/advisor.py`, `agent/voice.py`, `agent/tools.py`, các route memory/advisor, runtime execution/approval/receipt và `main.py`.
- Memory API chỉ thao tác user đã xác thực; model chỉ có `memory.read` và `memory.propose`, không có tool tự confirm hoặc tự bật consent.
- Evidence message được ràng buộc owner/thread/scope. Các memory kind không bao gồm psychological profile hoặc inferred mastery.
- Voice binding kiểm tra auth session và lesson; danh sách alias lấy từ registry/capabilities. Tool execution dùng persisted runtime chung, task bị hủy khi interruption. Client receipt không được coi là bằng chứng grading server.
- Không có approved MCP use case hoặc connector; P7 tiếp tục unavailable có chủ đích. Không thêm endpoint nhận MCP server URL từ model.

## Phát hiện chuyển cho chủ module

- Shared frontend Markdown renderer từng trả raw HTML khi nội dung bắt đầu bằng `<` dù `isHtml=false`. Frontend owner đã sửa bằng allowlist parser ở `safe-html.ts`; reviewer đã đọc boundary mới áp dụng cho cả HTML legacy và Markdown, loại active markup/unsafe URLs/attributes. Regression frontend do owner báo cáo riêng; không dùng lọc prompt để che lỗi renderer.
- Runtime navigation từng cho phép chỉ vì trong câu có keyword như `mở`, kể cả câu phủ định/đang trích dẫn. Runtime owner đã bổ sung `navigation_requested` với imperative prefixes, loại quoted/code text và phủ định, phân biệt open/close, hướng next/previous và yêu cầu tốc độ cho playback-rate. Reviewer đã đọc thay đổi và regression assertions.
- Payload memory trong tool/event/approval có thể giữ bản sao nội dung sau khi memory row bị xóa. Runtime owner đã thêm `durable_tool_data`: memory telemetry chỉ giữ IDs/scope/status/count và quyền sở hữu; content/evidence không được sao chép vào các durable tool payload. Nội dung tác vụ/tin nhắn do người dùng gửi vẫn thuộc conversation history riêng; xóa memory không đồng nghĩa xóa history.
- CORS wildcard legacy còn được ghi nhận trong architecture audit; không tự đổi main trong đợt review này. Cần cấu hình origin/cookie tương ứng khi chuẩn bị môi trường production.

Các thay đổi thuộc module khác được reviewer đọc source; kết quả kiểm thử module đó được tổng hợp riêng bởi root và owner. Không xem source inspection là browser E2E.

## Tests

Trên bản sao PostgreSQL đã migrate, `tests/integration/test_agent_memory_races.py` cùng `test_agent_memory_advisor.py`: **6 passed**. Gồm 3 test mới đối kháng và 3 test lifecycle/isolation/advisor có sẵn.

`tests/unit/test_agent_memory_advisor.py`: **7 passed** sau thay đổi memory scope và advisor.

Lệnh chạy từ backend, integration cần `TEST_DATABASE_ASYNC_URL` của database thử độc lập:

```sh
.venv/bin/python -m pytest tests/unit/test_agent_memory_advisor.py -q
.venv/bin/python -m pytest tests/integration/test_agent_memory_races.py tests/integration/test_agent_memory_advisor.py -q
```

Không dùng LLM-as-judge để chấm quyền, consent, deletion hoặc grading. Không sửa database nguồn hoặc deploy trong đợt review này.

## Tutor legacy input và OCR

Bổ sung giới hạn HTTP: message tối đa 12.000 ký tự, tối đa 5 ảnh, OCR kèm mỗi ảnh tối đa 12.000 ký tự, URL/metadata có giới hạn. Upload đọc tối đa 10 MB + 1 byte để phát hiện quá cỡ; xác minh raster MIME khớp bytes và giới hạn 16 triệu pixels trước khi gọi storage hoặc OCR. SVG/ảnh giả/ảnh quá lớn bị từ chối.

OCR khởi tạo và chạy ngoài event loop. Mỗi worker chỉ có một OCR job; thời gian chờ slot và chờ kết quả hữu hạn. Khi request bị hủy hoặc hết thời gian, thread đang chạy không thể cưỡng bức dừng trong Python, nên slot vẫn được giữ đến khi thread thật sự kết thúc. Không thả slot sớm để khởi chạy nhiều job CPU cùng lúc. OCR metadata từ client được ghi rõ là dữ liệu người học chưa xác minh lại, không phải nguồn RAG hoặc memory fact.

`tests/unit/test_tutor_upload_bounds.py`: **6 passed**, gồm actual-size bound, bytes/MIME, pixel limit, OCR result size, schema limits và cancellation/worker-slot invariant. Các test dùng OCR/storage fixtures; không tuyên bố đã kiểm thử model EasyOCR thật.
