"""Idempotent starter catalog; never infer taxonomy for legacy courses.
Sources and optional/compulsory distinction: docs/architecture/education-catalog-v2.md.
"""

import asyncio
import sys
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.db.models.catalog import (
    EducationLevel,
    Exam,
    Grade,
    LearningGoal,
    Subject,
    grade_subjects,
)
from app.db.sesson import AsyncSessionLocal
from sqlalchemy.dialects.postgresql import insert


def identity(code):
    return uuid5(NAMESPACE_URL, "studynest:catalog-v2:" + code)


async def seed(db):
    async def add(model, code, name, **extra):
        row = dict(
            id=identity(model.__tablename__ + ":" + code), code=code, name=name, **extra
        )
        await db.execute(insert(model).values(**row).on_conflict_do_nothing())
        # Code is immutable; resolve pre-existing admin record instead of assuming UUID.
        from sqlalchemy import select

        return await db.scalar(select(model.id).where(model.code == code))

    levels = []
    for index, (code, name) in enumerate(
        [("tieu-hoc", "Tiểu học"), ("thcs", "THCS"), ("thpt", "THPT")], 1
    ):
        levels.append(await add(EducationLevel, code, name, order_index=index))
    grades = {}
    for n in range(1, 13):
        grades[n] = await add(
            Grade,
            f"lop-{n}",
            f"Lớp {n}",
            slug=f"lop-{n}",
            grade_number=n,
            education_level_id=levels[0 if n <= 5 else 1 if n <= 9 else 2],
            order_index=n,
        )
    # Starter offering, not a complete compulsory curriculum or fixed business rule.
    subjects = [
        ("toan", "Toán", range(1, 13)),
        ("tieng-viet", "Tiếng Việt", range(1, 6)),
        ("ngu-van", "Ngữ văn", range(6, 13)),
        ("tieng-anh", "Tiếng Anh", range(1, 13)),
        ("tu-nhien-xa-hoi", "Tự nhiên và Xã hội", range(1, 4)),
        ("khoa-hoc", "Khoa học", range(4, 6)),
        ("tin-hoc-cong-nghe", "Tin học và Công nghệ", range(3, 6)),
        ("khtn", "Khoa học tự nhiên", range(6, 10)),
        ("lich-su-dia-ly", "Lịch sử và Địa lí", range(4, 10)),
        ("tin-hoc", "Tin học", range(6, 13)),
        ("vat-ly", "Vật lí", range(10, 13)),
        ("hoa-hoc", "Hóa học", range(10, 13)),
        ("sinh-hoc", "Sinh học", range(10, 13)),
        ("lich-su", "Lịch sử", range(10, 13)),
        ("dia-ly", "Địa lí", range(10, 13)),
    ]
    for code, name, numbers in subjects:
        subject = await add(Subject, code, name, slug=code)
        for n in numbers:
            await db.execute(
                insert(grade_subjects)
                .values(grade_id=grades[n], subject_id=subject)
                .on_conflict_do_nothing()
            )
    for code, name in [
        ("chuong-trinh", "Học theo chương trình"),
        ("lay-lai-goc", "Lấy lại gốc"),
        ("nang-cao", "Nâng cao"),
        ("chuyen-de", "Học chuyên đề"),
        ("luyen-thi", "Luyện thi"),
        ("ky-nang", "Phát triển kỹ năng"),
    ]:
        await add(LearningGoal, code, name)
    for code, name, kind in [
        ("vao-lop-10", "Tuyển sinh lớp 10", "entrance"),
        ("tot-nghiep-thpt", "Tốt nghiệp THPT", "graduation"),
        ("danh-gia-nang-luc", "Đánh giá năng lực", "aptitude"),
        ("danh-gia-tu-duy", "Đánh giá tư duy", "thinking"),
        ("hoc-sinh-gioi", "Học sinh giỏi", "competition"),
    ]:
        await add(Exam, code, name, exam_type=kind)


async def main():
    async with AsyncSessionLocal() as db:
        await seed(db)
        await db.commit()
    print("Catalog seed completed; legacy courses untouched.")


if __name__ == "__main__":
    asyncio.run(main())
