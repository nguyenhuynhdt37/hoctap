# Trang chủ học viên sau đăng nhập (BẢN 2, đã chỉnh theo phản hồi 23/11/2026)

Phạm vi: `studynest_fe/` (giao diện) + hợp đồng API cho `studynest_be/` (làm sau). Thay thế hoàn toàn bản 1.

## 1. Mục đích

Mây Mây là nền tảng **bán và học khóa học** cho học sinh lớp 1–12, có phụ huynh là người trả tiền. Sau đăng nhập, học viên đang thấy các trang rời rạc (`my-learning`, `lo-trinh`, ví, thông báo…) và gần như không thấy gamification dù backend đã có (`streak`, `daily_checkin`, `profile`).

Mục tiêu: khi đăng nhập, `/` trở thành **trang chủ của chính học viên**, vẫn là một website bình thường (không phải dashboard), trả lời "hôm nay mình học gì, ôn gì, được gì" và vẫn giữ lối khám phá/mua khóa mới. Chiều sâu thực tế đến từ vòng lặp học → ôn → theo dõi, chạy trên dữ liệu khóa học thật.

## 2. Phong cách (bắt buộc)

- **Website bình thường, KHÔNG dashboard**: giữ header chung của site (có cả mặt chợ: danh mục, khóa học, giảng viên, ví). Không sidebar, không thanh tab dưới, không lưới widget dày đặc, không biểu đồ phô trương.
- Trang là các **khối nội dung xếp dọc** trong container chuẩn của site, mỗi khối có tiêu đề rõ, đọc từ trên xuống, giống trang chủ hiện tại nhưng cá nhân hóa.
- Cloudy Blue: pastel ấm, Be Vietnam Pro, tương phản AA. Sự sáng tạo nằm ở **chi tiết**: linh vật Mây (đã có `MayMascot`) trong lời chào và trạng thái rỗng, câu chữ thân thiện, chuyển động nhỏ tinh tế (tôn trọng reduced-motion), không phải bố cục lạ.
- **Chữ trên giao diện: tiếng Việt. Chỉ route bằng tiếng Anh.**
- Không dùng icon Sparkles.

## 3. Cấu trúc

### 3.1 Trang chủ `/` khi đã đăng nhập
Cổng ở `/`: đã đăng nhập → hiển thị trang chủ học viên tại URL `/` (không redirect, không nháy landing); khách → landing như cũ. Cờ "đã từng đăng nhập" không chứa token, truy cập storage trong try/catch.

Các khối, theo thứ tự:
1. **Lời chào + điểm danh**: Mây chào, nút điểm danh hằng ngày, streak, XP/cấp (API thật: `daily_checkin`, `streak`, `profile`).
2. **Tiếp tục học**: bài đang học dở của khóa gần nhất (dữ liệu từ `my-learning`/tiến độ có sẵn).
3. **Cần ôn hôm nay**: số câu đến hạn → `/review` (mock đến khi backend có).
4. **Lộ trình & mục tiêu**: lộ trình/khóa đang theo, tiến độ, ngày muốn xong → `/goals`.
5. **Nhiệm vụ hôm nay** (gamification sẵn có).
6. **Khám phá cho bạn**: khóa gợi ý, combo, ưu đãi (tái dùng các khối của trang chủ cũ như `recommended-courses`, `combos-section`).
7. **Hỏi gia sư về bài đang học**: lối vào gia sư sẵn có của bài học (không tạo gia sư toàn cục mới).

### 3.2 Điều hướng
Giữ header hiện có; chỉ thêm vào menu/đường dẫn của người dùng đã đăng nhập: Ôn tập, Bản đồ năng lực, Mục tiêu. Mọi trang là trang nội dung bình thường trong container của site.

### 3.3 Ôn tập `/review`
- Nguồn: câu sai trong quiz của **các bài học có quiz** thuộc khóa học viên đã mua (không có kho riêng).
- Mỗi câu hiện kèm khóa · chương · bài nguồn + "Xem lại bài này".
- Chấm phía server qua `answer` (idempotent), rồi tự đánh giá chỉ **hai mức: "Nhớ rồi" / "Chưa nhớ"** (phù hợp học sinh nhỏ), quyết định lần ôn kế (bản đơn giản của SM-2).
- Phiên ôn ngắn (n/N), tổng kết khi xong, trạng thái rỗng thân thiện.
- Ràng buộc dữ liệu (cho backend): mất quyền truy cập khóa (hoàn tiền/hết hạn) thì câu ôn của khóa đó ẩn; giảng viên sửa câu hỏi (đổi `content_hash`) thì câu ôn cũ bị vô hiệu và nạp lại.

### 3.4 Bản đồ năng lực `/mastery`
Không phải heatmap. Là trang đọc đơn giản: chọn khóa → danh sách chương, mỗi chương một thanh tiến độ + nhãn chữ "Vững / Cần ôn / Sắp quên / Chưa học" (không chỉ dựa vào màu), mở chương thấy từng bài. Chỉ tính bài có quiz; bài video/code/tài liệu ghi "Chưa có bài kiểm tra". Mỗi chương có nút "Ôn phần này" → `/review` đã lọc.

### 3.5 Mục tiêu `/goals`
Gắn với **lộ trình (bundle) hoặc khóa đã mua**: chọn đối tượng, ngày muốn xong, số buổi/tuần → hiển thị lịch chia bài theo ngày, "đúng lịch / chậm X bài" và gợi ý điều chỉnh. Từ `lo-trinh/cua-toi` có lối sang đặt mục tiêu. Không tạo hệ thống kế hoạch tách rời.

### 3.6 Phụ huynh (giai đoạn một, bản đơn giản)
Trang "Báo cáo tuần" học viên xem và chia sẻ cho phụ huynh (tóm tắt số bài đã học, câu đã ôn, streak). Chỉ đọc, không cần tài khoản phụ huynh. Làm sau cùng, dùng mock + hợp đồng cho backend.

## 4. Lớp dữ liệu và backend

Frontend gọi qua `LearningHubApi` (đã có ở `src/lib/learning-hub/`), hai bản: `api` và `mock`. **Phần đã có API thật phải dùng API thật** (điểm danh, streak, XP, nhiệm vụ, tiến độ học, lộ trình). Mock chỉ cho phần backend chưa có (ôn tập, năng lực, mục tiêu/kế hoạch, báo cáo tuần). Chip "Dữ liệu mẫu" hiện **chỉ trên khối đang dùng mock**.

| Phần | Backend | Cần thêm |
|---|---|---|
| Điểm danh, streak, XP, nhiệm vụ | Có | Không (FE mới) |
| Tiếp tục học, tiến độ | Có | Không |
| Lộ trình đã mua | Có (`learning_paths`, `bundle_commerce`) | Không |
| Ôn tập | Thiếu | `review_items`, API hàng đợi + ghi kết quả; nạp từ `QuizAttempt.details` |
| Năng lực | Thiếu | API điểm theo khóa/chương/bài (từ quiz) |
| Mục tiêu/kế hoạch | Thiếu | `study_goals`, `study_plan_days`, API; gắn bundle/khóa |
| Báo cáo tuần | Thiếu | API tổng hợp tuần |

Hợp đồng API (đề xuất): `GET /user/review/queue`, `POST /user/review/{item_id}/answer {option_id, self_rating:"remembered"|"forgot", idempotency_key}`, `GET /user/courses/{id}/mastery`, `POST/GET /user/goals`, `GET /user/goals/{id}/plan`, `GET /user/reports/weekly`. Mọi API theo xác thực DPoP và kiểm quyền như `require_lesson_access`.

Việc để sau: seed dữ liệu demo thật (tận dụng `docs/catalog-demo-seed.md`) để demo không phụ thuộc mock.

## 4b. Nhiệm vụ theo khóa và phần thưởng (backend, chuẩn production)

### Hiện trạng đã xác minh (23/11/2026)
- XP chỉ đến từ nhiệm vụ theo ngày (loại sự kiện chung) và điểm danh; ngưỡng lên cấp ở `LevelsConfig` (mặc định: 100/200/300/500/750/1000, sau cấp 7 là `(cấp+1)*100`); lên cấp thưởng Peak.
- `UserMissions` KHÔNG có `course_id`/`lesson_id` → chưa có nhiệm vụ theo khóa đã mua.
- Không có đường nào cấp mã giảm giá khi xong nhiệm vụ; bảng `Rewards`/`RewardInstances`/`RewardRedemptions` có nhưng chưa có service dùng. Peak được cộng nhưng chưa có chỗ tiêu.

### Nguyên tắc: nhiệm vụ TỰ SINH từ cấu trúc khóa, không ai phải ra đề
Khi học viên mua khóa (`course.purchased`), hệ thống sinh nhiệm vụ từ mẫu và cấu trúc khóa:
| Mẫu | Điều kiện hoàn thành (nguồn dữ liệu) | Thưởng mặc định |
|---|---|---|
| `chapter.complete` | mọi bài của chương hoàn thành (`LessonProgress`) | XP theo số bài |
| `chapter.quiz_pass` | điểm quiz chương ≥ ngưỡng (`QuizAttempt`, chấm server) | XP + Peak |
| `course.complete` | hoàn thành toàn bộ khóa | XP lớn + **mã giảm giá khóa/combo kế tiếp** |
| `course.weekly_streak` | học ≥ N ngày trong tuần ở khóa này | Peak |
Admin chỉnh `mission_templates` (bật/tắt, ngưỡng, mức thưởng, loại thưởng).

### Luật tài trợ mã giảm giá (chủ sản phẩm chốt 23/11/2026)
Cơ sở: khi một khóa được mua, **giá gốc (trước mã)** được chia: nền tảng `giá × platform_fee` (hiện mặc định 30%), giảng viên `giá × (1 − platform_fee)`. Mã giảm giá chỉ làm giảm phần của **bên tạo mã**, bên kia giữ nguyên:

| Người tạo mã | Ai chịu phần giảm | Trần | Phần còn lại |
|---|---|---|---|
| Admin / nền tảng (gồm mã thưởng nhiệm vụ) | Trừ vào hoa hồng nền tảng | giảm ≤ 50% hoa hồng nền tảng của đơn đó = `0,5 × platform_fee × giá` (phí 30% → tối đa 15% giá) | Giảng viên nhận nguyên `giá × (1 − fee)` |
| Giảng viên | Trừ vào phần giảng viên | giảm ≤ phần giảng viên = `giá × (1 − fee)` (không để giảng viên nhận âm) | Nền tảng nhận nguyên `giá × fee` |

Ví dụ khóa 1.000.000đ, phí 30%: mã admin 15% → khách trả 850.000, nền tảng 150.000, giảng viên 700.000; mã giảng viên 100.000 → khách trả 900.000, nền tảng 300.000, giảng viên 600.000.

Quy tắc kỹ thuật:
- Chụp `platform_fee` và giá gốc lúc mua để tính trần và đối soát; kiểm tra lại trần ở bước thanh toán, không tin con số ghi trên mã. Mã % bị kẹp theo trần, mã cố định vượt trần bị từ chối.
- **Mỗi khóa trong một đơn áp tối đa một mã** (quyết định của mình, cần chủ sản phẩm duyệt) để không phải định nghĩa chồng mã giữa hai bên chịu phí khác nhau; nếu muốn cho chồng thì mỗi bên vẫn phải tự giữ trần của mình.
- **Mâu thuẫn cần sửa trong cấu hình hiện có**: `PlatformSettings.discount_max_percent` mặc định 90%. Với phí 30%, mã giảng viên 90% sẽ làm giảng viên nhận âm. Giới hạn của mã giảng viên phải là `min(discount_max_percent, 100 − fee%)`.
- **Thay đổi bắt buộc ở đối soát**: hiện `platform_share = tiền khách trả × fee` nên mọi mã giảm đang giảm cả phần nền tảng lẫn giảng viên theo tỷ lệ. Phải đổi thành chia theo giá gốc, rồi trừ phần giảm vào đúng bên tạo mã. Chạm `bundles.py`, `bundle_settlement.py`, luồng mua khóa lẻ và hoàn tiền (hoàn phải đảo đúng theo cách chia này). Chạm tiền nên cần kiểm thử đầy đủ.
- Sổ chi phí `platform_coupon_costs` ghi mọi khoản nền tảng tài trợ (admin xem tổng chi phí khuyến mãi, đặt hạn mức tháng); phần giảng viên tài trợ ghi vào bút toán thu nhập của họ.

### Quy tắc đúng đắn
- Tiến độ chỉ tính từ sự kiện phía server đã xác thực; hoàn thành đơn điệu (đã xong thì không mất khi giảng viên thêm bài); `target_count` chụp lại lúc sinh.
- Thưởng qua **sổ cái idempotent** `reward_grants (user_id, mission_id, reward_kind)` có ràng buộc duy nhất → nhận đúng một lần dù gọi lại/đua nhau.
- Người học bấm "Nhận thưởng" (`claim`) để có khoảnh khắc thưởng rõ ràng; có hạn nhận.
- Mã giảm giá: sinh bằng `Discounts` + `DiscountTargets` nhắm đúng người, dùng một lần, có hạn (14–30 ngày), có điều kiện tối thiểu, quy tắc chồng với mã combo được ghi rõ; mã lưu mã hóa trong `RewardInstances`.
- Hoàn tiền khóa: **XP và Peak đã nhận được giữ nguyên (chủ sản phẩm đã chốt)**. Chỉ thu hồi mã giảm giá chưa dùng gắn với khóa đó.
- Peak có chỗ tiêu: đổi lấy mã giảm giá (`Rewards.cost_peak`), trừ Peak và cấp mã trong một giao dịch.
- Chống lạm dụng: giới hạn tốc độ nhận, một người một tài khoản, nhật ký kiểm toán cho mọi lần cấp.

### Luật hoàn tiền (chủ sản phẩm đã chốt 23/11/2026)
- Hoàn tiền **không phải lúc nào cũng được**. Hiện có hạn hoàn theo `PlatformSettings.hold_days` (mặc định 7 ngày, trả lỗi "quá hạn hoàn tiền").
- **Thêm giới hạn: tối đa 3 khóa được hoàn mỗi tháng cho mỗi người dùng.** Hiện CHƯA có trong `services/shares/refund.py` (các `count` ở đó chỉ phục vụ phân trang), cần bổ sung kiểm tra phía server, tính theo tháng lịch (múi giờ Việt Nam) và theo số khóa (một yêu cầu hoàn nhiều khóa thì đếm từng khóa), kể cả combo/lộ trình. Hạn mức nên cấu hình được trong `PlatformSettings` (`refund_max_courses_per_month`, mặc định 3).
- Giao diện (trang hoàn tiền và nhắc trong trang chủ) hiển thị rõ còn mấy lượt hoàn trong tháng và hạn hoàn của từng khóa.

### Dữ liệu và API
- Bảng: `mission_templates`; mở rộng `user_missions` thêm `course_id`, `section_id`, `scope`, `status` (assigned/completed/claimed), `completed_at`, `claimed_at`; `reward_grants`.
- API: `GET /user/missions?course_id=`, `POST /user/missions/{id}/claim`, `GET /user/rewards/inventory`, `POST /user/rewards/{reward_id}/exchange` (đổi Peak). Mã áp dụng ở bước thanh toán qua luồng mã giảm giá hiện có.
- Kiểm thử bắt buộc: sinh nhiệm vụ khi mua, hoàn thành chương, đua nhau nhận thưởng, hoàn tiền thu hồi mã, giảng viên thêm bài sau khi xong, ngưỡng quiz.

### Ảnh hưởng đến trang chủ
Khối "Nhiệm vụ" hiện nhiệm vụ ngày (API thật hiện có) cộng nhiệm vụ theo khóa (mock đến khi backend xong, có chip "Dữ liệu mẫu"); thêm "Kệ phần thưởng" cho mã giảm giá đang có, kèm hạn dùng.

## 5. Không-mục-tiêu / phản-mục-tiêu

Không làm: sidebar/dashboard, gia sư AI toàn cục, kho câu hỏi ôn tập riêng, tài khoản phụ huynh đầy đủ, trang admin/giảng viên. Thất bại nếu: trông như dashboard, số liệu giả trông như thật, hoặc phá Cloudy Blue.

## 6. Giao việc

Giai đoạn A (một agent): sửa lại phần agent trước đã làm cho đúng phong cách website bình thường + cổng `/` + khung các khối. Giai đoạn B (song song, theo khối, mỗi agent một thư mục riêng): điểm danh/gamification; ôn tập; năng lực; mục tiêu; báo cáo tuần. Mỗi giai đoạn nghiệm thu bằng `tsc`, eslint, ảnh chụp desktop và 390px do người điều phối thực hiện.
