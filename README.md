# HocTap / StudyNest Monorepo

Repo gom 3 phần chính:

- `studynest_be`: FastAPI backend + PostgreSQL/Redis Docker Compose
- `studynest_fe`: Next.js web frontend
- `mobile`: Expo React Native app

## Backend

```bash
cd studynest_be
cp .env.example .env
docker compose up -d
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Web Frontend

```bash
cd studynest_fe
cp .env.example .env.local
pnpm install
pnpm dev
```

## Mobile

```bash
cd mobile
cp .env.example .env
pnpm install
npx expo start -c
```

## Notes

- Secret files (`.env`, Google tokens, local caches) are ignored by Git.
- `studynest_be/db.sql` is kept as the local database init dump for Docker Compose.
