"""Fill existing VTV7 course information from the reviewed lesson manifests."""

import argparse
import asyncio
import html
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.models.catalog import Subject
from app.db.models.database import Courses
from app.db.sesson import AsyncSessionLocal, engine
from scripts.expand_youtube_test_catalog import DATA


async def main(apply=False):
    try:
        changes = []
        async with AsyncSessionLocal() as db:
            for manifest in sorted(DATA.glob("vtv7*courses.json")):
                report = manifest.with_name(
                    manifest.name.replace("courses.json", "import-report.json")
                )
                if not report.exists():
                    continue
                imported = json.loads(report.read_text())
                if imported.get(
                    "target_database"
                ) != engine.url.database or not imported.get("apply"):
                    continue
                titles = {c["title"]: c["id"] for c in imported["courses"]}
                for record in json.loads(manifest.read_text()):
                    course_id = titles.get(record["title"])
                    if not course_id:
                        continue
                    from uuid import UUID

                    course = await db.scalar(
                        select(Courses)
                        .where(Courses.id == UUID(course_id))
                        .with_for_update()
                    )
                    if not course or course.deleted_at:
                        continue
                    if record["source_url"] not in (course.description or ""):
                        raise ValueError(
                            "Imported identity/source changed; refusing overwrite"
                        )
                    subject = await db.get(Subject, course.subject_id)
                    lessons = record["lessons"]
                    duration = sum(v["duration_seconds"] for v in lessons)
                    marker = "<h3>Danh sách nội dung từ nguồn VTV7</h3>"
                    original = (course.description or "").split(marker)[0]
                    listing = "".join(
                        f'<li>{html.escape(v["title"])} ({v["duration_seconds"]//60} phút {v["duration_seconds"]%60} giây)</li>'
                        for v in lessons
                    )
                    course.description = (
                        original
                        + marker
                        + "<ol>"
                        + listing
                        + "</ol><p>Cách học: xem theo trình tự, dừng video để tự làm ví dụ, ghi chú và đối chiếu sách đang học. Video được phát từ YouTube và có thể thay đổi khả dụng theo thời gian.</p>"
                    )
                    course.subtitle = f"{subject.name} · Lớp {record['grade']} · {len(lessons)} bài · {duration//60} phút · Nguồn VTV7"
                    indices = sorted(
                        {
                            0,
                            len(lessons) // 3,
                            2 * len(lessons) // 3,
                            len(lessons) - 1,
                        }
                    )
                    course.outcomes = [
                        f"Học và ôn tập: {lessons[i]['title']}" for i in indices
                    ]
                    course.requirements = [
                        "Thiết bị có kết nối Internet, trình duyệt và truy cập được YouTube.",
                        f"Kiến thức nền và tài liệu môn {subject.name} phù hợp lớp {record['grade']}.",
                        "Chuẩn bị vở ghi, tự làm lại ví dụ và đối chiếu chương trình/sách giáo khoa đang học.",
                    ]
                    course.target_audience = [
                        f"Học sinh lớp {record['grade']} muốn bổ trợ môn {subject.name} theo các bài trong danh sách.",
                        "Phụ huynh, giáo viên cần tìm bài giảng tham khảo từ VTV7.",
                    ]
                    course.total_length_seconds = duration
                    course.updated_at = datetime.now(UTC)
                    changes.append(str(course.id))
            if apply:
                await db.commit()
            else:
                await db.rollback()
        print(
            f"{'Updated' if apply else 'Prepared'} {len(changes)} existing VTV7 courses"
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--apply", action="store_true")
    asyncio.run(main(p.parse_args().apply))
