# Agent coding tools — verification and security boundaries

Ngày kiểm chứng: 13/11/2026. Bằng chứng máy đọc được: [agent-code-security-evidence.json](agent-code-security-evidence.json).

## Kết quả đã kiểm chứng

- **Live Piston:** 14/14 runtime hiện hoạt động chạy chương trình kiểm tra thành công. 26/26 lời giải giảng viên hiện có vượt qua 77/77 testcase lưu trong bản sao database. Script được kiểm tra: `verify_code_sample_async` chỉ đọc và gọi runner; không lưu code học sinh, progress, enrollment hoặc giao dịch.
- **Live sandbox:** 6/6 phép thử xác định đạt. Python multi-file nhận stdin và in `42`; vòng lặp vô hạn kết thúc `TO`/`SIGKILL`; kết nối socket trả `ENETUNREACH` (`101`); output giới hạn đúng 65.536 byte với `OL`; C++ sai cú pháp phân loại `compile_error`; cấp phát 300 MB dưới giới hạn 32 MB bị kết thúc với exit code `137`.
- **PostgreSQL thật, runner giả lập:** 6 integration tests đạt. Kiểm tra từ chối học viên không có enrollment trước khi gọi Piston; không lộ teacher solution hoặc hidden input qua Tutor/API; sample công khai đúng; buffer chưa lưu đã PASS không đánh dấu phiên bản database khác PASS; lưu có hash cũ trả 409; quiz được chấm từ đáp án server, idempotent và cô lập user; khóa execution có hiệu lực giữa hai database connection và giải phóng sau rollback.
- **Unit:** toàn bộ `tests/unit` đạt **217 tests và 7 subtests**; bộ tập trung code/quiz/Tutor/Voice trước đó đạt 54 tests và 4 subtests. Đây là kiểm thử với fixtures/mocks, không thay cho kết quả Live Piston bên trên.

## Lệnh tái lập

Từ `studynest_be/`:

```sh
.venv/bin/python -m pytest tests/unit/test_code_runner_provider.py tests/unit/test_learning_agent_security.py tests/unit/test_quiz_attempts.py tests/unit/test_tutor_context.py tests/unit/test_tutor_voice.py -q
.venv/bin/python scripts/verify_agent_code_security.py --live
.venv/bin/python scripts/smoke_piston.py --check-lessons
```

Lệnh integration cần `TEST_DATABASE_ASYNC_URL` trỏ đến **database thử riêng đã migrate đến head**. Khi chạy smoke trên bản sao, `DATABASE_ASYNC_URL` cũng trỏ bản sao. Không đưa URL chứa credentials vào log hoặc commit:

```sh
.venv/bin/python -m pytest tests/integration/test_learning_agent_security.py -q
```

Trong lần kiểm chứng này, các biến được đưa trực tiếp vào subprocess từ file riêng `/tmp/maymay-agent-verification/database_url`, không in nội dung. `tests/conftest.py` hiện không dùng database ứng dụng làm fallback; thiếu `TEST_DATABASE_ASYNC_URL` sẽ skip database fixture. Session thử sử dụng savepoint để commit/rollback từ domain service không thoát transaction bao ngoài.

Một probe thủ công ban đầu chọn Python 3.10.0 không được cài đã trả HTTP 400. Script xác minh chính thức tìm runtime thực từ `/runtimes`, dùng Python 3.11.0 và C++ 10.2.0, sau đó đạt đầy đủ các kiểm tra.

## Contract và chính sách

`is_sample=true` là testcase công khai. Trước thay đổi này, learner API che testcase mẫu và trả hidden testcase; Tutor dùng nghĩa ngược lại. Nay cùng một nghĩa được áp dụng ở serializer, grading và RAG. Không đổi dữ liệu testcase trong database.

Tutor không đưa file `solution`, đáp án đúng quiz hoặc explanation trước attempt vào prompt. Code lấy từ database được ghi rõ là **bản đã lưu**, không gọi là buffer hiện tại. Phần runtime/editor chuyên trách lấy buffer chưa lưu.

`LessonCodeUserTest` kiểm tra số file, tổng kích thước, tên file an toàn, tên không trùng, đúng một main file, language khớp exercise. Piston thực thi ngoài FastAPI với time/memory limit gửi vào sandbox; không dùng kiểm tra CPU/memory sau chạy để thay thế giới hạn sandbox. Compile failure được tách khỏi runtime failure. Hidden result không chứa stdin, expected, stdout hoặc stderr; lỗi upstream chỉ log loại lỗi, không trả raw exception.

Mỗi lượt test tạo `code_test_attempts`: user/exercise, hash đúng tập file, revision buffer, fingerprint bộ test chỉ ở server, mode, kết quả đã lọc. Không lưu source code hay hidden input trong attempt. Sample-only không cập nhật completion. Full test chỉ đánh dấu code đã lưu PASS khi toàn bộ test đạt, tập file database khớp byte đã test và bộ testcase không đổi trong lúc chạy. Code lesson không thể hoàn thành qua endpoint completion nếu các exercise chưa có saved code PASS.

Save nhận `expected_content_hash` tùy chọn để tương thích client cũ; agent/editor mới gửi hash baseline. Khóa transaction và kiểm tra hash ngăn ghi đè phiên bản khác; mismatch trả 409. Khi lưu một file, pass flag toàn bộ submission bị vô hiệu hóa. Không áp dụng patch trực tiếp trong backend; editor bridge giữ diff/approval/revision/undo.

Execution admission dùng `pg_try_advisory_xact_lock` theo user, ngăn hai backend worker chạy đồng thời cho cùng học sinh. Giới hạn mặc định 6 lượt/phút và tổng 90 giây/lượt; các giới hạn được cấu hình qua `CODE_MAX_RUNS_PER_MINUTE` và `CODE_MAX_SECONDS`. Có tối đa 100 testcase/lượt. Không retry mutation hoặc Piston job tự động khi mất kết nối.

Quiz attempt API chấm server từ question/option UUID có thật, kiểm tra membership bài học và enrollment, chống trùng request bằng idempotency key, giữ hash phiên bản câu hỏi. Đây là **server-graded practice evidence**, không phải kỳ thi có giám sát. Giao diện luyện tập legacy vẫn trả đáp án/feedback theo hành vi cũ; không được coi điểm client tự báo hoặc progress legacy là bằng chứng mastery đáng tin ngang kết quả server.

## Giới hạn bằng chứng

Các phép thử sandbox xác nhận hành vi được mô tả, không phải pentest toàn diện hoặc chứng nhận chống escape. Network probe chứng minh kết nối bị chặn trong lượt thực thi này; không khẳng định đã kiểm tra mọi giao thức hoặc đường thoát mạng. Memory probe chứng minh chương trình cấp phát lớn bị chặn, không chứng nhận số liệu peak RSS chính xác. Output của sample bị cắt thêm ở API để giới hạn payload.

Chưa có benchmark tải đồng thời toàn nền tảng hoặc cam kết latency/cost. Việc hủy request không chứng minh Piston rollback hay chấm dứt job đã được nhận; sandbox timeout vẫn giới hạn job đó. Các row attempt cần retention và quy trình xóa theo chính sách sản phẩm; không dùng retention của event log để suy ra đã xóa tất cả bằng chứng học tập. Không deploy hoặc migrate database production trong đợt kiểm chứng này.
