# Rà soát BE trang khám phá khóa học

Ngày 11/11/2026. Phạm vi `/courses?subject=dia-ly`; hợp đồng giao FE tại [catalog-browse-contract.md](catalog-browse-contract.md).

## Quyết định và thay đổi

Giữ router, schema và service catalog hiện có; không dựng thêm tầng repository hoặc thay mô hình dữ liệu cho một truy vấn đọc. Không cần migration/index mới trong lần sửa này: schema đã có index public catalog theo `(created_at DESC, id DESC)`, subject/provider và các bảng liên kết. Chưa có bằng chứng tải thực tế để thêm index cho mọi tổ hợp sort/filter hoặc thêm cache có rủi ro invalidation.

- Truy vấn danh sách chỉ lấy các cột phục vụ card và keyset. Bỏ việc hydrate entity `Courses`, vốn tải cả `description`, vector embedding 1536 chiều, search vector, ghi chú duyệt, outcomes và yêu cầu học không dùng ở trang khám phá.
- Giữ payload card hiện hữu để các consumer category/provider/mobile không bị mất trường. Pydantic response schema công khai xác định các trường trả về; không gửi cột nội bộ.
- Count chỉ chọn ID thay vì lồng toàn bộ nội dung card. `include_total=true` mặc định giữ tương thích; tải thêm có thể gửi false để bỏ count và nhận `total:null`.
- Cursor được kiểm tra trước truy vấn DB. Chữ ký bỏ qua `include_total` và `limit`, vẫn ràng buộc mọi filter, sort, category và legacy scope. Không đổi quy tắc duyệt/công khai hoặc bảo vệ nội dung đã lưu trữ.
- Grade vẫn lấy một lần cho cả trang; trang rỗng không thực hiện lookup grade.
- Thêm `GET /catalog/browse-filters`: taxonomy chỉ có trường lựa chọn, liên kết lớp–môn hợp lệ, provider chỉ `{id,name,slug}` và phải có khóa công khai. Không cần tải profile/provider pagination chỉ để dựng một select. Lớp thuộc cấp học đã tắt không được đưa vào lựa chọn.
- Giữ `/catalog/filters` nguyên vẹn cho form/admin và consumer cũ, tránh đánh đồng dữ liệu khám phá với dữ liệu biên tập.

## Kiểm tra

`tests/integration/test_catalog_v2.py` và `test_paths_bundles.py`: **63 passed**, trên DB thử riêng `studynest_catalog_v2_test`. Bao gồm 7 ca mới về truy vấn, phân trang, provider visibility, tính tương thích filter editor và HTTP validation. Sáu warnings hiện có thuộc Pydantic, Google SDK và transaction fixture.

Đếm SQL bằng SQLAlchemy event trên PostgreSQL thật, cho cả 5 cách sắp xếp:

| Request | SQL thực hiện |
| --- | --- |
| Trang đầu có khóa | 3: count + trang card + batch grade |
| Tải thêm `include_total=false` có khóa | 2: trang card + batch grade |
| Kết quả rỗng, không total | 1: trang card |
| Cursor sai bộ lọc | 0; trả 422 |

Kiểm tra SQL projection không có description/embedding/search_tsv/outcomes/requirements/approval_note; đổi limit và include_total giữa các trang vẫn đi hết kết quả, không lặp ID. HTTP có dữ liệu thật trong fixture xác nhận response schema, và từ chối limit/boolean/cursor/query lạ không hợp lệ.

Trên dữ liệu local hiện tại, JSON filter cũ 14.980 byte; browse filter mới 13.025 byte, đã bao gồm providers. Số liệu này phản ánh dataset nhỏ hiện tại, không phải benchmark tải production. Trọng tâm tiết kiệm lớn là bỏ cột nặng ở danh sách và bỏ count khi tải thêm.

API thật trên local: browse-filters trả 200, danh sách Địa lí trả 200 với total=0. Hiện chưa có khóa chính thức Địa lí đủ điều kiện công khai; không đổi seed/demo thành nội dung đã duyệt. Không sửa dữ liệu nghiệp vụ local, không migration/deploy.

Ruff qua trên các file BE liên quan. Log integration: `/tmp/catalog-browse-tests.log`.
