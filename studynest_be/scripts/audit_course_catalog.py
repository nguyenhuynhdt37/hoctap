"""Read-only six-course coverage report, with full published course metadata."""

import argparse
import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.sesson import AsyncSessionLocal, engine
from scripts.expand_youtube_test_catalog import DATA, coverage

ROOT = DATA.parents[1]


async def main(args):
    try:
        async with AsyncSessionLocal() as db:
            groups = await coverage(db, args.minimum)
            courses = [dict(r) for r in (await db.execute(text("""
    SELECT c.id,c.title,c.slug,c.subtitle,c.description,c.thumbnail_url,s.name subject,
    c.base_price,c.currency,c.language,c.level,c.outcomes,c.requirements,c.target_audience,
    u.fullname curator,
    (SELECT array_agg(g.grade_number ORDER BY g.grade_number) FROM course_grades cg
     JOIN grades g ON g.id=cg.grade_id WHERE cg.course_id=c.id) grades,
    (SELECT count(*) FROM lessons l WHERE l.course_id=c.id) lessons,
    (SELECT coalesce(sum(v.duration),0) FROM lessons l JOIN lesson_videos v ON v.lesson_id=l.id
     WHERE l.course_id=c.id) video_seconds
    FROM courses c JOIN public.user u ON u.id=c.instructor_id
    LEFT JOIN subjects s ON s.id=c.subject_id
    WHERE c.deleted_at IS NULL AND c.is_published AND c.approval_status='approved'
    AND c.slug NOT LIKE 'demo-catalog-%' AND c.slug NOT LIKE 'seed-shop-%' ORDER BY c.title
   """))).mappings()]
        fields = (
            "thumbnail_url",
            "subtitle",
            "description",
            "outcomes",
            "requirements",
            "target_audience",
            "subject",
            "grades",
            "lessons",
        )
        for c in courses:
            c["missing_fields"] = [f for f in fields if not c[f]]
        result = {
            "generated_at": datetime.now(UTC).isoformat(),
            "minimum": args.minimum,
            "published_courses": len(courses),
            "groups": len(groups),
            "groups_meeting_minimum": sum(g["missing"] == 0 for g in groups),
            "missing_placements": sum(g["missing"] for g in groups),
            "courses_missing_information": sum(
                bool(c["missing_fields"]) for c in courses
            ),
            "coverage": groups,
            "courses": courses,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.with_suffix(".json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2, default=str) + "\n"
        )
        lines = [
            "# Kiểm kê khóa học Mây Mây",
            "",
            f"Cập nhật: {result['generated_at']}",
            "",
            f"Mục tiêu: {args.minimum} khóa/môn/lớp. Hiện có {len(courses)} khóa; {result['groups_meeting_minimum']}/{len(groups)} nhóm đạt mục tiêu; còn thiếu {result['missing_placements']} lượt khóa theo môn/lớp.",
            "",
            "Chỉ tính khóa công khai, đã duyệt. Một khóa phù hợp nhiều lớp được tính cho từng lớp. Các tuyển chọn YouTube mới phục vụ test nội bộ, không tuyên bố là khóa đầy đủ của tác giả nguồn.",
            "",
            "| Lớp | Môn | Đang có | Cần thêm |",
            "| --- | --- | ---: | ---: |",
        ]
        for g in groups:
            lines.append(
                f"| {g['grade_number']} | {g['subject']} | {g['course_count']} | {g['missing']} |"
            )
        lines += ["", "## Thông tin đầy đủ từng khóa", ""]
        for c in courses:
            lines += [
                f"### {c['title']}",
                "",
                c["subtitle"] or "",
                "",
                f"- Đường dẫn: `/course/{c['slug']}`",
                f"- Môn: {c['subject']}; lớp: {', '.join(map(str,c['grades'] or []))}.",
                f"- Tài khoản biên tập: {c['curator']} (không đại diện là tác giả video nguồn).",
                f"- Giá: {c['base_price']} {c['currency']}; trình độ: {c['level']}; ngôn ngữ: {c['language']}.",
                f"- Nội dung: {c['lessons']} bài; video: {int(c['video_seconds'])//60} phút {int(c['video_seconds'])%60} giây.",
                f"- Ảnh: {c['thumbnail_url'] or 'Chưa có'}",
                "",
            ]
            for label, key in [
                ("Mục tiêu", "outcomes"),
                ("Yêu cầu", "requirements"),
                ("Đối tượng", "target_audience"),
            ]:
                lines += [f"**{label}**", ""] + [f"- {v}" for v in c[key] or []] + [""]
            lines += ["**Mô tả và nguồn**", "", c["description"] or "", ""]
        args.output.with_suffix(".md").write_text("\n".join(lines) + "\n")
        print(
            json.dumps(
                {k: v for k, v in result.items() if k not in ("coverage", "courses")},
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--minimum", type=int, default=6)
    p.add_argument(
        "--output", type=Path, default=ROOT / "docs/verification/course-catalog-audit"
    )
    asyncio.run(main(p.parse_args()))
