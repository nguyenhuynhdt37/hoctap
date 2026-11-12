# Đơn vị cung cấp — quản trị và xét duyệt

## Phạm vi tác nhân được xác nhận sau rà soát dữ liệu

Chỉ có USER, LECTURER và ADMIN. Provider là hồ sơ dữ liệu do admin quản lý, không có tài khoản hoặc cổng quản trị riêng. Quan hệ với giảng viên chỉ thể hiện quyền được gắn khóa học vào đơn vị.

Đã thực hiện migration `d01e34f56a78`: bỏ cột role của quan hệ đơn vị–giảng viên và các lựa chọn owner/manager/editor/instructor khỏi API/UI. Vai trò toàn hệ thống vẫn chỉ là USER/LECTURER/ADMIN; quan hệ đơn vị không tạo tác nhân hoặc tài khoản riêng. Mô tả DB c90 trong `docs/architecture/provider-data-audit.md` được giữ làm snapshot trước chuyển đổi, không phải schema hiện hành.


## Hợp đồng nghiệp vụ

Admin chịu trách nhiệm tạo/sửa/ẩn đơn vị và cấp/thu hồi thành viên. Giảng viên được tìm kiếm danh sách đơn vị đã xác minh, xem những đơn vị mình được cấp quyền và gửi yêu cầu tạo nếu chưa có. Việc xem danh sách không cấp quyền gắn khóa học vào một tổ chức.

Yêu cầu tạo là bản ghi riêng, chưa phải đơn vị công khai. Người gửi cung cấp tên, loại, giới thiệu, email liên hệ, lý do và website/minh chứng tùy chọn. Không cho gửi các trường quyền, trạng thái hoặc người xét duyệt.

- `pending → approved`: admin tạo đơn vị đã xác minh hoặc liên kết một đơn vị đã có; cấp liên kết giảng viên cho người gửi, không cấp quyền quản trị đơn vị.
- `pending → rejected`: admin phải ghi lý do; người gửi thấy lý do và có thể gửi yêu cầu mới đã chỉnh sửa.
- `pending → cancelled`: chỉ người gửi được hủy yêu cầu của mình.
- Quyết định cuối không được sửa/duyệt lại. Khóa bản ghi khi quyết định, kiểm tra lại trạng thái trong transaction.

Không đổi quy tắc thanh toán/đối soát đang có: xác minh đơn vị không mặc nhiên mở bán khóa học tổ chức hoặc chuyển doanh thu khỏi giảng viên.

## Phân quyền và dữ liệu

- API và service đều chặn giảng viên tạo/sửa đơn vị, tự thêm thành viên, tự xét duyệt.
- Directory chỉ công khai đơn vị active + verified; danh sách riêng dùng cho chọn đơn vị của khóa học vẫn giới hạn thành viên được admin cấp.
- Hàng đợi admin có phân trang, lọc trạng thái, tìm kiếm, chi tiết người gửi và dữ liệu yêu cầu. Giảng viên chỉ đọc yêu cầu của chính mình.
- Lưu requester, thời điểm gửi, người duyệt, thời điểm quyết định, lý do, provider_id được tạo/liên kết. Không xóa lịch sử khi ẩn đơn vị.
- Chống gửi trùng tên sau chuẩn hóa khoảng trắng/chữ hoa, unique index cho yêu cầu pending; kiểm tra lại đơn vị tồn tại lúc duyệt. Admin có thể liên kết vào đơn vị hiện hữu để tránh tạo trùng.
- Migration additive, không tự duyệt các đơn vị legacy pending và không sửa dữ liệu ngoài phạm vi.

## Thông báo

Lưu thông báo cùng transaction với yêu cầu/quyết định; chỉ phát WebSocket sau commit. WebSocket lỗi không làm mất trạng thái hoặc thông báo bền vững.

1. Gửi yêu cầu: hàng đợi ADMIN và xác nhận tiếp nhận cho người gửi ở LECTURER.
2. Duyệt/từ chối: kết quả cho người gửi, kèm lý do, link tới yêu cầu và provider khi duyệt.
3. Hủy: thông báo hàng đợi admin và xác nhận người gửi.
4. Admin thay đổi/cấp/thu hồi thành viên: thông báo trực tiếp giảng viên bị ảnh hưởng.

Tận dụng Notifications, role channels, unread, toast và trang thông báo hiện có; không gửi email ngoài hệ thống.

## Triển khai

1. Model/migration/schema và notification staging/publish để bảo đảm nguyên tử.
2. Service/API: directory, request lifecycle, admin CRUD và member management.
3. UI Cloudy Blue: trang giảng viên có directory / đơn vị được cấp / yêu cầu của tôi; form yêu cầu; trang admin quản lý đơn vị và hàng đợi xét duyệt, liên kết navigation; chọn đơn vị trong khóa học chỉ từ danh sách có quyền.
4. Kiểm thử PostgreSQL + API: phân quyền, dữ liệu riêng tư, chống trùng, xét duyệt cạnh tranh, rollback thông báo, membership, hủy/từ chối/gửi lại, public visibility và guard thanh toán.
5. Kiểm tra typecheck/build, regression FE, trình duyệt desktop/mobile và các luồng lỗi. Báo rõ phần nào dùng dữ liệu giả lập.


## Hoàn tất triển khai và xác minh

- Trang admin: `/admin/providers`; trang giảng viên: `/lecturer/providers`. Có liên kết từ sidebar admin, thanh điều hướng catalog và phần chọn đơn vị của khóa học. Mục đơn vị cũ trong catalog chuyển đến màn hình quản trị mới.
- Đã có directory, danh sách được cấp quyền có phân trang, yêu cầu có lọc trạng thái, tìm kiếm của admin, chi tiết qua URL `request_id`, xác nhận xét duyệt/hủy và thông báo lỗi giữ dữ liệu nhập.
- Admin cấp/thu hồi thành viên qua tìm kiếm giảng viên theo tên/email; không yêu cầu nhập UUID.
- Đã xử lý giới hạn Unicode/URL, khóa và unique index chống cạnh tranh, kiểm tra lại vai trò người gửi khi duyệt, các giao dịch rollback cả provider/membership/notification nếu lưu thông báo thất bại.
- Notifications dùng `stage_notification_async` và `publish_notification_async`: lưu cùng transaction, phát sau commit. Trang thông báo có loại “Đơn vị cung cấp”; admin đánh dấu đọc được thông báo chung mà không ảnh hưởng hộp thư giảng viên. Bỏ dependency embedding không sử dụng khỏi dịch vụ thông báo.
- Toast chỉ phát từ event realtime, không replay lịch sử; event đầu tiên trong hộp thư rỗng được hiển thị, event lặp không tăng unread. Danh sách đơn vị/yêu cầu cập nhật khi nhận event provider.
- Đã kiểm tra và sửa các trường hợp tràn ngang mobile do tên dài và nhãn sr-only; nút thao tác chờ hydration để không mất lần bấm đầu.

### Bằng chứng kiểm tra

- **44 kiểm tra PostgreSQL/API thành công**: `tests/integration/test_provider_governance.py` (16 ca) và `tests/integration/test_catalog_v2.py` (28 ca). Scratch database chỉ sao chép schema, tạo dữ liệu giả; không sao chép dữ liệu người dùng thật.
- **Trình duyệt độc lập thành công**: gửi yêu cầu; thông báo realtime cho admin và xác nhận cho giảng viên; kiểm tra lý do từ chối; duyệt/cấp quyền; từ chối; hủy; admin tạo đơn vị trực tiếp; tìm/cấp/thu hồi thành viên; 404 cho yêu cầu người khác; 403 khi giảng viên gọi API admin; giao diện giảng viên ở 1440px và 390px. Không có runtime page error.
- Fixture trình duyệt chỉ thay xác thực bằng tài khoản test, các provider API, PostgreSQL và WebSocket notification chạy thật. Fixture chỉ khởi động khi có `PROVIDER_BROWSER_TEST=1` và DB test được chỉ định rõ. Không tạo đơn vị thử trong database local chính.
- Frontend `typecheck`, `test:lecturer`, test notification store, test session/chat stream và production build Webpack đều thành công; `git diff --check` sạch. Có cảnh báo baseline-browser-mapping, middleware convention và pytest loop-scope có sẵn, không chặn kiểm tra.
- Migration `c90d23e45f67` đã kiểm tra trên scratch và áp dụng vào database local. Khi triển khai môi trường khác phải chạy `alembic upgrade head` trước khi đưa API mới vào phục vụ.

### Cách chạy lại

Backend dùng database kiểm thử đã migrate và có seed catalog/cây category như dự án:

```sh
cd studynest_be
TEST_DATABASE_ASYNC_URL='<disposable PostgreSQL URL>' .venv/bin/pytest tests/integration/test_provider_governance.py tests/integration/test_catalog_v2.py -q
```

Frontend và store:

```sh
npm --prefix studynest_fe run typecheck
npm --prefix studynest_fe run test:lecturer
node scripts/test-provider-notifications.cjs
```

Smoke test trình duyệt: `scripts/browser/test-provider-governance.cjs`, backend fixture `studynest_be/tests/browser/provider_governance_app.py`. Dùng một bản frontend riêng trỏ HTTP/WS tới fixture để không đổi phiên đăng nhập hoặc môi trường đang chạy của người dùng. Chỉ định `PLAYWRIGHT_MODULE`, `PROVIDER_BROWSER_URL`, `CHROME_PATH` theo máy chạy.

### Chuyển đổi dữ liệu cũ

Đơn vị legacy chưa xác minh vẫn được admin thấy và quản lý; không tự động duyệt hoặc chuyển chúng thành yêu cầu mới. Mọi liên kết cũ được chụp vào `provider_membership_events` trước khi bỏ role. Liên kết của tài khoản không có vai trò LECTURER được archive khỏi quan hệ hiện hành; giảng viên bị khóa/xóa mềm được ngừng liên kết. Các tài khoản, đơn vị và thông tin liên kết cũ vẫn được truy vết qua lịch sử. Không suy đoán người cấp quyền/thời điểm cấp cho dữ liệu cũ.

## Chuyển đổi về đúng ba tác nhân

- `provider_members` giữ `provider_id`, `user_id` (tài khoản giảng viên), `status`, `joined_at` và thêm `granted_by`, `granted_at`, `revoked_by`, `revoked_at`, `revocation_reason`; không còn cột role.
- `provider_membership_events` lưu provider, giảng viên, admin thao tác, hành động, trạng thái, lý do, metadata và thời điểm. Sự kiện legacy được đánh dấu riêng; không làm giả actor/thời điểm lịch sử.
- Admin cấp/thu hồi liên kết; thu hồi cần lý do. Cấp lại không xóa lịch sử lần thu hồi trước. Thao tác không thay đổi trạng thái không sinh event hoặc thông báo trùng.
- Duyệt yêu cầu cũng sử dụng cùng logic cấp liên kết, có event trỏ về request. Dữ liệu liên kết, audit và notification commit nguyên tử.
- Chỉ admin được đọc lịch sử qua GET `/admin/providers/{provider_id}/membership-events`; giao diện quản lý đơn vị hiển thị lịch sử có phân trang. Giảng viên không có API tự đổi liên kết.
- Truy vấn giảng viên công khai và bộ lọc đơn vị đã bỏ điều kiện role riêng, vẫn giữ kiểm tra tài khoản giảng viên và public visibility của dự án.
- Migration đã kiểm tra upgrade/downgrade/upgrade với đủ bốn role legacy, tài khoản admin và giảng viên bị khóa. Downgrade được chặn nếu đã có quyết định liên kết mới để tránh diễn giải sai quyền. Khi triển khai môi trường khác phải migrate trước khi phục vụ code mới; API `role` cũ bị từ chối thay vì tự bỏ qua.
- Các phần mở rộng hồ sơ đơn vị (liên hệ/địa chỉ/xác minh) trong bản audit là công việc riêng, chưa triển khai trong đợt đơn giản hóa tác nhân này.


### Xác minh chuyển đổi ba tác nhân

- **74 kiểm tra PostgreSQL/API thành công**, gồm governance, catalog và instructor discovery. Bổ sung kiểm tra API từ chối role riêng; tài khoản USER/ADMIN không được cấp liên kết giảng viên; cấp/thu hồi/cấp lại giữ đủ actor và lý do; audit lỗi thì rollback quyền; lịch sử chỉ admin được đọc.
- Kiểm thử migration với đủ bốn vai trò cũ, liên kết inactive, tài khoản admin không có LECTURER, giảng viên bị khóa: snapshot đủ dữ liệu, loại liên kết không hợp lệ khỏi trạng thái hiện hành, downgrade trước vận hành khôi phục đúng dữ liệu gốc, upgrade lại thành công.
- E2E Chrome độc lập trên DB riêng đã kiểm tra không còn bộ chọn vai trò, lịch sử hiện trong màn hình quản trị và thu hồi bị chặn khi chưa nhập lý do; các luồng yêu cầu/thông báo/mobile tiếp tục thành công. Fixture đợi xác nhận WebSocket sẵn sàng trước khi kiểm tra realtime.
- Typecheck, production build Webpack, kiểm tra session/chat stream, store thông báo và hồi quy giảng viên thành công. Migration `d01e34f56a78` đã áp dụng local; không có cột role trong provider_members.


## Avatar, danh mục toàn quốc và xin gia nhập đơn vị công tác — 12/11/2026

### Phạm vi và quyền

- Giữ đúng ba tác nhân USER, LECTURER, ADMIN. Hồ sơ đơn vị và yêu cầu công tác là dữ liệu, không có tài khoản/vai trò riêng.
- Giảng viên xem danh mục, thấy địa chỉ/tỉnh và trạng thái xác minh, gửi yêu cầu gia nhập đúng nơi đang công tác. Người gửi bắt buộc khai vị trí/môn dạy, thông tin đối chiếu từ 30 ký tự và xác nhận đang công tác; email cơ quan là tùy chọn, không suy đoán quan hệ công tác chỉ từ tên miền email.
- Admin đối chiếu trang nhân sự, email cơ quan hoặc liên hệ chính thức; phải ghi kết quả/lý do tối thiểu 10 ký tự. Duyệt cần xác nhận đã kiểm tra công tác và đơn vị phải đang hoạt động, đã xác minh. Chọn trường hoặc gửi đơn không tự cấp quyền.
- Liên kết được duyệt đi qua cùng cơ chế membership/audit. Giảng viên có thể gắn đơn vị cho khóa học theo quyền hiện có; danh sách giảng viên công khai vẫn tuân thủ điều kiện công khai của tài khoản. Không cấp quyền sửa hồ sơ đơn vị, quản lý giảng viên khác hoặc quyền tài chính của admin.
- Guard bán/xuất bản hiện vẫn chỉ cho provider loại individual; gia nhập trường/trung tâm không tự mở bán khóa học cho tổ chức hoặc thay đổi cơ chế chi trả.
- Minh chứng, email công tác, nhận xét xét duyệt chỉ có trong API admin/người gửi; không đưa vào public directory hoặc payload thông báo. Đơn đã duyệt lưu lịch sử; admin thu hồi liên kết khi giảng viên ngừng công tác, có lý do và audit.

### Dữ liệu và API mới

- `providers`: thêm `province`, `province_code`, `school_code`, `address`, `website_url`, `source_url`, `source_key` unique, `source_checked_at`, `source_snapshot` JSONB. Bổ sung `school` cho cả provider và đề nghị tạo mới. Các trường source là chỉ đọc trên giao diện, admin không được gửi đè qua schema quản trị.
- Public provider chỉ thêm tỉnh/địa chỉ/website; source snapshot không công khai qua whitelist này. Directory giảng viên, danh sách được cấp quyền và hồ sơ công khai chỉ sử dụng đơn vị verified/active. Hồ sơ nhập pending chỉ xuất hiện ở admin; giảng viên không được gửi đơn vào một hồ sơ chưa xác minh.
- `provider_join_requests`: id, provider_id, requester_id, position, work_email, evidence, status, review_note, reviewed_by, created_at, decided_at. Partial unique `(provider_id, requester_id) WHERE status=pending`; DB CHECK cho trạng thái/quyết định và nhận xét bắt buộc; khóa hàng khi hủy/duyệt, khóa provider khi cấp quyền.
- GET/POST `/lecturer/provider-join-requests`; POST `/{id}/cancel`. GET `/admin/provider-join-requests`; POST `/{id}/decision`. Danh sách có phân trang. Quyền chỉ được cấp trong giao dịch duyệt; quyền + audit + thông báo lưu cùng transaction, realtime phát sau commit.
- Giao diện có mục Yêu cầu gia nhập, form từ thẻ đơn vị, chi tiết minh chứng riêng tư, xét duyệt và hủy; URL `?view=joins` mở đúng mục từ thông báo.

### Ảnh qua R2

- POST `/admin/providers/assets/{avatar|banner}` chỉ ADMIN; uploader dùng `public/providers/catalog/{avatars|banners}/<uuid>-<kind>.webp` cho phép chuẩn bị ảnh trước khi tạo đơn vị.
- Chỉ nhận nội dung ảnh JPEG/PNG/WebP giải mã được, tối đa 5 MB, 20 megapixel, tối thiểu 32px; không tin đuôi file/MIME do client khai. Xoay theo EXIF, thu nhỏ, ghi lại WebP bỏ metadata. Avatar chuẩn hóa canvas trong suốt 512x512, bìa tối đa 2400x1200, giữ tỉ lệ logo.
- Lưu URL proxy ứng dụng ổn định, không lưu URL ký có hạn. Form có preview, gỡ ảnh, retry và chặn lưu khi đang upload; lưu đơn vị mới áp dụng ảnh. Không xóa ảnh cũ ngay vì có thể còn tham chiếu.
- Đã kiểm tra R2 thật bằng PUT/GET/đối chiếu bytes và dọn object thử. Browser fixture dùng R2 thật để upload, lưu đơn vị, tải ảnh qua proxy và mở lại form; dữ liệu nghiệp vụ vẫn ở DB test riêng.

### Crawl và nhập dữ liệu

- Nguồn trường: bảng năm 2026, bản cập nhật 09/05/2026, được trang tuyển sinh Đại học Công nghiệp Quảng Ninh công bố: https://tuyensinh.qui.edu.vn/about/Danh-sach-truong-THPT-theo-dia-gioi-hanh-chinh-moi.html . Lưu nguyên CSV, SHA256, bản ghi nguồn và thời điểm thu thập; không nhận đây là kiểm chứng pháp lý của từng trường.
- Đã nhập local 3.323 hồ sơ trường thuộc đủ 34 tỉnh/thành và 17 đơn vị luyện thi có chứng cứ nguồn. Đây là toàn bộ nhóm trường được bộ lọc nhận diện từ bảng nguồn, không cam kết bao phủ tuyệt đối mọi cơ sở đang hoạt động. Có trường phổ thông liên cấp trong nhóm này; nguồn không có trường phân biệt công lập/tư thục đủ tin cậy nên không tự gán.
- Bảng gốc còn mã GDTX/nghề, mã dự phòng, tên trước đổi/sáp nhập và trường hợp mơ hồ: giữ nguyên trong `excluded-schools.json` cùng lý do, không tự ghép với trường hiện tại. Các hồ sơ mới đều pending, không tự gắn nhãn verified và không tự cấp lecturer membership.
- Trung tâm: HOCMAI, Tuyensinh247, VUIHOC, VTED, Mclass, HOC247, HSA Education, VietJack, VUNGOI, Luyện Thi 123, Nguyễn Thượng Hiền, TopHSA, hai đơn vị Thành Công riêng, CLC, Nhân Tài Việt, DMT Education. Đây là danh mục có nguồn, không phải bảng xếp hạng hoặc tuyên bố thu thập hết mọi trung tâm nổi tiếng. Moon.vn chưa đủ nội dung truy xuất được nên chưa nhập.
- Khi website chặn crawler, chỉ bổ sung bằng nguồn công bố trực tiếp hoặc thông tin nhà phát triển tự công bố; `center-supplements.json` giữ nguồn và ngày đối chiếu thật, không giả HTTP thành công/hash. Phân biệt HSA Education với cơ quan tổ chức thi tại hsa.edu.vn.
- `scripts/import_provider_directory.py` mặc định fetch/report; `--apply` mới nhập. Nguồn có khóa tỉnh+mã trường (phiên bản danh mục 2026), không gộp theo tên: nhiều tỉnh có trường trùng tên. Import khóa giao dịch, unique source_key, không ghi đè hồ sơ đã nhập/admin sửa; bản ghi manual trùng tên được báo riêng để admin xử lý. Chạy lại trên local: 0 thêm, 3.340 đã có, không trùng.
- Nguồn cập nhật năm khác cần quy trình đối chiếu mã/sáp nhập trước khi đổi namespace; không chạy import danh mục năm khác như thêm mới hàng loạt. Import không tạo logo giả; đơn vị thiếu ảnh dùng ký tự đại diện, admin có thể tải logo thật lên R2.
- Import tạo một thông báo tổng hợp cho ADMIN trong cùng giao dịch, tránh phát hàng nghìn thông báo riêng.


### Bổ sung theo yêu cầu nhiều đơn vị và chất lượng danh mục

- Một giảng viên có nhiều liên kết đơn vị đồng thời; khóa chính membership là cặp provider/user. Mỗi đơn vị có đơn xin gia nhập, quyết định và lịch sử cấp/thu hồi độc lập. Thu hồi tại A không ảnh hưởng B; không có đơn vị chính bắt buộc.
- Directory có tìm kiếm tên/tỉnh/mã trường không phân biệt hoa thường và dấu tiếng Việt; lọc loại đơn vị, tỉnh/thành, sắp tên A–Z/Z–A, mới/cũ. Admin thêm lọc trạng thái xác minh/hoạt động. Danh sách được cấp quyền cũng nhận các bộ lọc. API whitelist giá trị sort, giới hạn kích thước trang và trả total cho đúng bộ lọc.
- Yêu cầu gia nhập có tìm theo đơn vị/giảng viên/vị trí giảng dạy, lọc trạng thái, sắp mới/cũ/tên đơn vị và phân trang. Admin mặc định hàng đợi pending, giảng viên mặc định toàn bộ đơn của chính mình. Thông báo lỗi nằm trong form và giữ dữ liệu để sửa/gửi lại.
- Phía giảng viên mặc định và bắt buộc chỉ thấy đơn vị verified + active ở cả API và UI. Tham số query không thể làm lộ hồ sơ pending. Import không tự xác minh đơn vị.
- `crawl_provider_logos.py`: đối chiếu tên chuẩn hóa + tỉnh từ danh bạ Sở, không đoán tên miền trường. Quét các danh bạ khả dụng từ trang 34 Sở do Cục Quản lý chất lượng công bố; báo rõ nguồn không có danh bạ hoặc lỗi. Chỉ tải ảnh từ website có căn cứ nguồn, chặn địa chỉ private/non-HTTP và kiểm tra mỗi redirect, giới hạn bytes, dùng cùng pipeline WebP 512x512 và canonical R2 như upload admin.
- Kiểm tra trực quan phát hiện logo chung của Sở/cổng thông tin bị gắn vào website trường. Crawler loại tên file/caption nhận diện logo cơ quan, loại hash ảnh giống nhau giữa các hồ sơ chưa xác minh, giữ lịch sử `logo_rejected`, không tự coi ảnh dùng chung là logo trường. Ảnh crawler bị loại được gỡ khỏi DB và xóa R2 sau khi kiểm tra không còn provider tham chiếu; không sửa/xóa ảnh của hồ sơ đã được admin xác minh.
- Crawler giữ ảnh có sẵn, ghi source website/image/hash/thời điểm, có báo cáo và chế độ resume `--skip-discovery`. Logo không lấy được hoặc không đủ căn cứ vẫn trống; không vẽ/gán thay bằng logo cơ quan khác. Có thể nạp logo thật thủ công bằng form admin.


### Kết quả cuối đợt bổ sung

- DB local đã migrate tới `g34b67c89d01`; 3.340 bản ghi nhập mới (3.323 trường, 17 đơn vị luyện thi), 34 tỉnh/thành, không tạo tài khoản/role mới. Đã chạy nhập lại: 0 thêm; giữ dữ liệu admin đã chỉnh trong kiểm thử DB riêng.
- 216 logo lưu R2 (207 hồ sơ trường, 9 đơn vị luyện thi); những hồ sơ còn thiếu ảnh không được gán logo giả. Có 321 website đối chiếu được từ các nguồn đã truy xuất, không phải toàn bộ 3.340 hồ sơ đều có website/logo. Kết quả nguồn lỗi/thiếu logo được giữ trong báo cáo, không tuyên bố đã crawl hết ảnh của mọi trường.
- Ảnh avatar 512x512 được bỏ đệm trong suốt dư, giữ tỉ lệ và đặt logo trắng trên nền có tương phản. Không tái tạo chi tiết vốn thiếu trong ảnh nguồn. Đợt chuẩn hóa lại chỉ áp dụng ảnh crawler đã chứng minh sở hữu ở hồ sơ pending; giữ ảnh admin đã thay và hồ sơ đã xác minh. Dùng key R2 mới, cập nhật DB rồi xóa key cũ khi không còn provider tham chiếu.
- **81 kiểm tra PostgreSQL/API** qua governance, catalog, instructor discovery. Có kiểm tra nhiều đơn vị và thu hồi độc lập, bộ lọc/sắp xếp, không lộ pending, không cấp quyền trước duyệt, cạnh tranh hai admin, quyền riêng tư, rollback quyền/quyết định khi thông báo lỗi.
- **31 kiểm tra unit/storage** qua ảnh, nguồn danh mục, chặn URL private và loại logo Sở; có trường hợp ảnh trắng/ảnh trong suốt, bytes giả SVG, file quá lớn, tree R2.
- **24 kiểm tra E2E Chrome thành công**, API/DB/WebSocket và R2 thật trên DB test riêng: tạo/duyệt/từ chối/hủy, thông báo, cấp/thu hồi, ảnh upload/lưu/hiển thị/mở lại, xin gia nhập hai đơn vị, admin đối chiếu, validation giữ form, bộ lọc/sắp xếp và mobile không tràn ngang. Xác thực dùng fixture test, không thay đăng nhập hay hồ sơ người dùng thật.
- Typecheck và production build Webpack thành công; store thông báo, lecturer regression, session refresh và chat stream đều qua kiểm tra. Có warning có sẵn về baseline-browser-mapping/middleware/metadataBase; không nâng framework hoặc thay phạm vi dự án để né lỗi.
- Migrations mới đã kiểm tra downgrade/upgrade trên schema trống, nhập lặp không trùng/không ghi đè admin, một thông báo tổng hợp; downgrade bị chặn khi đã có danh mục dữ liệu để tránh mất provenance.


### Trạng thái kết nối R2 ở thời điểm bàn giao

- Sau khi upload/crawl và kiểm thử R2 thành công, mạng bắt đầu trả certificate do Vingroup Web Gateway phát hành thay cho chuỗi chứng chỉ R2 tin cậy. Python/boto3 báo `CERTIFICATE_VERIFY_FAILED: unable to get local issuer certificate`. Kiểm tra bằng root hệ thống và truststore cũng không xác thực được; không tắt TLS verification và không tự tin cậy chứng chỉ lấy từ kết nối bị chặn.
- 216 ảnh đã có sẵn, đều là canvas 512x512. 183 ảnh đã hoàn tất chuẩn hóa khung v2 (bỏ đệm trong suốt, tăng tương phản logo trắng); 33 ảnh còn giữ phiên bản 512x512 trước đó, trong đó 32 cần retry R2 và 1 cần rà lại bằng chứng ảnh crawler. Không mất ảnh hiện hành khi upload mới lỗi.
- Cần CA gốc do IT cung cấp hoặc mạng truy cập R2 trực tiếp để upload mới/chạy lại phần còn lại. Cơ chế cấu hình `R2_CA_BUNDLE` đã có sẵn trong storage service; chưa thay cấu hình CA khi chưa có nguồn tin cậy.
- Đã dừng hai server kiểm thử và xóa hai database test. Có 6 object ảnh thử nghiệm chờ xóa khi TLS được khôi phục; danh sách an toàn (đã loại mọi URL được provider thật tham chiếu) ở `/tmp/hoctap-provider-test-assets-cleanup.json`. Database/R2 thật không chứa đơn vị/tài khoản nghiệp vụ thử.


## Điều chỉnh cuối: bỏ bước xác minh đơn vị

Theo yêu cầu mới, đơn vị mặc định verified; bỏ bộ chọn/bộ lọc/badge xác minh và hướng dẫn xác minh trên UI. Migration h45c78d90e12 chuyển toàn bộ hồ sơ hiện có sang verified, giữ nguyên is_active. API quản trị chỉ chấp nhận verified, importer và DB mặc định verified. Quyết định này thay thế chính sách nhập pending ở các mục trước. Admin vẫn phải duyệt công tác khi giảng viên xin gia nhập; không tự cấp membership. Đã kiểm tra DB không còn provider chưa verified và typecheck.
