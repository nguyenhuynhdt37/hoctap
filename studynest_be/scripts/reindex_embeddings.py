"""Rebuild semantic vectors atomically or fill missing same-model vectors.

Run from studynest_be with writes paused and a fresh pg_dump backup:
  .venv/bin/python scripts/reindex_embeddings.py --backup backups/before-reindex.dump
For an online repair using the existing embedding model, add --missing-only.
No database changes are committed until every embedding has been generated.
"""

import argparse
import asyncio
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from sqlalchemy import select, update

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.embedding import EmbeddingService
from app.core.settings import settings
from app.db.models.database import (
    CourseReviews,
    Courses,
    LessonChunks,
    LessonNotes,
    LessonQuizzes,
    Lessons,
    PlatformSettings,
    ResourceChunks,
    Topics,
    User,
    UserEmbeddingHistory,
)
from app.db.sesson import AsyncSessionLocal
from app.libs.formats.datetime import now

SOURCES = [
    (Topics, ["name", "description"]),
    (Courses, ["title", "description", "outcomes", "requirements", "target_audience"]),
    (Lessons, ["title", "description", "prerequisites", "outcomes"]),
    (LessonChunks, ["text_"]),
    (LessonNotes, ["content"]),
    (LessonQuizzes, ["question", "explanation"]),
    (ResourceChunks, ["content"]),
    (CourseReviews, ["content"]),
]


def source_text(row, fields):
    parts = []
    for field in fields:
        value = getattr(row, field, None)
        if isinstance(value, list):
            value = " ".join(str(item) for item in value)
        if value:
            parts.append(str(value))
    return "\n".join(parts).strip()


async def main(backup: Path, missing_only: bool = False, request_delay: float = 6):
    if not backup.is_file() or backup.stat().st_size == 0:
        raise SystemExit("A nonempty database backup file is required")
    if settings.EMBEDDING_PROVIDER != "gemini":
        raise SystemExit("Set EMBEDDING_PROVIDER=gemini before reindexing")
    service = EmbeddingService()
    async with AsyncSessionLocal() as db:
        all_rows = []
        texts = {}
        for model, fields in SOURCES:
            rows = list((await db.scalars(select(model))).all())
            for row in rows:
                content = source_text(row, fields)
                all_rows.append((row, content))
                if content and (not missing_only or row.embedding is None):
                    texts[content] = None
            print(model.__tablename__, len(rows), "rows", flush=True)
        users = list((await db.scalars(select(User))).all())
        for user in users:
            if user.preferences_str and user.preferences_str.strip() and (not missing_only or user.preferences_embedding is None):
                texts[user.preferences_str.strip()] = None
        unique = list(texts)
        print("Embedding", len(unique), "unique texts via", settings.EMBEDDING_MODEL, flush=True)
        for offset in range(0, len(unique), 8):
            if offset:
                await asyncio.sleep(request_delay)
            batch = unique[offset:offset + 8]
            vectors = await service.embed_texts([content[:50000] for content in batch])
            texts.update(zip(batch, vectors))
            print("Generated", min(offset + 8, len(unique)), "/", len(unique), flush=True)

        if missing_only:
            # Same-model repairs may run with the app online. Refresh before
            # writing so concurrent edits and completed background jobs win.
            all_rows = []
            for model, fields in SOURCES:
                rows = (await db.scalars(select(model).execution_options(populate_existing=True))).all()
                all_rows.extend((row, source_text(row, fields)) for row in rows)
            users = list((await db.scalars(select(User).execution_options(populate_existing=True))).all())

        # Keep both old and new spaces from being visible in the same database.
        courses = {}
        for row, content in all_rows:
            if not missing_only or row.embedding is None:
                if not content or content in texts:
                    row.embedding = texts[content] if content else None
            if isinstance(row, Courses):
                courses[row.id] = row.embedding
                row.embedding_updated_at = now()
        history_by_user = defaultdict(list)
        history = list((await db.scalars(select(UserEmbeddingHistory))).all())
        for row in history:
            if not missing_only or row.embedding is None:
                row.embedding = courses.get(row.course_id)
            if row.embedding is not None:
                history_by_user[row.user_id].append(row.embedding)
        for user in users:
            if missing_only and user.preferences_embedding is not None:
                continue
            preference = (user.preferences_str or "").strip()
            if preference:
                if preference in texts:
                    user.preferences_embedding = texts[preference]
            elif history_by_user[user.id]:
                vector = np.mean(history_by_user[user.id], axis=0)
                user.preferences_embedding = service._normalize_embedding(vector)
            else:
                user.preferences_embedding = None
            user.preferences_embedding_date_updated_at = now()
        await db.execute(update(PlatformSettings).values(embedding_dim=settings.EMBEDDING_DIMENSIONS))
        await db.commit()
        print("Committed all vectors in one transaction:", len(all_rows), "content rows,",
              len(history), "history rows,", len(users), "profiles", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", type=Path, required=True)
    parser.add_argument("--missing-only", action="store_true", help="Fill missing vectors only; use only when the model has not changed")
    parser.add_argument("--request-delay", type=float, default=6, help="Seconds between batches to respect Gemini quotas")
    args = parser.parse_args()
    asyncio.run(main(args.backup, args.missing_only, args.request_delay))
