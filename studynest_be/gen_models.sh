#!/bin/bash
# Script để tự động sinh ra models SQLAlchemy từ database hiện tại

echo "🚀 Đang kết nối tới database tại 127.0.0.1:5433..."

DATABASE_SYNC_URL=${DATABASE_SYNC_URL:-"postgresql://admin:change_me@127.0.0.1:5433/studynest"}

./.venv/bin/python -m sqlacodegen "$DATABASE_SYNC_URL" --schema public --outfile app/db/models/database.py

if [ $? -eq 0 ]; then
    echo "✅ Thành công! Đã cập nhật file: app/db/models/database.py"
else
    echo "❌ Thất bại! Vui lòng kiểm tra xem Docker database đã chạy chưa (docker-compose up -d)"
fi
