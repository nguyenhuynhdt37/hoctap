Đã tinh chỉnh trang chủ đã đăng nhập `/` trong `studynest_fe/`, giữ luồng “một trang, một hành trình hôm nay”.

1. **Điểm danh, nhiệm vụ và XP** dùng chung một hook. Hero và bảng nhiệm vụ khớp trạng thái trước và sau khi nhận thưởng. Hành trình hiển thị số phần thưởng chờ nhận.
2. **Nút chính** dùng nhãn một dòng như “Học tiếp”, “Ôn 3 câu” hoặc “Nhận thưởng”. Tên bài, khóa và thời lượng nằm ở dòng phụ, có tooltip và mô tả đầy đủ cho trình đọc màn hình.
3. **Dữ liệu mẫu** có một chip chung cho hành trình. Các chặng chưa tới ghi “Sắp tới”.
4. **Hero** có hai cột trên desktop, với ảnh bìa khóa thật, tên bài, tiến độ và một Mây lớn. Khi chưa có khóa, hero dùng ảnh thương hiệu. Trên mobile, thẻ ảnh nằm trên hành trình dọc. Chặng hiện tại dùng vòng sáng và Mây chỉ chuyển động một lần nếu thiết bị cho phép.
5. **Tiêu đề** Lora nhỏ hơn, dòng báo số bước còn lại được rút gọn.
6. **Câu ôn xem trước** hiện trực tiếp trong chặng Ôn khi chặng đó đến lượt.
7. **Lộ trình và mục tiêu** có ảnh bìa, thanh tiến độ và ngày về đích khi đã đặt. Trạng thái trống có ảnh thương hiệu và nút “Chọn lộ trình”.
8. **Kệ phần thưởng** cao theo cột nhiệm vụ trên desktop và xếp gọn dưới danh sách trên mobile.

**Tệp:** Tạo `home/use-daily-learning-state.ts`. Sửa `home/{index,greeting-check-in,daily-check-in,today-journey,today-missions,path-and-goals,review-today,section}.tsx`, `home/journey-state.ts`, `missions/{mission-board,reward-shelf}.tsx`, `src/app/globals.css` và `tests/test-learning-journey.cjs`. Không xóa tệp.

**Kiểm tra:** `npx tsc --noEmit`, ESLint và `git diff --check` đều đạt. Test hành trình đạt **9/9**. Trên phiên đã đăng nhập, cây truy cập xác nhận hero và bảng nhiệm vụ khớp ở cả hai trạng thái “Chờ nhận thưởng” và “Đã điểm danh hôm nay”.

**Chưa xác minh:** Chưa đo được `document.documentElement.scrollWidth` ở 1440px và 390px vì phiên trình duyệt chặn đổi viewport và đọc kích thước DOM. Ba danh sách cuộn hiện có vẫn giữ `relative`.