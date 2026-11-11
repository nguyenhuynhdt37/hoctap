"""Apply the compact K12 category/subject taxonomy after taking a database backup.

Existing non-K12 courses become unpublished archive entries. Lessons, purchases,
enrollments and progress remain intact. No school/class management tables are added.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.sesson import AsyncSessionLocal

LEVELS = [
    ("tieu-hoc", "Tiểu học", range(1, 6)),
    ("thcs", "THCS", range(6, 10)),
    ("thpt", "THPT", range(10, 13)),
]


def identity(kind, slug):
    return str(uuid5(NAMESPACE_URL, f"studynest:k12:{kind}:{slug}"))


def taxonomy():
    categories, topics = [], []
    for position, (slug, name, grades) in enumerate(LEVELS, 1):
        parent = identity("category", slug)
        categories.append(
            {
                "id": parent,
                "name": name,
                "slug": slug,
                "parent_id": None,
                "order_index": position,
                "visible": True,
            }
        )
        for grade in grades:
            grade_slug = f"lop-{grade}"
            category_id = identity("category", grade_slug)
            categories.append(
                {
                    "id": category_id,
                    "name": f"Lớp {grade}",
                    "slug": grade_slug,
                    "parent_id": parent,
                    "order_index": grade,
                    "visible": True,
                }
            )
            subjects = [
                ("toan", "Toán"),
                ("tieng-viet", "Tiếng Việt") if grade <= 5 else ("ngu-van", "Ngữ văn"),
                ("tieng-anh", "Tiếng Anh"),
            ]
            if 6 <= grade <= 9:
                subjects += [
                    ("khtn", "KHTN"),
                    ("lich-su-dia-ly", "Lịch sử & Địa lý"),
                    ("tin-hoc", "Tin học"),
                ]
            elif grade >= 10:
                subjects += [
                    ("vat-ly", "Vật lý"),
                    ("hoa-hoc", "Hóa học"),
                    ("sinh-hoc", "Sinh học"),
                    ("lich-su", "Lịch sử"),
                    ("dia-ly", "Địa lý"),
                    ("tin-hoc", "Tin học"),
                ]
            for index, (subject_slug, subject_name) in enumerate(subjects, 1):
                slug = f"{subject_slug}-{grade_slug}"
                topics.append(
                    {
                        "id": identity("topic", slug),
                        "category_id": category_id,
                        "name": subject_name,
                        "slug": slug,
                        "description": f"{subject_name} lớp {grade}.",
                        "order_index": index,
                    }
                )
    categories.append(
        {
            "id": identity("category", "luu-tru"),
            "name": "Lưu trữ",
            "slug": "luu-tru",
            "parent_id": None,
            "order_index": 99,
            "visible": False,
        }
    )
    return categories, topics


async def main(backup):
    if not backup.is_file() or backup.stat().st_size == 0:
        raise SystemExit("A fresh database backup is required")
    categories, topics = taxonomy()
    category_ids = [c["id"] for c in categories]
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "LOCK TABLE categories, topics, courses, discount_targets IN SHARE ROW EXCLUSIVE MODE"
            )
        )
        counts_before = dict(
            (
                await db.execute(
                    text(
                        "SELECT (SELECT count(*) FROM courses) courses, (SELECT count(*) FROM lessons) lessons, (SELECT count(*) FROM course_enrollments) enrollments, (SELECT count(*) FROM purchase_items) purchases, (SELECT count(*) FROM lesson_progress) progress"
                    )
                )
            )
            .mappings()
            .one()
        )
        old_categories = (
            (
                await db.execute(
                    text(
                        "SELECT id FROM categories WHERE NOT (id=ANY(CAST(:ids AS uuid[])))"
                    ),
                    {"ids": category_ids},
                )
            )
            .scalars()
            .all()
        )
        archive_id = identity("category", "luu-tru")
        # Fail rather than silently broaden a discount that targeted an old category.
        targeted = await db.scalar(
            text(
                "SELECT count(*) FROM discount_targets WHERE category_id=ANY(CAST(:ids AS uuid[]))"
            ),
            {"ids": list(map(str, old_categories))},
        )
        if targeted:
            raise SystemExit(
                "Existing category discounts require explicit remapping before cleanup"
            )
        for c in categories:
            await db.execute(
                text("""INSERT INTO categories(id,name,slug,parent_id,order_index,is_onboarding_visible)
                VALUES(CAST(:id AS uuid),:name,:slug,CAST(:parent_id AS uuid),:order_index,:visible)
                ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,parent_id=EXCLUDED.parent_id,
                    order_index=EXCLUDED.order_index,is_onboarding_visible=EXCLUDED.is_onboarding_visible"""),
                c,
            )
        archive = await db.execute(
            text("""UPDATE courses SET category_id=CAST(:archive AS uuid),topic_id=NULL,
                is_published=false,updated_at=now() WHERE category_id=ANY(CAST(:ids AS uuid[]))"""),
            {"archive": archive_id, "ids": list(map(str, old_categories))},
        )
        await db.execute(
            text(
                "UPDATE courses SET topic_id=NULL WHERE topic_id IN (SELECT id FROM topics WHERE category_id=ANY(CAST(:ids AS uuid[])))"
            ),
            {"ids": list(map(str, old_categories))},
        )
        deleted_topics = await db.execute(
            text("DELETE FROM topics WHERE category_id=ANY(CAST(:ids AS uuid[]))"),
            {"ids": list(map(str, old_categories))},
        )
        await db.execute(
            text("DELETE FROM categories WHERE id=ANY(CAST(:ids AS uuid[]))"),
            {"ids": list(map(str, old_categories))},
        )
        for topic in topics:
            await db.execute(
                text("""INSERT INTO topics(id,category_id,name,slug,description,order_index,is_active)
                VALUES(CAST(:id AS uuid),CAST(:category_id AS uuid),:name,:slug,:description,:order_index,true)
                ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,name=EXCLUDED.name,slug=EXCLUDED.slug,
                    description=EXCLUDED.description,order_index=EXCLUDED.order_index,is_active=true"""),
                topic,
            )
        counts_after = dict(
            (
                await db.execute(
                    text(
                        "SELECT (SELECT count(*) FROM courses) courses, (SELECT count(*) FROM lessons) lessons, (SELECT count(*) FROM course_enrollments) enrollments, (SELECT count(*) FROM purchase_items) purchases, (SELECT count(*) FROM lesson_progress) progress"
                    )
                )
            )
            .mappings()
            .one()
        )
        if counts_before != counts_after:
            raise RuntimeError("Learning or purchase records changed unexpectedly")
        await db.commit()
        report = {
            "visible_categories": 15,
            "levels": 3,
            "grades": 12,
            "subjects": len(topics),
            "archived_courses": archive.rowcount,
            "removed_legacy_categories": len(old_categories),
            "removed_legacy_topics": deleted_topics.rowcount,
            "unchanged_counts": counts_after,
            "backup": str(backup),
        }
        path = backup.parent / "result.json"
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        path.chmod(0o600)
        print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", type=Path, required=True)
    args = parser.parse_args()
    asyncio.run(main(args.backup))
