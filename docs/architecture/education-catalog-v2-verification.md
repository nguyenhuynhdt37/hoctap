# Catalog V2 — kiểm chứng ngày 10/11/2026

## Kết quả

Tái sử dụng auth/roles, category/topic và URL legacy, course ownership/CRUD, lesson/enrollment, wallet checkout, discount, earning/refund/payout, progress, tutor/recommendation và Cloudy Blue. V2 bổ sung taxonomy/provider; không thay người nhận doanh thu.

Migration `c34d56e78f90` thêm 11 bảng: education_levels, grades, subjects, grade_subjects, learning_goals, exams, providers, provider_members, course_grades, course_learning_goals, course_exams. Courses có subject_id/provider_id nullable và delivery_type. Chi tiết ERD/API/rollback: [hướng dẫn V2](education-catalog-v2.md). Khảo sát dependency: [audit](education-catalog-v2-audit.md).

Luồng mới: cấp học → lớp → môn → mục tiêu/kỳ thi → khóa học → hồ sơ provider. Subject dùng chung nhiều lớp. Category/topic cũ vẫn phục vụ mobile, preferences và các API legacy.

## Kiểm tra thực tế

| Gate | Kết quả |
| --- | --- |
| Toàn bộ backend pytest trên DB thử riêng | 140 passed, 3 subtests passed; còn warnings legacy/Pydantic/fixtures |
| Integration Catalog PostgreSQL | 17 passed: seed idempotency, FK/unique, category CRUD/cycle/depth, shared subject, multi-grade/exam, provider permissions, settlement guard, 5 sorts/keyset/visibility, HTTP validation, course CRUD, thumbnail ownership |
| Alembic downgrade/upgrade | Qua trên bản sao: c34d56e78f90 → b23c45d67e89 → head |
| Khởi tạo DB mới | Qua: import nguyên db.sql → Alembic head → seed |
| Ruff các file Python V2 mới | Qua |
| Web typecheck và production build | Qua; Next còn cảnh báo baseline-browser-mapping và middleware convention |
| Mobile TypeScript | Qua |
| API thật | 200: catalog filters/levels/grades/subjects/courses/providers; categories/subcategories/category courses/newest legacy |
| Desktop Chrome | URL grade=12&subject=toan chọn đúng, empty state đúng, không tràn ngang |
| Mobile web Playwright 390×844 | Không tràn ngang, filter ẩn/mở được và aria-expanded cập nhật |
| git diff --check | Qua |

Đã xem EXPLAIN ANALYZE/BUFFERS truy vấn public sort chính, lưu local tại `studynest_be/backups/catalog-v2/query-plan.txt`. Chỉ 8 khóa và kết quả trống vì đang ẩn, không coi đây là benchmark marketplace; cần load test dữ liệu đại diện.

Dữ liệu local giữ nguyên: courses **8**, lessons **90**, enrollments **19**, purchase_items **25**, lesson_progress **12**. Published **0** theo yêu cầu ẩn khóa cũ. V2 có **15** subject canonical, **0** provider (không tạo đơn vị giả). Các fixture course/provider chỉ tạo trong DB thử.

Backup trước chuỗi taxonomy: `backups/k12-taxonomy/before-taxonomy.dump`; sau additive schema, trước seed V2: `backups/catalog-v2/after-additive-schema.dump` trong backend. Lần backup V2 đầu tiên lỗi dotenv; không tuyên bố có snapshot V2 mới trước upgrade. Bản trước chuỗi taxonomy vẫn có đủ dữ liệu legacy; thời điểm được ghi rõ trong migration guide.

## File tạo/chỉnh sửa cho V2

- `docs/architecture/education-catalog-v2-audit.md`, `education-catalog-v2.md`, tài liệu này; `README.md`.
- Backend: `alembic/versions/c34d56e78f90_education_catalog_v2.py`, `alembic/env.py`, `app/db/models/catalog.py`, `database.py`.
- Backend schema: `app/schemas/catalog.py`, `admin/category.py`, `lecturer/courses.py`.
- Backend services: `app/services/catalog.py`, `providers.py`, `admin/category.py`, `user/category.py`, `user/courses.py`, `lecturer/course.py`, `shares/transaction.py`.
- Backend routes: `app/api/v1/catalog.py`, `user/category.py`, `user/course_enroll.py`, `lecturer/courses.py`; router registration trong `app/main.py`.
- Backend scripts/tests: `scripts/seed_catalog_v2.py`, `map_course_taxonomy.py`, `tests/integration/test_catalog_v2.py`, `requirements-dev.txt`.
- Web: `src/types/catalog.ts`, `src/components/catalog/*`, `src/components/admin/catalog/*`; pages `/khoa-hoc`, `/providers/[slug]`, `/admin/catalog`, `/lecturer/providers` trong `src/app/(main)/`.
- Web tích hợp: lecturer course create/edit, course detail, user category/header, admin sidebar, lecturer header hiện có.
- Mobile: `src/types/catalog.ts`, `src/services/catalog.service.ts`, `components/features/categories/CatalogExplorer.tsx`, `CategoriesContent.tsx`.

Các thay đổi UI/auth/storage có sẵn trong working tree vẫn giữ nguyên. Không commit/push/deploy.

## Chưa xác minh và rủi ro trước production

- Không có script lint frontend trong package.json; không báo frontend lint đã qua. Typecheck và production build đã chạy.
- Chưa chạy Expo native build/device; typecheck không thay thế kiểm thử native.
- Chưa kiểm thử thanh toán/refund/payout sandbox xuyên suốt với tài khoản/provider thật; không thực hiện giao dịch thật. Bộ tests hiện không chứng minh toàn bộ luồng kế toán.
- Chưa chạy lại hội thoại AI với dịch vụ ngoài, pipeline embedding hoặc upload R2 mới. Unit tests AI/storage có qua nhưng không xác minh credential/network ngoài.
- Chưa kiểm thử mọi màn admin/lecturer qua tài khoản thật trên browser. Service/API authorization và CRUD đã được kiểm thử PostgreSQL.
- Provider tổ chức chỉ chuẩn bị draft, chưa mở bán/nhận doanh thu. Chưa có settlement/hợp đồng/đối soát cho trung tâm. Live/hybrid/nhóm/1:1 chưa mở vì thiếu lịch và quyền truy cập tương ứng.
- Chưa làm module giấy tờ xác minh, kỳ thi theo năm/tỉnh, đồng biên tập course nhiều người, learning path/bundle/subscription.
- Quy trình pháp lý hoạt động đào tạo, quyền phụ huynh và retention/xóa dữ liệu trẻ em cần triển khai riêng; verified không thay thế các quy trình này.
- Technical debt bảo mật sẵn có: main.py cấu hình CORS rộng và thay global SSL context. Cần audit cấu hình deployment trước production; Catalog không âm thầm thay cấu hình mạng toàn hệ thống.

Đây là bản triển khai local có kiểm chứng, chưa tuyên bố production-ready.
