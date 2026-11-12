# Rà soát mô hình dữ liệu đơn vị cung cấp

Ngày kiểm tra: 2026-11-12. Nguồn: PostgreSQL local (`information_schema`, `pg_constraint`, `pg_indexes`, `information_schema.triggers`), ORM, schema API, service và form FE. Alembic local đang ở `c90d23e45f67`.

Bản này ghi lại snapshot DB ở `c90d23e45f67` tại thời điểm phân tích. Sau khi người dùng chốt ba tác nhân, migration `d01e34f56a78` đã bỏ role riêng và thêm lịch sử liên kết; xem trạng thái hiện hành trong `docs/plans/provider-governance.md`. Các thiếu hụt về hồ sơ/liên hệ/xác minh còn là đề xuất chưa triển khai.

## Kết luận

Luồng gửi/xét duyệt đã có kiểm soát transaction và phân quyền, nhưng hồ sơ đơn vị mới là một bản ghi giới thiệu tối giản. Nó chưa đủ cho admin quản lý thông tin tổ chức, liên hệ, căn cứ xác minh và lịch sử thay đổi. Các kiểm thử trước đó kiểm chứng workflow đã định nghĩa; chúng không chứng minh mô hình nghiệp vụ đã đầy đủ.

Vấn đề quan trọng nhất không phải số ô trong form, mà là thiếu hợp đồng về đơn vị: là thương hiệu giảng dạy, pháp nhân, chi nhánh hay bên bán/nhận tiền. Mô hình hiện tại đang trộn các ý nghĩa này.

## Phạm vi tác nhân đã được người dùng xác nhận

Hệ thống chỉ có **USER (người dùng), LECTURER (giảng viên), ADMIN (quản trị viên)**. Đơn vị cung cấp là thực thể dữ liệu, không phải tài khoản đăng nhập hoặc tác nhân thứ tư.

| Tác nhân | Quyền liên quan đến đơn vị |
| --- | --- |
| Người dùng | Xem hồ sơ đơn vị công khai và khóa học được công bố; không xem dữ liệu xét duyệt/liên hệ nội bộ |
| Giảng viên | Tra cứu đơn vị; gửi/hủy yêu cầu của mình; xem kết quả; liên kết khóa học của mình vào đơn vị đã được admin cấp quyền |
| Admin | Quản lý/xác minh/ẩn đơn vị; xét duyệt yêu cầu; cấp/thu hồi liên kết giảng viên; xem lịch sử xử lý |

Các giá trị owner/manager/editor/instructor trong `provider_members.role` dưới đây là **hiện trạng legacy**, không phải đề xuất tác nhân hoặc mô hình quyền cần tiếp tục mở rộng. Mô hình đích bỏ cột role của quan hệ này: quan hệ chỉ ghi giảng viên nào được admin cho phép tham gia đơn vị nào, cùng trạng thái và lịch sử cấp/thu hồi. Vai trò tài khoản vẫn lấy từ hệ thống USER/LECTURER/ADMIN.

Người đại diện/email/điện thoại của đơn vị nếu cần lưu chỉ là thông tin hồ sơ, không sinh tài khoản quản lý đơn vị. Không mở thêm owner portal, manager portal hoặc editor portal. Trong phạm vi hiện tại cũng không phát sinh tài khoản nhận tiền hay luồng đối soát riêng cho đơn vị; giữ luồng giảng viên hiện có.

## 1. Những gì DB thực sự có

### `public.providers` — 11 trường

| Trường | Kiểu PostgreSQL | Null | Ý nghĩa / ràng buộc |
| --- | --- | --- | --- |
| `id` | uuid | Không | PK, tự sinh |
| `name` | varchar(160) | Không | Tên hiển thị; không có unique constraint trên tên |
| `slug` | varchar(180) | Không | Đường dẫn, unique |
| `provider_type` | varchar(30) | Không | `individual`, `center`, `exam_center`, `organization`; mặc định `individual` |
| `description` | text | Có | Giới thiệu tự do |
| `logo_url` | text | Có | Chuỗi đường dẫn ảnh; không có FK tới asset |
| `banner_url` | text | Có | Chuỗi đường dẫn ảnh; không có FK tới asset |
| `verification_status` | varchar(20) | Không | `pending`, `verified`, `rejected`; mặc định `pending` |
| `is_active` | boolean | Không | Mặc định true; dùng bật/ẩn |
| `created_at` | timestamptz | Không | Mặc định now() |
| `updated_at` | timestamptz | Không | Mặc định now(); ORM có onupdate, DB không có trigger cập nhật |

Chỉ `slug` và PK được DB bảo đảm duy nhất. Service có so khớp tên chuẩn hóa và advisory lock; các lối ghi trực tiếp ngoài service không chịu ràng buộc duy nhất theo tên.

`description` không thể thay thế các trường địa chỉ, email, website hoặc định danh tổ chức: không validate/tìm kiếm/lọc/kiểm tra trùng từng thông tin được nếu gom vào văn bản tự do.

### `public.provider_members` — 5 trường

| Trường | Kiểu | Null | Ý nghĩa |
| --- | --- | --- | --- |
| `provider_id` | uuid | Không | FK providers, ON DELETE CASCADE |
| `user_id` | uuid | Không | FK user, ON DELETE CASCADE |
| `role` | varchar(20) | Không | owner / manager / instructor / editor |
| `status` | varchar(20) | Không | active / inactive |
| `joined_at` | timestamptz | Không | Lần tạo bản ghi, mặc định now() |

PK ghép `(provider_id, user_id)`. Upsert chỉ thay `role` và `status`; không lưu ai cấp/thu hồi, lúc nào, lý do hoặc các lần tham gia lại. `joined_at` không phải thời điểm thay đổi quyền gần nhất.

### `public.provider_creation_requests` — 15 trường

| Nhóm | Trường | Ý nghĩa |
| --- | --- | --- |
| Định danh | `id` uuid, `requester_id` uuid | PK và người gửi; requester bắt buộc |
| Nội dung đề nghị | `name` varchar(160), `normalized_name` varchar(160), `provider_type` varchar(30), `description` text | Snapshot đề nghị ban đầu |
| Liên hệ/minh chứng | `contact_email` varchar(320), `website_url` varchar(2048) nullable | Email bắt buộc; một URL đang dùng chung cho website hoặc minh chứng |
| Đề nghị | `reason` text | Lý do tạo và mối liên hệ của người gửi |
| Workflow | `status` varchar(20), `created_at` timestamptz | pending / approved / rejected / cancelled |
| Kết quả | `reviewed_by` uuid nullable, `decided_at` timestamptz nullable, `review_note` text nullable, `provider_id` uuid nullable | Người xử lý, thời điểm, ghi chú và đơn vị được tạo/liên kết |

Có CHECK kiểm tra hình dạng quyết định; từ chối bắt buộc ghi chú. Unique index `normalized_name` chỉ áp dụng cho yêu cầu pending. Các FK người gửi/người duyệt/provider dùng RESTRICT để giữ lịch sử; cần tính tác động này khi thiết kế xóa hẳn tài khoản hoặc đơn vị.

### Liên kết khóa học và dữ liệu dẫn xuất

`courses.provider_id` là UUID nullable, có FK providers. `courses.instructor_id` vẫn bắt buộc; đơn vị chưa thay thế chủ sở hữu khóa học hoặc người nhận thu nhập.

Các trường phản hồi `subjects`, `grades`, `instructors`, `course_count`, `is_member` không phải cột của providers. Chúng được truy vấn từ khóa học, phân loại, tài khoản và membership. Chưa có danh sách môn/khối mà đơn vị tự khai báo độc lập với khóa học công khai.

## 2. Những thiếu hụt đã xác minh

### P1 — Liên hệ và website bị giữ ở yêu cầu, không có trong hồ sơ đơn vị

Nhánh duyệt tạo provider chỉ truyền `name`, `provider_type`, `description`, `verification_status`, `is_active` sang bản ghi mới (`app/services/providers.py`, nhánh decide_request). `contact_email` và `website_url` vẫn còn trong request nhưng không trở thành dữ liệu hồ sơ có thể cập nhật.

Admin tạo trực tiếp không có nơi nhập email/website. Form admin hiện chỉ phản ánh tập trường tối giản của providers.

Không nên khắc phục bằng cách tự động công khai contact_email: form mặc định bằng email tài khoản người gửi. Đây có thể là liên hệ cá nhân, không phải email của tổ chức. URL hiện còn có thể là minh chứng riêng tư thay vì website chính thức.

### P1 — “Đã xác minh” chưa có căn cứ và lịch sử đầy đủ

Provider không có `verified_by`, `verified_at`, căn cứ, ghi chú xác minh hoặc lịch sử thay đổi. Duyệt yêu cầu mặc định đặt verified; admin sửa trực tiếp cũng có thể đổi cờ này. Request lưu người xét duyệt lần tạo, nhưng không phản ánh các thay đổi xác minh sau đó hoặc provider tạo trực tiếp.

Form admin mặc định verified khi tạo mới. Việc chấp thuận tạo hồ sơ và việc hoàn thành xác minh đang bị gộp vào cùng thao tác, chưa có tiêu chí dữ liệu rõ ràng. Cờ verified không chứng minh đã xác minh giấy phép hay tư cách pháp lý.

### P1 — Thiếu phân tách hồ sơ công khai và dữ liệu quản trị

Chưa có trường riêng cho tên pháp lý, thông tin đại diện, địa chỉ, số liên hệ của tổ chức và tài liệu minh chứng. Nếu bổ sung, cần phân loại public/private ngay trong response DTO, không trả toàn bộ model ra public.

Hiện public_provider đã whitelist cột; cần giữ nguyên nguyên tắc này khi mở rộng, không chuyển sang trả record(provider) cho public.

### P1 — Trung tâm được duyệt vẫn chưa có luồng mở bán

`CatalogService.validate_assignment(..., publishing=True)` chặn mọi provider khác individual. `public_course()` cũng loại các khóa gắn provider khác individual khỏi catalog công khai. Đây là guard chủ động trong thiết kế catalog cũ, không phải chỉ thiếu UI.

Hệ quả: việc tạo/duyệt/cấp thành viên cho một trung tâm chưa bảo đảm giảng viên xuất bản được khóa mang tên trung tâm. Cần chốt đơn vị chỉ là thương hiệu liên kết hay còn là bên bán/nhận tiền. Không tự bỏ guard hoặc thêm thông tin ngân hàng vào hồ sơ công khai để giải quyết vấn đề này.

### P1 — Lịch sử quản trị và ý nghĩa vai trò còn thiếu

`provider_members` chỉ giữ trạng thái cuối. `providers` không lưu người tạo/người sửa. Thông báo không thay thế nhật ký quản trị: hiện không ghi đủ before/after, người thao tác và lý do thay đổi quyền.

owner/manager/editor/instructor còn tồn tại trong DB, nhưng API quản trị đơn vị chỉ cho ADMIN. `provider_permission` mặc định chấp nhận cả bốn vai trò khi kiểm tra liên kết khóa học. Chưa có ma trận quyền khác biệt tương ứng tên vai trò. Theo phạm vi ba tác nhân đã xác nhận, cần bỏ tập vai trò này khỏi quan hệ đơn vị–giảng viên và giao diện cấp quyền. Khi triển khai migration, chuyển các liên kết legacy hợp lệ sang quan hệ giảng viên được cấp quyền, giữ lịch sử, không xóa hàng loạt dữ liệu.

### P2 — Định danh và loại đơn vị chưa đủ chính xác

Tên chuẩn hóa không đủ phân biệt các tổ chức hoặc chi nhánh trùng tên. Kiểm tra trùng tên hiện áp dụng cả hệ thống và có thể chặn hai đơn vị khác nhau. `center`/`exam_center` mô tả hoạt động, trong khi `individual`/`organization` mô tả hình thức chủ thể; chúng không cùng một trục phân loại. Enum cũng chưa có loại school dù lời giải thích nghiệp vụ từng nhắc tới trường học.

Chưa có mô hình chi nhánh, định danh pháp lý hoặc khóa định danh nghiệp vụ khác. Không nên thêm unique tên như một cách thay thế cho định danh tổ chức.

### P2 — Assets, chất lượng dữ liệu và tài liệu

Logo/banner đang nhập đường dẫn thủ công. Service kiểm tra prefix public storage, chưa có quan hệ asset xác định tồn tại, quyền sử dụng hoặc vòng đời ảnh. Giới thiệu dài tối đa 10.000 ký tự đang dùng Input một dòng ở form admin.

Tài liệu education-catalog-v2 cũ vẫn mô tả owner/manager tự quản lý, trái với API admin-only hiện tại. Cần cập nhật hợp đồng chung, không chỉ thêm một plan mới.

## 3. Mô hình đề xuất tối thiểu trước khi làm lại form

Đây là đề xuất sản phẩm, chưa phải các cột đã tồn tại hoặc yêu cầu pháp lý.

| Nhóm | Dữ liệu đề xuất | Quy tắc |
| --- | --- | --- |
| Hồ sơ công khai | Giữ `name`, `slug`, `description`; thêm `website_url`, `public_email`, `public_phone` | Liên hệ của đơn vị, có lựa chọn công khai; không tự lấy email cá nhân người gửi |
| Địa chỉ | `country_code`, mã khu vực theo danh mục được dự án chọn, `address_line` | Tách trường để validate/tìm kiếm; địa chỉ cá nhân không tự công khai |
| Loại đơn vị | `provider_type`; tên pháp lý/định danh nếu thực sự cần xác minh tổ chức | Đây là phân loại hồ sơ, không phải tác nhân hay quyền đăng nhập mới; chưa cần mở rộng thành mô hình pháp nhân riêng |
| Đại diện/liên hệ riêng | `representative_name`, `representative_role`, `contact_email`, `contact_phone` | Admin được xem; không mặc định đưa lên public profile |
| Xác minh | `verified_by`, `verified_at`, `verification_note`; bảng `provider_verification_evidence` | Minh chứng riêng, người kiểm tra, thời điểm và kết quả; tách URL website khỏi URL minh chứng |
| Quản trị | `created_by`, `updated_by`; bảng `provider_audit_logs` | Ghi actor, hành động, before/after được chọn lọc, thời điểm và lý do |
| Liên kết giảng viên | `provider_id`, `instructor_id`, `status`, người/thời điểm cấp và thu hồi, lý do; có lịch sử sự kiện | Không có owner/manager/editor; admin quản lý quan hệ, giảng viên chỉ sử dụng quyền liên kết khóa học của mình |
| Ảnh | Quan hệ/tham chiếu asset phù hợp storage hiện có | Upload/chọn ảnh thay vì buộc admin gõ đường dẫn |
| Yêu cầu | Tách `requester_contact_*`, `website_url`, minh chứng; snapshot thông tin đề nghị có schema/version rõ | Payload được duyệt ánh xạ sang hồ sơ theo danh sách trường cho phép; giữ nguyên snapshot gốc |

Không cần tạo ngay bảng chi nhánh nếu sản phẩm chỉ quản lý một địa chỉ cho mỗi đơn vị. Nếu cùng một tổ chức có nhiều cơ sở, thêm `provider_locations` thay vì tạo nhiều providers chỉ khác địa chỉ và chặn nhau vì trùng tên.

Không thêm bảng nhận tiền/đối soát trong đợt hoàn thiện hồ sơ. Nếu đơn vị là bên bán, đó là phần nghiệp vụ riêng cần hợp đồng payee/settlement rõ ràng trước khi sửa guard mở bán.

## 4. Thứ tự sửa đề xuất

1. Áp dụng phạm vi đã chốt: ba tác nhân USER/LECTURER/ADMIN; đơn vị là hồ sơ do admin quản lý. Chốt tập trường công khai/riêng tư và tiêu chí verified; đối chiếu guard xuất bản với ý nghĩa liên kết khóa học, không tạo thêm bên nhận tiền cho đơn vị.
2. Bổ sung model và migration additive cho liên hệ/địa chỉ, provenance xác minh và audit; không tự công khai dữ liệu từ request cũ, không tự nâng mức xác minh.
3. Đồng bộ request → review → provider với snapshot và mapping rõ; admin tạo trực tiếp phải có cùng tiêu chuẩn dữ liệu với đơn vị được duyệt từ yêu cầu.
4. Làm lại form theo nhóm Tổng quan / Liên hệ / Địa chỉ / Xác minh / Thành viên / Lịch sử; bỏ nhập ảnh bằng đường dẫn, dùng textarea đúng loại nội dung.
5. Cập nhật DTO public/private, quyền của ba tác nhân và hợp đồng tài liệu cũ; loại bỏ các lựa chọn owner/manager/editor khỏi UI/API liên kết đơn vị. Xác định ai được xem minh chứng và thời hạn lưu trong thiết kế sản phẩm.
6. Bổ sung kiểm thử chất lượng dữ liệu: giữ liên hệ sau duyệt, không lộ liên hệ riêng/minh chứng, thay đổi xác minh có actor và lý do, cấp-thu hồi-cấp lại giữ lịch sử, định danh không chặn nhầm đơn vị khác nhau, và khả năng xuất bản theo loại đơn vị.

## Nguồn mã đối chiếu

- ORM: `studynest_be/app/db/models/catalog.py` (`Provider`, `ProviderMember`, `ProviderCreationRequest`).
- API schema: `studynest_be/app/schemas/catalog.py`.
- Xét duyệt và quản trị: `studynest_be/app/services/providers.py`.
- Quyền liên kết/xuất bản và public projection: `studynest_be/app/services/catalog.py`.
- Form admin/yêu cầu: `studynest_fe/src/components/catalog/provider-editor.tsx`, `provider-request-form.tsx`.
- Hợp đồng catalog cũ: `docs/architecture/education-catalog-v2.md`.
