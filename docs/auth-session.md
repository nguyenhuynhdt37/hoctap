# Phiên đăng nhập web

Khi access token hết hạn nhưng refresh token còn hợp lệ, web làm mới cookie và tiếp tục
yêu cầu đang thực hiện. Thời hạn cookie access token lấy từ `ACCESS_TOKEN_EXPIRE_MINUTES`,
thống nhất với thời hạn JWT; cookie refresh tồn tại 30 ngày.

## Luồng xử lý

- Middleware xử lý cookie hết hạn trên cả trang công khai và trang có bảo vệ.
  Cookie mới được chuyển tới Server Components trong cùng request và tới trình duyệt
  bằng `Set-Cookie`, kể cả khi có redirect phân quyền. Cookie khác được giữ nguyên.
- Server Components chỉ đọc phiên, không gọi refresh hoặc logout: chúng không thể
  ghi cookie mới về trình duyệt. Suspense fallback không xóa user trong Zustand.
- Axios, chat SSE và khôi phục WebSocket dùng `refreshSession`. Các yêu cầu cùng trang
  dùng chung một promise; Web Locks điều phối các tab nếu trình duyệt hỗ trợ.
  Trước khi refresh, client kiểm tra xem cookie đã được tab khác/middleware cập nhật chưa.
- Backend commit token rotation trước khi trả kết quả. ID session thiết bị được giữ
  nguyên để refresh ở một tab không thu hồi JWT còn hạn của tab khác hoặc WebSocket.
- Redis điều phối refresh giữa worker và lưu kết quả rotation theo hash refresh token
  cũ trong 15 giây. Yêu cầu đồng thời nhận cùng kết quả; cache luôn kiểm tra session
  chưa bị thu hồi/hết hạn. Refresh token cũ bị từ chối sau khoảng đệm này.
- Lỗi mạng, timeout và 5xx không xóa cookie hoặc chuyển về login. Redis tạm ngừng sẽ
  khiến refresh trả 503 để client có thể thử lại, thay vì làm hỏng phiên đang tồn tại.
- Chỉ refresh bị từ chối với 401/403 mới được coi là phiên không còn hợp lệ. Backend
  xóa cookie qua response 401 thực tế; client chuyển tới login và giữ đường dẫn quay lại.

## Kiểm tra

Từ thư mục gốc:

```sh
node scripts/test-refresh-session.cjs
```

Từ thư mục `studynest_be`:

```sh
.venv/bin/python -m unittest tests.unit.test_refresh_session -q
```

Đã kiểm tra trên dịch vụ local: 6 refresh song song, token mới gọi được `/auth/me`,
session đã thu hồi bị từ chối, tải `/profile` bằng access token hết hạn, tải trang chủ
khi chỉ còn refresh cookie, và gọi API/tải lại trang tiếp tục giữ phiên.
