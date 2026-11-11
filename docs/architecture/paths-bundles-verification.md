# Lộ trình/combo — kết quả kiểm thử giai đoạn đầu

> Báo cáo lịch sử trước khi bỏ chế độ minh họa. Đường dẫn demo, script seed và số liệu dưới đây không còn mô tả trạng thái hiện tại. Xem [quy trình catalog chính thức](official-catalog-workflow.md) và [kiểm tra hiện hành](official-catalog-review.md).

## Kết quả có thể kiểm tra

Module đã chạy trên local, schema additive đã migrate sau backup. Giao diện Cloudy Blue nối API/database thật:

- `/lo-trinh`, `/lo-trinh/demo-hanh-trinh-tieng-anh`
- `/combo`, `/combo/demo-combo-tieng-anh`
- `/lo-trinh/cua-toi`, `/combo/don-hang`, `/combo/don-hang/{id}`
- `/admin/learning-paths`, `/admin/bundles`

Path/framework/nhãn do admin quản trị, course picker tìm theo tên và sắp thứ tự, xem trước/publish, clone thành version mới, hide/show. Người học thấy chặng/học phần và các khóa thay thế, theo dõi version, tiến độ theo bài học thật. Combo có quote personalized, owned credit, refund policy lấy cấu hình, confirm riêng, idempotency và receipt. Demo chỉ minh họa, không mở bán.

Chi tiết schema, API, phân bổ tiền, quyền và migration: [hướng dẫn](paths-bundles-guide.md). [Kế hoạch ban đầu](paths-bundles-implementation.md).

## Quality gates thực tế

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ backend pytest trên DB thử riêng | **160 passed, 3 subtests passed** |
| Integration riêng path/bundle | **18 passed** |
| Largest remainder, tổng allocation và fee | Qua, có cả phần lẻ 0.01 |
| Owned credit, giá đã chốt không bị giá lẻ mới thay | Qua |
| Quote thay đổi, thiếu ví, banned buyer, client tự gửi amount | Bị từ chối đúng lỗi, không trừ tiền |
| Fault injection sau khi bắt đầu ghi | Rollback ví/order/earning/holding |
| Hai request đồng thời cùng idempotency key | Một đơn, một lần trừ ví |
| Retry và mua lại khi đã sở hữu | Trả đơn cũ hoặc quote 0, không thu lại phần đã có |
| Hoàn line và payout release | Đúng số thực trả/share, không ảnh hưởng line khác; xử lý lặp bị chặn |
| Refund treo và quyền refund | Giữ payout, không cho user khác yêu cầu/duyệt |
| Admin/anonymous/receipt IDOR | 401/403/404 phù hợp |
| Version và child/snapshot triggers | Chặn sửa/xóa published và order snapshots ở PostgreSQL |
| Tiến độ nhóm có khóa thay thế | Một option hoàn thành đủ cho nhóm, không buộc học mọi lựa chọn |
| Xóa course đã được bundle tham chiếu | 409 có thông báo, không lỗi FK 500 |
| Refund legacy transaction nhiều line thiếu mapping | Chặn đối soát, không chọn earning tùy ý |
| Alembic upgrade/downgrade/upgrade | Qua trên DB riêng phục hồi từ backup trước module |
| Ruff file Python mới | Qua |
| Web production build | Qua, log `/tmp/paths-bundles-build-final.log` |
| Web TypeScript | Qua |
| Mobile TypeScript | Qua; types/services mới, không đổi native auth/navigation |
| Public API thật | GET path/bundle/detail/quote qua |
| Trang riêng tư anonymous | 307 về login; orders API 401 |
| Mobile web Playwright 390px | Path list/detail và bundle detail không tràn ngang; không ảnh lỗi; demo CTA disabled |
| Refund policy trên UI | Hiển thị **3 ngày**, khớp cấu hình local, không hardcode 7 |
| Metadata detail | Title combo đúng nội dung từ public API |
| Diff whitespace phần thay đổi liên quan | Qua; global diff còn whitespace có sẵn ở file AI ngoài phạm vi |

Log full pytest: `/tmp/paths-bundles-tests-final.log`. Warnings còn thuộc Pydantic/pytest/gamification/fixtures legacy, không bị suppress để báo pass.

## Bảo toàn dữ liệu

Local sau công việc: **57 course, 19 enrollment, 25 purchase_item, 0 bundle_order**. Không phát sinh mua/hoàn/chuyển ví thật. Path/bundle demo có 2 version để kiểm tra bất biến; bản mới nhất dùng thứ tự lớp tăng dần, không quy đổi lớp sang CEFR. Những course demo vẫn có dấu demo, không gán chứng nhận/năng lực thật. Không thêm lượt mua/review giả.

Backup trước migration trong `studynest_be/backups/paths-bundles/before-*.dump`, private/ignored. Chỉ migrate local và DB thử, không deploy hoặc migrate production, không commit/push.

## File chính

Backend:
- `alembic/versions/d45e67f89a01_learning_paths_bundles.py`, `e56f78a90b12_guard_published_path_children.py`.
- `app/db/models/learning_paths.py`, đăng ký trong `database.py`.
- `app/schemas/learning_paths.py`, `app/services/learning_paths.py`, `bundles.py`, `bundle_settlement.py`.
- `app/api/v1/learning_paths.py`, router registration `app/main.py`.
- Tích hợp hẹp vào `services/shares/refund.py`, `payout.py`, `transaction.py`, `services/user/courses.py`, `services/lecturer/course.py`; admin refund route truyền reviewer ID thật.
- `tests/integration/test_paths_bundles.py`, `scripts/seed_paths_bundles_demo.py`.

Web:
- `src/types/learning-paths.ts`, `src/lib/server/learning-metadata.ts`.
- `src/components/learning-paths/*`, `src/components/admin/learning-paths/*`.
- Các page path/combo/admin tương ứng dưới `src/app/(main)/`.
- Shared Modal thêm focus trap/restore focus; protected routes trong middleware; nav admin/catalog giữ thiết kế hiện có.

Mobile: `src/types/learning-paths.ts`, `src/services/learning-paths.service.ts`.
Docs/README: kế hoạch, hướng dẫn, báo cáo này, liên kết audit cũ.

## Giới hạn trước production

Không coi kết quả local là xác nhận toàn bộ nền tảng production-ready. Cần staging E2E bằng buyer/lecturer/admin thật, thử các trạng thái ví/khóa, payout job và quy trình hỗ trợ/đối soát, monitoring, backup/restore. Chưa thực hiện thanh toán thật, payout external hoặc kiểm thử mọi màn admin bằng tài khoản browser có quyền; quyền và nghiệp vụ đã có HTTP/service/PostgreSQL tests.

Frontend không có script lint, nên không báo đã chạy frontend lint. Chưa native build/simulator/device cho module; mới types/services và typecheck. Cần load test dữ liệu lớn; bộ test concurrency hiện xác nhận correctness cho retry, chưa là benchmark tải production.

Legacy bulk financial transactions không tự backfill line-to-earning khi thiếu căn cứ. Các khoản đó bị chặn tự hoàn và cần đối soát thủ công trước xử lý. Không thay đổi payout/payee tổ chức chưa được hỗ trợ. Các rủi ro deployment CORS/SSL và dữ liệu aggregate legacy ngoài phạm vi vẫn phải được rà soát.

AI tự xếp/publish, chứng chỉ CEFR, bundle subscriptions, coupon stacking và tự cấp khóa mới cho đơn cũ không nằm trong module đã triển khai. Không giả vờ những tính năng này đã hoạt động.
