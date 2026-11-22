# Kiểm thử chọn công cụ và bộ nhớ dài hạn

Bộ dữ liệu `studynest_be/tests/evals/assistant_routing_cases.json` có **99 tình huống đặt kỳ vọng trước**: câu nói thường, kiến thức chung, hồ sơ, memory, GitHub/web, SQL/tiến độ, nội dung bài, ảnh, câu ghép, tiếng Anh, Unicode tổ hợp, trích dẫn/code và điều khiển màn hình. Có cả câu nhắc đến “bài này” nhưng thực sự hỏi tên/bộ nhớ hoặc xin hỏi ngoài bài. Đây là kiểm thử hành vi, không phải cam kết hiểu mọi cách diễn đạt.

## Phạm vi xác minh

- Unit: ma trận relevance/grounding; chuẩn hóa Unicode; hỏi tiếp theo chủ đề trước; chọn quote; loại giả định, prompt injection, thông tin nhạy cảm, câu hỏi, việc nhất thời và opt-out; cấu trúc JSON lỗi không phá câu trả lời; adapter/voice/budget/security.
- PostgreSQL riêng: save/update/duplicate/delete; tombstone theo hash chủ đề; phân quyền message/thread; tắt consent trong lúc chờ model; race hai writer; thời hạn lưu và giới hạn 100 mục; thất bại ghi memory không phá chat; không nạp bài và không gọi RAG ngoài phạm vi; dùng lại kết quả search; đổi chủ đề rồi hỏi tiếp.
- Provider thật + PostgreSQL: một tài khoản giả lập nói cách học bằng sơ đồ/ví dụ; model chọn quote, DB giữ không hết hạn, lượt sau nhớ lại đúng và không gọi knowledge.
- Provider thật với 18 đầu vào giả lập: quan sát công cụ thực sự được model chọn và các quote vượt qua validator; không thực thi công cụ hoặc thay đổi tài khoản người dùng.

## Chạy lại

Từ `studynest_be/`:

```sh
.venv/bin/python -m pytest tests/unit/test_assistant_routing_matrix.py tests/unit/test_semantic_memory.py -q
```

Dùng database **dùng riêng để kiểm thử**, có schema/fixture tương ứng migration `w01mn345i678`, đặt cả `DATABASE_ASYNC_URL` và `TEST_DATABASE_ASYNC_URL` tới database đó:

```sh
.venv/bin/python -m pytest tests/integration/test_semantic_memory.py -q
RUN_LIVE_MODEL_EVAL=1 .venv/bin/python -m pytest tests/integration/test_semantic_memory_live.py -q
```

Đánh giá provider tốn lượt gọi thật, chỉ dùng dữ liệu giả:

```sh
.venv/bin/python scripts/eval_assistant_routing_memory.py --live --output /tmp/assistant-eval.json
```

Có thể chạy riêng ca lỗi bằng `--case-ids lesson-summary`. Báo cáo ghi tool, số quote được chọn/được chấp nhận, thời gian và loại lỗi; không ghi credentials hoặc nội dung người dùng thật.

## Kết quả và giới hạn

Bộ unit cuối: **285 passed + 13 subtests**. Bộ PostgreSQL/runtime/playback và live lifecycle: **39 passed**; sau bổ sung theo dõi chủ đề, riêng bộ semantic integration cuối **18 passed**, gồm bốn ca mới theo dõi chủ đề và một ca hỏi tiếp thiếu ngữ cảnh. Tổng phạm vi DB đã đạt là **44 ca riêng biệt**, không cộng lượt chạy lặp.

Đợt live đầu dùng streaming có 12/18 ca đạt, 6 timeout ở ngưỡng 60 giây. Kiểm tra lại với JSON không streaming: 5/6 đạt; ca tóm tắt cuối đạt khi dùng đúng timeout 90 giây của runtime, thực tế 38.14 giây. Độ trễ provider vẫn biến động, không coi timeout ban đầu là đạt hoặc khẳng định transport đã loại bỏ toàn bộ timeout. Sau khi siết câu hỏi tiếp không có lịch sử, raw-planner eval ca đó vẫn timeout 90 giây. Runtime thực tế hiện trả câu hỏi làm rõ trực tiếp cho tình huống này, không gọi model/tool; ca PostgreSQL riêng xác minh đường đi này. Không tính raw-planner timeout là thành công.

Model chọn key chủ đề không hoàn toàn ổn định giữa mọi cách nói. Quote phải có bằng chứng nguyên văn; các thông tin hữu ích diễn đạt quá mơ hồ có thể không được lưu. Voice trích chọn nền là best effort; memory đã ghi thành công nằm trong PostgreSQL và tách khỏi lịch sử/context có giới hạn.
