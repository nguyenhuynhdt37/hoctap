"""Upload generated Mây Mây subject covers to R2 and assign imported courses.

Dry-run by default. Uploaded object references are checkpointed before one
atomic DB update. Retries reuse checkpointed assets, preserving existing covers.
"""

import argparse
import asyncio
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image
from sqlalchemy import select

from app.core.settings import settings
from app.db.models.catalog import Subject
from app.db.models.database import Courses
from app.db.sesson import AsyncSessionLocal, engine
from app.services.shares.file_storage import FileStorageService

DATA = Path(__file__).resolve().parents[2] / "data/lessons"
COVERS = DATA / "covers"
REPORT = COVERS / "assignments.json"
SUBJECTS = {
    "toan",
    "tieng-viet",
    "ngu-van",
    "vat-ly",
    "hoa-hoc",
    "sinh-hoc",
    "lich-su",
    "dia-ly",
}


async def main(apply=False):
    try:
        items = []
        for name in ["vtv7-import-report.json", "vtv7-more-import-report.json"]:
            report = json.loads((DATA / name).read_text())
            if report["target_database"] != engine.url.database:
                raise ValueError("Import report belongs to another database")
            items.extend(report["courses"])
        ids = {UUID(x["id"]) for x in items}
        previous = (
            {x["course_id"]: x for x in json.loads(REPORT.read_text())["assignments"]}
            if REPORT.exists()
            else {}
        )
        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(Courses, Subject.code)
                    .join(Subject, Subject.id == Courses.subject_id)
                    .where(Courses.id.in_(ids), Courses.deleted_at.is_(None))
                )
            ).all()
            if len(rows) != len(ids):
                raise ValueError("Imported course or subject missing")
            snapshots = [
                (c.id, c.title, c.thumbnail_url, subject) for c, subject in rows
            ]
        storage = FileStorageService()
        assignments = []
        for course_id, title, old_url, subject in snapshots:
            if subject not in SUBJECTS:
                raise ValueError("Unsupported cover subject")
            asset = COVERS / f"{subject}-may-may-v1.jpg"
            content = asset.read_bytes()
            with Image.open(asset) as image:
                if image.format != "JPEG" or image.size != (1600, 900):
                    raise ValueError("Invalid cover format or dimensions")
                image.verify()
            digest = hashlib.sha256(content).hexdigest()
            prior = previous.get(str(course_id))
            if old_url and (not prior or old_url != prior.get("thumbnail_url")):
                print(title, "existing cover preserved", flush=True)
                continue
            entry = {
                "course_id": str(course_id),
                "title": title,
                "subject": subject,
                "asset": asset.name,
                "sha256": digest,
                "previous_thumbnail": old_url,
            }
            if apply:
                if prior and prior.get("sha256") == digest:
                    await asyncio.to_thread(
                        storage._client().head_object,
                        Bucket=settings.R2_BUCKET_NAME,
                        Key=prior["key"],
                    )
                    entry.update(key=prior["key"], thumbnail_url=prior["thumbnail_url"])
                else:
                    uploaded = await storage.upload_file(
                        ["courses", str(course_id), "thumbnails"],
                        asset.name,
                        content,
                        "image/jpeg",
                    )
                    entry.update(key=uploaded["key"], thumbnail_url=uploaded["url"])
            assignments.append(entry)
            if apply:
                REPORT.write_text(
                    json.dumps(
                        {
                            "database": engine.url.database,
                            "committed": False,
                            "assignments": assignments,
                        },
                        ensure_ascii=False,
                        indent=2,
                    )
                    + "\n"
                )
            print(title, "uploaded" if apply else "ready", flush=True)
        if apply:
            async with AsyncSessionLocal() as db:
                for entry in sorted(assignments, key=lambda x: x["course_id"]):
                    course = await db.scalar(
                        select(Courses)
                        .where(Courses.id == UUID(entry["course_id"]))
                        .with_for_update()
                    )
                    if (
                        not course
                        or course.deleted_at
                        or course.thumbnail_url != entry["previous_thumbnail"]
                    ):
                        raise RuntimeError("Course cover changed during upload; retry")
                    course.thumbnail_url = entry["thumbnail_url"]
                await db.commit()
            REPORT.write_text(
                json.dumps(
                    {
                        "database": engine.url.database,
                        "committed": True,
                        "completed_at": datetime.now(UTC).isoformat(),
                        "assignments": assignments,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n"
            )
        print("Assigned" if apply else "Prepared", len(assignments), "course covers")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    asyncio.run(main(parser.parse_args().apply))
