# Review Database Gamification trước khi triển khai Module 02 (Streak)

Tài liệu này đánh giá hiện trạng cơ sở dữ liệu (Database Schema) của hệ thống Gamification thuộc StudyNest để đảm bảo tính sẵn sàng trước khi tiến hành triển khai Module 02 (Streak) cùng các module kế tiếp.

Quy tắc cốt lõi: **Không tự ý thay đổi Database; không tạo Migration mới; không sửa Entity hiện tại trừ khi có sự xác nhận rõ ràng từ phía người dùng.**

---

## ✅ Đã đầy đủ

Các thành phần cơ sở dữ liệu hiện tại đã được thiết kế hoàn chỉnh, đồng bộ và sẵn sàng phục vụ cho tất cả các Module Gamification:

### 1. Hệ thống Kinh nghiệm (EXP System)
Hệ thống EXP đã sẵn sàng hoạt động với đầy đủ các cấu trúc lưu trữ và nhật ký giao dịch:
* **User EXP & Level**: Được lưu trữ tại bảng `user_gamification_profiles` với các trường:
  * `level` (tương ứng với `current_level`)
  * `current_xp` (tương ứng với `current_exp`)
  * `total_xp` (tương ứng với `total_exp`)
* **Level Config**: Bảng `levels_config` lưu trữ cấu hình cấp độ:
  * `level` (Cấp độ)
  * `xp_required` (Kinh nghiệm yêu cầu để thăng cấp, tương ứng với `required_exp`)
  * `rewards_config` (Trường dạng `JSONB` hỗ trợ cấu hình linh hoạt các loại phần thưởng khi thăng cấp, tương ứng với `reward`).
* **XP Transaction**: Bảng `xp_transactions` lưu vết toàn bộ lịch sử biến động XP phục vụ mục đích kiểm toán (Audit Log):
  * `user_id` (ID người dùng)
  * `amount` (Số XP thay đổi)
  * `before_xp` & `after_xp` (Trạng thái trước và sau giao dịch)
  * `source` & `event_type` (Nguồn gốc và phân loại sự kiện nhận XP)
  * `metadata` (Thông tin bổ sung dạng JSONB)
  * `created_at` (Thời gian ghi nhận giao dịch)

### 2. Ví Peak (Peak Wallet)
Hệ thống ví Peak được thiết kế đạt tiêu chuẩn sản xuất (Production-ready) với khả năng kiểm toán tài chính chặt chẽ:
* **Peak Balance**: Bảng `user_peak_balances` quản lý số dư của người dùng bao gồm:
  * `current_balance` (Số dư khả dụng hiện tại)
  * `total_earned` & `total_spent` (Lũy kế tích lũy và tiêu dùng)
  * `version` (Hỗ trợ Khóa lạc quan - Optimistic Locking để chống lỗi Race Condition khi cập nhật số dư song song).
* **Peak Transaction & Audit**: Bảng `peak_transactions` ghi lại toàn bộ dòng tiền của ví:
  * `before_balance` & `after_balance` (Số dư trước và sau giao dịch, đảm bảo khả năng đối soát kép).
  * `amount` & `type` (Số lượng Peak thay đổi và loại giao dịch).
  * `source` & `event_type` & `metadata` (Lưu thông tin chi tiết nguồn sinh Peak như: check-in, hoàn thành nhiệm vụ, đạt thành tựu...).

### 3. Chuỗi học tập (Streak)
Bảng cấu hình thông tin Streak đã có sẵn các trường cần thiết trong bảng `user_gamification_profiles`:
* `current_streak` (Chuỗi học tập hiện tại của người dùng).
* `best_streak` (Chuỗi học tập dài nhất từng đạt được, tương ứng với `longest_streak`).
* `streak_freezes` (Số lượng vật phẩm đóng băng Streak hiện có để tự động giải cứu khi người dùng bỏ lỡ ngày học).
* **Qualified Learning Activity Date**: Sử dụng trường `last_active_date` trong bảng `user_gamification_profiles`. 
  * *Lý do*: Bảng người dùng gốc (`user`) đã có sẵn trường `last_login_at` để theo dõi thời gian mở app/đăng nhập thông thường. Do đó, trường `last_active_date` trong profile Gamification sẽ được dành riêng để lưu trữ **ngày gần nhất hoàn thành Hoạt động Học tập Đạt chuẩn (Qualified Learning Activity)**. Điều này giúp tính toán chuỗi học tập chính xác mà không cần thêm cột mới.
* **Last Check-in Date**: Trạng thái điểm danh hàng ngày được lưu trữ và truy vấn động từ bảng `user_checkins` (lấy ngày lớn nhất), tránh việc lưu trùng lặp dữ liệu trên bảng profile.

### 4. Hoạt động Học tập Đạt chuẩn (Qualified Learning Activity)
Hệ thống có đầy đủ dữ liệu để xác định các hoạt động học tập hợp lệ của người dùng mà không cần tạo thêm bảng mới:
* **Hoàn thành Lesson lần đầu**: Được xác thực qua bảng `lesson_progress`. Khi cập nhật tiến trình bài học, nếu trạng thái chuyển từ `is_completed = False` sang `True` (hoặc record mới được tạo với `is_completed = True`), đây được coi là hoạt động đạt chuẩn. Nếu học lại bài học cũ (đã có `is_completed = True`), hệ thống sẽ phát hiện và bỏ qua.
* **Vượt qua Quiz lần đầu / Giải Code lần đầu**: Sử dụng bảng nhật ký hoạt động dùng chung `gamification_activity_logs`.
  * Khi người dùng vượt qua một Quiz hoặc giải quyết một bài tập Code, hệ thống sẽ thực hiện truy vấn nhanh trên bảng `gamification_activity_logs` với bộ lọc: `user_id = :user_id`, `action_type = 'quiz_passed'` (hoặc `'code_solved'`), và `source_event_id = :quiz_id` (hoặc `:code_id`).
  * Nếu chưa tồn tại bản ghi nào, hệ thống ghi nhận đây là **lần hoàn thành đầu tiên** (Qualified Activity), đồng thời tiến hành ghi log mới, cập nhật chỉ số trong `user_statistics`, cộng điểm/kinh nghiệm và cập nhật Streak.
  * Nếu đã tồn tại bản ghi, hệ thống coi đó là hoạt động học lại và sẽ không kích hoạt tăng Streak hay thưởng thêm.

### 5. Thành tựu (Achievement)
Hệ thống thành tựu được liên kết chặt chẽ thông qua hai bảng `achievements` và `user_achievements`:
* Bảng cấu hình `achievements` hỗ trợ định nghĩa chỉ số mục tiêu thông qua cặp trường `criteria_type` và `criteria_value`.
* Các `criteria_type` được ánh xạ trực tiếp để theo dõi:
  * Số lượng bài học hoàn thành: Ánh xạ tới `total_lessons_completed` trong `user_statistics`.
  * Số lượng Quiz vượt qua: Ánh xạ tới `total_quizzes_passed` trong `user_statistics`.
  * Số lượng bài tập Code đã giải: Ánh xạ tới `total_code_lessons_solved` trong `user_statistics`.
  * Chuỗi ngày học tập (Streak): Ánh xạ tới `best_streak` trong `user_gamification_profiles`.
  * Số dư ví Peak: Ánh xạ tới `current_balance` trong `user_peak_balances`.
  * Cấp độ người dùng: Ánh xạ tới `level` trong `user_gamification_profiles`.
* Bảng `user_achievements` quản lý việc mở khóa của người dùng kèm cờ trạng thái nhận thưởng `reward_claimed` và thời gian nhận `claimed_at`.

### 6. Nhiệm vụ Hàng ngày & Hàng tuần (Daily & Weekly Missions)
Dữ liệu cho hệ thống nhiệm vụ được thiết kế tối ưu thông qua bảng mẫu `missions` và bảng tiến trình thực tế `user_missions`:
* **Phân loại tần suất**: Thuộc tính `frequency` lưu giá trị `'daily'` hoặc `'weekly'` để chia nhóm nhiệm vụ.
* **Theo dõi tiến độ (Progress)**: Bảng `user_missions` chứa trường `current_count` (tiến độ hiện tại) và `target_count` (yêu cầu hoàn thành) để cập nhật động theo các sự kiện học tập của người dùng.
* **Nhận thưởng (Claim)**: Trường `status` (có các trạng thái `'assigned'`, `'completed'`, `'claimed'`), kết hợp cột `claimed_at` để quản lý luồng nhận quà của nhiệm vụ.
* **Thiết lập lại (Reset)**: Sử dụng trường `cycle_date` làm mốc thời gian nhiệm vụ được giao. Khi bắt đầu ngày mới hoặc tuần mới, hệ thống sẽ tự động giao (assign) các nhiệm vụ mới với `cycle_date` tương ứng. Các truy vấn lấy danh sách nhiệm vụ chỉ cần lọc theo `cycle_date` hiện tại, đảm bảo tự động reset một cách tự nhiên mà không cần các câu lệnh xóa dữ liệu vật lý.

### 7. Bảng xếp hạng (Leaderboard)
Bảng xếp hạng được hỗ trợ toàn diện bởi bảng lịch sử snapshot `leaderboard_snapshots`:
* Bảng lưu trữ đầy đủ các chỉ số: `score` (điểm xếp hạng có thể cấu hình theo XP hoặc Peak), `level` (cấp độ hiện tại), và `streak` (chuỗi ngày học) của người dùng tại thời điểm chốt bảng xếp hạng.
* Các trường định danh hiển thị như `display_name`, `avatar_url`, và `badge_image_url` được lưu trữ trực tiếp trong snapshot để tối ưu tốc độ truy vấn danh sách xếp hạng (giảm thiểu JOIN với bảng User lớn khi hiển thị).
* Trường `leaderboard_type` và `cycle_start_date` cho phép tổ chức nhiều loại bảng xếp hạng khác nhau (Hàng tuần, Theo mùa giải).

### 8. Hồ sơ Gamification người dùng (User Profile)
Bảng `user_gamification_profiles` đóng vai trò là hub trung tâm lưu trữ toàn bộ thông tin tổng hợp của người dùng:
* Chứa đầy đủ các thuộc tính: `level`, `current_xp`, `total_xp`, `total_peak_score` (tổng số Peak người dùng đã tích lũy trong sự nghiệp học tập), `current_streak`, `best_streak` và `streak_freezes`.
* Được thiết kế tách biệt hoàn toàn với bảng số dư ví `user_peak_balances` nhằm tăng tính bảo mật, dễ dàng khóa cô lập giao dịch ví mà không ảnh hưởng tới tiến trình trải nghiệm game của người dùng.

---

## ⚠ Cần bổ sung

Sau khi đánh giá kỹ lưỡng, cấu trúc cơ sở dữ liệu hiện tại **đã được thiết kế vô cùng bao quát và đầy đủ**. **Không có trường dữ liệu hay thực thể (Entity) cốt lõi nào bị thiếu** để phục vụ cho sự phát triển của Module 02 (Streak) và các module liên quan tiếp theo.

Mọi nghiệp vụ nâng cao (như phân biệt học lại bài cũ, làm lại quiz cũ để tránh gian lận tăng streak) đều được giải quyết triệt để bằng cách kết hợp thông tin tiến trình sẵn có (`lesson_progress`, `user_statistics`) với bảng lịch sử dùng chung `gamification_activity_logs`.

---

## ❌ Không cần bổ sung

Dưới đây là một số đề xuất mở rộng tính năng trong tương lai nhưng **không cần bổ sung ở thời điểm hiện tại** nhằm tránh tình trạng Over-engineering (thiết kế quá phức tạp khi chưa cần thiết):

### 1. Bảng lưu trữ chi tiết lượt làm Quiz / Giải Code (Quiz Attempts / Code Submissions)
* **Đề xuất ban đầu có thể cân nhắc**: Tạo bảng `user_quiz_attempts` hoặc `user_code_submissions` để lưu trữ chi tiết từng lượt gửi bài.
* **Lý do không cần thiết**: 
  * Việc lưu trữ chi tiết từng lượt trả lời đúng/sai của người dùng thuộc phạm vi quản lý của module Học tập chính (Learning core) chứ không thuộc Gamification.
  * Đối với Gamification, chúng ta chỉ cần xác nhận sự kiện "vượt qua lần đầu" để trao giải. Việc này được giải quyết trọn vẹn, gọn nhẹ hơn thông qua bảng log hoạt động `gamification_activity_logs` với `action_type = 'quiz_passed'` và `source_event_id = :quiz_id`. Cách tiếp cận này giúp giảm thiểu việc phình to kích thước database không đáng có.

### 2. Các bảng liên quan đến Bang hội (Guilds) hoặc Battle Pass
* **Đề xuất ban đầu có thể cân nhắc**: Tạo các bảng `guilds`, `guild_members`, `battle_pass_tiers`, `user_battle_pass_rewards`.
* **Lý do không cần thiết**: 
  * Đây là những tính năng nâng cao nằm trong kế hoạch phát triển dài hạn (Future Features). Việc tạo sẵn các bảng này khi chưa có luồng nghiệp vụ chi tiết sẽ dẫn đến việc sai lệch thiết kế thực tế sau này và gây lãng phí tài nguyên phát triển cơ sở dữ liệu.
  * Cơ sở dữ liệu hiện tại đã hỗ trợ tính năng Mùa giải thông qua bảng `seasons` và các khóa ngoại liên kết mùa giải trong bảng `missions`, `achievements`, và `leaderboard_snapshots`. Khi các tính năng Bang hội hay Battle Pass được triển khai, chúng có thể dễ dàng cắm ghép vào cấu trúc Mùa giải hiện có này dưới dạng các bảng độc lập bổ sung.
