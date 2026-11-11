# Lộ trình và combo — kế hoạch triển khai

## Dependency và phạm vi

Giữ nguyên courses, lesson/section/progress, enrollment và người nhận earnings. Lộ trình là tuyển chọn học thuật do admin duyệt; combo là danh sách khóa/giá xác định, có thể liên kết phiên bản lộ trình. Không tự dùng doanh số/rating thiếu đối soát để gán A1–C2. AI tự xuất bản chưa bật.

Luồng: admin khai báo framework/level → duyệt nhãn course → tạo bản nháp path với stage/nhóm lựa chọn → publish bản bất biến → learner theo dõi version. Combo version chứa các course cụ thể và giá phân bổ cố định → quote theo quyền sở hữu → xác nhận bằng quote hash → checkout idempotent → snapshot order + line → transaction/purchase/earning/enrollment từng course.

## Điểm rủi ro đã xác minh

Checkout cũ cho nhiều course dùng chung transaction; refund/payout cũ lấy một earning/purchase đầu tiên theo transaction. Combo mới dùng transaction riêng cho từng line nhưng chỉ trừ ví tổng một lần trong cùng transaction DB. Nhờ đó luồng đối soát legacy không lẫn giữa các course; order cấp trên gom các line. Refund line combo dùng mapping chính xác và hoàn toàn bộ allocated_price, không chỉ phần instructor. Tất cả commit nguyên tử, khóa ví và serialized purchase theo user, idempotency key lưu order.

Mỗi version đã published bất biến. Quyền sở hữu khóa giúp giảm phần tiền đã phân bổ cho khóa đó, không tính lại chiết khấu dựa giá mới. Tổng allocation bằng bundle price với largest remainder ở độ chính xác 0.01 VND. Không cộng coupon lên giá combo. Giá và khóa đã mua được hiển thị trước xác nhận, quote thay đổi trả conflict, không tự thu tiền khác. Chỉ VND và recorded content đủ public/provider policy mới bán. Demo có thể xem path/combo thử nhưng không checkout.

## Thứ tự và kiểm tra

1. Schema additive + backup, kiểm tra FK và downgrade trên DB riêng.
2. Services validation/publish/versioning/progress và bundle quote/checkout/refund.
3. Public/admin APIs, quyền owner/admin, legacy refund dispatch cho bundle lines.
4. Cloudy Blue admin editor, thư viện/detail lộ trình và combo, quote/confirm/receipt, loading/error/empty.
5. Test DB riêng: rounding, owned, concurrent purchase, idempotency, rollback, refund đúng line, version immutable, IDOR, visibility. Web/mobile typecheck, production build, browser responsive.

Chưa deploy hoặc migrate production. Không công bố production-ready nếu chưa hoàn tất quality gates hoặc còn rủi ro tài chính chưa kiểm chứng.
