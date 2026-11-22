"""Crawl YouTube metadata for the explicitly authorized internal test catalog.

No media downloads. Courses are short selections, never represented as complete
publisher playlists or a full curriculum. Source authors remain attributed.
Collect/checkpoint first; --apply imports atomically. Re-runs fill only deficits.
"""

import argparse
import asyncio
import hashlib
import html
import json
import re
import sys
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.models.catalog import course_grades
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
from scripts.collect_vtv7_courses import initial, walk

DATA = Path(__file__).resolve().parents[2] / "data/lessons"
MANIFEST = DATA / "youtube-test-catalog.json"
REPORT = DATA / "youtube-test-import-report.json"
ALIASES = {
    "toan": ["toan"],
    "tieng-viet": ["tieng viet", "hoc van"],
    "ngu-van": ["ngu van", "van"],
    "tieng-anh": ["tieng anh", "english"],
    "tu-nhien-xa-hoi": ["tu nhien va xa hoi", "tu nhien xa hoi", "tnxh"],
    "khoa-hoc": ["khoa hoc"],
    "tin-hoc-cong-nghe": ["tin hoc", "cong nghe"],
    "khtn": ["khoa hoc tu nhien", "khtn"],
    "lich-su-dia-ly": ["lich su", "dia li", "dia ly"],
    "tin-hoc": ["tin hoc"],
    "vat-ly": ["vat li", "vat ly"],
    "hoa-hoc": ["hoa hoc", "hoa"],
    "sinh-hoc": ["sinh hoc", "sinh"],
    "lich-su": ["lich su"],
    "dia-ly": ["dia li", "dia ly"],
}


def normalized(value):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", value.lower().replace("đ", "d"))
        if unicodedata.category(c) != "Mn"
    )


def yt_text(value):
    return value.get("simpleText") or "".join(
        x.get("text", "") for x in value.get("runs", [])
    )


def matches(title, group):
    value = normalized(title)
    grade = group["grade_number"]
    # Exact grade boundaries prevent matching grade 1 with 10, 11 or 12.
    explicit = re.findall(r"\blop\s*(\d{1,2})\b", value)
    if explicit and str(grade) not in explicit:
        return False
    return any(
        re.search(r"\b" + re.escape(alias) + r"\b", value)
        for alias in ALIASES[group["subject_code"]]
    ) and (
        str(grade) in explicit
        or any(
            re.search(
                r"\b" + re.escape(alias) + r"\s*(?:lop\s*)?" + str(grade) + r"\b", value
            )
            for alias in ALIASES[group["subject_code"]]
        )
    )


def parse_video(node):
    vid = node.get("videoId", "")
    title = yt_text(node.get("title", {}))
    duration = yt_text(node.get("lengthText", {}))
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", vid) or not re.fullmatch(
        r"\d+(?::\d+){1,2}", duration
    ):
        return None
    seconds = 0
    for part in duration.split(":"):
        seconds = seconds * 60 + int(part)
    if not 120 <= seconds <= 10800:
        return None
    owner = node.get("ownerText") or node.get("longBylineText") or {}
    channel = yt_text(owner)
    endpoint = (
        (owner.get("runs") or [{}])[0]
        .get("navigationEndpoint", {})
        .get("browseEndpoint", {})
    )
    if not channel or not endpoint.get("browseId"):
        return None
    return {
        "video_id": vid,
        "title": title,
        "video_url": "https://www.youtube.com/watch?v=" + vid,
        "thumbnail_url": "https://i.ytimg.com/vi/" + vid + "/hqdefault.jpg",
        "duration_seconds": seconds,
        "channel": channel,
        "channel_id": endpoint["browseId"],
        "channel_url": "https://www.youtube.com/channel/" + endpoint["browseId"],
    }


async def coverage(db, minimum):
    rows = (await db.execute(text("""
 SELECT g.id grade_id,g.grade_number,s.id subject_id,s.code subject_code,s.name subject,
 count(DISTINCT c.id) course_count FROM grade_subjects gs
 JOIN grades g ON g.id=gs.grade_id AND g.is_active
 JOIN education_levels e ON e.id=g.education_level_id AND e.is_active
 JOIN subjects s ON s.id=gs.subject_id AND s.is_active
 LEFT JOIN course_grades cg ON cg.grade_id=g.id
 LEFT JOIN courses c ON c.id=cg.course_id AND c.subject_id=s.id AND c.deleted_at IS NULL
 AND c.is_published AND c.approval_status='approved'
 AND c.slug NOT LIKE 'demo-catalog-%' AND c.slug NOT LIKE 'seed-shop-%'
 GROUP BY g.id,g.grade_number,s.id,s.code,s.name ORDER BY g.grade_number,s.name
 """))).mappings()
    return [dict(r, missing=max(0, minimum - r["course_count"])) for r in rows]


async def search(client, query, pages=4):
    response = await client.get(
        "https://www.youtube.com/results",
        params={"search_query": query, "hl": "vi", "gl": "VN", "sp": "EgIQAQ=="},
    )
    response.raise_for_status()
    data = initial(response.text)
    version = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', response.text)
    for page in range(pages):
        for node in walk(data, "videoRenderer"):
            item = parse_video(node)
            if item:
                yield item
        tokens = list(walk(data, "continuationCommand"))
        if not tokens or not version:
            break
        response = await client.post(
            "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
            json={
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": version[1],
                        "hl": "vi",
                        "gl": "VN",
                    }
                },
                "continuation": tokens[-1]["token"],
            },
        )
        response.raise_for_status()
        data = response.json()


async def verify(client, item):
    response = await client.get(
        "https://www.youtube.com/oembed",
        params={"url": item["video_url"], "format": "json"},
    )
    response.raise_for_status()
    data = response.json()
    if (
        data.get("type") != "video"
        or not data.get("author_name")
        or not data.get("html")
    ):
        raise ValueError("Not an embeddable video")
    # oEmbed verifies existence/embed metadata, not playback in every region.
    item.update(
        channel=data["author_name"],
        channel_url=data["author_url"],
        title=data["title"],
        verified_at=datetime.now(UTC).isoformat(),
        verification="youtube_search_and_oembed",
    )
    return item


async def collect(groups, used, args):
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"groups": []}
    cached = {(g["grade_number"], g["subject_code"]): g for g in previous["groups"]}
    output = {
        "purpose": "internal testing; explicitly authorized by project owner",
        "minimum": args.minimum,
        "lessons_per_course": args.lessons,
        "groups": [],
    }
    semaphore = asyncio.Semaphore(4)
    checkpoint = asyncio.Lock()
    async with httpx.AsyncClient(timeout=35, follow_redirects=True) as client:

        async def one(group):
            if not group["missing"]:
                return
            async with semaphore:
                key = (group["grade_number"], group["subject_code"])
                old = cached.get(key, {})
                pool = [
                    x
                    for x in old.get("videos", [])
                    if x["video_id"] not in used and matches(x["title"], group)
                ]
                seen = {x["video_id"] for x in pool} | used
                needed = group["missing"] * args.lessons
                queries = [
                    f"{group['subject']} lớp {group['grade_number']} bài giảng",
                    f"{group['subject']} {group['grade_number']} kết nối tri thức",
                    f"{group['subject']} lớp {group['grade_number']} chân trời sáng tạo",
                    f"{group['subject']} lớp {group['grade_number']} cánh diều",
                ]
                errors = []
                for query in queries:
                    if len(pool) >= needed:
                        break
                    try:
                        async for item in search(client, query):
                            if item["video_id"] in seen or not matches(
                                item["title"], group
                            ):
                                continue
                            seen.add(item["video_id"])
                            try:
                                checked = await verify(client, item)
                                if matches(checked["title"], group):
                                    pool.append(checked)
                            except (httpx.HTTPError, ValueError, KeyError):
                                continue
                            if len(pool) >= needed:
                                break
                    except (httpx.HTTPError, ValueError) as exc:
                        errors.append(type(exc).__name__)
                record = {
                    k: str(v) if isinstance(v, UUID) else v for k, v in group.items()
                }
                record.update(
                    videos=pool,
                    needed_videos=needed,
                    errors=errors,
                    eligible=len(pool) >= needed,
                )
                async with checkpoint:
                    output["groups"].append(record)
                    # Preserve not-yet-processed cache across interrupted runs.
                    saved = {
                        (g["grade_number"], g["subject_code"]): g
                        for g in previous["groups"]
                    }
                    saved.update(
                        {
                            (g["grade_number"], g["subject_code"]): g
                            for g in output["groups"]
                        }
                    )
                    MANIFEST.write_text(
                        json.dumps(
                            dict(output, groups=list(saved.values())),
                            ensure_ascii=False,
                            indent=2,
                        )
                        + "\n"
                    )
                print(
                    f"Lớp {group['grade_number']} · {group['subject']}: {len(pool)}/{needed} videos",
                    flush=True,
                )

        await asyncio.gather(*(one(g) for g in groups))
    return output


def course_metadata(group, videos, index):
    subject = group["subject"]
    grade = group["grade_number"]
    topic = videos[0]["title"]
    # Keep the publisher's actual title rather than inventing topic coverage.
    title = f"{subject} lớp {grade} · {topic[:130]}"
    channels = list(dict.fromkeys(v["channel"] for v in videos))
    duration = sum(v["duration_seconds"] for v in videos)
    listing = "".join(
        f'<li><a href="{html.escape(v["video_url"],quote=True)}">{html.escape(v["title"])}</a> — {html.escape(v["channel"])}, {v["duration_seconds"]//60} phút {v["duration_seconds"]%60} giây</li>'
        for v in videos
    )
    description = (
        f"<p>Tuyển chọn {len(videos)} video tham khảo môn {html.escape(subject)}, lớp {grade}. Bộ dữ liệu phục vụ kiểm thử nội bộ Mây Mây theo yêu cầu chủ dự án.</p>"
        f"<p>Phạm vi: các bài được liệt kê dưới đây; không phải toàn bộ chương trình hay toàn bộ playlist của nhà xuất bản.</p><ol>{listing}</ol>"
        "<p>Video được nhúng từ YouTube; tác giả và quyền sở hữu nội dung thuộc các kênh nguồn. Tài khoản quản lý trên Mây Mây chỉ biên tập danh mục.</p>"
        "<p>Cách học: xem theo thứ tự, dừng video để tự làm ví dụ, ghi lại điều chưa hiểu và đối chiếu sách đang học. Nội dung có thể thuộc các bộ sách/năm học khác nhau; đối chiếu chương trình hiện tại khi sử dụng.</p>"
    )
    return {
        "title": title,
        "subtitle": f"{len(videos)} bài video · {duration//60} phút · Nguồn: {', '.join(channels)}",
        "description": description,
        "thumbnail_url": videos[0]["thumbnail_url"],
        "outcomes": [f"Ôn tập nội dung: {v['title']}" for v in videos],
        "requirements": [
            "Thiết bị có trình duyệt, kết nối Internet và truy cập được YouTube.",
            f"Kiến thức nền môn {subject} phù hợp lớp {grade}; chuẩn bị vở ghi và sách đang học.",
            "Tự thực hành các ví dụ trong video và đối chiếu kết quả với bài giảng.",
        ],
        "target_audience": [
            f"Học sinh lớp {grade} cần học bổ trợ môn {subject}.",
            "Phụ huynh hoặc giáo viên cần tìm video tham khảo theo bài học.",
        ],
        "total_length_seconds": duration,
    }


async def import_courses(output, args):
    if any(not g["eligible"] for g in output["groups"]):
        raise ValueError("Incomplete groups remain; rerun collection before applying")
    report = []
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "SELECT pg_advisory_xact_lock(hashtextextended('youtube-test-catalog',0))"
            )
        )
        approver = await db.scalar(
            select(User)
            .join(UserRoles, UserRoles.user_id == User.id)
            .join(Role, Role.id == UserRoles.role_id)
            .where(
                Role.role_name == "ADMIN",
                User.deleted_at.is_(None),
                User.is_banned.is_(False),
            )
            .order_by(User.create_at)
            .limit(1)
        )
        if not approver:
            raise ValueError("Existing active administrator required")
        owners = list(
            (
                await db.scalars(
                    select(User)
                    .join(Courses, Courses.instructor_id == User.id)
                    .join(UserRoles, UserRoles.user_id == User.id)
                    .join(Role, Role.id == UserRoles.role_id)
                    .where(
                        Role.role_name == "LECTURER",
                        Courses.is_published,
                        Courses.deleted_at.is_(None),
                        User.deleted_at.is_(None),
                        User.is_banned.is_(False),
                    )
                    .distinct()
                    .order_by(User.id)
                )
            ).all()
        )
        if not owners:
            raise ValueError("Existing active lecturer required")
        current = {
            (g["grade_number"], g["subject_code"]): g
            for g in await coverage(db, args.minimum)
        }
        for group in sorted(
            output["groups"], key=lambda g: (g["grade_number"], g["subject_code"])
        ):
            fresh = current[(group["grade_number"], group["subject_code"])]
            category = await db.scalar(
                select(Categories).where(
                    Categories.slug == f"lop-{group['grade_number']}"
                )
            )
            for i in range(fresh["missing"]):
                videos = group["videos"][i * args.lessons : (i + 1) * args.lessons]
                if len(videos) != args.lessons:
                    raise ValueError("Not enough verified lessons")
                data = course_metadata(group, videos, i)
                digest = hashlib.sha256(
                    "|".join(v["video_id"] for v in videos).encode()
                ).hexdigest()[:12]
                slug = f"youtube-tham-khao-{group['subject_code']}-lop-{group['grade_number']}-{digest}"
                if await db.scalar(select(Courses.id).where(Courses.slug == slug)):
                    raise ValueError("Existing course identity conflicts with coverage")
                owner = owners[len(report) % len(owners)]
                course = Courses(
                    id=uuid4(),
                    instructor_id=owner.id,
                    slug=slug,
                    **data,
                    category_id=category.id if category else None,
                    subject_id=fresh["subject_id"],
                    base_price=0,
                    currency="VND",
                    language="vi",
                    level="beginner",
                    delivery_type="recorded_video",
                    is_published=True,
                    approval_status="approved",
                    approved_by=approver.id,
                    approved_at=datetime.now(UTC),
                    approval_note="Dữ liệu kiểm thử nội bộ từ YouTube theo yêu cầu chủ dự án; giữ ghi công tác giả nguồn.",
                )
                db.add(course)
                await db.flush()
                await db.execute(
                    insert(course_grades).values(
                        course_id=course.id, grade_id=fresh["grade_id"]
                    )
                )
                section = CourseSections(
                    id=uuid4(),
                    course_id=course.id,
                    title="Bài giảng và thực hành theo video",
                    position=1,
                )
                db.add(section)
                await db.flush()
                for position, v in enumerate(videos, 1):
                    lesson = Lessons(
                        id=uuid4(),
                        course_id=course.id,
                        section_id=section.id,
                        title=v["title"],
                        lesson_type=LessonTypeEnum.VIDEO,
                        position=position,
                        is_preview=position == 1,
                        description=f"Nguồn: {v['channel']} — {v['channel_url']}\nVideo: {v['video_url']}\nGợi ý học: xem bài, dừng để tự làm ví dụ, ghi chú và đối chiếu kết quả.\nKiểm tra metadata: {v['verified_at']}. Không có transcript được nhập.",
                    )
                    db.add(lesson)
                    await db.flush()
                    db.add(
                        LessonVideos(
                            lesson_id=lesson.id,
                            video_url=v["video_url"],
                            file_id=v["video_id"],
                            source_type="youtube_url",
                            duration=v["duration_seconds"],
                            transcript=None,
                        )
                    )
                course.search_tsv = func.to_tsvector(
                    "simple",
                    data["title"]
                    + " "
                    + data["subtitle"]
                    + " "
                    + " ".join(data["outcomes"]),
                )
                report.append(
                    {
                        "id": str(course.id),
                        "slug": slug,
                        "title": course.title,
                        "grade": group["grade_number"],
                        "subject": group["subject_code"],
                        "lessons": len(videos),
                        "duration_seconds": course.total_length_seconds,
                        "owner_id": str(owner.id),
                        "video_ids": [v["video_id"] for v in videos],
                    }
                )
        for owner in owners:
            owner.course_count = await db.scalar(
                select(func.count())
                .select_from(Courses)
                .where(Courses.instructor_id == owner.id, Courses.deleted_at.is_(None))
            )
        if args.apply:
            await db.commit()
        else:
            await db.rollback()
    data = {
        "target_database": engine.url.database,
        "apply": args.apply,
        "created_at": datetime.now(UTC).isoformat(),
        "courses": report,
    }
    if args.apply and report and REPORT.exists():
        previous = json.loads(REPORT.read_text())
        if (
            previous.get("apply")
            and previous.get("target_database") == engine.url.database
        ):
            data["courses"] = previous["courses"] + report
    # A no-op retry must retain the original IDs needed to undo this batch.
    if report and (args.apply or not REPORT.exists()):
        REPORT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(
        f"{'Imported' if args.apply else 'Prepared'} {len(report)} courses; {sum(c['lessons'] for c in report)} video lessons",
        flush=True,
    )


async def main(args):
    try:
        DATA.mkdir(parents=True, exist_ok=True)
        async with AsyncSessionLocal() as db:
            groups = await coverage(db, args.minimum)
            used = set((await db.scalars(select(LessonVideos.file_id))).all())
        print(
            f"{len(groups)} groups; {sum(g['missing'] for g in groups)} missing course placements",
            flush=True,
        )
        output = await collect(groups, used, args)
        await import_courses(output, args)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum", type=int, default=6)
    parser.add_argument("--lessons", type=int, default=3)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.minimum < 1 or args.lessons < 1:
        parser.error("Counts must be positive")
    asyncio.run(main(args))
