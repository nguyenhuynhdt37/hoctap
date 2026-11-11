"""Hide local visual/test fixtures while preserving purchases and enrollments."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.models.database import Courses
from app.db.models.learning_paths import CourseBundle, LearningPath
from app.db.sesson import AsyncSessionLocal
from sqlalchemy import func, select, update
from sqlalchemy.engine import make_url


async def run(args):
    async with AsyncSessionLocal() as db:
        if make_url(str(db.bind.url)).host not in {"localhost", "127.0.0.1", "::1"}:
            raise SystemExit("This maintenance script only accepts a local DB")
        course_filter = Courses.slug.like("seed-shop-%") | Courses.slug.like(
            "demo-catalog-%"
        )
        path_filter = LearningPath.slug.like("seed-shop-%") | LearningPath.slug.like(
            "demo-%"
        )
        bundle_filter = CourseBundle.slug.like("seed-shop-%") | CourseBundle.slug.like(
            "demo-%"
        )
        counts = {
            "published_courses": await db.scalar(
                select(func.count()).select_from(Courses).where(
                    course_filter, Courses.is_published.is_(True)
                )
            ),
            "active_paths": await db.scalar(
                select(func.count()).select_from(LearningPath).where(
                    path_filter, LearningPath.is_active.is_(True)
                )
            ),
            "active_bundles": await db.scalar(
                select(func.count()).select_from(CourseBundle).where(
                    bundle_filter, CourseBundle.is_active.is_(True)
                )
            ),
        }
        if not args.apply:
            print(json.dumps({"mode": "dry-run", **counts}))
            return
        if (
            not args.backup
            or not args.backup.is_file()
            or args.backup.stat().st_size < 100_000
        ):
            raise SystemExit("--backup must point to a recent, non-empty DB dump")
        await db.execute(
            update(Courses).where(course_filter).values(is_published=False)
        )
        await db.execute(
            update(LearningPath).where(path_filter).values(is_active=False)
        )
        await db.execute(
            update(CourseBundle).where(bundle_filter).values(is_active=False)
        )
        await db.commit()
        print(json.dumps({"mode": "applied", **counts}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path)
    asyncio.run(run(parser.parse_args()))
