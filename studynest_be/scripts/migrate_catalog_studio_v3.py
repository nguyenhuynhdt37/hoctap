"""Additive migration & rich metadata seed for Mây Mây Curriculum Studio (/admin/catalog)."""

import asyncio
import json

from sqlalchemy import text

from app.db.sesson import AsyncSessionLocal

TAXONOMY_TABLES = (
    "education_levels",
    "grades",
    "subjects",
    "learning_goals",
    "exams",
)

ALTER_STATEMENTS = [
    "ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS icon VARCHAR(64)",
    "ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS color_token VARCHAR(32) NOT NULL DEFAULT 'primary'",
    "ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS tagline VARCHAR(240)",
    "ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false",
    "ALTER TABLE public.{table} ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb",
]

LEVEL_SEEDS = {
    "tieu-hoc": {
        "icon": "School",
        "color_token": "vanilla",
        "tagline": "Khơi mở tư duy nền tảng, niềm vui khám phá từ Lớp 1 đến Lớp 5",
        "is_featured": True,
        "metadata": {"grade_range": "Lớp 1 – 5", "age_range": "6 – 11 tuổi"},
    },
    "thcs": {
        "icon": "BookOpen",
        "color_token": "primary",
        "tagline": "Củng cố kiến thức hệ thống, bứt phá chuyển cấp từ Lớp 6 đến Lớp 9",
        "is_featured": True,
        "metadata": {"grade_range": "Lớp 6 – 9", "age_range": "11 – 15 tuổi"},
    },
    "thpt": {
        "icon": "GraduationCap",
        "color_token": "lavender",
        "tagline": "Chuyên sâu học thuật, chinh phục Tốt nghiệp THPT & Đại học",
        "is_featured": True,
        "metadata": {"grade_range": "Lớp 10 – 12", "age_range": "15 – 18 tuổi"},
    },
}

GRADE_SEEDS = {
    f"lop-{n}": {
        "icon": "Bookmark" if n <= 5 else ("BookMarked" if n <= 9 else "GraduationCap"),
        "color_token": "vanilla" if n <= 5 else ("primary" if n <= 9 else "lavender"),
        "tagline": (
            "Làm quen chữ số, đọc viết & khám phá thế giới quanh em"
            if n == 1
            else (
                "Vững nền tảng chuyển cấp vào THCS"
                if n == 5
                else (
                    "Bứt phá kiến thức trọng tâm thi vào lớp 10"
                    if n == 9
                    else (
                        "Khởi đầu chương trình THPT mới"
                        if n == 10
                        else (
                            "Chặng nước rút Tốt nghiệp THPT & ĐGNL"
                            if n == 12
                            else f"Chương trình chuẩn Bộ GD&ĐT dành cho học sinh Lớp {n}"
                        )
                    )
                )
            )
        ),
        "is_featured": n in (5, 9, 10, 12),
        "metadata": {"milestone": n in (5, 9, 12)},
    }
    for n in range(1, 13)
}

SUBJECT_SEEDS = {
    "toan": {
        "icon": "Calculator",
        "color_token": "primary",
        "tagline": "Tư duy logic, đại số, hình học & giải toán ứng dụng",
        "is_featured": True,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "tieng-viet": {
        "icon": "Feather",
        "color_token": "secondary",
        "tagline": "Đọc hiểu, chính tả, luyện viết văn giàu cảm xúc",
        "is_featured": True,
        "metadata": {"group": "Ngôn ngữ & Xã hội"},
    },
    "ngu-van": {
        "icon": "PenTool",
        "color_token": "secondary",
        "tagline": "Cảm thụ văn học, nghị luận xã hội & diễn đạt sắc bén",
        "is_featured": True,
        "metadata": {"group": "Ngôn ngữ & Xã hội"},
    },
    "tieng-anh": {
        "icon": "Languages",
        "color_token": "info",
        "tagline": "Nghe, nói, đọc, viết & phản xạ giao tiếp chuẩn quốc tế",
        "is_featured": True,
        "metadata": {"group": "Ngoại ngữ"},
    },
    "vat-ly": {
        "icon": "Atom",
        "color_token": "lavender",
        "tagline": "Cơ học, điện từ, sóng ánh sáng & thí nghiệm trực quan",
        "is_featured": True,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "hoa-hoc": {
        "icon": "FlaskConical",
        "color_token": "success",
        "tagline": "Cấu tạo chất, phản ứng vô cơ – hữu cơ & bài tập thực tiễn",
        "is_featured": True,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "sinh-hoc": {
        "icon": "Dna",
        "color_token": "success",
        "tagline": "Tế bào, di truyền, tiến hóa & hệ sinh thái",
        "is_featured": False,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "lich-su": {
        "icon": "Landmark",
        "color_token": "vanilla",
        "tagline": "Dòng chảy lịch sử Việt Nam & thế giới qua tư liệu sinh động",
        "is_featured": False,
        "metadata": {"group": "Khoa học xã hội"},
    },
    "dia-ly": {
        "icon": "Globe",
        "color_token": "info",
        "tagline": "Bản đồ, địa lí tự nhiên, kinh tế – xã hội Việt Nam & toàn cầu",
        "is_featured": False,
        "metadata": {"group": "Khoa học xã hội"},
    },
    "tin-hoc": {
        "icon": "Code2",
        "color_token": "primary",
        "tagline": "Tư duy thuật toán, lập trình & công nghệ số",
        "is_featured": True,
        "metadata": {"group": "Công nghệ"},
    },
    "tin-hoc-cong-nghe": {
        "icon": "Laptop",
        "color_token": "primary",
        "tagline": "Kỹ năng máy tính an toàn & sáng tạo công nghệ tiểu học",
        "is_featured": False,
        "metadata": {"group": "Công nghệ"},
    },
    "khtn": {
        "icon": "Microscope",
        "color_token": "success",
        "tagline": "Tích hợp Vật lí, Hóa học & Sinh học cho học sinh THCS",
        "is_featured": True,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "khoa-hoc": {
        "icon": "Lightbulb",
        "color_token": "vanilla",
        "tagline": "Khám phá hiện tượng tự nhiên & thực hành thí nghiệm vui",
        "is_featured": False,
        "metadata": {"group": "Khoa học tự nhiên"},
    },
    "tu-nhien-xa-hoi": {
        "icon": "Compass",
        "color_token": "vanilla",
        "tagline": "Hiểu bản thân, gia đình, trường học & thiên nhiên quanh em",
        "is_featured": False,
        "metadata": {"group": "Khoa học xã hội"},
    },
    "lich-su-dia-ly": {
        "icon": "Map",
        "color_token": "vanilla",
        "tagline": "Tích hợp Lịch sử & Địa lí theo chương trình GDPT 2018",
        "is_featured": False,
        "metadata": {"group": "Khoa học xã hội"},
    },
}

GOAL_SEEDS = {
    "chuong-trinh": {
        "icon": "BookOpen",
        "color_token": "primary",
        "tagline": "Bám sát SGK chuẩn Bộ GD&ĐT từng tuần học",
        "is_featured": True,
        "metadata": {"stage": 1, "badge_label": "Nền tảng"},
    },
    "lay-lai-goc": {
        "icon": "Heart",
        "color_token": "secondary",
        "tagline": "Lấp lỗ hổng kiến thức căn bản, học chậm mà chắc",
        "is_featured": True,
        "metadata": {"stage": 2, "badge_label": "Củng cố"},
    },
    "chuyen-de": {
        "icon": "Layers",
        "color_token": "info",
        "tagline": "Đào sâu từng mảng kiến thức trọng tâm dễ mất điểm",
        "is_featured": False,
        "metadata": {"stage": 3, "badge_label": "Chuyên sâu"},
    },
    "nang-cao": {
        "icon": "TrendingUp",
        "color_token": "lavender",
        "tagline": "Vận dụng cao, chinh phục điểm 9–10 và đội tuyển",
        "is_featured": True,
        "metadata": {"stage": 4, "badge_label": "Bứt phá"},
    },
    "luyen-thi": {
        "icon": "Target",
        "color_token": "vanilla",
        "tagline": "Tổng ôn, luyện đề chuẩn cấu trúc và tối ưu thời gian",
        "is_featured": True,
        "metadata": {"stage": 5, "badge_label": "Về đích"},
    },
    "ky-nang": {
        "icon": "Zap",
        "color_token": "success",
        "tagline": "Phát triển tư duy phản biện, giao tiếp & tự học chủ động",
        "is_featured": False,
        "metadata": {"stage": 6, "badge_label": "Mở rộng"},
    },
}

EXAM_SEEDS = {
    "vao-lop-10": {
        "icon": "Flag",
        "color_token": "primary",
        "tagline": "Chinh phục kỳ thi tuyển sinh vào lớp 10 công lập & chuyên",
        "is_featured": True,
        "metadata": {"target_month": "Tháng 6 hằng năm", "target_grades": [9], "exam_date": "2027-06-05"},
    },
    "tot-nghiep-thpt": {
        "icon": "GraduationCap",
        "color_token": "lavender",
        "tagline": "Kỳ thi Tốt nghiệp THPT & xét tuyển Đại học toàn quốc",
        "is_featured": True,
        "metadata": {"target_month": "Cuối tháng 6 hằng năm", "target_grades": [12], "exam_date": "2027-06-26"},
    },
    "danh-gia-nang-luc": {
        "icon": "Brain",
        "color_token": "info",
        "tagline": "Đánh giá năng lực ĐHQG Hà Nội (HSA) & ĐHQG TP.HCM (V-ACT)",
        "is_featured": True,
        "metadata": {"target_month": "Tháng 3 – 5 hằng năm", "target_grades": [11, 12], "exam_date": "2027-03-28"},
    },
    "danh-gia-tu-duy": {
        "icon": "Cpu",
        "color_token": "vanilla",
        "tagline": "Kỳ thi Đánh giá tư duy ĐH Bách khoa Hà Nội (TSA)",
        "is_featured": True,
        "metadata": {"target_month": "Tháng 1 – 6 hằng năm", "target_grades": [11, 12], "exam_date": "2027-04-18"},
    },
    "hoc-sinh-gioi": {
        "icon": "Trophy",
        "color_token": "secondary",
        "tagline": "Bồi dưỡng đội tuyển Học sinh giỏi cấp Tỉnh/Thành phố & Quốc gia",
        "is_featured": False,
        "metadata": {"target_month": "Tháng 12 – 3 hằng năm", "target_grades": [9, 10, 11, 12]},
    },
}

TABLE_SEEDS = {
    "education_levels": LEVEL_SEEDS,
    "grades": GRADE_SEEDS,
    "subjects": SUBJECT_SEEDS,
    "learning_goals": GOAL_SEEDS,
    "exams": EXAM_SEEDS,
}


async def run():
    async with AsyncSessionLocal() as db:
        for table in TAXONOMY_TABLES:
            for template in ALTER_STATEMENTS:
                await db.execute(text(template.format(table=table)))
        await db.commit()
        print("OK: Added additive columns to all 5 taxonomy tables.")

        updated_total = 0
        for table, seeds in TABLE_SEEDS.items():
            for code, seed in seeds.items():
                res = await db.execute(
                    text(
                        f"""
                        UPDATE public.{table}
                        SET
                            icon = COALESCE(icon, :icon),
                            color_token = CASE WHEN color_token = 'primary' THEN :color_token ELSE color_token END,
                            tagline = COALESCE(tagline, :tagline),
                            is_featured = CASE WHEN is_featured = false THEN :is_featured ELSE is_featured END,
                            metadata = CASE WHEN metadata = '{{}}'::jsonb THEN CAST(:metadata AS jsonb) ELSE metadata END
                        WHERE code = :code
                        """
                    ),
                    {
                        "code": code,
                        "icon": seed["icon"],
                        "color_token": seed["color_token"],
                        "tagline": seed["tagline"],
                        "is_featured": seed["is_featured"],
                        "metadata": json.dumps(seed["metadata"], ensure_ascii=False),
                    },
                )
                updated_total += res.rowcount or 0
        await db.commit()
        print(f"OK: Seeded rich metadata for {updated_total} taxonomy records.")


if __name__ == "__main__":
    asyncio.run(run())
