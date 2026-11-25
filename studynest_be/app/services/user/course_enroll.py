import datetime
import uuid
from typing import Optional

from fastapi import Depends, HTTPException
from sqlalchemy import asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embedding import EmbeddingService, get_embedding_service
from app.db.models.catalog import course_grades
from app.db.models.database import (
    Categories,
    CourseEnrollments,
    CourseReviews,
    Courses,
    LearningListCourses,
    LearningLists,
    LessonProgress,
    Lessons,
    User,
)
from app.db.models.learning_paths import (
    BundleOrder,
    BundleOrderLine,
    BundleVersion,
    CourseBundle,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.services.user.learning_menu import (
    gifted_by_avatar_subquery,
    gifted_by_id_subquery,
    gifted_by_name_subquery,
)

VALID_LIST_TONES = {"sky", "rose", "lavender", "vanilla"}
VN_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


class CourseEnrolls:
    def __init__(
        self,
        db: AsyncSession = Depends(get_session),
        embedding: EmbeddingService = Depends(get_embedding_service),
    ):
        self.db = db
        self.embedding = embedding

    async def get_user_courses_async(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        size: int = 10,
        keyword: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        level: Optional[str] = None,
        language: Optional[str] = None,
        sort_by: str = "enrolled_at",
        order: str = "desc",
        archived: bool = False,
        list_id: Optional[uuid.UUID] = None,
        subject_id: Optional[uuid.UUID] = None,
        grade_id: Optional[uuid.UUID] = None,
    ):
        valid_sort_fields = {
            "title": Courses.title,
            "rating_avg": Courses.rating_avg,
            "enrolled_at": CourseEnrollments.enrolled_at,
            "created_at": Courses.created_at,
            "views": Courses.views,
            "progress": func.coalesce(
                func.sum(case((LessonProgress.is_completed.is_(True), 1), else_=0))
                * 100
                / func.greatest(func.count(Lessons.id), 1),
                0,
            ),
        }

        sort_field = valid_sort_fields.get(sort_by, CourseEnrollments.enrolled_at)
        sort_order = desc if order.lower() == "desc" else asc

        archived_filter = (
            CourseEnrollments.archived_at.is_not(None)
            if archived
            else CourseEnrollments.archived_at.is_(None)
        )

        # Kiểm tra tủ sách cá nhân nếu có lọc list_id
        list_course_ids: Optional[list[uuid.UUID]] = None
        if list_id is not None:
            owned_list = await self.db.scalar(
                select(LearningLists.id).where(
                    LearningLists.id == list_id,
                    LearningLists.user_id == user_id,
                )
            )
            if owned_list is None:
                raise HTTPException(404, "Không tìm thấy tủ sách cá nhân này.")
            list_course_ids = list(
                (
                    await self.db.scalars(
                        select(LearningListCourses.course_id).where(
                            LearningListCourses.list_id == list_id
                        )
                    )
                ).all()
            )
            if not list_course_ids:
                archived_count = int(
                    (
                        await self.db.scalar(
                            select(func.count())
                            .select_from(CourseEnrollments)
                            .where(CourseEnrollments.user_id == user_id)
                            .where(CourseEnrollments.archived_at.is_not(None))
                            .where(CourseEnrollments.status == "active")
                        )
                    )
                    or 0
                )
                return {
                    "page": page,
                    "size": size,
                    "total": 0,
                    "archived_count": archived_count,
                    "filters": {
                        "keyword": keyword,
                        "category_id": category_id,
                        "level": level,
                        "language": language,
                        "sort_by": sort_by,
                        "order": order,
                        "archived": archived,
                        "list_id": str(list_id),
                    },
                    "courses": [],
                }

        completed_expr = func.coalesce(
            func.sum(case((LessonProgress.is_completed.is_(True), 1), else_=0)),
            0,
        )
        total_lessons_expr = func.count(Lessons.id)

        query = (
            select(
                Courses.id,
                Courses.title,
                Courses.slug,
                Courses.thumbnail_url,
                Courses.rating_avg,
                Courses.total_length_seconds,
                Courses.level,
                Courses.language,
                Courses.created_at,
                CourseEnrollments.enrolled_at,
                CourseEnrollments.archived_at,
                CourseEnrollments.pinned_at,
                gifted_by_id_subquery(user_id).label("gifted_by_id"),
                gifted_by_name_subquery(user_id).label("gifted_by_name"),
                gifted_by_avatar_subquery(user_id).label("gifted_by_avatar"),
                Categories.name.label("category_name"),
                func.count(func.distinct(CourseReviews.id)).label("review_count"),
                func.coalesce(func.avg(CourseReviews.rating), 0).label("avg_rating"),
                completed_expr.label("completed_lessons"),
                total_lessons_expr.label("total_lessons"),
                (completed_expr * 100 / func.greatest(total_lessons_expr, 1)).label(
                    "progress_percent"
                ),
            )
            .join(CourseEnrollments, CourseEnrollments.course_id == Courses.id)
            .outerjoin(CourseReviews, CourseReviews.course_id == Courses.id)
            .outerjoin(Lessons, Lessons.course_id == Courses.id)
            .outerjoin(
                LessonProgress,
                (LessonProgress.course_id == Courses.id)
                & (LessonProgress.user_id == user_id)
                & (LessonProgress.lesson_id == Lessons.id),
            )
            .outerjoin(Categories, Categories.id == Courses.category_id)
            .where(CourseEnrollments.user_id == user_id)
            .where(archived_filter)
            .where(CourseEnrollments.status == "active")
            .group_by(
                Courses.id,
                Categories.name,
                CourseEnrollments.enrolled_at,
                CourseEnrollments.archived_at,
                CourseEnrollments.pinned_at,
            )
        )

        if list_course_ids is not None:
            query = query.where(Courses.id.in_(list_course_ids))

        if keyword:
            kw = f"%{keyword.lower()}%"
            query = query.where(
                or_(
                    func.lower(Courses.title).ilike(kw),
                    func.lower(Courses.description).ilike(kw),
                    Courses.search_tsv.op("@@")(
                        func.plainto_tsquery("simple", keyword)
                    ),
                )
            )

        if category_id:
            query = query.where(Courses.category_id == category_id)
        if subject_id:
            query = query.where(Courses.subject_id == subject_id)
        if grade_id:
            query = query.where(
                Courses.id.in_(
                    select(course_grades.c.course_id).where(
                        course_grades.c.grade_id == grade_id
                    )
                )
            )
        if level:
            query = query.where(Courses.level == level)
        if language:
            query = query.where(Courses.language == language)

        # Luôn ưu tiên khóa học được Ghim lên đầu danh sách
        query = query.order_by(
            CourseEnrollments.pinned_at.desc().nulls_last(),
            sort_order(sort_field),
        )
        query = query.offset((page - 1) * size).limit(size)

        total_query = (
            select(func.count())
            .select_from(CourseEnrollments)
            .join(Courses, Courses.id == CourseEnrollments.course_id)
            .where(CourseEnrollments.user_id == user_id)
            .where(archived_filter)
            .where(CourseEnrollments.status == "active")
        )
        if list_course_ids is not None:
            total_query = total_query.where(Courses.id.in_(list_course_ids))
        if category_id:
            total_query = total_query.where(Courses.category_id == category_id)
        if subject_id:
            total_query = total_query.where(Courses.subject_id == subject_id)
        if grade_id:
            total_query = total_query.where(
                Courses.id.in_(
                    select(course_grades.c.course_id).where(
                        course_grades.c.grade_id == grade_id
                    )
                )
            )
        if level:
            total_query = total_query.where(Courses.level == level)
        if language:
            total_query = total_query.where(Courses.language == language)

        archived_count_query = (
            select(func.count())
            .select_from(CourseEnrollments)
            .where(CourseEnrollments.user_id == user_id)
            .where(CourseEnrollments.archived_at.is_not(None))
            .where(CourseEnrollments.status == "active")
        )

        result = await self.db.execute(query)
        total = await self.db.scalar(total_query)
        archived_count = await self.db.scalar(archived_count_query)
        rows = result.mappings().all()

        # Batch-load danh sách tủ sách (list_ids) chứa từng khóa học
        course_ids = [r["id"] for r in rows]
        list_ids_by_course: dict[uuid.UUID, list[str]] = {}
        if course_ids:
            lc_rows = (
                await self.db.execute(
                    select(
                        LearningListCourses.course_id,
                        LearningListCourses.list_id,
                    )
                    .join(LearningLists, LearningLists.id == LearningListCourses.list_id)
                    .where(
                        LearningLists.user_id == user_id,
                        LearningListCourses.course_id.in_(course_ids),
                    )
                )
            ).all()
            for cid, lid in lc_rows:
                list_ids_by_course.setdefault(cid, []).append(str(lid))

        courses_payload = []
        for r in rows:
            item = dict(r)
            item["is_pinned"] = item.get("pinned_at") is not None
            item["completed_lessons"] = int(item.get("completed_lessons") or 0)
            item["total_lessons"] = int(item.get("total_lessons") or 0)
            item["list_ids"] = list_ids_by_course.get(r["id"], [])
            courses_payload.append(item)

        return {
            "page": page,
            "size": size,
            "total": int(total or 0),
            "archived_count": int(archived_count or 0),
            "filters": {
                "keyword": keyword,
                "category_id": category_id,
                "level": level,
                "language": language,
                "sort_by": sort_by,
                "order": order,
                "archived": archived,
                "list_id": str(list_id) if list_id else None,
            },
            "courses": courses_payload,
        }

    async def get_learning_cockpit_async(self, user: User) -> dict:
        """Trả dữ liệu tổng hợp cho Cloudy Learning Cockpit trong 1 request."""
        from app.services.user.learning import LearningService

        badges_map = await LearningService._load_qa_user_badges_async(self.db, [user.id])
        gamification = badges_map.get(
            user.id,
            {"level": 1, "current_streak": 0, "equipment": {}},
        )

        # 1) Khóa học Tiếp tục hành trình (ưu tiên khóa truy cập gần nhất hoặc ghim, chưa lưu trữ)
        completed_expr = func.coalesce(
            func.sum(case((LessonProgress.is_completed.is_(True), 1), else_=0)),
            0,
        )
        total_lessons_expr = func.count(Lessons.id)

        continue_row = (
            await self.db.execute(
                select(
                    Courses.id,
                    Courses.title,
                    Courses.slug,
                    Courses.thumbnail_url,
                    Courses.level,
                    CourseEnrollments.pinned_at,
                    CourseEnrollments.last_accessed,
                    CourseEnrollments.enrolled_at,
                    gifted_by_id_subquery(user.id).label("gifted_by_id"),
                    gifted_by_name_subquery(user.id).label("gifted_by_name"),
                    gifted_by_avatar_subquery(user.id).label("gifted_by_avatar"),
                    completed_expr.label("completed_lessons"),
                    total_lessons_expr.label("total_lessons"),
                    (completed_expr * 100 / func.greatest(total_lessons_expr, 1)).label(
                        "progress_percent"
                    ),
                )
                .join(CourseEnrollments, CourseEnrollments.course_id == Courses.id)
                .outerjoin(Lessons, Lessons.course_id == Courses.id)
                .outerjoin(
                    LessonProgress,
                    (LessonProgress.course_id == Courses.id)
                    & (LessonProgress.user_id == user.id)
                    & (LessonProgress.lesson_id == Lessons.id),
                )
                .where(
                    CourseEnrollments.user_id == user.id,
                    CourseEnrollments.status == "active",
                    CourseEnrollments.archived_at.is_(None),
                )
                .group_by(
                    Courses.id,
                    CourseEnrollments.pinned_at,
                    CourseEnrollments.last_accessed,
                    CourseEnrollments.enrolled_at,
                )
                .order_by(
                    CourseEnrollments.pinned_at.desc().nulls_last(),
                    func.coalesce(
                        CourseEnrollments.last_accessed, CourseEnrollments.enrolled_at
                    ).desc(),
                )
                .limit(1)
            )
        ).mappings().first()

        continue_learning = None
        if continue_row is not None:
            # Tìm bài học đang học dở hoặc bài tiếp theo trong khóa
            next_lesson_title = await self.db.scalar(
                select(Lessons.title)
                .outerjoin(
                    LessonProgress,
                    (LessonProgress.lesson_id == Lessons.id)
                    & (LessonProgress.user_id == user.id),
                )
                .where(
                    Lessons.course_id == continue_row["id"],
                    or_(
                        LessonProgress.is_completed.is_(None),
                        LessonProgress.is_completed.is_(False),
                    ),
                )
                .order_by(Lessons.position.asc())
                .limit(1)
            )
            continue_learning = {
                "id": str(continue_row["id"]),
                "title": continue_row["title"],
                "slug": continue_row["slug"],
                "thumbnail_url": continue_row["thumbnail_url"],
                "level": continue_row["level"],
                "is_pinned": continue_row["pinned_at"] is not None,
                "completed_lessons": int(continue_row["completed_lessons"] or 0),
                "total_lessons": int(continue_row["total_lessons"] or 0),
                "progress_percent": int(round(float(continue_row["progress_percent"] or 0))),
                "next_lesson_title": next_lesson_title,
                "gifted_by_id": (
                    str(continue_row["gifted_by_id"])
                    if continue_row["gifted_by_id"]
                    else None
                ),
                "gifted_by_name": continue_row["gifted_by_name"],
                "gifted_by_avatar": continue_row["gifted_by_avatar"],
            }

        # 2) Nhịp học 7 ngày gần nhất (theo giờ Việt Nam UTC+7)
        vn_tz = datetime.timezone(datetime.timedelta(hours=7))
        today_vn = datetime.datetime.now(vn_tz).date()
        start_date = today_vn - datetime.timedelta(days=6)
        start_dt = datetime.datetime.combine(start_date, datetime.time.min, tzinfo=vn_tz)

        progress_timestamps = (
            await self.db.scalars(
                select(LessonProgress.completed_at).where(
                    LessonProgress.user_id == user.id,
                    LessonProgress.is_completed.is_(True),
                    LessonProgress.completed_at.is_not(None),
                    LessonProgress.completed_at >= start_dt,
                )
            )
        ).all()

        day_counts: dict[datetime.date, int] = {}
        for ts in progress_timestamps:
            if ts is None:
                continue
            dt_vn = (
                ts.astimezone(vn_tz)
                if ts.tzinfo is not None
                else ts.replace(tzinfo=datetime.timezone.utc).astimezone(vn_tz)
            )
            d = dt_vn.date()
            day_counts[d] = day_counts.get(d, 0) + 1

        weekly_activity = []
        for offset in range(7):
            d = start_date + datetime.timedelta(days=offset)
            weekly_activity.append(
                {
                    "date": d.isoformat(),
                    "label": VN_WEEKDAYS[d.weekday()],
                    "completed_lessons": day_counts.get(d, 0),
                    "is_today": d == today_vn,
                }
            )

        # 3) Danh sách Tủ sách / Bộ sưu tập cá nhân
        lists_rows = (
            await self.db.scalars(
                select(LearningLists)
                .where(LearningLists.user_id == user.id)
                .order_by(LearningLists.created_at.desc())
            )
        ).all()
        list_ids = [item.id for item in lists_rows]
        courses_by_list: dict[uuid.UUID, list[str]] = {}
        if list_ids:
            rel_rows = (
                await self.db.execute(
                    select(
                        LearningListCourses.list_id,
                        LearningListCourses.course_id,
                    ).where(LearningListCourses.list_id.in_(list_ids))
                )
            ).all()
            for lid, cid in rel_rows:
                courses_by_list.setdefault(lid, []).append(str(cid))

        lists_payload = [
            {
                "id": str(lst.id),
                "name": lst.name,
                "description": lst.description,
                "color_tone": lst.color_tone,
                "course_ids": courses_by_list.get(lst.id, []),
                "course_count": len(courses_by_list.get(lst.id, [])),
            }
            for lst in lists_rows
        ]

        # 4) Nhóm Combo đã mua (BundleOrder + BundleOrderLine + tiến độ từng khóa)
        bundle_order_rows = (
            await self.db.execute(
                select(
                    BundleOrder.id.label("order_id"),
                    BundleOrder.title.label("order_title"),
                    BundleOrder.created_at.label("purchased_at"),
                    BundleVersion.bundle_id.label("bundle_id"),
                    BundleVersion.title.label("version_title"),
                    BundleVersion.subtitle.label("subtitle"),
                    BundleVersion.thumbnail_url.label("thumbnail_url"),
                    CourseBundle.slug.label("slug"),
                )
                .join(BundleVersion, BundleVersion.id == BundleOrder.version_id)
                .join(CourseBundle, CourseBundle.id == BundleVersion.bundle_id)
                .where(BundleOrder.user_id == user.id)
                .order_by(BundleOrder.created_at.desc())
            )
        ).mappings().all()

        owned_bundles = []
        if bundle_order_rows:
            # Gộp theo bundle_id (giữ đơn mới nhất nếu mua lại phiên bản mới)
            seen_bundle_ids: set[uuid.UUID] = set()
            unique_orders = []
            for row in bundle_order_rows:
                bid = row["bundle_id"]
                if bid in seen_bundle_ids:
                    continue
                seen_bundle_ids.add(bid)
                unique_orders.append(row)

            order_ids = [r["order_id"] for r in unique_orders]
            line_rows = (
                await self.db.execute(
                    select(
                        BundleOrderLine.order_id,
                        BundleOrderLine.course_id,
                        BundleOrderLine.title.label("line_title"),
                        Courses.title.label("course_title"),
                        Courses.slug.label("course_slug"),
                        Courses.thumbnail_url.label("course_thumbnail"),
                    )
                    .join(Courses, Courses.id == BundleOrderLine.course_id)
                    .where(BundleOrderLine.order_id.in_(order_ids))
                )
            ).mappings().all()

            all_bundle_course_ids = list({lr["course_id"] for lr in line_rows})
            lessons_total_map: dict[uuid.UUID, int] = {}
            lessons_done_map: dict[uuid.UUID, int] = {}
            if all_bundle_course_ids:
                tot_rows = (
                    await self.db.execute(
                        select(Lessons.course_id, func.count(Lessons.id))
                        .where(Lessons.course_id.in_(all_bundle_course_ids))
                        .group_by(Lessons.course_id)
                    )
                ).all()
                lessons_total_map = {cid: int(cnt or 0) for cid, cnt in tot_rows}

                done_rows = (
                    await self.db.execute(
                        select(LessonProgress.course_id, func.count(LessonProgress.id))
                        .where(
                            LessonProgress.user_id == user.id,
                            LessonProgress.course_id.in_(all_bundle_course_ids),
                            LessonProgress.is_completed.is_(True),
                        )
                        .group_by(LessonProgress.course_id)
                    )
                ).all()
                lessons_done_map = {cid: int(cnt or 0) for cid, cnt in done_rows}

            lines_by_order: dict[uuid.UUID, list[dict]] = {}
            for lr in line_rows:
                cid = lr["course_id"]
                tot = lessons_total_map.get(cid, 0)
                done = lessons_done_map.get(cid, 0)
                pct = int(round((done * 100 / tot))) if tot > 0 else 0
                lines_by_order.setdefault(lr["order_id"], []).append(
                    {
                        "id": str(cid),
                        "title": lr["course_title"] or lr["line_title"],
                        "slug": lr["course_slug"],
                        "thumbnail_url": lr["course_thumbnail"],
                        "completed_lessons": done,
                        "total_lessons": tot,
                        "progress_percent": min(100, pct),
                    }
                )

            for order_row in unique_orders:
                b_courses = lines_by_order.get(order_row["order_id"], [])
                c_count = len(b_courses)
                completed_courses = sum(
                    1 for c in b_courses if c["progress_percent"] >= 100
                )
                avg_pct = (
                    int(round(sum(c["progress_percent"] for c in b_courses) / c_count))
                    if c_count > 0
                    else 0
                )
                owned_bundles.append(
                    {
                        "order_id": str(order_row["order_id"]),
                        "bundle_id": str(order_row["bundle_id"]),
                        "slug": order_row["slug"],
                        "title": order_row["version_title"] or order_row["order_title"],
                        "subtitle": order_row["subtitle"],
                        "thumbnail_url": order_row["thumbnail_url"],
                        "purchased_at": (
                            order_row["purchased_at"].isoformat()
                            if order_row["purchased_at"]
                            else None
                        ),
                        "course_count": c_count,
                        "completed_courses": completed_courses,
                        "progress_percent": min(100, avg_pct),
                        "courses": b_courses,
                    }
                )

        return {
            "user": {
                "id": str(user.id),
                "fullname": user.fullname,
                "avatar": user.avatar,
            },
            "gamification": gamification,
            "continue_learning": continue_learning,
            "weekly_activity": weekly_activity,
            "weekly_total_completed": sum(d["completed_lessons"] for d in weekly_activity),
            "lists": lists_payload,
            "owned_bundles": owned_bundles,
        }

    async def toggle_pin_course_async(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> dict:
        enrollment = await self.db.scalar(
            select(CourseEnrollments).where(
                CourseEnrollments.user_id == user_id,
                CourseEnrollments.course_id == course_id,
                CourseEnrollments.status == "active",
            )
        )
        if enrollment is None:
            raise HTTPException(404, "Bạn chưa đăng ký khóa học này.")

        if enrollment.pinned_at is not None:
            enrollment.pinned_at = None
        else:
            pinned_count = int(
                (
                    await self.db.scalar(
                        select(func.count(CourseEnrollments.id)).where(
                            CourseEnrollments.user_id == user_id,
                            CourseEnrollments.status == "active",
                            CourseEnrollments.pinned_at.is_not(None),
                        )
                    )
                )
                or 0
            )
            if pinned_count >= 6:
                raise HTTPException(
                    400, "Bạn chỉ có thể ghim tối đa 6 khóa học ưu tiên cùng lúc."
                )
            enrollment.pinned_at = get_now()

        await self.db.commit()
        return {"course_id": str(course_id), "is_pinned": enrollment.pinned_at is not None}

    async def create_learning_list_async(
        self,
        user_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
        color_tone: str = "sky",
    ) -> dict:
        clean_name = (name or "").strip()
        if not clean_name:
            raise HTTPException(400, "Tên tủ sách không được để trống.")
        if len(clean_name) > 80:
            raise HTTPException(400, "Tên tủ sách tối đa 80 ký tự.")

        tone = (color_tone or "sky").strip().lower()
        if tone not in VALID_LIST_TONES:
            tone = "sky"

        existing_count = int(
            (
                await self.db.scalar(
                    select(func.count(LearningLists.id)).where(
                        LearningLists.user_id == user_id
                    )
                )
            )
            or 0
        )
        if existing_count >= 12:
            raise HTTPException(400, "Bạn có thể tạo tối đa 12 tủ sách cá nhân.")

        now = get_now()
        new_list = LearningLists(
            user_id=user_id,
            name=clean_name,
            description=(description or "").strip()[:240] or None,
            color_tone=tone,
            created_at=now,
            updated_at=now,
        )
        self.db.add(new_list)
        await self.db.commit()
        await self.db.refresh(new_list)
        return {
            "id": str(new_list.id),
            "name": new_list.name,
            "description": new_list.description,
            "color_tone": new_list.color_tone,
            "course_ids": [],
            "course_count": 0,
        }

    async def delete_learning_list_async(
        self, user_id: uuid.UUID, list_id: uuid.UUID
    ) -> dict:
        item = await self.db.scalar(
            select(LearningLists).where(
                LearningLists.id == list_id,
                LearningLists.user_id == user_id,
            )
        )
        if item is None:
            raise HTTPException(404, "Không tìm thấy tủ sách này.")
        await self.db.delete(item)
        await self.db.commit()
        return {"deleted": True, "id": str(list_id)}

    async def toggle_course_in_list_async(
        self, user_id: uuid.UUID, list_id: uuid.UUID, course_id: uuid.UUID
    ) -> dict:
        owned_list = await self.db.scalar(
            select(LearningLists).where(
                LearningLists.id == list_id,
                LearningLists.user_id == user_id,
            )
        )
        if owned_list is None:
            raise HTTPException(404, "Không tìm thấy tủ sách này.")

        existing = await self.db.scalar(
            select(LearningListCourses).where(
                LearningListCourses.list_id == list_id,
                LearningListCourses.course_id == course_id,
            )
        )
        if existing is not None:
            await self.db.delete(existing)
            in_list = False
        else:
            enrolled = await self.db.scalar(
                select(CourseEnrollments.id).where(
                    CourseEnrollments.user_id == user_id,
                    CourseEnrollments.course_id == course_id,
                    CourseEnrollments.status == "active",
                )
            )
            if enrolled is None:
                raise HTTPException(404, "Bạn chưa sở hữu khóa học này.")
            self.db.add(
                LearningListCourses(
                    list_id=list_id,
                    course_id=course_id,
                    added_at=get_now(),
                )
            )
            in_list = True

        owned_list.updated_at = get_now()
        await self.db.commit()
        return {"list_id": str(list_id), "course_id": str(course_id), "in_list": in_list}
