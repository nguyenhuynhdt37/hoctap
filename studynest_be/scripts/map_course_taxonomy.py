"""Explicit legacy mapping JSON. Dry-run unless --apply and --backup are supplied.

Input: [{"course_id":"uuid", "education":{"subject_id":"uuid", "grade_ids":["uuid"]}}]
Never infer a grade/subject from course title or mutate course IDs/slugs.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.models.database import Courses
from app.db.sesson import AsyncSessionLocal
from app.schemas.catalog import CourseTaxonomy
from app.services.catalog import CatalogService
from sqlalchemy import select


async def main(args):
    if args.apply and (
        not args.backup or not args.backup.is_file() or not args.backup.stat().st_size
    ):
        raise SystemExit("A non-empty database backup is required for --apply")
    entries = json.loads(args.mapping.read_text())
    async with AsyncSessionLocal() as db:
        service = CatalogService(db)
        seen = set()
        for entry in entries:
            course_id = UUID(entry["course_id"])
            if course_id in seen:
                raise ValueError("Duplicate course mapping")
            seen.add(course_id)
            course = await db.scalar(
                select(Courses).where(Courses.id == course_id).with_for_update()
            )
            if not course:
                raise ValueError(f"Unknown course {course_id}")
            data = CourseTaxonomy.model_validate(entry["education"])
            await service.validate_assignment(
                data,
                course.instructor_id,
                publishing=bool(course.is_published),
                admin=True,
            )
            if args.apply:
                await service.assign(
                    course, data, course.instructor_id, admin=True, commit=False
                )
        if args.apply:
            await db.commit()
        else:
            await db.rollback()
    print(json.dumps({"validated": len(seen), "applied": args.apply}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mapping", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path)
    asyncio.run(main(parser.parse_args()))
