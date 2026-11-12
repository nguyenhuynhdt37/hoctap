# Instructor V2 — hợp đồng triển khai

Codex sở hữu BE, migration, integration tests; Gemini tiếp tục sở hữu FE theo phân công trong phiên. Chỉ sửa module instructor, homepage instructor section, thêm nav instructor nếu chưa có. Không sửa Catalog V2/shared UI/auth/payment hay dữ liệu mẫu. Tuân thủ AGENTS.md + Cloudy Blue.

## API (web /api, backend /api/v1)

- GET `/users/instructors`: query `q` (trim/collapse whitespace, tối đa160), `grade`1..12, `level` code education level, `subject` slug, `exam` code, `goal` code, `provider` slug, `min_rating`0..5, `sort` relevant|popular|rating|courses|newest|name, `limit`1..30 default12, `cursor`, `include_total`true default. API validates canonical taxonomy values, unknown/inactive returns422. All reads guest. Same eligible instructor rule: LECTURER role, not banned/deleted, >=1 public_course().
- GET `/users/instructors/filter-options`: same compact shape as `/catalog/browse-filters`, providers include verified active provider affiliations from courses OR active instructor ProviderMember relationships. Subjects/grades/goals/exams canonical.
- Envelope `{items,next_cursor,has_more,total:number|null}`; load more include_total=false, don't reset first-page total to null. Stable cursor binds filters/sort (not limit/include_total). Return controlled422 on mismatch.
- Instructor item: `{id,name,avatar,short_bio,subjects:[{id,name,slug}],grades:[{id,name,grade_number}],exams:[{id,code,name}],learning_goals:[{id,code,name}],providers:[{id,name,slug}],public_course_count,course_count,student_count,rating_avg:number,evaluated_count,rating_count,first_public_course_at:null}`. rating_avg=0 with count0 means not reviewed, omit stars. Ratings represent eligible COURSE reviews, label accordingly. Students = distinct active enrolled learners across public courses (not summed counters).
- GET `/users/instructors/top` keeps array + legacy names, updated truthful stats; no verified instructor badge.
- GET `/users/instructors/{uuid}`: item fields + `instructor_description` plain safe text, `facebook_url` validated https/http Facebook URL only, `created_at` (account creation date). 404 for ineligible instructor. Do not render raw HTML; BE strips tags and script/style content. No email/address/phone/identity/wallet/notes.
- GET `/users/instructors/{uuid}/courses`: legacy parameters `keyword,category_slug,topic_slug,level` (beginner|intermediate|advanced|all), sort created_at_desc|created_at_asc|rating_desc|rating_asc|views_desc|views_asc|enrolls_desc|enrolls_asc, limit1..50, cursor; plus grade/subject/exam/goal/provider optional. Stable keyset cursor; 404 if profile ineligible. Response `{items,next_cursor,has_more,total}`; item retains legacy fields id,title,slug,thumbnail,base_price,is_purchased,is_favorite,rating_avg,rating_count,total_enrolls,views,level,language,category:{id,name,slug}|null,topic same,created_at,updated_at; adds currency. UI can use existing course cards or semantic link card, never fake metrics.

## Saved instructors

Static routes registered BEFORE /{uuid}:
- GET `/users/instructors/saved`: same directory envelope, same filters, requires login; only own eligible saved instructors.
- GET `/users/instructors/saved/ids?ids=uuid&ids=uuid`: max30 IDs, returns `{ids:[uuid]}` for current user's saved eligible instructors. Batch state fetch only logged-in; don't add per-card requests. Scope SWR key by user.id.
- PUT `/users/instructors/{uuid}/saved`: idempotent save, returns `{saved:true}`; requires eligible instructor + active viewer.
- DELETE same: idempotent remove `{saved:false}` even if teacher subsequently unavailable. No client user_id accepted.
- New protected page `/favorites/instructors` under existing /favorites middleware protection. Nav link from directory, profile and existing favorites area if appropriate. Guest save links to /login?redirect=currentURL. Save button lock while request, reliable error and retry; avoid unsafe rapid toggle/optimistic state.

## UI responsibilities

Build /instructors Server page shell + metadata (canonical /instructors; filtered URLs noindex/follow), directory Client filtering/search debounce350ms+Enter, URL back-forward, chips, canonical taxonomy options, shared Modal mobile, InstructorCard reusable, cursor pagination guarded against stale/double responses. No keepPreviousData showing old filter results; pages/extras keyed by filter. Existing /instructors/[id] route upgraded with real metadata, 404 on API404, overview/subjects/grades/exams/goals/providers/course list, no fabricated verification or experience. Preserve InstructorDetailData/InstructorResponse types used elsewhere; only add fields, don't remove legacy account-editor types. Don't use shared MarkdownRenderer on biographies (its HTML passthrough is unsafe); show plain escaped text from BE.

Home featured section reuse truthful card/API, no blanket checkmark and no nested clickable div/buttons; Xem tất cả link /instructors. Ensure global Dynamic Island link if needed (don't redesign).

No new UI framework, no mock/dev route, no DB writes/seeding, no build until Codex signals (typecheck allowed). Run npx tsc --noEmit and record exact result + changed files in docs/architecture/instructor-ui-result.md then stop edits for review. Implement directly, no action plan approval.

Sort newest được chốt theo ngày tạo tài khoản User.create_at (nhãn Mới tham gia). Không có timestamp xuất bản khóa đầu tiên đáng tin nên first_public_course_at=null; không suy ra kinh nghiệm.

## Cập nhật công khai giáo viên — 2026-11-11

Quy tắc mới thay phần eligibility/sort cũ ở trên: tài khoản có quyền LECTURER (được cấp sau luồng thanh toán/nâng cấp), không bị khóa/xóa, được công khai hồ sơ dù chưa có khóa published. Không tự công khai khóa nháp/chưa duyệt. Directory, detail, featured, saved và provider people dùng cùng policy. Không đưa thông tin thanh toán vào response công khai.

Mặc định `sort=rating`, xếp giảm dần theo trung bình đánh giá hợp lệ của các khóa công khai; chưa có đánh giá có điểm 0. Các đánh giá vẫn yêu cầu người học đang đăng ký, loại bản trùng, tài khoản bị khóa/xóa và tự đánh giá. Featured dùng cùng sort; danh sách khóa trên hồ sơ mặc định `rating_desc`. Các sort khác giữ nguyên.

Thêm `has_courses=true|false` (bỏ trống = tất cả), lọc số khóa công khai. Giữ tìm tên/giới thiệu và lọc môn, cấp, lớp, mục tiêu, kỳ thi, đơn vị, mức điểm. Bộ lọc học thuật chỉ dùng dữ liệu khóa công khai, không tiết lộ môn/lớp của khóa nháp. UI có chip xóa lọc, reset, mobile drawer và URL giữ bộ lọc. Bio ngắn ưu tiên trường bio rồi mới lấy phần giới thiệu.

Validation: 26 integration tests trên DB sao chép riêng, TypeScript và Ruff qua. Local API trả hai tài khoản chính dù số khóa công khai bằng 0.
