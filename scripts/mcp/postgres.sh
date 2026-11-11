#!/bin/sh
# Read-only Postgres MCP for the local Mây Mây database.
# Connection values come from studynest_be/.env so the DSN is not stored in git.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
ENV_FILE="$ROOT/studynest_be/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi

read_env() {
  key="$1"
  val=$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2- | tr -d '\r')
  val=${val#\"}
  val=${val%\"}
  val=${val#\'}
  val=${val%\'}
  if [ -z "$val" ]; then
    echo "missing $key in $ENV_FILE" >&2
    exit 1
  fi
  printf '%s' "$val"
}

user=$(read_env POSTGRES_USER)
pass=$(read_env POSTGRES_PASSWORD)
db=$(read_env POSTGRES_DB)
host=$(read_env POSTGRES_HOST)
port=$(read_env POSTGRES_PORT)

STUDYNEST_DSN=$(
  POSTGRES_USER="$user" \
  POSTGRES_PASSWORD="$pass" \
  POSTGRES_DB="$db" \
  POSTGRES_HOST="$host" \
  POSTGRES_PORT="$port" \
  python3 -c '
import os
from urllib.parse import quote
user = quote(os.environ["POSTGRES_USER"], safe="")
password = quote(os.environ["POSTGRES_PASSWORD"], safe="")
host = os.environ["POSTGRES_HOST"]
port = os.environ["POSTGRES_PORT"]
db = quote(os.environ["POSTGRES_DB"], safe="")
print(f"postgres://{user}:{password}@{host}:{port}/{db}?sslmode=disable")
'
)
export STUDYNEST_DSN

exec npx -y @bytebase/dbhub@1.6.0 --transport stdio --config "$ROOT/scripts/mcp/dbhub.toml"
