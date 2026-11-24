"""Personalized K-12 (Lớp 1 → Lớp 12) learning roadmap blueprint & user preference service."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.catalog import Subject
from app.db.models.database import (
    Categories,
    CourseEnrollments,
    Courses,
    LessonProgress,
    Lessons,
    User,
)
from app.db.models.learning_paths import (
    LearningPath,
    PathVersion,
    UserLearningPath,
)


class LearningPreferencesInput(BaseModel):
    grade_level: int = Field(ge=1, le=12)
    learning_track: str = Field(min_length=2, max_length=60)
    focus_subjects: list[str] = Field(default_factory=list, max_length=8)
    goal_mode: str = Field(default="giu-vung", max_length=40)
    daily_goal_minutes: int = Field(default=30, ge=10, le=240)


TIER_DEFINITIONS: dict[str, dict[str, Any]] = {
    "tieu-hoc": {
        "key": "tieu-hoc",
        "label": "Tiểu học",
        "region_name": "Vùng Ươm Mầm",
        "grade_range": "Lớp 1 – 5",
        "grades": [1, 2, 3, 4, 5],
        "tagline": "Xây nền tảng tư duy, đọc hiểu và niềm vui khám phá mỗi ngày",
    },
    "thcs": {
        "key": "thcs",
        "label": "THCS",
        "region_name": "Vùng Khám Phá",
        "grade_range": "Lớp 6 – 9",
        "grades": [6, 7, 8, 9],
        "tagline": "Định hình sở trường môn học và bứt tốc cho kỳ thi vào Lớp 10",
    },
    "thpt": {
        "key": "thpt",
        "label": "THPT",
        "region_name": "Vùng Chinh Phục",
        "grade_range": "Lớp 10 – 12",
        "grades": [10, 11, 12],
        "tagline": "Chuyên sâu tổ hợp mục tiêu, tối ưu điểm số và chinh phục Đại học",
    },
}

TRACK_CATALOG: list[dict[str, Any]] = [
    # Tiểu học (1-5)
    {
        "code": "nen-tang",
        "tier": "tieu-hoc",
        "label": "Vững nền tảng",
        "badge": "Cốt lõi",
        "description": "Chắc Toán – Tiếng Việt – Tiếng Anh, học nhẹ nhàng mà sâu sắc",
        "default_subjects": ["toan", "tieng-viet", "tieng-anh"],
    },
    {
        "code": "kham-pha",
        "tier": "tieu-hoc",
        "label": "Khám phá thế giới",
        "badge": "Tư duy STEM",
        "description": "Kết hợp Toán cùng Khoa học, Tự nhiên & Xã hội, Tin học & Công nghệ",
        "default_subjects": ["toan", "khoa-hoc", "tu-nhien-xa-hoi", "tin-hoc-cong-nghe"],
    },
    {
        "code": "song-ngu",
        "tier": "tieu-hoc",
        "label": "Bứt phá Tiếng Anh",
        "badge": "Song ngữ",
        "description": "Ưu tiên phản xạ Tiếng Anh song song cùng Toán và Tiếng Việt",
        "default_subjects": ["tieng-anh", "toan", "tieng-viet"],
    },
    # THCS (6-9)
    {
        "code": "chuyen-toan-khtn",
        "tier": "thcs",
        "label": "Tư duy Tự nhiên & STEM",
        "badge": "Tự nhiên",
        "description": "Đào sâu Toán, Khoa học tự nhiên và Tin học tạo nền vững cho THPT",
        "default_subjects": ["toan", "khtn", "tin-hoc", "tieng-anh"],
    },
    {
        "code": "chuyen-van-su",
        "tier": "thcs",
        "label": "Ngôn ngữ & Xã hội",
        "badge": "Xã hội",
        "description": "Phát triển tư duy ngôn ngữ, viết luận cùng Ngữ văn, Tiếng Anh và Sử – Địa",
        "default_subjects": ["ngu-van", "tieng-anh", "lich-su-dia-ly"],
    },
    {
        "code": "on-thi-vao-10",
        "tier": "thcs",
        "label": "Bứt tốc vào Lớp 10",
        "badge": "Chuyển cấp",
        "description": "Tập trung 3 môn mũi nhọn Toán – Ngữ văn – Tiếng Anh thi vào 10",
        "default_subjects": ["toan", "ngu-van", "tieng-anh"],
    },
    # THPT (10-12)
    {
        "code": "khoi-a",
        "tier": "thpt",
        "label": "Khối A00 / A01 · Tự nhiên & Công nghệ",
        "badge": "Khối A",
        "description": "Toán, Vật lí kết hợp Hóa học / Tiếng Anh / Tin học cho ngành Kỹ thuật – CNTT",
        "default_subjects": ["toan", "vat-ly", "hoa-hoc", "tieng-anh", "tin-hoc"],
    },
    {
        "code": "khoi-b",
        "tier": "thpt",
        "label": "Khối B00 · Y Dược & Sinh học",
        "badge": "Khối B",
        "description": "Tổ hợp Toán – Hóa học – Sinh học hướng tới Y Dược và Khoa học sự sống",
        "default_subjects": ["toan", "hoa-hoc", "sinh-hoc"],
    },
    {
        "code": "khoi-c",
        "tier": "thpt",
        "label": "Khối C00 · Khoa học Xã hội",
        "badge": "Khối C",
        "description": "Tổ hợp Ngữ văn – Lịch sử – Địa lí cho Luật, Báo chí, Sư phạm & Xã hội",
        "default_subjects": ["ngu-van", "lich-su", "dia-ly"],
    },
    {
        "code": "khoi-d",
        "tier": "thpt",
        "label": "Khối D01 · Ngôn ngữ & Kinh tế",
        "badge": "Khối D",
        "description": "Tổ hợp Toán – Ngữ văn – Tiếng Anh linh hoạt cho Kinh tế, Truyền thông & Ngoại ngữ",
        "default_subjects": ["toan", "ngu-van", "tieng-anh"],
    },
]

GOAL_MODES: list[dict[str, str]] = [
    {
        "code": "giu-vung",
        "label": "Nắm chắc kiến thức lớp",
        "description": "Theo sát chương trình trên trường, không bị hổng bài",
    },
    {
        "code": "but-pha",
        "label": "Bứt phá điểm 8–9+",
        "description": "Luyện dạng bài nâng cao, tối ưu điểm kiểm tra và học kỳ",
    },
    {
        "code": "luyen-thi",
        "label": "Luyện thi chuyển cấp / Đại học",
        "description": "Tập trung trọng tâm đề thi, tốc độ và chiến lược làm bài",
    },
    {
        "code": "mat-goc",
        "label": "Lấy lại căn bản từ đầu",
        "description": "Đi từ kiến thức gốc dễ hiểu, xây lại tự tin từng bước",
    },
]

VALID_GOAL_CODES = {g["code"] for g in GOAL_MODES}
TRACK_BY_CODE = {t["code"]: t for t in TRACK_CATALOG}


def tier_for_grade(grade: int) -> str:
    if grade <= 5:
        return "tieu-hoc"
    if grade <= 9:
        return "thcs"
    return "thpt"


def default_track_for_grade(grade: int) -> dict[str, Any]:
    tier = tier_for_grade(grade)
    if grade in (8, 9):
        return TRACK_BY_CODE["on-thi-vao-10"]
    for t in TRACK_CATALOG:
        if t["tier"] == tier:
            return t
    return TRACK_CATALOG[0]


def _resolve_goal_mode(raw: str | None) -> str:
    if raw and raw in VALID_GOAL_CODES:
        return raw
    return "giu-vung"


class PersonalizedRoadmapService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_preferences(
        self, user: User, data: LearningPreferencesInput
    ) -> dict[str, Any]:
        track = TRACK_BY_CODE.get(data.learning_track)
        tier = tier_for_grade(data.grade_level)
        if not track or track["tier"] != tier:
            track = default_track_for_grade(data.grade_level)

        goal_mode = _resolve_goal_mode(data.goal_mode)
        clean_subjects = [
            s.strip().lower()
            for s in data.focus_subjects
            if isinstance(s, str) and s.strip()
        ]
        if not clean_subjects:
            clean_subjects = list(track["default_subjects"])

        user.grade_level = data.grade_level
        user.learning_track = track["code"]
        user.focus_subjects = clean_subjects
        user.learning_goals = goal_mode
        user.daily_goal_minutes = data.daily_goal_minutes

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return await self.get_blueprint(user, preview_grade=data.grade_level)

    async def get_blueprint(
        self, user: User, preview_grade: int | None = None
    ) -> dict[str, Any]:
        configured_grade = user.grade_level if user.grade_level and 1 <= user.grade_level <= 12 else None
        is_configured = configured_grade is not None
        active_grade = preview_grade or configured_grade or 10
        active_tier = tier_for_grade(active_grade)

        # Xác định nhóm định hướng đang áp dụng cho lớp đang xem
        saved_track = TRACK_BY_CODE.get(user.learning_track or "")
        if saved_track and saved_track["tier"] == active_tier:
            active_track = saved_track
        else:
            active_track = default_track_for_grade(active_grade)

        goal_mode = _resolve_goal_mode(user.learning_goals)
        daily_goal_minutes = int(user.daily_goal_minutes or 30)

        # Môn trọng tâm: nếu đang xem đúng bậc đã lưu thì dùng focus_subjects của user,
        # nếu đang xem trước bậc khác thì lấy default_subjects của track bậc đó
        if saved_track and saved_track["tier"] == active_tier and user.focus_subjects:
            focus_subjects = [s.lower() for s in user.focus_subjects]
        else:
            focus_subjects = list(active_track["default_subjects"])

        # 1) Lấy toàn bộ khóa học published thuộc Lớp 1..12
        grade_slugs = [f"lop-{g}" for g in range(1, 13)]
        courses_rows = (
            await self.db.execute(
                select(
                    Courses.id,
                    Courses.title,
                    Courses.slug,
                    Courses.thumbnail_url.label("thumbnail"),
                    Courses.base_price,
                    Courses.rating_avg,
                    Courses.total_enrolls,
                    Courses.level,
                    Categories.slug.label("grade_slug"),
                    Subject.name.label("subject_name"),
                    Subject.slug.label("subject_slug"),
                )
                .join(Categories, Categories.id == Courses.category_id)
                .outerjoin(Subject, Subject.id == Courses.subject_id)
                .where(
                    Courses.is_published.is_(True),
                    Courses.deleted_at.is_(None),
                    Categories.slug.in_(grade_slugs),
                )
            )
        ).all()

        # 2) Lấy danh sách khóa học user đã ghi danh & tiến độ thực
        enrolled_rows = (
            await self.db.execute(
                select(CourseEnrollments.course_id).where(
                    CourseEnrollments.user_id == user.id
                )
            )
        ).scalars().all()
        enrolled_ids: set[uuid.UUID] = set(enrolled_rows)

        progress_by_course: dict[uuid.UUID, int] = {}
        if enrolled_ids:
            total_lessons_rows = (
                await self.db.execute(
                    select(Lessons.course_id, func.count(Lessons.id))
                    .where(Lessons.course_id.in_(enrolled_ids))
                    .group_by(Lessons.course_id)
                )
            ).all()
            total_lessons_map = {cid: int(cnt or 0) for cid, cnt in total_lessons_rows}

            done_lessons_rows = (
                await self.db.execute(
                    select(Lessons.course_id, func.count(LessonProgress.id))
                    .join(Lessons, Lessons.id == LessonProgress.lesson_id)
                    .where(
                        LessonProgress.user_id == user.id,
                        LessonProgress.is_completed.is_(True),
                        Lessons.course_id.in_(enrolled_ids),
                    )
                    .group_by(Lessons.course_id)
                )
            ).all()
            done_lessons_map = {cid: int(cnt or 0) for cid, cnt in done_lessons_rows}

            for cid in enrolled_ids:
                tot = total_lessons_map.get(cid, 0)
                done = done_lessons_map.get(cid, 0)
                progress_by_course[cid] = int(round((done / tot) * 100)) if tot > 0 else 0

        # 3) Thống kê 12 trạm lớp (Lớp 1 → Lớp 12)
        grade_courses_map: dict[int, list[Any]] = {g: [] for g in range(1, 13)}
        for row in courses_rows:
            try:
                g_num = int(str(row.grade_slug).replace("lop-", ""))
            except ValueError:
                continue
            if 1 <= g_num <= 12:
                grade_courses_map[g_num].append(row)

        grade_map: list[dict[str, Any]] = []
        for g in range(1, 13):
            g_courses = grade_courses_map[g]
            g_enrolled = [c for c in g_courses if c.id in enrolled_ids]
            avg_progress = (
                int(
                    round(
                        sum(progress_by_course.get(c.id, 0) for c in g_enrolled)
                        / len(g_enrolled)
                    )
                )
                if g_enrolled
                else 0
            )
            grade_map.append(
                {
                    "grade": g,
                    "label": f"Lớp {g}",
                    "tier": tier_for_grade(g),
                    "total_courses": len(g_courses),
                    "enrolled_courses": len(g_enrolled),
                    "progress_percent": avg_progress,
                    "is_user_grade": configured_grade == g,
                    "is_active": active_grade == g,
                }
            )

        # 4) Phân tích khóa học của lớp đang xem (active_grade)
        active_rows = grade_courses_map[active_grade]
        available_subjects_dict: dict[str, dict[str, Any]] = {}
        enriched_courses: list[dict[str, Any]] = []
        focus_set = set(focus_subjects)

        for row in active_rows:
            sub_slug = (row.subject_slug or "khac").lower()
            sub_name = row.subject_name or "Tổng hợp"
            if sub_slug not in available_subjects_dict:
                available_subjects_dict[sub_slug] = {
                    "slug": sub_slug,
                    "name": sub_name,
                    "count": 0,
                    "is_focus": sub_slug in focus_set,
                }
            available_subjects_dict[sub_slug]["count"] += 1

            is_enrolled = row.id in enrolled_ids
            prog = progress_by_course.get(row.id, 0) if is_enrolled else 0
            is_focus = sub_slug in focus_set

            if is_enrolled and prog >= 100:
                match_reason = "Đã hoàn thành 100%"
            elif is_enrolled and prog > 0:
                match_reason = f"Đang học · {prog}%"
            elif is_enrolled:
                match_reason = "Đã sở hữu · Sẵn sàng học"
            elif is_focus:
                match_reason = f"Trọng tâm {sub_name} · Lớp {active_grade}"
            else:
                match_reason = f"Mở rộng {sub_name} · Lớp {active_grade}"

            score = (
                (100 if is_enrolled and prog < 100 else 0)
                + (60 if is_focus else 0)
                + (20 if is_enrolled else 0)
                + float(row.rating_avg or 0) * 4.0
                + min(20.0, float(row.total_enrolls or 0) * 0.2)
            )

            enriched_courses.append(
                {
                    "id": str(row.id),
                    "title": row.title,
                    "slug": row.slug,
                    "thumbnail": row.thumbnail,
                    "subject_name": sub_name,
                    "subject_slug": sub_slug,
                    "base_price": float(row.base_price or 0),
                    "rating_avg": round(float(row.rating_avg or 0), 1),
                    "total_enrolls": int(row.total_enrolls or 0),
                    "level": row.level or "all",
                    "is_enrolled": is_enrolled,
                    "progress_percent": prog,
                    "is_focus": is_focus,
                    "match_reason": match_reason,
                    "_score": score,
                }
            )

        enriched_courses.sort(key=lambda c: c["_score"], reverse=True)

        # Chia thành 3 chặng sáng tạo không trùng lặp
        used_ids: set[str] = set()
        stage1_items: list[dict[str, Any]] = []
        stage2_items: list[dict[str, Any]] = []
        stage3_items: list[dict[str, Any]] = []

        # Chặng 1: Khởi động & Xây nền (ưu tiên khóa đang học hoặc top môn trọng tâm đầu tiên)
        for c in enriched_courses:
            if len(stage1_items) >= 4:
                break
            if c["is_enrolled"] or c["is_focus"]:
                stage1_items.append({k: v for k, v in c.items() if k != "_score"})
                used_ids.add(c["id"])

        # Chặng 2: Tăng tốc Môn Trọng Tâm
        for c in enriched_courses:
            if len(stage2_items) >= 4:
                break
            if c["id"] not in used_ids and c["is_focus"]:
                stage2_items.append({k: v for k, v in c.items() if k != "_score"})
                used_ids.add(c["id"])

        # Nếu chặng 2 chưa đủ, lấy thêm khóa chất lượng cao của lớp
        if len(stage2_items) < 4:
            for c in enriched_courses:
                if len(stage2_items) >= 4:
                    break
                if c["id"] not in used_ids:
                    stage2_items.append({k: v for k, v in c.items() if k != "_score"})
                    used_ids.add(c["id"])

        # Chặng 3: Bứt phá & Mở rộng toàn diện
        for c in enriched_courses:
            if len(stage3_items) >= 4:
                break
            if c["id"] not in used_ids:
                stage3_items.append({k: v for k, v in c.items() if k != "_score"})
                used_ids.add(c["id"])

        def stage_progress(items: list[dict[str, Any]]) -> int:
            if not items:
                return 0
            return int(round(sum(i["progress_percent"] for i in items) / len(items)))

        stages = [
            {
                "index": 1,
                "code": "foundation",
                "title": "Chặng 01 · Khởi động & Xây nền chắc",
                "subtitle": f"Bắt đầu với các khóa cốt lõi của Lớp {active_grade} và bài học bạn đang theo dở.",
                "accent": "sky",
                "progress_percent": stage_progress(stage1_items),
                "courses": stage1_items,
            },
            {
                "index": 2,
                "code": "focus",
                "title": f"Chặng 02 · Tăng tốc {active_track['label']}",
                "subtitle": "Tập trung sâu vào các môn trọng tâm theo nhóm định hướng bạn đã chọn.",
                "accent": "lavender",
                "progress_percent": stage_progress(stage2_items),
                "courses": stage2_items,
            },
            {
                "index": 3,
                "code": "mastery",
                "title": "Chặng 03 · Bứt phá & Mở rộng toàn diện",
                "subtitle": f"Hoàn thiện các môn bổ trợ giúp điểm tổng kết Lớp {active_grade} đồng đều.",
                "accent": "vanilla",
                "progress_percent": stage_progress(stage3_items),
                "courses": stage3_items,
            },
        ]

        # 5) Lộ trình tuyển chọn user đang theo dõi (tương thích ngược)
        following_rows = (
            await self.db.execute(
                select(
                    UserLearningPath.version_id,
                    PathVersion.title,
                    LearningPath.slug,
                )
                .join(PathVersion, PathVersion.id == UserLearningPath.version_id)
                .join(LearningPath, LearningPath.id == PathVersion.path_id)
                .where(UserLearningPath.user_id == user.id)
                .order_by(UserLearningPath.started_at.desc())
            )
        ).mappings().all()

        available_subjects = sorted(
            available_subjects_dict.values(),
            key=lambda s: (not s["is_focus"], -s["count"], s["name"]),
        )

        # Tính tổng tiến độ của lớp đang xem
        active_grade_station = grade_map[active_grade - 1]
        goal_obj = next((g for g in GOAL_MODES if g["code"] == goal_mode), GOAL_MODES[0])

        return {
            "profile": {
                "fullname": user.fullname or "Học viên Mây Mây",
                "avatar": user.avatar,
                "is_configured": is_configured,
                "grade_level": configured_grade,
                "learning_track": active_track["code"],
                "learning_track_label": active_track["label"],
                "focus_subjects": focus_subjects,
                "goal_mode": goal_mode,
                "goal_label": goal_obj["label"],
                "daily_goal_minutes": daily_goal_minutes,
            },
            "active_grade": active_grade,
            "active_tier": TIER_DEFINITIONS[active_tier],
            "active_track": active_track,
            "active_grade_stats": active_grade_station,
            "grade_map": grade_map,
            "available_subjects": available_subjects,
            "stages": stages,
            "following_paths": [
                {
                    "version_id": str(r["version_id"]),
                    "title": r["title"],
                    "slug": r["slug"],
                }
                for r in following_rows
            ],
            "catalog": {
                "tiers": list(TIER_DEFINITIONS.values()),
                "tracks": TRACK_CATALOG,
                "goals": GOAL_MODES,
            },
        }
