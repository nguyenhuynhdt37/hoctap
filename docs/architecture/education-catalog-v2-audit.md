# Education Catalog V2 — audit và kế hoạch triển khai

## Kiến trúc và dependency thực tế

FastAPI + SQLAlchemy async, Next.js 16/React 19, Expo 54. PostgreSQL bootstrap bằng `db.sql` (đã chứa gamification), tiếp tục Alembic đến `b23c45d67e89`. Không thay dump lớn. `database.py` là model legacy; các model catalog được thêm riêng, cùng Base.

`categories.parent_id → categories`; `topics.category_id → categories`; `courses.category_id/topic_id → categories/topics`. Category hiện có ba cấp được admin hỗ trợ (depth 0–2), dữ liệu local sau bước trước có 3 cấp học, 12 lớp và Lưu trữ; 66 topic theo lớp. V2 giữ nguyên các bản ghi này để bảo vệ consumer cũ, thêm subjects dùng chung và grade_subjects độc lập.

Dependency map:

```text
categories/topics → lecturer course CRUD → courses
categories → discount_targets → discounts/checkout
categories/topics → user preferences → recommendation/embedding
courses → sections/lessons → progress/quizzes/tutor chat
courses → enrollments/reviews/favorites
courses → purchase_items/transactions → instructor_earnings → refund/payout
categories → web header/category/admin/lecturer + Expo category services
```

FK và unique: category slug và topic slug unique toàn cục; category parent SET NULL; topic category CASCADE; course topic SET NULL; course category FK restrict; course slug unique. Course ID là FK của nhiều bảng tài chính và học tập, không đổi ID/slug.

SQL functions `fn_get_category_tree`, `fn_get_related_categories_by_slug`, `fn_get_root_and_level1_from_slug` xử lý cây đệ quy. Related count hiện đếm trực tiếp published+approved; admin course_count đếm trực tiếp mọi trạng thái. Cần ghi rõ hai semantics này. Cây không được vượt depth 2 hoặc tạo cycle. Các truy vấn đệ quy mới dùng UNION để kết thúc ngay cả với dữ liệu chu trình cũ.

## Luồng tái sử dụng

Lecturer xác thực qua AuthorizationService, course owner là instructor_id. Tạo/sửa có category/topic validation; duyệt qua approval_status; public chỉ được nhận published+approved+not deleted. Enrollment và learning access độc lập việc bán công khai. Thanh toán, discount, refund và payout giữ nguyên; transaction.py tạo InstructorEarnings cho instructor, payout/refund dựa earning hiện hữu. Provider chỉ là thông tin đơn vị, không thay payee. Provider tổ chức bị chặn publish/bán đến khi có settlement riêng; không tự xác minh provider.

## Lỗi đã xác minh

Category update bỏ parent_id sẽ thành NULL; tự đổi slug khi rename; chỉ chặn self-parent; order_index dùng `or -1` sai với 0. Category courses bỏ quên price từ router; thiếu visibility; popular sort sai; cursor không có ID, dễ mất dòng bằng timestamp/rating. Course create gửi is_lock_lesson không khớp model is_lock_lesson (giữ tên thực tế), ownership update có sẵn. Topic legacy lặp môn theo lớp; không dùng làm Subject V2.

## Kiến trúc chính thức và thứ tự

1. Audit, bảo toàn working tree hiện hữu.
2. Additive Alembic: levels, grades, subjects, grade_subjects, goals, exams, providers, members, course mapping và nullable course fields. Seed code ổn định, subject dùng chung. Không đoán taxonomy của 8 khóa cũ.
3. Backend: public catalog/filter/pagination, admin CRUD, provider authorization, course taxonomy; sửa category legacy.
4. Web: admin module riêng, reusable course taxonomy form, catalog với URL state và provider profile; detail bổ sung qua endpoint nhỏ.
5. Expo: types/service tương thích, không sửa navigation/auth.
6. Kiểm thử migration trên DB thử, API thật, tests, typecheck/build và tài liệu.

## Rủi ro và migration

Backup local trước upgrade; không migrate production. 8 khóa legacy đang unpublished được giữ nguyên; taxonomy chưa biết hiển thị trạng thái cần phân loại. Giữ topic/category legacy, thêm mapping thay vì xóa/lặp môn. Các cột mới nullable/default để client cũ vẫn gửi được. Seed không ghi đè chỉnh sửa admin mỗi lần khởi động. Downgrade chỉ trên DB thử: xóa schema V2, không xóa legacy. Production rollback ưu tiên quay code, giữ additive data; backup trước downgrade vì metadata V2 sẽ mất.

Provider không cấp quyền xem học sinh, email hoặc kết quả học tập; course mutation vẫn theo ownership instructor hiện hành. Không giả lập livestream/booking; chỉ recorded_video được bật. Chưa triển khai bundle, subscription, tổ chức nhận payout hoặc chương trình/năm thi chi tiết. Môn seed là bộ danh mục khởi đầu theo CTGDPT, không phải quy tắc bắt buộc; admin có thể mở rộng mapping. Xem tài liệu nguồn và giới hạn trong migration guide.
