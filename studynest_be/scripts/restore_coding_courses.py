"""Restore the two original coding products and refresh only course presentation.

Preserves original product IDs/slugs and all financial references. Swaps the
archived coding curriculum back to its original parent, retaining math drafts
under the archive IDs. Content fingerprints exclude only the parent course FK.
Requires a PostgreSQL custom-format backup before applying.
"""

import argparse
import asyncio
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select, text, update

from app.core.embedding import EmbeddingService
from app.db.models.catalog import (
    Grade,
    Subject,
    course_exams,
    course_grades,
    course_learning_goals,
)
from app.db.models.database import (
    Courses,
    CourseSections,
    Lessons,
    Role,
    User,
    UserRoles,
)
from app.db.sesson import AsyncSessionLocal, engine
from app.schemas.catalog import CourseTaxonomy
from app.services.catalog import CatalogService

DATA = Path(__file__).resolve().parents[2] / "data/lessons"
PAIRS = [
    {
        "original": UUID("075522a0-adb5-4816-9593-da0d254acf45"),
        "archive": UUID("b81809f1-f8c6-59b2-9400-0aa9decb010b"),
        "slug": "lap-trinh-c-co-ban-nang-cao",
        "draft_slug": "toan-lop-3-cung-co-kien-thuc-ban-nhap",
        "title": "Tin học THPT · Nền tảng lập trình C++",
        "subtitle": "Nhập xuất, biến và kiểu dữ liệu · Tự viết code và luyện test case",
        "outcomes": [
            "Làm quen môi trường C++ và cấu trúc một chương trình đơn giản.",
            "Sử dụng biến, hằng số và các kiểu dữ liệu cơ bản.",
            "Nhập dữ liệu bằng cin và xuất kết quả bằng cout.",
            "Viết chương trình giải các bài toán số học cơ bản.",
            "Đọc kết quả test case, tìm lỗi và cải thiện chương trình.",
        ],
        "topics": "Làm quen với Dev-C++, nhập xuất, biến, hằng số và kiểu dữ liệu. Các bài thực hành hiện có gồm tổng/hiệu, diện tích và một số bài toán số nguyên.",
        "scope": "Nội dung đã phát hành tập trung vào phần nền tảng. Các chương nâng cao được giữ trong lộ trình và sẽ bổ sung bài học sau.",
        "requirements": [
            "Máy tính có bàn phím và kết nối Internet.",
            "Biết thao tác cơ bản với tệp và thư mục.",
            "Sẵn sàng tự viết chương trình và thử lại sau mỗi lỗi.",
        ],
    },
    {
        "original": UUID("e03af09c-57cc-4eec-b16d-47ccf745aa25"),
        "archive": UUID("0b604358-05c9-53ff-a57e-186151cc74a8"),
        "slug": "lap-trinh-javascript-co-ban",
        "draft_slug": "toan-lop-4-cung-co-kien-thuc-ban-nhap",
        "title": "Tin học THPT · JavaScript và lập trình web",
        "subtitle": "Từ biến và hàm đến DOM, mảng, đối tượng và bất đồng bộ",
        "outcomes": [
            "Sử dụng biến, kiểu dữ liệu, toán tử, điều kiện và vòng lặp trong JavaScript.",
            "Viết hàm và thao tác với mảng, đối tượng.",
            "Tạo tương tác trên trang web với DOM và sự kiện.",
            "Làm quen Promise, Fetch, callback và async/await.",
            "Giải bài tập lập trình và tự kiểm tra bằng test case trên Mây Mây.",
        ],
        "topics": "Biến và kiểu dữ liệu; điều kiện, vòng lặp và hàm; phạm vi biến; mảng và đối tượng; DOM, sự kiện và Local Storage; làm quen Node.js, Promise, Fetch, callback và async/await.",
        "scope": "Học theo nhịp của bạn, kết hợp video, bài ôn tập và thực hành để củng cố kỹ năng lập trình web từ nền tảng đến các chủ đề nâng cao hơn.",
        "requirements": [
            "Máy tính có bàn phím, trình duyệt và kết nối Internet.",
            "Biết HTML/CSS cơ bản sẽ giúp học phần DOM thuận lợi hơn.",
            "Tự thực hành sau từng bài và đọc kết quả test case.",
        ],
    },
]
FINANCE_TABLES = [
    "purchase_items",
    "transactions",
    "course_enrollments",
    "course_favourites",
    "course_reviews",
    "discount_targets",
    "course_bundle_items",
    "bundle_order_lines",
    "stage_course_options",
]


async def digest(db, table, where, params, ignore_course=False):
    if not re.fullmatch(r"[a-z_]+", table):
        raise ValueError("Unsafe table identifier")
    row = "to_jsonb(t) - 'course_id'" if ignore_course else "to_jsonb(t)"
    return (
        (
            await db.execute(
                text(
                    f"SELECT count(*), md5(COALESCE(jsonb_agg({row} ORDER BY ({row})::text)::text, '[]')) FROM public.{table} t WHERE {where}"
                ),
                params,
            )
        )
        .one()
        ._asdict()
    )


async def snapshot(db, course_ids):
    lessons = list(
        (
            await db.scalars(
                select(Lessons.id).where(Lessons.course_id.in_(course_ids))
            )
        ).all()
    )
    sections = list(
        (
            await db.scalars(
                select(CourseSections.id).where(
                    CourseSections.course_id.in_(course_ids)
                )
            )
        ).all()
    )
    codes = list(
        (
            await db.execute(
                text("SELECT id FROM lesson_codes WHERE lesson_id=ANY(:ids)"),
                {"ids": lessons},
            )
        ).scalars()
    )
    quizzes = list(
        (
            await db.execute(
                text("SELECT id FROM lesson_quizzes WHERE lesson_id=ANY(:ids)"),
                {"ids": lessons},
            )
        ).scalars()
    )
    params = {
        "cids": course_ids,
        "lids": lessons,
        "sids": sections,
        "codes": codes,
        "quizzes": quizzes,
    }
    content = {
        "lessons": await digest(db, "lessons", "id=ANY(:lids)", params, True),
        "course_sections": await digest(
            db, "course_sections", "id=ANY(:sids)", params, True
        ),
    }
    columns = (
        await db.execute(
            text(
                "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('lesson_id','lesson_code_id','quiz_id','lesson_quiz_id')"
            )
        )
    ).all()
    by_table = {}
    for table, column in columns:
        if not re.fullmatch(r"[a-z_]+", column):
            raise ValueError("Unsafe column identifier")
        param = (
            "lids"
            if column == "lesson_id"
            else "codes"
            if column == "lesson_code_id"
            else "quizzes"
        )
        by_table.setdefault(table, []).append(f"{column}=ANY(:{param})")
    for table, clauses in by_table.items():
        content[table] = await digest(db, table, " OR ".join(clauses), params, True)
    finance = {
        table: await digest(db, table, "course_id=ANY(:cids)", params)
        for table in FINANCE_TABLES
    }
    return {"content": content, "financial_and_access": finance}


async def taxonomy(db, course):
    return CourseTaxonomy(
        subject_id=course.subject_id,
        provider_id=course.provider_id,
        delivery_type=course.delivery_type,
        grade_ids=list(
            (
                await db.scalars(
                    select(course_grades.c.grade_id).where(
                        course_grades.c.course_id == course.id
                    )
                )
            ).all()
        ),
        learning_goal_ids=list(
            (
                await db.scalars(
                    select(course_learning_goals.c.learning_goal_id).where(
                        course_learning_goals.c.course_id == course.id
                    )
                )
            ).all()
        ),
        exam_ids=list(
            (
                await db.scalars(
                    select(course_exams.c.exam_id).where(
                        course_exams.c.course_id == course.id
                    )
                )
            ).all()
        ),
    )


async def code_count(db, course_id):
    return await db.scalar(
        text(
            "SELECT count(*) FROM lesson_codes c JOIN lessons l ON l.id=c.lesson_id WHERE l.course_id=:id"
        ),
        {"id": course_id},
    )


async def restore(apply=False, backup=None, covers=None, report_path=None):
    if apply and (
        not backup
        or not Path(backup).is_file()
        or Path(backup).read_bytes()[:5] != b"PGDMP"
    ):
        raise ValueError("A PostgreSQL custom-format backup is required")
    report = {"database": engine.url.database, "applied": apply, "courses": []}
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                text(
                    "SELECT pg_advisory_xact_lock(hashtextextended('restore-original-coding-courses',0))"
                )
            )
            all_ids = [p[key] for p in PAIRS for key in ["original", "archive"]]
            roots = {
                c.id: c
                for c in (
                    await db.scalars(
                        select(Courses)
                        .where(Courses.id.in_(all_ids))
                        .order_by(Courses.id)
                        .with_for_update()
                    )
                ).all()
            }
            if len(roots) != 4:
                raise ValueError("Expected four known original/archive courses")
            before = await snapshot(db, all_ids)
            tin = await db.scalar(
                select(Subject).where(
                    Subject.code == "tin-hoc", Subject.is_active.is_(True)
                )
            )
            grades = list(
                (
                    await db.scalars(
                        select(Grade.id).where(
                            Grade.grade_number.in_([10, 11, 12]),
                            Grade.is_active.is_(True),
                        )
                    )
                ).all()
            )
            if not tin or len(grades) != 3:
                raise ValueError("Missing active THPT computing taxonomy")
            desired = []
            for pair in PAIRS:
                original, archive = roots[pair["original"]], roots[pair["archive"]]
                if (
                    original.slug != pair["slug"]
                    or original.instructor_id != archive.instructor_id
                ):
                    raise ValueError("Original course identity/owner conflict")
                admin = await db.scalar(
                    select(UserRoles.user_id)
                    .join(Role, Role.id == UserRoles.role_id)
                    .where(
                        UserRoles.user_id == original.instructor_id,
                        Role.role_name == "ADMIN",
                    )
                )
                if not admin:
                    raise ValueError("Administrator publication owner required")
                existing = await code_count(db, original.id)
                source = original if existing else archive
                expected_lessons = set(
                    (
                        await db.scalars(
                            select(Lessons.id).where(Lessons.course_id == source.id)
                        )
                    ).all()
                )
                expected_sections = set(
                    (
                        await db.scalars(
                            select(CourseSections.id).where(
                                CourseSections.course_id == source.id
                            )
                        )
                    ).all()
                )
                if not await code_count(db, source.id):
                    raise ValueError("Original coding content missing")
                if not existing:
                    if (
                        not original.title.startswith("Toán lớp ")
                        or archive.slug != f"archived-k12-{original.id}"
                        or archive.deleted_at is None
                    ):
                        raise ValueError("Unexpected archive state; no changes made")
                    for table in FINANCE_TABLES:
                        if await db.scalar(
                            text(f"SELECT count(*) FROM {table} WHERE course_id=:id"),
                            {"id": archive.id},
                        ):
                            raise ValueError(
                                "Archive has independent commercial/access references"
                            )
                section_count, lesson_count = (
                    len(expected_sections),
                    len(expected_lessons),
                )
                exercises = await code_count(db, source.id)
                cases = await db.scalar(
                    text(
                        "SELECT count(*) FROM lesson_code_testcases t JOIN lesson_codes c ON c.id=t.lesson_code_id JOIN lessons l ON l.id=c.lesson_id WHERE l.course_id=:id"
                    ),
                    {"id": source.id},
                )
                report["courses"].append(
                    {
                        "id": str(original.id),
                        "slug": original.slug,
                        "title": pair["title"],
                        "sections": section_count,
                        "lessons": lesson_count,
                        "exercises": exercises,
                        "testcases": cases,
                        "price_preserved": str(original.base_price),
                        "mode": "already_restored" if existing else "restore_original",
                    }
                )
                if not apply:
                    continue
                cover = (covers or {}).get(str(original.id), "")
                if not cover.startswith(
                    f"/api/storage/files/public/courses/{original.id}/thumbnails/"
                ):
                    raise ValueError("An owned R2 thumbnail is required")
                if not existing:
                    math_taxonomy = await taxonomy(db, original)
                    for column in Courses.__table__.columns:
                        if column.name not in {"id", "slug"}:
                            setattr(
                                archive, column.name, getattr(original, column.name)
                            )
                    archive.slug = pair["draft_slug"]
                    archive.is_published = False
                    archive.approval_status = "pending"
                    archive.approved_at = archive.approved_by = None
                    archive.approval_note = None
                    # The math draft must not inherit the coding product's metrics.
                    archive.total_enrolls = archive.rating_count = (
                        archive.total_reviews
                    ) = 0
                    archive.rating_avg = 0
                    archive.views = await db.scalar(
                        text("SELECT count(*) FROM course_views WHERE course_id=:id"),
                        {"id": archive.id},
                    )
                    await db.flush()
                    # Swap parent pointers only. IDs, titles, order and content stay intact.
                    for model in [CourseSections, Lessons]:
                        await db.execute(
                            update(model)
                            .where(model.course_id.in_([original.id, archive.id]))
                            .values(
                                course_id=text(
                                    "CASE WHEN course_id=:original THEN :archive ELSE :original END"
                                )
                            ),
                            {"original": original.id, "archive": archive.id},
                        )
                    for table in [
                        "lesson_quizzes",
                        "lesson_progress",
                        "tutor_chat_threads",
                    ]:
                        await db.execute(
                            text(
                                f"UPDATE {table} t SET course_id=l.course_id FROM lessons l WHERE t.lesson_id=l.id AND l.course_id IN (:original,:archive) AND t.course_id IS DISTINCT FROM l.course_id"
                            ),
                            {"original": original.id, "archive": archive.id},
                        )
                    # Navigation has PK(user_id, course_id); a direct two-way
                    # swap violates immediate uniqueness. Reinsert the exact
                    # same lesson/timestamp pointers within this transaction.
                    nav_params = {"original": original.id, "archive": archive.id}
                    positions = (
                        (
                            await db.execute(
                                text("""SELECT a.user_id,l.course_id,a.lesson_id,a.activated_at
                        FROM lesson_active a JOIN lessons l ON l.id=a.lesson_id
                        WHERE l.course_id IN (:original,:archive)
                        ORDER BY a.user_id,a.course_id FOR UPDATE OF a"""),
                                nav_params,
                            )
                        )
                        .mappings()
                        .all()
                    )
                    removed = await db.execute(
                        text("""DELETE FROM lesson_active a USING lessons l
                        WHERE a.lesson_id=l.id AND l.course_id IN (:original,:archive)"""),
                        nav_params,
                    )
                    if removed.rowcount != len(positions):
                        raise RuntimeError("Navigation changed concurrently; retry")
                    if positions:
                        await db.execute(
                            text("""INSERT INTO lesson_active(user_id,course_id,lesson_id,activated_at)
                            VALUES(:user_id,:course_id,:lesson_id,:activated_at)"""),
                            [dict(p) for p in positions],
                        )
                    await CatalogService(db).assign(
                        archive,
                        math_taxonomy,
                        original.instructor_id,
                        admin=True,
                        commit=False,
                    )
                original.title = pair["title"]
                original.subtitle = pair["subtitle"]
                original.description = f"## {pair['title']}\n\nKhóa bổ trợ kỹ năng lập trình dành cho học sinh THPT lớp 10–12, kết hợp video, bài ôn tập và thực hành trên Mây Mây.\n\n### Nội dung học\n\n{pair['topics']}\n\n### Học và thực hành\n\nXem bài giảng, tự viết chương trình và chạy test case ngay trong bài học. Đọc kết quả từng lần chạy để sửa lỗi và luyện cách giải quyết vấn đề.\n\n### Phạm vi khóa học\n\nHiện có {lesson_count} bài học trong {section_count} chương, với {exercises} bài tập lập trình và {cases} test case. {pair['scope']}"
                original.outcomes = pair["outcomes"]
                original.requirements = pair["requirements"]
                original.target_audience = [
                    "Học sinh lớp 10, 11, 12 muốn bổ trợ kỹ năng Tin học và lập trình.",
                    "Người mới bắt đầu cần học theo video và thực hành từng bước.",
                ]
                original.level, original.language = "beginner", "vi"
                original.thumbnail_url = cover
                original.promo_video_url = None
                original.category_id = original.topic_id = None
                original.deleted_at = None
                original.is_published, original.approval_status = True, "approved"
                original.approved_by = original.instructor_id
                original.approved_at = original.updated_at = datetime.now(UTC)
                original.approval_note = "Khôi phục khóa code gốc và đồng bộ trình bày Tin học THPT theo yêu cầu chủ dự án."
                review_count, rating = (
                    await db.execute(
                        text(
                            "SELECT count(*),COALESCE(avg(rating),0) FROM course_reviews WHERE course_id=:id"
                        ),
                        {"id": original.id},
                    )
                ).one()
                original.rating_count = original.total_reviews = review_count
                original.rating_avg = rating
                original.total_enrolls = await db.scalar(
                    text(
                        "SELECT count(DISTINCT user_id) FROM course_enrollments WHERE course_id=:id"
                    ),
                    {"id": original.id},
                )
                original.total_length_seconds = int(
                    await db.scalar(
                        text(
                            "SELECT COALESCE(sum(v.duration),0) FROM lesson_videos v JOIN lessons l ON l.id=v.lesson_id WHERE l.course_id=:id"
                        ),
                        {"id": original.id},
                    )
                )
                await CatalogService(db).assign(
                    original,
                    CourseTaxonomy(
                        subject_id=tin.id,
                        grade_ids=grades,
                        delivery_type="recorded_video",
                    ),
                    original.instructor_id,
                    admin=True,
                    commit=False,
                )
                if (
                    set(
                        (
                            await db.scalars(
                                select(Lessons.id).where(
                                    Lessons.course_id == original.id
                                )
                            )
                        ).all()
                    )
                    != expected_lessons
                    or set(
                        (
                            await db.scalars(
                                select(CourseSections.id).where(
                                    CourseSections.course_id == original.id
                                )
                            )
                        ).all()
                    )
                    != expected_sections
                ):
                    raise RuntimeError("Curriculum identity mismatch")
                desired.append(original)
            if apply:
                service = EmbeddingService()
                contents = [
                    "\n".join(
                        [
                            c.title,
                            c.description,
                            " ".join(c.outcomes),
                            " ".join(c.requirements),
                            " ".join(c.target_audience),
                        ]
                    )
                    for c in desired
                ]
                vectors = await service.embed_texts(contents)
                for course, content, vector in zip(
                    desired, contents, vectors, strict=True
                ):
                    course.embedding = vector
                    course.embedding_updated_at = datetime.now(UTC).replace(tzinfo=None)
                    course.search_tsv = func.to_tsvector("simple", content)
                for owner_id in {c.instructor_id for c in desired}:
                    user = await db.get(User, owner_id)
                    user.course_count = await db.scalar(
                        select(func.count())
                        .select_from(Courses)
                        .where(
                            Courses.instructor_id == owner_id,
                            Courses.deleted_at.is_(None),
                        )
                    )
                await db.flush()
                after = await snapshot(db, all_ids)
                if before != after:
                    raise RuntimeError(
                        "Content, progress or financial history changed; rolling back"
                    )
                await db.commit()
                report["preservation_checks"] = after
            else:
                await db.rollback()
        if report_path:
            Path(report_path).write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n"
            )
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return report
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path)
    parser.add_argument("--covers", type=Path)
    parser.add_argument(
        "--report", type=Path, default=DATA / "coding-course-restoration.json"
    )
    args = parser.parse_args()
    mapping = json.loads(args.covers.read_text()) if args.covers else None
    asyncio.run(restore(args.apply, args.backup, mapping, args.report))
