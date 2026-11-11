# Chuyển dữ liệu Mây Mây sang R2 — 10/11/2026

Đã gỡ Google Drive khỏi luồng chạy của ứng dụng. Upload chỉ dùng Cloudflare R2.

## Bản sao đầy đủ

- ZIP thư mục dự án `Elearn_Uploader`: **71 file**, ZIP **83.099.838 byte**.
- Database trước chuyển đổi: **7.986.409 byte**.
- Hai bản sao đã được tải lên R2 và tải lại để đối chiếu SHA-256.
- Vị trí: `private/backups/migrations/drive-to-r2/2026-11-10/` trong bucket `studynest`.
- Có manifest ghi nguồn, đích, dung lượng và SHA-256 của từng file chuyển đổi;
  danh mục ZIP được lưu trong `archive-contents.json`.

## Dữ liệu đang dùng

Đã sao chép riêng **24 file**, tổng **12.740.262 byte**, vào cây thư mục đang hoạt động:

| Nhóm | Số file |
| --- | ---: |
| Ảnh khóa học | 8 |
| Avatar | 7 |
| Tài liệu bài học | 5 |
| Ảnh chat | 2 |
| Ảnh trong ghi chú | 2 |

Tất cả được đối chiếu SHA-256 sau khi upload trước khi cập nhật database.
Sau đó cả 24 file đều được tải qua đường dẫn của ứng dụng và đối chiếu SHA-256 lần nữa.
Database đang chạy và SQL khởi tạo không còn link Drive cũ.

## Gỡ tích hợp và xác minh

- Đã xóa hai service Drive, nhánh fallback, cấu hình thư mục Drive, field `drive_id`,
  scope Drive trong uploader YouTube và các hàm chuyển đổi URL Drive ở web/mobile.
- Avatar, thumbnail, editor, tài liệu và ảnh chat dùng chung lớp R2 và
  [cây thư mục chuẩn](storage-tree.md).
- Migration schema `b23c45d67e89` bỏ giá trị mặc định nguồn video Drive đã lỗi thời.
- 51 kiểm tra backend đạt. TypeScript web/mobile đạt.
- Kiểm tra thực tế: 24 file tải đúng; người chưa đăng nhập bị từ chối với file riêng;
  upload mới vào đúng cây, tên tiếng Việt được làm sạch, dữ liệu tải lại khớp.
- Thư mục `Elearn_Uploader` cũ trên Drive đã được đưa vào thùng rác sau khi xác minh bản sao R2.

Google Login, Gemini embedding và YouTube không phải kho Drive; các tính năng đó vẫn được giữ.

## Phục hồi

Quản trị viên tải `database-before.dump` và `source-archive.zip` từ nhánh backup riêng
trong R2 Dashboard khi cần phục hồi. Manifest và file nguồn tải về cũng nằm trong
`studynest_be/backups/drive-migration/` trên máy triển khai; thư mục này không đưa lên Git.
Script `scripts/migrate_drive_to_r2.py` chỉ dùng cho chuyển đổi một lần, không nằm trong
luồng upload của ứng dụng.
