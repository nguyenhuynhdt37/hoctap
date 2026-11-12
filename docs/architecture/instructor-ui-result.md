# Báo cáo triển khai giao diện Khám phá & Hồ sơ Giảng viên V2 (Instructor Discovery/Profile V2 FE)

**Người triển khai ban đầu**: Gemini; Codex review và hoàn thiện  
**Phối hợp hệ thống**: Đồng bộ theo hợp đồng `docs/architecture/instructor-discovery-contract.md` (Codex triển khai BE full 212 tests pass song song)  
**Ngày cập nhật**: 11/11/2026  
**Thương hiệu & Thiết kế**: Mây Mây — Cloudy Blue Design System (Korean Pastel Minimalism)

---

## 1. Mục tiêu và Phạm vi thực hiện

Triển khai toàn diện tính năng Khám phá Giảng viên (Instructor Discovery V2), Hồ sơ chi tiết (Profile V2), tính năng Lưu giảng viên (Saved Instructors) kèm view cá nhân, nâng cấp phần Giảng viên hàng đầu tại Trang chủ (Homepage Section) và tích hợp điều hướng toàn cục (Dynamic Island).

### Phạm vi ranh giới tuân thủ
- **Các file và thành phần Frontend sở hữu**:
  - `studynest_fe/src/types/user/instructor.ts`
  - `studynest_fe/src/hooks/user/use-saved-instructors.ts`
  - `studynest_fe/src/components/user/instructors/instructor-card.tsx`
  - `studynest_fe/src/components/user/instructors/instructor-filter-sidebar.tsx`
  - `studynest_fe/src/components/user/instructors/instructor-directory.tsx`
  - `studynest_fe/src/app/(main)/(user)/instructors/page.tsx`
  - `studynest_fe/src/components/user/instructors/saved-instructors-view.tsx`
  - `studynest_fe/src/app/(main)/(user)/favorites/instructors/page.tsx`
  - `studynest_fe/src/components/user/favorites/index.tsx`
  - `studynest_fe/src/components/user/instructors/detail/index.tsx`
  - `studynest_fe/src/components/user/instructors/detail/detail.tsx`
  - `studynest_fe/src/components/user/instructors/detail/courses.tsx`
  - `studynest_fe/src/app/(main)/(user)/instructors/[id]/page.tsx`
  - `studynest_fe/src/components/user/home/instructors-section.tsx`
  - `studynest_fe/src/components/user/home/cinematic/LandingDynamicIsland.tsx`
- **Quy tắc bảo toàn**:
  - Không sửa Backend, migration hay database; không tạo dữ liệu ảo hay số liệu giả mạo.
  - Không chạy `npm run build` hoặc xóa thư mục `.next` trong phiên dev chung.
  - Không commit/push git.
  - Giữ nguyên toàn bộ các thay đổi không liên quan.

---

## 2. Chi tiết thành phần đã triển khai

### 2.1. Thanh Shortcut Môn học Mục 6.2B ([`SubjectPills`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/catalog/subject-pills.tsx))
- Tái sử dụng trực tiếp component `SubjectPills` trong `InstructorDirectory` ngay dưới Hero banner.
- Sử dụng trực tiếp danh mục môn học chuẩn từ `options.subjects` (không tạo dataset mới).
- 1 hàng duy nhất responsive, có nút mũi tên cuộn ngang mượt mà, đồng bộ hai chiều với tham số URL `subject`.

### 2.2. Trình Duyệt Danh Mục Trung Tâm ([`InstructorDirectory`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/instructors/instructor-directory.tsx))
- Sắp xếp: Nhãn tùy chọn `newest` chuẩn hóa thành **"Mới tham gia"** (phản ánh trung thực ngày tạo tài khoản `User.created_at`).
- Debounce tìm kiếm 350ms sử dụng `router.replace` để không làm ngập lịch sử duyệt web; phím Enter sử dụng `router.push` để tạo history entry rõ ràng.
- Chặn gọi push/replace dư thừa khi query URL không thay đổi.
- Quản lý `searchTimeoutRef` chặt chẽ: tự động clear trên unmount, back/forward (`current`), khi đặt lại bộ lọc (`resetAllFilters`), khi xóa từ khóa (nút X và chip), và khi thay đổi bộ lọc khác (`setParams`), ngăn callback cũ khôi phục từ khóa đã xóa.
- Whitelist các tham số URL công khai (`q, level, grade, subject, goal, exam, provider, min_rating, sort`); dọn dẹp sạch sẽ `cursor`, `limit`, `include_total` khỏi URL.
- **Quản lý Phân Trang Keyset Vững Chắc (Race Conditions & Stale Guard)**:
  - Ràng buộc `loadingMoreKey === filtersQuery`.
  - Tích hợp `AbortController` tự động hủy request cũ khi đổi filter.
  - Snapshot thế hệ request `loadMoreGenRef` loại bỏ stale response khi đổi bộ lọc.
  - Phân biệt rõ `hasLoadedMore` để ẩn nút Xem thêm khi hết trang.
- Empty state trung thực, không gợi ý dữ liệu ảo.

### 2.3. Khóa Học Của Giáo Viên ([`InstructorCourses`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/instructors/detail/courses.tsx))
- **Scope SWR Key & Extra Page QueryKey**: Scope theo `viewerScope = user?.id || "guest"` để bảo toàn trạng thái `is_purchased` / `is_favorite` theo từng viewer, nhưng HTTP URL gọi API backend giữ nguyên `/users/instructors/{id}/courses`.
- **Bộ lọc Catalog V2**: Thay thế việc gọi `/categories/all` legacy bằng `/users/instructors/filter-options` canonical (môn học, khối lớp, sắp xếp).
- **Phân trang an toàn**: Tích hợp `AbortController`, `loadMoreGenRef`, ref lock `loadingMoreKeyRef`, và thông báo `moreError` visible kèm nút Thử lại; tự động reset loading/extraState khi query/viewer/unmount thay đổi.
- Format giá an toàn với `currency?: string | null`, input search có `maxLength={160}` và đầy đủ `htmlFor`/`id` cho các select.

### 2.4. Trang Giáo Viên Đã Lưu ([`SavedInstructorsView`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/instructors/saved-instructors-view.tsx))
- SWR key phân tách riêng biệt theo từng tài khoản đăng nhập `["/users/instructors/saved", user.id, "limit=12&include_total=true"]`.
- **Owner Guard**: Tự động hủy request cũ và reset danh sách khi người dùng đổi tài khoản/đăng xuất (`user?.id` thay đổi).
- **Phân trang có bảo vệ**: Keyset pagination có ref lock, `AbortController`, và `moreError` visible kèm nút Thử lại.
- Thao tác bỏ lưu chỉ xóa thẻ khi kết quả thực sự là `false` (`willBeSaved === false`), bảo toàn card khi thao tác bị từ chối/bỏ qua (`null`).
- Loại bỏ hoàn toàn lỗi lồng tương tác (`no Link wrapping Button`), các nút điều hướng sử dụng thẻ `Link` độc lập.

### 2.5. Hồ Sơ Giáo Viên Server-side ([`[id]/page.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/app/(main)/(user)/instructors/[id]/page.tsx) & [`detail.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/instructors/detail/detail.tsx))
- Phân biệt 3 trạng thái kết quả Server SSR qua Union type:
  - `status: "found"`: Trả về hồ sơ giáo viên kèm OpenGraph metadata (`title`, `description`, `canonical url`, `type: "profile"`, `avatar`).
  - `status: "not_found"`: Chỉ HTTP 404 hoặc 422 mới gọi `notFound()`.
  - `status: "unavailable"`: Khi backend bị timeout hoặc trả về lỗi 5xx, **không gọi `notFound()`**, thiết lập metadata `noindex`, render giao diện client thông báo lỗi kết nối máy chủ kèm nút "Thử lại".
- Client `InstructorDetail` phân biệt rõ giữa HTTP 404 và Network/Server error để hiển thị thông điệp chính xác và nút "Thử lại".
- Không suy diễn `first_public_course_at` thành kinh nghiệm giảng dạy; chỉ hiển thị các số liệu thực tế được cung cấp từ backend.
- Avatar fallback bằng initials SVG nội bộ 100%, chống loop lỗi.
- **Biểu Diễn Tiểu Sử An Toàn (Safe Plain Biography)**: Hiển thị plain escaped text với `whitespace-pre-line` thanh lịch, không dùng `MarkdownRenderer` tránh rủi ro HTML passthrough.
- Tích hợp nút "Lưu giáo viên" / "Đang theo dõi" ở đầu hồ sơ, tự động disable khi chưa đồng bộ.
- Link Facebook an toàn (đã validate http/https, `target="_blank" rel="noopener noreferrer"`).

### 2.6. Hook Quản Lý Giảng Viên Đã Lưu ([`useSavedInstructors`](file:///Users/huynh/codes/hoctap/studynest_fe/src/hooks/user/use-saved-instructors.ts))
- Batch fetch qua `fetchBatchedSavedIds` chia theo các lô `<= 30` IDs cho viewer đã đăng nhập.
- SWR key được scope nghiêm ngặt theo `user.id`.
- Expose đầy đủ: `isSaved`, `isPending`, `toggleSave`, `savedIds`, `isReady`, `fetchError`, `retry`.
- Vô hiệu hóa nút bấm và cảnh báo người dùng khi chưa `isReady` hoặc khi gặp lỗi mạng.
- Khi bị khóa do thao tác liên tiếp (`processingRef`), hook trả về `null` thay vì `false`.

### 2.7. Thẻ Giảng Viên ([`InstructorCard`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/instructors/instructor-card.tsx))
- Tên giáo viên sử dụng font chuẩn `font-sans font-bold` (Be Vietnam Pro).
- Avatar fallback 100% nội bộ bằng initials SVG/CSS thuần, loại bỏ hoàn toàn `ui-avatars.com`.
- Nhận prop `isReady` để tự động vô hiệu hóa nút lưu khi trạng thái theo dõi đang được đồng bộ hoặc gặp lỗi fetch.
- Đánh giá khóa học thực tế: hiển thị "Chưa có đánh giá" và ẩn sao trung thực nếu chưa có review.

### 2.8. Trang Chủ ([`instructors-section.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/home/instructors-section.tsx)) & Navigation ([`LandingDynamicIsland.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/user/home/cinematic/LandingDynamicIsland.tsx))
- Tách `TopInstructorCard` với Avatar Fallback Initials SVG/CSS nội bộ 100%, loại bỏ hoàn toàn `ui-avatars.com` và nguy cơ lặp vô hạn `onError`.
- Tên giáo viên chuẩn font sans `Be Vietnam Pro`.
- Thêm mục "Đội ngũ giáo viên" (`/instructors`) trong Dynamic Island toàn hệ thống.

---

## 3. Kết quả Kiểm tra Kỹ thuật Thực tế

Đã thực hiện chạy kiểm tra kiểu dữ liệu tĩnh TypeScript trên toàn bộ thư mục `studynest_fe`:

```bash
cd studynest_fe && npx tsc --noEmit
```

**Kết quả thực chạy**:
```text
Command exited with code 0.
No output from the command.
```
TypeScript kết thúc với exit code 0. Đây là kiểm tra kiểu dữ liệu, không thay thế kiểm thử hành vi hoặc đánh giá accessibility.

---

## 4. Danh sách các file đã thay đổi & tạo mới

- `studynest_fe/src/types/user/instructor.ts`
- `studynest_fe/src/hooks/user/use-saved-instructors.ts`
- `studynest_fe/src/components/user/instructors/instructor-card.tsx`
- `studynest_fe/src/components/user/instructors/instructor-filter-sidebar.tsx`
- `studynest_fe/src/components/user/instructors/instructor-directory.tsx`
- `studynest_fe/src/app/(main)/(user)/instructors/page.tsx`
- `studynest_fe/src/components/user/instructors/saved-instructors-view.tsx`
- `studynest_fe/src/app/(main)/(user)/favorites/instructors/page.tsx`
- `studynest_fe/src/components/user/favorites/index.tsx`
- `studynest_fe/src/components/user/instructors/detail/index.tsx`
- `studynest_fe/src/components/user/instructors/detail/detail.tsx`
- `studynest_fe/src/components/user/instructors/detail/courses.tsx`
- `studynest_fe/src/app/(main)/(user)/instructors/[id]/page.tsx`
- `studynest_fe/src/components/user/home/instructors-section.tsx`
- `studynest_fe/src/components/user/home/cinematic/LandingDynamicIsland.tsx`

---

## 5. Trạng thái Hoàn tất

Gemini đã bàn giao và dừng sửa. Codex tiếp tục review, sửa lỗi retry hồ sơ, bảo vệ saved-state khi đổi tài khoản, bổ sung liên kết provider/footer và kiểm tra browser/build. Báo cáo nghiệm thu chính thức và giới hạn thực tế nằm trong [instructor-discovery-v2.md](instructor-discovery-v2.md). Không tạo commit, push hoặc deploy.
