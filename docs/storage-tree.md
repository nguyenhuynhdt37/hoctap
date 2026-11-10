# Cấu trúc file StudyNest trên R2

Bucket `studynest` luôn private. `public/` chỉ có nghĩa ứng dụng cho phép xem
nhóm file đó mà không đăng nhập; bucket không được mở public toàn bộ.

```text
studynest/
├── public/
│   ├── users/{user_id}/
│   │   ├── avatars/{asset_id}-{ten-file}.png
│   │   └── editor/{YYYY}/{MM}/
│   │       └── images/{asset_id}-{ten-file}.png
│   └── courses/{course_id}/
│       └── thumbnails/{asset_id}-{ten-file}.jpg
└── private/
    ├── users/{user_id}/
    │   ├── tutor-chat/{YYYY}/{MM}/
    │   │   └── images/{asset_id}-{ten-file}.png
    │   └── lessons/{lesson_id}/notes/attachments/
    │       └── images/{asset_id}-{ten-file}.png
    ├── courses/{course_id}/lessons/{lesson_id}/resources/
    │   ├── documents/{asset_id}-{ten-file}.pdf
    │   ├── images/{asset_id}-{ten-file}.png
    │   ├── archives/{asset_id}-{ten-file}.zip
    │   ├── videos/{asset_id}-{ten-file}.mp4
    │   ├── audio/{asset_id}-{ten-file}.mp3
    │   └── other/{asset_id}-{ten-file}.bin
    └── backups/migrations/drive-to-r2/2026-11-10/
        ├── source-archive.zip
        ├── database-before.dump
        ├── archive-contents.json
        ├── manifest.json
        └── result.json
```

## Quy tắc upload

- Mỗi loại upload phải có mục đích rõ ràng: avatar, thumbnail, editor,
  tài liệu bài học, ảnh chat hoặc ảnh ghi chú. Đường dẫn không được ánh xạ sẽ bị từ chối.
- Dùng ID người dùng/khóa học/bài học làm thư mục ổn định, nên đổi tên khóa học không làm hỏng URL.
- Nhóm file theo loại: `images`, `documents`, `archives`, `videos`, `audio`, `other`.
  Editor và chat được chia tiếp theo năm/tháng để hạn chế số file trong cùng thư mục.
- Làm sạch tên file: bỏ dấu, chữ thường, dấu gạch ngang; giữ phần mở rộng.
  Bỏ mã UUID tiền tố do uploader cũ thêm, rồi thêm một `asset_id` để tránh ghi đè.
- Database lưu `/api/storage/files/{key}`; backend kiểm tra quyền trước khi ký link R2.
- Nội dung ghi chú, ảnh chat: chỉ chủ sở hữu. Tài liệu bài học: giảng viên sở hữu
  khóa học hoặc học viên có quyền học. Backup chỉ quản trị trực tiếp trong R2.

## Thêm loại upload mới

Thêm ánh xạ trong `FileStorageService.object_key`, quy tắc quyền trong
`authorize_file` nếu file riêng tư, và kiểm tra tương ứng. Không tự nối tùy ý tên thư mục
tại từng endpoint hoặc lưu file ở gốc bucket.
