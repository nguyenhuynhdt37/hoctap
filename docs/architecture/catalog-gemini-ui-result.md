# Báo cáo triển khai giao diện Khám phá Khóa học (FE Catalog UI)

**Người thực hiện**: Gemini; Codex rà soát tích hợp  
**Tương tác hệ thống**: Phối hợp với Codex (Backend Engineer) theo hợp đồng `docs/architecture/catalog-browse-contract.md`  
**Ngày cập nhật**: 11/11/2026  
**URL trọng tâm**: `/courses?subject=dia-ly` và `/courses`

---

## 1. Mục tiêu và Phạm vi thực hiện

Khắc phục tình trạng giao diện danh mục khóa học trước đây bị đơn điệu, ít tính năng, form lọc quá dài và không tối ưu cho từng môn học chuyên biệt (đặc biệt là môn Địa lí).

### Phạm vi ranh giới tuân thủ
- **Chỉ sửa đổi các file Frontend liên quan**:
  - `studynest_fe/src/types/catalog.ts`
  - `studynest_fe/src/components/catalog/catalog-browser.tsx`
  - `studynest_fe/src/components/catalog/catalog-card.tsx`
  - `studynest_fe/src/components/catalog/subject-hero.tsx`
  - `studynest_fe/src/components/catalog/subject-pills.tsx`
  - `studynest_fe/src/components/catalog/filter-sidebar.tsx`
  - `studynest_fe/src/app/(main)/(user)/courses/page.tsx`
- **Không xâm phạm**: Không sửa Backend, DB, script seed (không đổi slug seed, không bật publish giả mạo), auth, home page, shared UI core; không tạo commit/push git, không xóa `.next` hoặc chạy `npm run build` trong lúc dev song song với Codex.
- **Tiêu chuẩn thiết kế**: Tuân thủ 100% **Cloudy Blue Design System** (Korean Pastel Minimalism), semantic tokens CSS, font `Lora` chọn lọc cho Hero và `Be Vietnam Pro` cho toàn bộ UI body.

---

## 2. Chi tiết các thành phần đã triển khai & Sửa lỗi theo Browser Review

### 2.1. Khắc Phục Triệt Để Ca Tái Hiện Của Codex (XHR Slow Response & Stale Lock)
- **Vấn đề đã tái hiện**: Khi ở trang Địa lí (20/21 khóa) bấm "Xem thêm", chuyển sang Toán khi response tải thêm của Địa lí còn chậm; dữ liệu môn Toán về 20 khóa nhưng nút "Xem thêm" bị kẹt ở trạng thái disabled ("Đang tải thêm...").
- **Nguyên nhân cốt lõi**: Trạng thái `loadingMore` kiểu boolean đơn lẻ bị tách rời khỏi filter key, và block `finally` kiểm tra `currentGen === loadMoreGenRef.current` (bị false do gen đã tăng khi đổi filter) nên bỏ qua không reset `loadingMore` về `false`.
- **Giải pháp triệt để đã triển khai trong [`catalog-browser.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/catalog/catalog-browser.tsx)**:
  1. **Ràng buộc `loadingMore` theo Filter Key**:
     ```ts
     const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);
     const isLoadingMore = Boolean(loadingMoreKey && loadingMoreKey === filtersQuery);
     ```
     Ngay khi chuyển từ Địa lí sang Toán, `filtersQuery` thay đổi khiến `isLoadingMore` lập tức nhận giá trị `false` ngay trong lần render đầu tiên của môn Toán mà không cần chờ đợi effect hay event callback. Nút Xem thêm ở môn mới không thể nào bị kẹt ở trạng thái loading của môn cũ.
  2. **Tích hợp `AbortController`**: Mỗi khi người dùng đổi filter (qua `useEffect`, `setParams` hoặc `resetAllFilters`), hệ thống gọi ngay `abortControllerRef.current?.abort()`, đóng kết nối mạng XHR cũ trên trình duyệt, ngăn không cho payload cũ bay lơ lửng rồi phản hồi muộn.
  3. **Reset State & Lock Triệt Để**: Khi kết thúc request (dù success hay error/canceled), `loadingMoreKeyRef.current = null` và `setLoadingMoreKey(null)` luôn được giải phóng an toàn.
  - **Kết quả kiểm thử từ Codex**: Chậm response Địa lí 6 giây → chuyển Toán: 20 khóa Toán đúng, nút Xem thêm enabled (PASS); Double-click chỉ 1 request (PASS); 21/21 ID duy nhất, nút hết trang ẩn (PASS).

### 2.2. Sửa Lỗi Layout Của Drawer Modal ([`catalog-browser.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/catalog/catalog-browser.tsx#L652-L665))
- **Vấn đề**: Trước đây render `FilterSidebar` instance thứ 2 vô điều kiện với `isMobileDrawer={mobileFilterOpen}`. Khi `mobileFilterOpen = false`, component render `<aside>` làm xuất hiện sidebar thứ 2 đẩy kết quả sai lệch grid.
- **Khắc phục**: Chỉ mount instance thứ 2 khi `mobileFilterOpen === true` và cố định `isMobileDrawer={true}`. Instance desktop giữ nguyên trong `<div className="hidden lg:block">`.

### 2.3. Empty State Trung Thực Chuẩn Dữ Liệu
- Đổi tiêu đề và mô tả rỗng thành:
  - Tiêu đề: *"Chưa có khóa học công khai phù hợp"*
  - Mô tả: *"Hãy thử thay đổi điều kiện lọc, từ khóa tìm kiếm hoặc chọn khối lớp khác."*
  - Loại bỏ hoàn toàn các câu từ không có dữ liệu chứng minh ("đội ngũ giáo viên đang biên soạn...").

### 2.4. Chuẩn Hóa Nhãn Link Hero ([`subject-hero.tsx`](file:///Users/huynh/codes/hoctap/studynest_fe/src/components/catalog/subject-hero.tsx#L83-L92))
- Đường dẫn `/lo-trinh` là thư viện lộ trình chung của toàn hệ thống, đổi nhãn thành **"Khám phá lộ trình"** (không dùng "Lộ trình môn X").

### 2.5. Cập nhật Kiểu Dữ liệu Chuẩn Contract (`types/catalog.ts`)
- Tách riêng Compact Taxonomy Types: `BrowseTaxonomyOption`, `BrowseGradeOption`, `BrowseSubjectOption`, `BrowseProvider`, `BrowseFilters`. Không `extends CatalogOptions`.
- Chuyển toàn bộ props của các components sang compact types, không ép kiểu (type casting) dữ liệu thiếu.

### 2.6. Sửa Bug Chức Năng Bộ Lọc & Tích Hợp Modal Drawer (`filter-sidebar.tsx`)
- **Sửa Bug mất `min_price`**: Cung cấp `onFiltersChange(patch: Record<string, string>)` để cập nhật cả `min_price` và `max_price` trong một lần `router.push` duy nhất.
- **Lọc Khối Lớp Giao Thoa Cả Cấp Học và Môn Học**: Khối lớp khả dụng (`availableGrades`) được giao thoa giữa `education_level_id` và `grade_subjects`. Tự động xóa `grade` khi chuyển đổi sang cấp học hoặc môn học không tương thích.
- **Mobile Drawer dùng Shared Modal Chuẩn**: Sử dụng component `Modal` từ `@/components/ui/modal` có sẵn Focus Trap chuẩn WCAG (khóa Tab/Shift+Tab, Escape, khóa thanh cuộn body).
- **Trợ năng (A11y)**: Đầy đủ cặp `htmlFor`/`id` cho các thẻ select/input, thuộc tính `aria-pressed` cho các nút bấm lựa chọn. Màu sao đánh giá chuyển sang semantic warning token `text-warning fill-warning`.

### 2.7. Thẻ Khóa Học Chuẩn Hóa (`catalog-card.tsx`)
- Đổi nhãn `Khóa học mới` khi `rating_count === 0` thành **`Chưa có đánh giá`**.
- Màu sao đánh giá dùng semantic warning token: `fill-warning text-warning`.

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
TypeScript đã qua (exit code 0).

---

## 4. Kết luận & Dừng Chỉnh Sửa

Gemini đã dừng chỉnh sửa sau review. Codex đã kiểm tra lại giao diện và production build; kết quả bên dưới.


## Kiểm chứng tích hợp cuối của Codex

- `npm run build` qua; log `/tmp/catalog-browse-build.log`. TypeScript qua.
- Trang thật `/courses?subject=dia-ly`: API browse-filters + courses đều 200, không gọi profile provider hoặc endpoint filter editor. Hiện chưa có khóa chính thức phù hợp; empty state phản ánh dữ liệu này.
- Desktop 1440px có đúng một sidebar; mobile 390px không có sidebar dư hoặc tràn ngang, mở/đóng bộ lọc qua shared Modal và Escape hoạt động. Link không lồng button; nhãn tìm kiếm và select đã được gắn rõ.
- Browser-only XHR interception trong context thử riêng: response tải thêm Địa lí chậm 6 giây, chuyển Toán trước khi trả về; kết quả vẫn đúng 20 khóa Toán và nút tải thêm hoạt động. Đã chạy lại sau bổ sung AbortController.
- Bấm tải thêm hai lần liên tiếp: một request `include_total=false`, cuối cùng 21 ID duy nhất và nút tải thêm ẩn khi hết trang. Preset giá cập nhật đồng thời `min_price=300000&max_price=700000`.
- Dữ liệu giả chỉ ở bộ nhớ trình duyệt thử, không thêm route/mock/khóa học vào repo hoặc DB.
- Console trang thật có lỗi tài nguyên từ Chrome extension; không quan sát thấy lỗi JavaScript thuộc catalog. Build còn warnings baseline-browser-mapping cũ và convention middleware của Next.js.

BE: [Kết quả kiểm tra và tối ưu](catalog-browse-backend-review.md).
