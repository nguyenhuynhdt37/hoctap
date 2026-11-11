# Learning paths — kiểm tra DB và quyết định quản trị đề xuất

> Đã triển khai thiết kế mở rộng trong phiên sau. Xem [hướng dẫn path/combo](paths-bundles-guide.md); nội dung bên dưới là snapshot audit trước migration.

Kiểm tra read-only ngày 10/11/2026 trên database local; chưa tạo migration hoặc sửa dữ liệu lộ trình.

## Bằng chứng hiện tại

- 57 courses: 8 legacy và 49 demo. Có 19 enrollment, 12 lesson_progress, 0 course_reviews. Demo không sinh rating/lượt mua.
- Chưa có learning_paths, stages, course prerequisites hoặc proficiency/CEFR tables.
- Courses.level CHECK chỉ nhận beginner/intermediate/advanced/all. Không đưa A1–C2 vào cột này, không biến Grade thành CEFR.
- Courses có subject/provider; course_grades, course_learning_goals, course_exams đã có. Nội dung theo course_sections → lessons; tiến độ qua enrollment/lesson_progress.
- lessons.prerequisites là text[], không phải FK tới khóa học, không bảo đảm prerequisite giữa các khóa.
- fn_recommend_top20 hiện dùng khoảng cách embedding sở thích/course và loại khóa đã enrolled active. Đây là gợi ý khóa, không có bằng chứng mô hình hóa trình tự kiến thức hoặc mức đầu vào/đầu ra.
- 3 khóa legacy có rating_count/rating_avg dương dù bảng reviews hiện trống; 4 khóa legacy có total_enrolls khác số dòng enrollment. Có thể do dữ liệu import/counters cũ; chưa kết luận nguồn nào đúng và chưa reset. Cần đối soát trước dùng ranking.
- purchase_items: 17 completed, 8 refunded. Không được coi total_enrolls là số lượt bán hoặc doanh thu; có thể gồm miễn phí/tự đăng ký. Ranking bán chạy phải định nghĩa paid completed/refund/net và khoảng thời gian.
- Nhiều FK vào courses (lessons/enrollments/reviews/progress/purchases/transactions/tutor/discounts...). Mở rộng bằng bảng liên kết, giữ course ID/slug/ownership/payee, không chuyển course vào một category lộ trình.

## Phân quyền và nguồn quyết định

Đề xuất mô hình admin duyệt, thuật toán hỗ trợ, AI đề xuất:

1. Lecturer khai báo môn, kỹ năng, yêu cầu đầu vào, nội dung/đầu ra. Các nhãn học thuật mới ở trạng thái pending.
2. Admin/biên tập học thuật xác nhận nhãn và thiết kế thứ tự stage, điều kiện hoàn thành, nhóm học phần cần học. Admin quyết định publish.
3. Hệ thống xếp lựa chọn khóa bên trong cùng stage/nhóm đã duyệt, ưu tiên phù hợp trình độ/kỹ năng/mục tiêu. Rating đáng tin cậy, dữ liệu mua hợp lệ và mức phù hợp ngân sách chỉ hỗ trợ xếp lựa chọn.
4. AI có thể đọc metadata/nội dung đã có để gợi ý nhãn, tạo bản nháp lộ trình hoặc cá nhân hóa khóa thay thế. Lưu source, model, thời điểm, lý do/nguồn chứng minh; không tự publish, cấp chứng nhận hay chuyển người học sang stage tiếp theo.

Không dùng bán chạy để suy ra level, thứ tự học hoặc kiến thức tiên quyết. Cold start không có review: dùng nội dung và phê duyệt chuyên môn. Ranking rating cần xét sample size và verified enrollment; xếp hạng doanh số cần đối soát completed/refund trước. Các counter legacy hiện chưa đủ tin cậy.

## Schema additive dự kiến (chưa triển khai)

- proficiency_frameworks và proficiency_levels: framework dùng theo môn, level/code/order. A1–C2 là ví dụ cho tiếng Anh; không ép các môn khác theo thang này, không mặc định grade tương đương CEFR.
- course_proficiency: course + framework + entry/target level + kỹ năng/phạm vi tuyên bố + trạng thái duyệt + người duyệt. FK, uniqueness phù hợp; không sửa Courses.level. Chỉ gắn khi có căn cứ nội dung; nhãn không tự tạo chứng chỉ cho người học.
- learning_paths: identity/slug/subject/owner quản trị và thông tin mục tiêu.
- learning_path_versions: draft/published/archived, version, người duyệt/thời điểm. Bản đã có người theo học giữ ổn định; cập nhật tạo version mới.
- learning_path_stages: version + order + mục tiêu/đầu vào/đầu ra và điều kiện hoàn thành rõ ràng.
- stage_course_groups và stage_course_options: phân biệt học phần cần học với những khóa thay thế cho cùng học phần. Ví dụ stage A1 cần Ngữ pháp và Nghe nói; mỗi nhóm có 3 khóa để chọn một. Không vô tình yêu cầu học tất cả khóa thay thế.
- user_learning_paths: user + path_version + lựa chọn/điểm xuất phát. Không tự cấp course enrollment hoặc quyền mua; tái sử dụng enrollment/progress thật.

Một course có thể được tham chiếu trong nhiều paths. FK tới course dùng RESTRICT (hoặc ngừng kích hoạt option), không cascade xóa cả lộ trình. Unique order trong cùng stage/version, chống cycle nếu cho nhánh prerequisite, kiểm tra subject/framework tương thích. Bản đầu nên là các stage tuyến tính + nhóm lựa chọn, chưa cần graph tùy ý.

## Quy tắc chống bể

- Backup, migration additive, thử upgrade/downgrade trên DB riêng; dữ liệu thiếu nhãn để pending, không suy từ title hoặc difficulty.
- Mua từng course vẫn theo checkout/payee cũ; theo lộ trình không đồng nghĩa đã mua. Không cộng tiền/mua lại course học sinh đã sở hữu; bundle/giảm giá toàn lộ trình là module sau.
- Hoàn thành course hoặc xem hết bài không đủ chứng minh đạt A1/A2. Chỉ thể hiện tiến độ nội dung; đạt stage theo rule/assessment đã công bố, chứng nhận cần đánh giá riêng.
- Khóa ngừng bán vẫn giữ quyền học đã mua; hiển thị trạng thái option, không âm thầm thay khóa học sinh đã chọn.
- Không dùng demo courses/counters trong ranking hoặc lộ trình thật. AI lỗi/dịch vụ ngoài ngắt vẫn có curated path và sort xác định.
- Không để đánh giá hoặc doanh số mới tự sửa thứ tự các stage của bản published. Khi đổi ranking/phiên bản phải có trace và không reset learner progress.

## Thứ tự thực hiện đề xuất

Đối soát counter → tạo nhãn trình độ/kỹ năng có phê duyệt → admin tuyển chọn path/stage/nhóm lựa chọn → tận dụng tiến độ học hiện hữu → ranking trong nhóm đã duyệt → AI đề xuất/cá nhân hóa sau khi có dữ liệu và evaluation.
