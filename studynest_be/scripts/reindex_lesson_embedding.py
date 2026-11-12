"""Rebuild one lesson's metadata vector using the configured embedding service.

Uses the same source fields as reindex_embeddings.py. This does not transcribe
videos or change transcript/chunk vectors. Defaults to a read-only preview.
"""

import argparse
import asyncio
import hashlib
import json
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reindex_embeddings import SOURCES, source_text
from sqlalchemy import select

from app.core.embedding import EmbeddingService
from app.core.settings import settings
from app.db.models.database import Lessons
from app.db.sesson import AsyncSessionLocal, engine

FIELDS = next(fields for model, fields in SOURCES if model is Lessons)


async def main(lesson_id: UUID, apply: bool = False):
    try:
        if settings.EMBEDDING_PROVIDER != "gemini":
            raise ValueError("Use the existing Gemini embedding space")
        async with AsyncSessionLocal() as db:
            lesson = await db.get(Lessons, lesson_id)
            if not lesson:
                raise ValueError("Lesson not found")
            content = source_text(lesson, FIELDS)
            if not content:
                raise ValueError("Lesson has no embedding source text")
            result = {
                "lesson_id": str(lesson_id),
                "title": lesson.title,
                "provider": settings.EMBEDDING_PROVIDER,
                "model": settings.EMBEDDING_MODEL,
                "source": "lesson_metadata",
                "source_sha256": hashlib.sha256(content.encode()).hexdigest(),
                "previous_embedding": lesson.embedding is not None,
                "applied": False,
            }
        if apply:
            service = EmbeddingService()
            vector = await service.embed_google_normalized(content)
            # Generate before locking; reject concurrent source edits on save.
            async with AsyncSessionLocal() as db:
                lesson = await db.scalar(
                    select(Lessons).where(Lessons.id == lesson_id).with_for_update()
                )
                if not lesson or source_text(lesson, FIELDS) != content:
                    raise RuntimeError("Lesson changed; retry with its current text")
                lesson.embedding = vector
                lesson.content_tokens = service.estimate_tokens(content)
                await db.commit()
            async with AsyncSessionLocal() as db:
                lesson = await db.get(Lessons, lesson_id)
                persisted = service._normalize_embedding(lesson.embedding)
                result.update(
                    applied=True,
                    dimensions=len(persisted),
                    content_tokens=lesson.content_tokens,
                    norm=round(sum(float(x) ** 2 for x in lesson.embedding) ** 0.5, 6),
                )
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson-id", type=UUID, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.lesson_id, args.apply))
