"""Import reviewed official-channel embeds atomically; draft unless --publish."""

import argparse
import asyncio
import hashlib
import html
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import func, select, text

from app.core.embedding import EmbeddingService
from app.db.models.catalog import Grade, Subject
from app.db.models.database import (
    Categories,
    Courses,
    CourseSections,
    Lessons,
    LessonTypeEnum,
    LessonVideos,
    Role,
    User,
    UserRoles,
)
from app.db.sesson import AsyncSessionLocal, engine
from app.schemas.catalog import CourseTaxonomy
from app.services.catalog import CatalogService
from app.services.catalog_slugs import slugify

DATA = Path(__file__).resolve().parents[2] / "data/lessons"


def validate(course):
    if course.get("subject") in {"tin-hoc", "tin-hoc-cong-nghe", "tieng-anh"}:
        raise ValueError("Computing and English are excluded from this import")
    lessons = course["lessons"]
    if (
        not course.get("eligible")
        or course.get("verification_errors")
        or course.get("missing_numbers")
    ):
        raise ValueError("Incomplete or unverified source")
    if sorted(x["number"] for x in lessons) != list(
        range(1, course["expected_last_lesson"] + 1)
    ):
        raise ValueError("Episode numbers must be complete and unique")
    if len({x["video_id"] for x in lessons}) != len(lessons):
        raise ValueError("Duplicate video")
    for item in lessons:
        if (
            item.get("verification") != "official_channel_and_oembed"
            or item.get("channel_url") != "https://www.youtube.com/@VTV7tv"
        ):
            raise ValueError("Source channel not verified")
        if item.get("duration_seconds", 0) <= 0:
            raise ValueError("Unknown video duration")
    return lessons


def record_owner_id(record, fallback):
    raw = record.get("owner_id")
    return UUID(str(raw)) if raw else fallback


async def has_role(db, user_id, role_name):
    return await db.scalar(
        select(UserRoles.user_id)
        .join(Role, Role.id == UserRoles.role_id)
        .where(UserRoles.user_id == user_id, Role.role_name == role_name)
        .limit(1)
    )


async def main(
    owner_id,
    apply=False,
    manifest=None,
    report_path=None,
    publish=False,
    embed_courses=False,
    approver_id=None,
):
    manifest = Path(manifest) if manifest else DATA / "vtv7-courses.json"
    records = json.loads(manifest.read_text())
    for record in records:
        validate(record)
    report = []
    created = []
    async with AsyncSessionLocal() as db:
        owners = {}
        lecturer_role_id = await db.scalar(
            select(Role.id).where(Role.role_name == "LECTURER")
        )
        for record in records:
            oid = record_owner_id(record, owner_id)
            if oid in owners:
                continue
            course_owner = await db.get(User, oid)
            lecturer = await has_role(db, oid, "LECTURER")
            if not course_owner or course_owner.is_banned or course_owner.deleted_at:
                raise ValueError("Active owner required")
            if not lecturer:
                # Catalog instructors who already own courses can curate a new
                # embed. They are not granted administrator access.
                owned = await db.scalar(
                    select(func.count())
                    .select_from(Courses)
                    .where(
                        Courses.instructor_id == oid, Courses.deleted_at.is_(None)
                    )
                )
                if not owned or not lecturer_role_id:
                    raise ValueError("Active lecturer owner required")
                if apply:
                    db.add(
                        UserRoles(id=uuid4(), user_id=oid, role_id=lecturer_role_id)
                    )
                    await db.flush()
            owners[oid] = course_owner
        publisher_id = approver_id or owner_id
        if publish and not await has_role(db, publisher_id, "ADMIN"):
            raise ValueError("Publishing requires an existing administrator")
        publisher = await db.get(User, publisher_id) if publish else None
        if publish and (
            not publisher or publisher.is_banned or publisher.deleted_at
        ):
            raise ValueError("Publishing requires an existing administrator")
        # Deterministic import identities and one transaction prevent duplicate or partial courses.
        await db.execute(
            text(
                "SELECT pg_advisory_xact_lock(hashtextextended('official-vtv7-course-import',0))"
            )
        )
        for record in records:
            lessons = validate(record)
            oid = record_owner_id(record, owner_id)
            course_owner = owners[oid]
            slug = (
                "vtv7-"
                + slugify(record["title"])
                + "-"
                + hashlib.sha256(record["source_url"].encode()).hexdigest()[:10]
            )
            existing = await db.scalar(select(Courses).where(Courses.slug == slug))
            if existing:
                if existing.instructor_id != oid or record["source_url"] not in (
                    existing.description or ""
                ):
                    raise ValueError(
                        "Existing course identity conflicts; manual review required"
                    )
                report.append(
                    {
                        "id": str(existing.id),
                        "title": existing.title,
                        "owner_id": str(oid),
                        "owner_name": course_owner.fullname,
                        "status": "existing_preserved",
                        "lessons": len(lessons),
                    }
                )
                continue
            duplicate_video = await db.scalar(
                select(LessonVideos.file_id)
                .where(LessonVideos.file_id.in_([item["video_id"] for item in lessons]))
                .limit(1)
            )
            if duplicate_video:
                raise ValueError("Video already imported")
            grade = await db.scalar(
                select(Grade).where(
                    Grade.grade_number == record["grade"], Grade.is_active.is_(True)
                )
            )
            subject = await db.scalar(
                select(Subject).where(
                    Subject.code == record["subject"], Subject.is_active.is_(True)
                )
            )
            if not grade or not subject:
                raise ValueError("Missing active grade/subject taxonomy")
            category = await db.scalar(
                select(Categories).where(Categories.slug == f"lop-{record['grade']}")
            )
            if not apply:
                report.append(
                    {
                        "title": record["title"],
                        "owner_id": str(oid),
                        "owner_name": course_owner.fullname,
                        "status": "ready",
                        "lessons": len(lessons),
                        "duration_seconds": sum(x["duration_seconds"] for x in lessons),
                    }
                )
                continue
            source = html.escape(record["source_url"], quote=True)
            course = Courses(
                instructor_id=oid,
                title=record["title"],
                slug=slug,
                category_id=category.id if category else None,
                subtitle="Bộ bài giảng công khai của VTV7 · Nhúng nguyên nguồn",
                description=f'<p>Khóa tham khảo miễn phí, biên tập từ bộ bài giảng công khai của VTV7. Tác giả và nội dung video thuộc VTV7; tài khoản quản lý khóa không được ghi nhận là tác giả video.</p><p>Phạm vi: {len(lessons)} bài trong bộ nguồn, không tuyên bố là toàn bộ chương trình năm học hiện hành. Các bộ ôn thi được ghi là tư liệu lưu trữ; cần đối chiếu chương trình và cấu trúc đề thi hiện hành khi học.</p><p>Nguồn: <a href="{source}" target="_blank" rel="noopener noreferrer">VTV7 và danh mục bài giảng</a></p>',
                base_price=0,
                currency="VND",
                is_published=publish,
                approval_status="approved" if publish else "pending",
                approved_by=publisher.id if publish else None,
                approved_at=datetime.now(UTC) if publish else None,
                approval_note="Nhập và công khai bộ VTV7 miễn phí theo yêu cầu chủ dự án."
                if publish
                else None,
                language="vi",
                level="beginner",
                total_length_seconds=sum(x["duration_seconds"] for x in lessons),
                outcomes=["Học và ôn tập theo trình tự của bộ bài giảng nguồn"],
                requirements=[
                    "Thiết bị truy cập YouTube và kết nối Internet",
                    f"Tài liệu tham khảo dành cho học sinh lớp {record['grade']}",
                ],
                target_audience=[f"Học sinh lớp {record['grade']} và phụ huynh"],
            )
            db.add(course)
            await db.flush()
            created.append(course)
            await CatalogService(db).assign(
                course,
                CourseTaxonomy(
                    subject_id=subject.id,
                    grade_ids=[grade.id],
                    delivery_type="recorded_video",
                ),
                publisher.id if publish else oid,
                admin=True,
                commit=False,
            )
            sections = {}
            for item in lessons:
                group = (item["number"] - 1) // 10
                if group not in sections:
                    section = CourseSections(
                        course_id=course.id,
                        title=f"Nhóm bài {group * 10 + 1}–{min((group + 1) * 10, len(lessons))}",
                        position=group + 1,
                    )
                    db.add(section)
                    await db.flush()
                    sections[group] = section
                lesson = Lessons(
                    course_id=course.id,
                    section_id=sections[group].id,
                    title=item["title"],
                    lesson_type=LessonTypeEnum.VIDEO,
                    position=(item["number"] - 1) % 10 + 1,
                    is_preview=False,
                    description=f"Video nguồn: VTV7. {item['video_url']}\nDanh mục đối chiếu: {item.get('article_url', record['source_url'])}",
                )
                db.add(lesson)
                await db.flush()
                db.add(
                    LessonVideos(
                        lesson_id=lesson.id,
                        file_id=item["video_id"],
                        video_url=item["video_url"],
                        source_type="youtube_url",
                        duration=item["duration_seconds"],
                        transcript=None,
                    )
                )
            await db.flush()
            count = await db.scalar(
                select(func.count())
                .select_from(Lessons)
                .where(Lessons.course_id == course.id)
            )
            if count != len(lessons):
                raise RuntimeError("Imported lesson count mismatch")
            report.append(
                {
                    "id": str(course.id),
                    "title": course.title,
                    "slug": course.slug,
                    "owner_id": str(oid),
                    "owner_name": course_owner.fullname,
                    "status": "published_created" if publish else "draft_created",
                    "lessons": count,
                    "price": "0",
                    "published": publish,
                }
            )
        if apply and embed_courses and created:
            service = EmbeddingService()
            contents = [
                "\n".join(
                    [
                        c.title or "",
                        c.description or "",
                        " ".join(c.outcomes or []),
                        " ".join(c.requirements or []),
                        " ".join(c.target_audience or []),
                    ]
                )
                for c in created
            ]
            for offset in range(0, len(created), 8):
                vectors = await service.embed_texts(contents[offset : offset + 8])
                for course, content, vector in zip(
                    created[offset : offset + 8],
                    contents[offset : offset + 8],
                    vectors,
                    strict=True,
                ):
                    course.embedding = vector
                    course.embedding_updated_at = datetime.now(UTC).replace(tzinfo=None)
                    course.search_tsv = func.to_tsvector("simple", content)
        if apply and created:
            await db.flush()
            for oid in {course.instructor_id for course in created}:
                owners[oid].course_count = await db.scalar(
                    select(func.count())
                    .select_from(Courses)
                    .where(
                        Courses.instructor_id == oid, Courses.deleted_at.is_(None)
                    )
                )
        if apply:
            await db.commit()
        else:
            await db.rollback()
    output = {"target_database": engine.url.database, "apply": apply, "courses": report}
    (Path(report_path) if report_path else DATA / "vtv7-import-report.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(output, ensure_ascii=False, indent=2))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner-id", required=True, type=UUID)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--embed-courses", action="store_true")
    parser.add_argument("--approver-id", type=UUID)
    args = parser.parse_args()
    asyncio.run(
        main(
            args.owner_id,
            args.apply,
            args.manifest,
            args.report,
            args.publish,
            args.embed_courses,
            args.approver_id,
        )
    )
