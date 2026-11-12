# Instructor Discovery & Profile V2 — Mây Mây

Ngày triển khai: 11/11/2026. Hợp đồng FE/BE: [instructor-discovery-contract.md](instructor-discovery-contract.md).

## Kiến trúc trước và sau

Trước: chỉ có `/top`, chi tiết và danh sách khóa theo giảng viên. Chưa có route web directory. Detail chỉ kiểm tra role, không chặn banned/deleted; counters trên User được cập nhật rải rác lúc tạo/xóa khóa, đăng ký/mua và đánh giá nên không đại diện chính xác cho nội dung đang công khai. Phân trang khóa dùng ID đơn trong khi sắp theo ngày/rating/views/enrollment, lấy cursor từ dòng dư. Homepage có checkmark không có hồ sơ xác minh tương ứng. MarkdownRenderer chung có đường tắt trả HTML thô khi nội dung bắt đầu bằng `<`.

Sau: router mỏng `api/v1/user/lecturer.py` → schema tường minh `schemas/user/instructors.py` → `services/user/instructor_discovery.py`. Legacy `LecturerService` ủy quyền các phương thức đọc cho service mới; đăng ký giảng viên giữ luồng cũ. `instructor_visibility.py` tập trung điều kiện công khai, ProviderService dùng lại. Không xây lại Catalog V2, payment, auth hoặc mobile.

## Điều kiện công khai

Có role LECTURER (bảng hiện hữu không có cờ active riêng cho UserRoles); `deleted_at IS NULL`, `is_banned=false`, có ít nhất một khóa thỏa `public_course()`. Điều kiện này dùng cho directory, detail, featured, endpoint khóa và người dạy trên provider profile.

`public_course()` giữ nguyên: published, approved, chưa xóa, không prefix seed/minh họa, provider nếu có phải đáp ứng chính sách hiện hành (individual, active, verified). Không mở thanh toán cho organization hoặc đổi người nhận doanh thu. Provider affiliation từ khóa công khai hoặc thành viên instructor đang active của provider active/verified; affiliation không phải chứng chỉ và không chứng minh môn học của trung tâm. Môn/lớp/kỳ thi/mục tiêu luôn lấy từ khóa công khai thực tế. Nhiều filter học thuật phải khớp cùng một khóa.

## API

Prefix backend `/api/v1`; web dùng shared client `/api`.

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| GET | `/users/instructors` | Directory công khai, keyset, total tùy chọn |
| GET | `/users/instructors/filter-options` | Taxonomy Catalog V2 gọn và provider affiliation hợp lệ |
| GET | `/users/instructors/top` | Mảng tối đa 4 người theo số học viên đủ điều kiện; giữ các tên field legacy |
| GET | `/users/instructors/{uuid}` | Hồ sơ an toàn, 404 nếu không đủ điều kiện |
| GET | `/users/instructors/{uuid}/courses` | Giữ field/query legacy, sửa keyset, thêm filter Catalog V2 |
| GET | `/users/instructors/saved` | Directory đã lưu của chính tài khoản đăng nhập |
| GET | `/users/instructors/saved/ids?ids=...` | Batch tối đa 30 ID, chỉ trạng thái đã lưu của viewer hiện tại |
| PUT | `/users/instructors/{uuid}/saved` | Lưu idempotent, cần login và teacher còn công khai |
| DELETE | `/users/instructors/{uuid}/saved` | Bỏ lưu idempotent, kể cả teacher đã bị ẩn |
| POST | `/users/instructors/become` | Giữ chức năng đăng ký hiện có |

Static routes đứng trước `/{uuid}`. Directory query: `q`, `grade`1–12, `level` code, `subject` slug, `exam`/`goal` code, `provider` slug, `min_rating`0–5, `sort`, `limit`1–30, `cursor`, `include_total`. Giá trị taxonomy không tồn tại/đã tắt trả422; query lạ bị từ chối. Courses giữ limit1–50 và tám sort ngày/rating/views/enrolls asc/desc. UUID sai422, resource không công khai404, private read khi chưa login401, viewer bị khóa403.

Envelope `{items,next_cursor,has_more,total}`; `include_total=false` bỏ count và trả total null. Public response model không serialize User entity. Legacy name/student_count/course_count/rating_avg/evaluated_count còn được giữ; UI cần xem count trước khi hiện sao.

## Tìm kiếm và ranking

Search chuẩn hóa NFC, trim/collapse whitespace; SQL normalize+translate+lower để so tiếng Việt không dấu (kể cả đ/Đ và chuỗi decomposed). Giữ chữ Unicode ngoài Latin, escape `%`, `_` và backslash. Không cần unaccent extension hay search server. Search trên tên, tên môn của khóa công khai, mô tả giảng dạy authored và tên provider affiliation hợp lệ.

- `relevant`: khi có q, tên khớp chính xác=4, tên chứa=3, môn=2, provider=1, bio=0; UUID làm tie-break. Không có q dùng số học viên đủ điều kiện.
- `popular`: số người học **không trùng**, enrollment active trên các khóa công khai; bỏ self-enrollment và tài khoản learner banned/deleted. Không dùng views để xếp người dạy.
- `rating`: score `(sum_rating + 20×4)/(review_count+20)`, cast numeric6 chữ số. Prior cố định4/5, sức nặng20 review; chỉ dùng xếp hạng, không hiển thị thành điểm thật.
- `courses`: số khóa đủ điều kiện công khai.
- `newest`: ngày tạo tài khoản `User.create_at`, nhãn “Mới tham gia”; không suy ra tuổi nghề. Không có timestamp xuất bản đầu tiên đáng tin cậy nên `first_public_course_at` để null.
- `name`: tên đã normalize không dấu, collation C, tăng dần.

Rating hiển thị là trung bình **đánh giá khóa học**, không phải đánh giá năng lực giảng viên. Chỉ lấy review1–5 từ người có enrollment active ở khóa đang công khai, reviewer hợp lệ, không tự đánh giá. Mỗi cặp course/user chỉ lấy review mới nhất theo updated_at, created_at, id; rating_count là số cặp đủ điều kiện, không phải số học viên duy nhất. Chưa có review thì không hiển thị 0.0 sao. min_rating áp dụng trên trung bình thực và yêu cầu ít nhất một review.

## Query và phân trang

CTE khóa công khai; aggregate riêng course count, learner distinct, review dedupe bằng row_number và rating metrics. Không join trực tiếp nhiều mapping bảng vào một aggregate gây nhân bản. Academic filters dùng EXISTS/semi-join; role cũng dùng EXISTS để không nhân đôi khi legacy có nhiều UserRoles.

Trang chỉ lấy cột public cần thiết; biography listing giới hạn4.096 ký tự trước chuyển plain text, short_bio240 ký tự. Profile lấy phần giới thiệu riêng (giới hạn50.000 khi xử lý). Không tải password, email, identity, embedding hoặc ví. Metadata subjects/grades/exams/goals/provider được batch theo ID của trang. 7 SELECT cho trang có kết quả (count + page +4 taxonomy +affiliation), không tăng theo số card; load more bỏ count. Trang rỗng không chạy batch metadata.

Dùng cursor utility Catalog V2 với sort-value+UUID và chữ ký filter/scope. Cursor tạo từ **dòng cuối đã trả**, không phải dòng limit+1. Signature gồm instructor khi phân trang khóa, viewer khi phân trang saved; limit/include_total không làm hỏng cursor. Không có quy tắc so ID đơn trái với trường sort. Dữ liệu không thay đổi thì không lặp/bỏ sót; đây không phải snapshot xuyên nhiều request khi dữ liệu được chỉnh giữa các trang.

## Database

Không tái tạo taxonomy. Hai migration additive:

- `a78b90c12d34`: `instructor_favourites(user_id,instructor_id,created_at)`; PK hai ID, FK cascade tới User, index đảo theo instructor. Bảng độc lập course_favourites, không có thông báo/chat/follow xã hội.
- `b89c12d34e56`: index khóa public theo `(instructor_id,created_at DESC,id DESC)`, UserRoles `(user_id,role_id)`, enrollment active `(course_id,user_id)` và reviews `(course_id,user_id)`. Không thêm unique constraints lên dữ liệu legacy có thể có trùng.

Đã backup private/ignored tại `studynest_be/backups/instructor-v2/` trước migration local. Không reset DB, không seed giảng viên giả vào local, không deploy production. Upgrade/downgrade/upgrade được kiểm tra trên DB thử riêng.

## Quyền riêng tư và nội dung

Bookmarks lấy user từ AuthorizationService, không nhận user_id để quyết định owner. PUT dùng ON CONFLICT DO NOTHING; DELETE chỉ theo viewer+teacher. Saved list/IDs cũng áp dụng eligibility; record cũ không làm lộ teacher đã bị ẩn. Viewer bị khóa/xóa bị chặn. Public profile không có saved-state cá nhân nên không đưa private state vào metadata.

Profile biography chuyển plain text bằng HTMLParser, bỏ script/style/iframe/object; UI render escaped text, không dùng đường HTML bypass của MarkdownRenderer. Facebook chỉ http/https tới hostname Facebook/fb.com chính xác, không credential/port; frontend links dùng noopener/noreferrer. Không có teacher verification badge vì chưa có nguồn xác minh chuyên môn đáng tin. Provider verification không thay thế teacher credentials.

Các wrapper route cũ trả raw exception/stack detail đã gỡ; HTTPException404/422 không bị bọc thành500. Sửa thêm truy vấn lấy role LECTURER trong đăng ký: bỏ predicate course/user không liên quan đã có sẵn trước phiên; không thay phí, payment settlement hay notification semantics.

## Frontend

Server route `/instructors` với metadata/canonical, URL filters noindex theo chính sách; Client directory dùng SWR, URL state, search debounce+Enter, bộ lọc Catalog thật, chips/reset, six sorts, skeleton/error/retry/empty và load more. `InstructorCard` dùng link semantic, avatar fallback không lặp, không có verification giả. Shared Modal cho filter mobile.

Profile `/instructors/[id]` giữ URL, metadata công khai, notFound cho hồ sơ không tồn tại/không công khai; lỗi hạ tầng có retry riêng; overview/taxonomy/provider và course tabs, khóa vẫn trỏ `/course/{slug}`. Biographies không chạy HTML. Trang `/favorites/instructors` dưới protection `/favorites`; hook batch saved-state theo tài khoản và lưu/bỏ lưu có khóa thao tác/lỗi rõ. Homepage và Dynamic Island có lối vào directory; không thiết kế lại navigation.

## Kiểm chứng và giới hạn

Các kết quả bên dưới được ghi từ lần chạy thực tế; không coi dữ liệu fixture trong trình duyệt là dữ liệu chính thức. Không coi một lần đo nhỏ trên local là benchmark tải production. Cần tiếp tục staging với dữ liệu/traffic thật, theo dõi query plan và quy trình biên tập khóa thật. Không bổ sung cache, teacher credential system, lịch dạy, nhắn tin, hoặc dữ liệu giảng viên mẫu để lấp trạng thái rỗng.


### Kết quả BE đã chạy

- Hai migration upgrade local/test; round-trip downgrade về f67a89b01c23 rồi upgrade head trên DB thử riêng qua. Không rollback schema local.
- Integration instructor + catalog + paths/bundles: **89 passed** ở nhóm integration liên quan sau bổ sung kiểm tra Unicode không hợp lệ. Toàn bộ suite backend: **212 passed, 27 warnings, 3 subtests passed**, 24.07s. Warnings hiện hữu liên quan Pydantic/Google SDK/pytest fixtures/resources, không bị tắt để làm xanh kết quả. Bao gồm6 sort directory và8 sort course asc/desc.
- API thật: directory/filter-options/top200, canonical combined query200, UUID sai422, hồ sơ không tồn tại404, saved guest401.
- Query-count integration xác nhận7 SELECT cho cả trang1 hoặc5 người; projection không có password/identity.
- Đo thực trên transaction scratch có40 giáo viên/80 khóa công khai, rollback toàn bộ sau đo: trang12 người tổng40, 7 SELECT; service131.69ms, EXPLAIN trang chính planning2.351ms/execution7.747ms, node Limit. Đây là dữ liệu kiểm thử nhỏ/cold compilation, không phải benchmark production hoặc bảo đảm SLO. Không suy ra mức tăng tốc từ một lần đo.
- Log: `/tmp/instructor-v2-full-tests.log`, `/tmp/instructor-v2-query-plan.json`.


### Kết quả frontend và browser

- `cd studynest_fe && npx tsc --noEmit`: exit0 sau review. `npm run build`: build production thành công; danh sách route có directory, profile và saved instructors. Log `/tmp/instructor-v2-build.log`. Cảnh báo hạ tầng hiện có: middleware convention deprecated, baseline-browser-mapping cũ và metadataBase chưa khai báo ở những route khác (build vẫn cảnh báo toàn ứng dụng). MetadataBase của hai route instructor lấy từ `NEXT_PUBLIC_URL_FRONTEND`, fallback localhost cho development.
- `ruff check` trên schema/service/router/models/migrations/tests của tính năng: All checks passed. `git diff --check`: sạch.
- Trình duyệt guest thật tại localhost: directory hoạt động; filter taxonomy thực; saved route chuyển login. Không có lỗi console trên tab directory kiểm tra. Không overflow tại390×844,768×1024,1440×900; desktop headingtop khoảng244px, không bị Dynamic Island che. Mobile filter dùng dialog có tên/description, modal và close/apply; chọn lớp12 cập nhật URL cùng môn Toán; reset/clear trở lại URL gốc. Search Enter chuẩn hóa NFC/whitespace và cập nhật URL; back khôi phục sort trước đó. Sort cập nhật URL.
- Fixture XHR **chỉ trong browser context QA**, không thêm mock API vào repository hoặc ghi DB:12 card trang đầu; double-click load more chỉ phát một request cursor; cuối13 card unique và hết nút tải. Request trang2 Địa lí bị làm chậm5s, đổi sang Toán trước khi hoàn tất: sau đó chỉ12 card Toán, nút tải hoạt động; response Địa lí không chen vào. Backend pagination được kiểm tra tự động riêng trên PostgreSQL.
- Harness tạm ngoài repository (`/tmp/instructor-v2-harness`) bundle **component thực** với API/router giả: profile hiển thị môn/lớp/exam/provider, không hiện sao khi chưa review; avatar lỗi chuyển initials, không lặp tải; HTML tiểu sử được escape, không chạy script; hostname Facebook giả bị loại; link provider đúng và course tab mở link `/course/{slug}`. Guest Save hướng login. Hồ sơ lỗi503 có retry và hiển thị lại sau thành công (đã sửa lỗi initialUnavailable giữ error mãi). Layout profile không overflow ở cả ba kích thước. Harness không có auth/payment hoặc font loader Next thực, không được coi là E2E dữ liệu thật.
- Cùng harness: hai toggle đồng thời chỉ tạo một DELETE; đổi ownerA→B khi request đang chạy không hiện lại cardA, không ghi saved-state củaA vàoB, trạng tháiB=false và không pending. Kiểm tra owner isolation/idempotence/auth của API đã nằm trong suite PostgreSQL.
- Không có framework test FE được cấu hình trong package hiện tại; không thêm framework lớn chỉ cho trang này. Browser/harness là kiểm tra hành vi của phiên này, không phải suite FE tự động trong CI.

## Lỗi đã sửa

Eligibility thiếu banned/deleted; public counters sai phạm vi; duplicate instructor do nhiều quan hệ; phân trang khóa dùng sai sort/cursor dòng dư; verification checkmark vô căn cứ; mô tả HTML không an toàn; raw exception công khai; role query đăng ký chứa điều kiện không liên quan; phản hồi load more cũ sau đổi filter/viewer; double-click tạo nhiều thao tác; saved-cache ghi nhầm sau đổi viewer; retry hồ sơ không thoát initialUnavailable; link footer cũ không vào directory. Provider profile liên kết lại đúng hồ sơ instructor; profile liên kết provider thực. Không thay settlement/payment flow.

## Danh sách tệp

### Tạo mới

- `studynest_be/app/schemas/user/instructors.py`
- `studynest_be/app/services/user/instructor_discovery.py`
- `studynest_be/app/services/user/instructor_visibility.py`
- `studynest_be/app/db/models/instructor_favourites.py`
- `studynest_be/alembic/versions/a78b90c12d34_instructor_favourites.py`
- `studynest_be/alembic/versions/b89c12d34e56_instructor_query_indexes.py`
- `studynest_be/tests/integration/test_instructor_discovery.py`
- `studynest_fe/src/app/(main)/(user)/instructors/page.tsx`
- `studynest_fe/src/app/(main)/(user)/favorites/instructors/page.tsx`
- `studynest_fe/src/components/user/instructors/instructor-directory.tsx`
- `studynest_fe/src/components/user/instructors/instructor-filter-sidebar.tsx`
- `studynest_fe/src/components/user/instructors/instructor-card.tsx`
- `studynest_fe/src/components/user/instructors/saved-instructors-view.tsx`
- `studynest_fe/src/hooks/user/use-saved-instructors.ts`
- Ba tài liệu `docs/architecture/instructor-discovery-contract.md`, `instructor-discovery-v2.md`, `instructor-ui-result.md`.

### Chỉnh sửa

- BE: `app/api/v1/user/lecturer.py`, `app/services/user/lecturer.py`, `app/services/providers.py`, `app/db/models/database.py`.
- FE: `src/app/(main)/(user)/instructors/[id]/page.tsx`; `src/types/user/instructor.ts`; ba component `src/components/user/instructors/detail/{index,detail,courses}.tsx`; `src/components/user/favorites/index.tsx`; `src/components/user/home/instructors-section.tsx`; `src/components/user/home/cinematic/LandingDynamicIsland.tsx`; `src/components/user/footer/index.tsx`; `src/components/catalog/provider-profile.tsx` (chỉ thêm link hồ sơ).

## Giới hạn và đánh giá sẵn sàng

1. DB local hiện không có instructor với khóa học chính thức đủ điều kiện; directory rỗng là kết quả thật. Không xuất bản lại khóa mẫu để tạo kết quả. Chưa nghiệm thu hồ sơ có dữ liệu thật và save/refresh qua phiên đăng nhập thật trên môi trường ứng dụng đầy đủ; đã kiểm tra service/API bằng integration và component bằng harness.
2. API hồ sơ unavailable trả404 đúng. Web gọi `notFound()` và xuất giao diện404 +robots noindex; thử cả dev và production riêng port3013 vẫn thấy **HTTP200 do root streaming/loading boundary hiện tại**. Nếu tiêu chí bắt buộc status transport404 cho mọi client, mục này còn chưa đạt. Liên quan `src/app/loading.tsx`, layout gốc và route instructor; chưa đổi chính sách streaming toàn hệ thống hoặc thêm một lượt fetch vào middleware để che vấn đề.
3. Chưa có Lighthouse, tải đồng thời lớn, kiểm thử screen reader đầy đủ hoặc bộ FE tự động CI. Không tuyên bố WCAG chứng nhận hay SLO production từ kiểm tra layout/keyboard và số đo nhỏ.
4. Cần cấu hình `NEXT_PUBLIC_URL_FRONTEND` đúng origin khi build môi trường thật; chạy hai migration trên staging/production theo quy trình phát hành có backup. Không deploy trong phiên này.
5. Không có instructor credentials đáng tin: chủ động bỏ verified badge; không tạo fake review section/experience. Extension sau này có thể thêm hồ sơ chứng chỉ có audit trail, maintained aggregates khi đo tải thực sự yêu cầu, và FE regression runner theo chuẩn chung dự án.

**Đánh giá**: triển khai đã tích hợp FE/BE và qua các kiểm tra kỹ thuật nêu trên, sẵn sàng review/UAT trên staging. Chưa khẳng định toàn bộ acceptance production đạt: cần dữ liệu chính thức để nghiệm thu end-to-end và quyết định xử lý HTTP404 trong kiến trúc streaming chung.
