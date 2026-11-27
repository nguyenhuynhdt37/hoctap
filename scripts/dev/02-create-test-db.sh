#!/usr/bin/env bash
# Chạy một lần khi volume dev được khởi tạo: tạo DB riêng cho pytest, nạp cùng schema db.sql.
set -euo pipefail
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE studynest_test OWNER $POSTGRES_USER;"
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d studynest_test -f /docker-entrypoint-initdb.d/01-db.sql
