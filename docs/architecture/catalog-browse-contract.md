# Hợp đồng catalog cho giao diện khám phá

Phạm vi: `/courses?subject=dia-ly` và catalog dùng chung của provider. Giữ kiến trúc `api/v1/catalog.py` → `schemas/catalog.py` → `services/catalog.py` → models hiện có. Codex sửa BE; Gemini sửa FE.

## Request

- `GET /api/v1/catalog/browse-filters` (web `/api/catalog/browse-filters`): dữ liệu lựa chọn gọn cho trang khám phá; không dùng endpoint admin/form để dựng sidebar.
- Response keys: `levels`, `grades`, `subjects`, `learning_goals`, `exams`, `grade_subjects`, `delivery_types`, `providers`.
- Taxonomy: `{id,code,name}`; grades thêm `{education_level_id,grade_number,slug}`, subjects thêm `slug`. Không gửi description, trạng thái quản trị hoặc các trường hình ảnh/profile dư thừa. Chỉ lấy mục hoạt động; lớp thuộc cấp học đang hoạt động; liên kết lớp–môn chỉ gồm các mục hiện hữu trong response.
- Providers: `{id,name,slug}`, chỉ đơn vị đang có khóa học đủ điều kiện công khai; không gọi `/providers?size=100` riêng. Không giới hạn 100 provider rồi bỏ sót lựa chọn.
- Delivery types hiện chỉ có `{code:"recorded_video",name:"Video bài giảng"}`.

`GET /api/v1/catalog/courses` giữ bộ lọc `level,grade,subject,goal,exam,provider,delivery_type,currency,min_price,max_price,rating,keyword,sort,limit,cursor`. `subject`/`provider` dùng slug, level/goal/exam dùng code. Giá mặc định VND. Sort: newest/popular/rating/price_asc/price_desc; limit 1–50, mặc định 20.

Thêm `include_total` boolean, mặc định `true`. Trang đầu lấy total, tải thêm dùng `include_total=false`: response `{items,next_cursor,has_more,total:null}` để bỏ COUNT. Tham số này và limit không làm thay đổi chữ ký cursor. Các bộ lọc/sort và scope phải khớp cursor; cursor sai hoặc không khớp trả 422.

## Card và phân trang

Item giữ fields hiện có: `id,slug,title,thumbnail,base_price,currency,rating_avg,rating_count,total_enrolls,total_hours,created_at,level,language,delivery_type,instructor:{id,fullname,avatar},subject:{id,name}|null,provider:{id,name,slug}|null,grades:[{id,name,grade_number}]`.

BE chỉ SELECT cột cần cho card và keyset; không tải description, embedding, search vector, outcomes, requirements, promo video hoặc ghi chú duyệt. Grade được batch theo đúng trang, không N+1. Trang rỗng không chạy lookup grade. Giữ visibility/provider policy và bảo vệ khóa đã lưu trữ hiện có.

FE giữ total từ trang đầu khi tải thêm trả null. Dùng snapshot key bộ lọc khi gửi request tải thêm; bỏ response cũ nếu người dùng đổi filter, tránh ghép khóa khác bộ lọc. Bảo toàn URL/back/forward; xóa cursor khi filter đổi. Không thêm dữ liệu mẫu khi rỗng. `CatalogCard` tiếp tục được export để provider page dùng.

`/catalog/filters` giữ nguyên cho taxonomy editor và những consumer cũ; không đổi payload hoặc hành vi admin.
