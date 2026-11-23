# Hợp đồng API: Ôn tập, Năng lực, Mục tiêu, Báo cáo tuần, Huy hiệu

Bổ sung cho `2026-11-23-missions-api-contract.md`. Tiền tố `/api/v1`, xác thực DPoP như API user khác, thông báo lỗi tiếng Việt. Nếu đường dẫn cuối cùng khác bảng này, backend PHẢI cập nhật tài liệu và nêu trong báo cáo. Luật đã chốt: chỉ tính khóa còn quyền truy cập (đã mua, chưa hoàn tiền); ôn tập chỉ cho bài có quiz; tự đánh giá hai mức; mục tiêu gắn khóa/lộ trình đã mua; XP/Peak không thu hồi khi hoàn tiền.

## Ôn tập (ngắt quãng, gắn khóa học)
- `GET  /user/review/queue?course_id=&section_id=&limit=` → `{ due_count, items: ReviewItem[] }` (KHÔNG trả đáp án đúng)
- `POST /user/review/{item_id}/answer` body `{ option_id, self_rating: "remembered"|"forgot", idempotency_key }` → `{ correct, correct_option_id, explanation, next_due_at, interval_days, due_count }`; chấm phía server, idempotent theo `idempotency_key`.
```ts
interface ReviewItem { item_id: string; quiz_id: string; question: string; options: Array<{id:string; text:string}>; due_at: string; difficulty: number|null;
  course:{id:string; title:string; thumbnail_url:string|null}; section:{id:string; title:string; position:number}|null; lesson:{id:string; title:string}; lesson_href:string }
```
Quy tắc: câu vào hàng đợi khi học viên làm sai trong `QuizAttempt.details` (nạp lúc GET lần đầu/backfill idempotent); thuật toán SM-2 đơn giản hóa với hai mức; câu của khóa mất quyền truy cập bị ẩn; câu hỏi bị giảng viên sửa (đổi `content_hash`) thì vô hiệu và nạp lại; chống gửi trùng.

## Năng lực theo cấu trúc khóa
- `GET /user/mastery/courses` → `{ courses: Array<{id,title,thumbnail_url,course_score:number|null,status:MasteryStatus,quiz_lessons:number,total_lessons:number}> }`
- `GET /user/courses/{course_id}/mastery` → `{ course:{id,title,thumbnail_url}, course_score:number|null, status, sections: Array<{id,title,position,score:number|null,status,lessons:Array<{id,title,lesson_type,position,has_quiz:boolean,score:number|null,status,last_seen_at:string|null,wrong_count:number,href:string}>}> }`
- `type MasteryStatus = "solid"|"needs_review"|"fading"|"not_started"|"no_quiz"`. Điểm bài tính từ độ chính xác quiz có trọng số theo độ mới và `difficulty_level`, suy giảm theo thời gian; chương/khóa là tổng hợp. Ngưỡng phân loại định nghĩa MỘT chỗ ở backend. Bài không có quiz là `no_quiz`.

## Mục tiêu và kế hoạch
- `POST /user/goals` `{ target_type:"course"|"path", target_id, target_date, sessions_per_week }`, `GET /user/goals`, `GET /user/goals/{id}`, `PATCH /user/goals/{id}`, `DELETE /user/goals/{id}`
- `GET /user/goals/{id}/plan` → `{ goal, days: Array<{date, items:Array<{kind:"lesson"|"review", lesson_id:string|null, title, done:boolean, href}>}>, completed_lessons, total_lessons, on_track:boolean, behind_lessons:number, suggestion:string|null }`
Quy tắc: chỉ khóa/lộ trình người dùng sở hữu; ngày quá khứ/quá gần báo lỗi 422 rõ ràng; chia bài còn lại theo số buổi/tuần, chèn buổi ôn; `done` suy ra từ `LessonProgress`/ôn tập thực tế; tối đa số mục tiêu đang mở hợp lý/người dùng.

## Báo cáo tuần
- `GET /user/reports/weekly` → `{ week_start, week_end, lessons_completed, quizzes_taken, reviews_done, study_days, streak, top_courses: Array<{id,title,thumbnail_url,lessons_completed}>, share_text }` (múi giờ Việt Nam, tuần thứ Hai–Chủ nhật).

## Huy hiệu
- `GET /gamification/badges` → `{ badges: Array<{id,name,description,image_url,earned:boolean,earned_at:string|null}> }` (từ `Badges`/`UserBadges`).

## Chi tiết tích hợp

- **Hàng đợi.** `course_id` và `section_id` đều là bộ lọc tùy chọn. `limit` mặc định 20, nhận từ 1 đến 100. `due_count` của GET tính theo bộ lọc trước khi áp dụng `limit`. `due_count` của POST tính trên toàn bộ khóa còn quyền. `idempotency_key` là UUID. Gửi lại cùng mã, câu, lựa chọn và mức tự đánh giá trả kết quả đã lưu nếu câu vẫn hợp lệ và người học còn quyền. Đổi payload với cùng mã, trả lời câu chưa đến hạn hoặc gửi câu thuộc phiên bản quiz đã thay đổi trả 409.
- **Lịch ôn.** Một lần nhớ thành công cần cả đáp án đúng và mức `remembered`. Hai lần nhớ đầu cách 1 và 6 ngày, các lần sau nhân khoảng cách với hệ số SM-2 và giới hạn 365 ngày. Trả lời sai hoặc chọn `forgot` đặt lại chuỗi nhớ và hẹn ngày kế. Mọi hạn mới bắt đầu lúc 00:00 giờ Việt Nam. Khi bộ câu hỏi đổi hash, hàng đợi tạo thẻ mới cho những câu còn giữ mã và từng trả lời sai. Câu thay bằng mã mới cần bằng chứng sai của câu mới.
- **Năng lực.** Điểm từ 0 đến 100. Backend dùng tối đa 12 lượt nộp gần nhất mỗi bài, chấm trọng số theo độ khó và giảm trọng số theo tuổi tương đối của bằng chứng. Sau 60 ngày kể từ lượt hợp lệ cuối, điểm giữ lại giảm một nửa. `wrong_count` lấy từ lượt hợp lệ cuối. Mốc `solid` là 80. Khi độ chính xác đạt mốc nhưng điểm đã suy giảm dưới mốc, trạng thái là `fading`. Điểm chương và khóa là trung bình các bài có điểm. Bài ngoài chương được gom vào “Bài học khác” có ID bằng ID khóa.
- **Mục tiêu.** Với `target_type: "course"`, dùng ID khóa đang ghi danh. Với `target_type: "path"`, dùng ID đơn combo từ `GET /bundles/orders/my`. Kế hoạch đi theo thứ tự khóa trong đơn và chỉ tính các khóa thành phần còn quyền. POST trả 201 và một mục tiêu. GET danh sách trả `{ items: StudyGoal[] }`. GET chi tiết và PATCH trả một mục tiêu. DELETE trả 204. Mỗi mục tiêu có `id`, `target_type`, `target_id`, `title`, `thumbnail_url`, `target_date`, `sessions_per_week`, `created_at`, `updated_at`, `progress_percent`, `on_track`, `behind_lessons`. PATCH cho sửa ngày, số buổi hoặc cặp loại và ID đích.
- **Kế hoạch.** Ngày mục tiêu cách hôm nay từ 2 đến 366 ngày theo giờ Việt Nam. Chọn từ 1 đến 7 buổi mỗi tuần và có tối đa 5 mục tiêu còn quyền và chưa qua hạn khi tạo hoặc cập nhật. Lịch bắt đầu ngày sau khi tạo hoặc đổi cấu hình, giữ mốc qua các lần xem và cập nhật trạng thái theo bằng chứng học. Buổi cuối mỗi tuần kế hoạch có một mục ôn nếu đích có quiz, hoàn thành khi có lượt ôn thuộc đích trong ngày đó. `behind_lessons` đếm bài còn thiếu sau ngày đã xếp. Tiến độ hiện tại và quyền truy cập phụ thuộc chương trình học hiện hành.
- **Báo cáo tuần.** `week_start` và `week_end` là ngày thứ Hai và Chủ nhật của tuần hiện tại. Thống kê đến thời điểm gọi. `quizzes_taken` đếm lượt nộp quiz, `reviews_done` đếm lượt ôn được ghi nhận và `study_days` đếm các ngày khác nhau có hoàn thành bài, làm quiz, ôn tập hoặc lưu bài thực hành đã vượt kiểm thử. `top_courses` trả tối đa 5 khóa theo số bài hoàn thành.
- **Huy hiệu.** Danh sách gồm huy hiệu đang hoạt động và huy hiệu đã nhận còn trong danh mục. `description` và `earned_at` có thể là `null`.
