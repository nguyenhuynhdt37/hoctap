#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/studynest_be/.env"
BACKUP_DIR="${ROOT_DIR}/data/backups"
mkdir -p "${BACKUP_DIR}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/studynest_${STAMP}.sql.gz"

echo "[Backup] Đang sao lưu PostgreSQL (${POSTGRES_DB:-studynest}) từ container studynest_db..."
docker exec studynest_db pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-studynest}" \
  --no-owner \
  --no-acl | gzip > "${OUT_FILE}"

SIZE="$(du -h "${OUT_FILE}" | awk '{print $1}')"
echo "[Backup] Hoàn tất: ${OUT_FILE} (${SIZE})"
