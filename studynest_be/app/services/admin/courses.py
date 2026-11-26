"""Service Quản lý, Thẩm định & Xem trước Khóa học dành cho Admin."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Depends, HTTPException
from loguru import logger
from sqlalchemy import asc, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.contracts import DigitalContracts
from app.db.models.database import (
    Categories,
    Courses,
    CourseSections,
    LessonCodes,
    LessonFillBlanks,
    LessonFlashcards,
    LessonListening,
    LessonQuizzes,
    LessonResources,
    Lessons,
    LessonSpeaking,
    LessonVideos,
    Topics,
    User,
)
from app.db.sesson import get_session
from app.libs.formats.datetime import now as get_now
from app.schemas.shares.notification import NotificationCreateSchema
from app.services.catalog import CatalogService
from app.services.shares.notification import NotificationService


def _iso(dt: Any) -> str | None:
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)


class AdminCourseService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    # =========================================================================
    # 1. THỐNG KÊ TỔNG HỢP (KPI & SIDEBAR BADGE)
    # =========================================================================
    async def get_stats_async(self) -> dict[str, int]:
        row = (
            await self.db.execute(
                select(
                    func.count(Courses.id).label("total"),
                    func.coalesce(
                        func.sum(
                            case((Courses.approval_status == "pending", 1), else_=0)
                        ),
                        0,
                    ).label("pending"),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (Courses.approval_status == "approved")
                                    & (Courses.is_published.is_(True)),
                                    1,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label("approved_live"),
                    func.coalesce(
                        func.sum(
                            case(
                                (
                                    (Courses.approval_status == "approved")
                                    & (
                                        Courses.is_published.is_(False)
                                        | Courses.is_published.is_(None)
                                    ),
                                    1,
                                ),
                                else_=0,
                            )
                        ),
                        0,
                    ).label("approved_hidden"),
                    func.coalesce(
                        func.sum(
                            case((Courses.approval_status == "rejected", 1), else_=0)
                        ),
                        0,
                    ).label("rejected"),
                    func.coalesce(func.sum(Courses.total_enrolls), 0).label(
                        "total_enrolls"
                    ),
                ).where(Courses.deleted_at.is_(None))
            )
        ).first()

        total_lessons = (
            await self.db.scalar(
                select(func.count(Lessons.id))
                .join(Courses, Courses.id == Lessons.course_id)
                .where(Courses.deleted_at.is_(None))
            )
            or 0
        )

        return {
            "total": int(row.total or 0) if row else 0,
            "pending": int(row.pending or 0) if row else 0,
            "approved_live": int(row.approved_live or 0) if row else 0,
            "approved_hidden": int(row.approved_hidden or 0) if row else 0,
            "rejected": int(row.rejected or 0) if row else 0,
            "total_enrolls": int(row.total_enrolls or 0) if row else 0,
            "total_lessons": int(total_lessons),
        }

    async def _get_master_contracts_map(
        self, instructor_ids: set[uuid.UUID]
    ) -> dict[uuid.UUID, DigitalContracts]:
        if not instructor_ids:
            return {}
        rows = (
            await self.db.scalars(
                select(DigitalContracts)
                .where(
                    DigitalContracts.party_b_user_id.in_(instructor_ids),
                    DigitalContracts.contract_type == "LECTURER_MASTER",
                )
                .order_by(DigitalContracts.created_at.desc())
            )
        ).all()
        result: dict[uuid.UUID, DigitalContracts] = {}
        for c in rows:
            cur = result.get(c.party_b_user_id)
            if cur is None:
                result[c.party_b_user_id] = c
            elif cur.status != "countersigned" and c.status == "countersigned":
                result[c.party_b_user_id] = c
            elif cur.status not in ("countersigned", "signed") and c.status == "signed":
                result[c.party_b_user_id] = c
        return result

    # =========================================================================
    # 2. DANH SÁCH & BỘ LỌC KHÓA HỌC CHO ADMIN
    # =========================================================================
    async def list_courses_async(
        self,
        *,
        status_filter: str | None = None,
        instructor_id: uuid.UUID | None = None,
        level: str | None = None,
        price_type: str | None = None,
        search: str | None = None,
        sort_by: str = "pending_first",
        order: str = "desc",
        page: int = 1,
        size: int = 12,
    ) -> dict[str, Any]:
        summary = await self.get_stats_async()

        stmt = (
            select(Courses)
            .join(User, User.id == Courses.instructor_id)
            .options(
                selectinload(Courses.instructor),
                selectinload(Courses.category),
                selectinload(Courses.topic),
                selectinload(Courses.user),
            )
            .where(Courses.deleted_at.is_(None))
        )

        # Bộ lọc trạng thái chuyên sâu
        if status_filter == "pending":
            stmt = stmt.where(Courses.approval_status == "pending")
        elif status_filter == "approved_live":
            stmt = stmt.where(
                Courses.approval_status == "approved",
                Courses.is_published.is_(True),
            )
        elif status_filter == "approved_hidden":
            stmt = stmt.where(
                Courses.approval_status == "approved",
                or_(
                    Courses.is_published.is_(False),
                    Courses.is_published.is_(None),
                ),
            )
        elif status_filter == "approved":
            stmt = stmt.where(Courses.approval_status == "approved")
        elif status_filter == "rejected":
            stmt = stmt.where(Courses.approval_status == "rejected")

        if instructor_id:
            stmt = stmt.where(Courses.instructor_id == instructor_id)

        if level and level in ("beginner", "intermediate", "advanced", "all"):
            stmt = stmt.where(Courses.level == level)

        if price_type == "free":
            stmt = stmt.where(func.coalesce(Courses.base_price, 0) <= 0)
        elif price_type == "paid":
            stmt = stmt.where(func.coalesce(Courses.base_price, 0) > 0)

        if search and search.strip():
            q = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    Courses.title.ilike(q),
                    Courses.slug.ilike(q),
                    User.fullname.ilike(q),
                    User.email.ilike(q),
                )
            )

        count_subq = stmt.with_only_columns(Courses.id).subquery()
        total_items = (
            await self.db.scalar(select(func.count()).select_from(count_subq)) or 0
        )

        # Sắp xếp
        is_asc = order.lower() == "asc"
        if sort_by == "pending_first":
            priority = case(
                (Courses.approval_status == "pending", 0),
                (Courses.approval_status == "rejected", 1),
                else_=2,
            )
            stmt = stmt.order_by(priority.asc(), Courses.updated_at.desc())
        else:
            sort_map = {
                "created_at": Courses.created_at,
                "updated_at": Courses.updated_at,
                "base_price": Courses.base_price,
                "total_enrolls": Courses.total_enrolls,
                "rating_avg": Courses.rating_avg,
                "views": Courses.views,
                "review_round": Courses.review_round,
            }
            col = sort_map.get(sort_by, Courses.updated_at)
            stmt = stmt.order_by(asc(col) if is_asc else desc(col))

        stmt = stmt.offset((page - 1) * size).limit(size)
        courses = (await self.db.scalars(stmt)).all()

        course_ids = [c.id for c in courses]
        instructor_ids = {c.instructor_id for c in courses if c.instructor_id}

        # Đếm chương & bài học hàng loạt (0 N+1)
        sections_map: dict[uuid.UUID, int] = {}
        lessons_map: dict[uuid.UUID, int] = {}
        if course_ids:
            sec_rows = (
                await self.db.execute(
                    select(CourseSections.course_id, func.count(CourseSections.id))
                    .where(CourseSections.course_id.in_(course_ids))
                    .group_by(CourseSections.course_id)
                )
            ).all()
            sections_map = {cid: int(cnt) for cid, cnt in sec_rows if cid}

            les_rows = (
                await self.db.execute(
                    select(Lessons.course_id, func.count(Lessons.id))
                    .where(Lessons.course_id.in_(course_ids))
                    .group_by(Lessons.course_id)
                )
            ).all()
            lessons_map = {cid: int(cnt) for cid, cnt in les_rows if cid}

        contracts_map = await self._get_master_contracts_map(instructor_ids)

        items: list[dict[str, Any]] = []
        for c in courses:
            inst = c.instructor
            mc = contracts_map.get(c.instructor_id)
            approver = c.user
            items.append(
                {
                    "id": str(c.id),
                    "title": c.title,
                    "slug": c.slug,
                    "subtitle": c.subtitle,
                    "thumbnail_url": c.thumbnail_url,
                    "level": c.level or "all",
                    "language": c.language or "vi",
                    "delivery_type": c.delivery_type or "recorded_video",
                    "base_price": float(c.base_price or 0),
                    "currency": c.currency or "VND",
                    "is_published": bool(c.is_published),
                    "approval_status": c.approval_status or "pending",
                    "approval_note": c.approval_note,
                    "approved_at": _iso(c.approved_at),
                    "review_round": int(c.review_round or 1),
                    "sections_count": sections_map.get(c.id, 0),
                    "lessons_count": lessons_map.get(c.id, 0),
                    "total_length_seconds": int(c.total_length_seconds or 0),
                    "views": int(c.views or 0),
                    "total_enrolls": int(c.total_enrolls or 0),
                    "rating_avg": float(c.rating_avg or 0),
                    "rating_count": int(c.rating_count or 0),
                    "category": (
                        {"id": str(c.category.id), "name": c.category.name}
                        if c.category
                        else None
                    ),
                    "topic": (
                        {"id": str(c.topic.id), "name": c.topic.name}
                        if c.topic
                        else None
                    ),
                    "instructor": {
                        "id": str(inst.id) if inst else str(c.instructor_id),
                        "fullname": inst.fullname if inst else "Giảng viên",
                        "email": inst.email if inst else "",
                        "avatar": inst.avatar if inst else None,
                        "master_contract_status": mc.status if mc else "none",
                        "master_contract_number": mc.contract_number if mc else None,
                    },
                    "approver": (
                        {
                            "id": str(approver.id),
                            "fullname": approver.fullname or approver.email,
                        }
                        if approver
                        else None
                    ),
                    "created_at": _iso(c.created_at),
                    "updated_at": _iso(c.updated_at),
                }
            )

        total_pages = max(1, (total_items + size - 1) // size)
        return {
            "page": page,
            "size": size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "summary": summary,
            "items": items,
        }

    # =========================================================================
    # 3. CHI TIẾT KHÓA HỌC 360° + CÂY CHƯƠNG BÀI + CHECKLIST CHẤT LƯỢNG
    # =========================================================================
    async def get_course_review_detail_async(
        self, course_id: uuid.UUID
    ) -> dict[str, Any]:
        course = await self.db.scalar(
            select(Courses)
            .options(
                selectinload(Courses.instructor),
                selectinload(Courses.category),
                selectinload(Courses.topic),
                selectinload(Courses.user),
                selectinload(Courses.course_sections)
                .selectinload(CourseSections.lessons)
                .options(
                    selectinload(Lessons.lesson_videos),
                    selectinload(Lessons.lesson_resources),
                    selectinload(Lessons.lesson_quizzes),
                    selectinload(Lessons.lesson_codes),
                    selectinload(Lessons.lesson_flashcards),
                    selectinload(Lessons.lesson_listening),
                    selectinload(Lessons.lesson_fill_blank),
                    selectinload(Lessons.lesson_speaking),
                ),
            )
            .where(Courses.id == course_id, Courses.deleted_at.is_(None))
        )
        if not course:
            raise HTTPException(404, "Không tìm thấy khóa học.")

        try:
            education = await CatalogService(self.db).course_taxonomy(course.id)
        except Exception:
            education = None

        contracts_map = await self._get_master_contracts_map({course.instructor_id})
        mc = contracts_map.get(course.instructor_id)
        inst = course.instructor
        approver = course.user

        # Sắp xếp chương & bài học
        sorted_sections = sorted(
            course.course_sections or [], key=lambda s: (s.position or 0)
        )

        sections_payload: list[dict[str, Any]] = []
        total_lessons = 0
        empty_lessons_count = 0
        preview_lessons_count = 0
        computed_duration = 0.0
        lesson_type_counts: dict[str, int] = {}

        for sec in sorted_sections:
            sorted_lessons = sorted(
                sec.lessons or [], key=lambda l: (l.position or 0)
            )
            les_items: list[dict[str, Any]] = []
            for les in sorted_lessons:
                total_lessons += 1
                ltype = (
                    les.lesson_type.value
                    if hasattr(les.lesson_type, "value")
                    else str(les.lesson_type)
                )
                lesson_type_counts[ltype] = lesson_type_counts.get(ltype, 0) + 1
                if les.is_preview:
                    preview_lessons_count += 1

                vid = les.lesson_videos
                dur = float(vid.duration or 0) if vid else 0.0
                if les.lesson_listening and les.lesson_listening.duration_seconds:
                    dur = max(dur, float(les.lesson_listening.duration_seconds))
                if les.lesson_fill_blank and les.lesson_fill_blank.duration_seconds:
                    dur = max(dur, float(les.lesson_fill_blank.duration_seconds))
                computed_duration += dur

                # Xác định bài học đã có nội dung thực hay chưa
                has_content = False
                content_hint = ""
                if ltype == "video":
                    has_content = bool(vid and (vid.video_url or vid.file_id))
                    content_hint = (
                        f"Video · {int(dur // 60)}:{int(dur % 60):02d}"
                        if has_content
                        else "Chưa tải video"
                    )
                elif ltype == "quiz":
                    q_cnt = len(les.lesson_quizzes or [])
                    has_content = q_cnt > 0
                    content_hint = f"{q_cnt} câu hỏi" if has_content else "0 câu hỏi"
                elif ltype == "code":
                    c_cnt = len(les.lesson_codes or [])
                    has_content = c_cnt > 0
                    content_hint = f"{c_cnt} bài code" if has_content else "Chưa tạo đề"
                elif ltype == "flashcard":
                    f_cnt = len(les.lesson_flashcards or [])
                    has_content = f_cnt > 0
                    content_hint = f"{f_cnt} thẻ từ" if has_content else "0 thẻ từ"
                elif ltype == "listening":
                    ll = les.lesson_listening
                    lines_cnt = (
                        len(ll.script_lines)
                        if ll and isinstance(ll.script_lines, list)
                        else 0
                    )
                    has_content = bool(ll and (ll.audio_url or lines_cnt > 0))
                    content_hint = (
                        f"{lines_cnt} thoại" if has_content else "Chưa có hội thoại"
                    )
                elif ltype == "fill_blank":
                    fb = les.lesson_fill_blank
                    b_cnt = (
                        len(fb.blanks) if fb and isinstance(fb.blanks, list) else 0
                    )
                    has_content = bool(fb and fb.prompt_text and b_cnt > 0)
                    content_hint = (
                        f"{b_cnt} chỗ trống" if has_content else "Chưa cấu hình ô trống"
                    )
                elif ltype == "speaking":
                    sp = les.lesson_speaking
                    has_content = bool(sp and sp.scenario.strip())
                    content_hint = "AI Roleplay" if has_content else "Chưa có kịch bản"
                elif ltype == "resource":
                    r_cnt = len(les.lesson_resources or [])
                    has_content = r_cnt > 0 or bool(
                        les.description and les.description.strip()
                    )
                    content_hint = (
                        f"{r_cnt} tài liệu" if r_cnt > 0 else "Tài liệu đính kèm"
                    )
                else:
                    # article / assignment
                    has_content = bool(
                        (les.description and len(les.description.strip()) >= 10)
                        or len(les.lesson_resources or []) > 0
                    )
                    content_hint = "Bài đọc / Bài tập" if has_content else "Nội dung trống"

                if not has_content:
                    empty_lessons_count += 1

                les_items.append(
                    {
                        "id": str(les.id),
                        "title": les.title,
                        "lesson_type": ltype,
                        "position": int(les.position or 0),
                        "is_preview": bool(les.is_preview),
                        "duration_seconds": int(round(dur)),
                        "has_content": has_content,
                        "content_hint": content_hint,
                        "resources_count": len(les.lesson_resources or []),
                    }
                )

            sections_payload.append(
                {
                    "id": str(sec.id),
                    "title": sec.title,
                    "position": int(sec.position or 0),
                    "lessons_count": len(les_items),
                    "lessons": les_items,
                }
            )

        # Checklist thẩm định tự động 6 tiêu chí
        has_cover_and_desc = bool(
            course.thumbnail_url
            and course.description
            and len(course.description.strip()) >= 30
        )
        has_outcomes = bool(course.outcomes and len(course.outcomes) >= 1)
        has_taxonomy = bool(
            course.subject_id or course.provider_id or course.category_id
        )
        has_curriculum = len(sections_payload) >= 1 and total_lessons >= 1
        all_lessons_ready = total_lessons > 0 and empty_lessons_count == 0
        contract_ready = bool(mc and mc.status == "countersigned")

        quality_checks = [
            {
                "key": "cover_and_desc",
                "label": "Ảnh bìa & Mô tả chi tiết khóa học",
                "passed": has_cover_and_desc,
                "detail": (
                    "Đã có ảnh bìa và mô tả đầy đủ"
                    if has_cover_and_desc
                    else "Thiếu ảnh bìa hoặc mô tả quá ngắn (< 30 ký tự)"
                ),
            },
            {
                "key": "outcomes",
                "label": "Mục tiêu đầu ra (Learning Outcomes)",
                "passed": has_outcomes,
                "detail": (
                    f"{len(course.outcomes or [])} mục tiêu học tập"
                    if has_outcomes
                    else "Chưa khai báo mục tiêu đầu ra cho học viên"
                ),
            },
            {
                "key": "taxonomy",
                "label": "Phân loại Môn học / Khối lớp",
                "passed": has_taxonomy,
                "detail": (
                    "Đã gán phân loại học thuật"
                    if has_taxonomy
                    else "Chưa gán môn học hoặc danh mục"
                ),
            },
            {
                "key": "curriculum",
                "label": "Cấu trúc Chương & Bài giảng",
                "passed": has_curriculum,
                "detail": f"{len(sections_payload)} chương · {total_lessons} bài học",
            },
            {
                "key": "lesson_content",
                "label": "Toàn vẹn nội dung từng bài học",
                "passed": all_lessons_ready,
                "detail": (
                    "100% bài học đã có nội dung"
                    if all_lessons_ready
                    else (
                        "Chưa có bài học nào"
                        if total_lessons == 0
                        else f"Còn {empty_lessons_count}/{total_lessons} bài học đang trống nội dung"
                    )
                ),
            },
            {
                "key": "lecturer_contract",
                "label": "Hợp đồng Đối tác PKI của Giảng viên",
                "passed": contract_ready,
                "detail": (
                    f"Đã đồng ký 2 bên ({mc.contract_number})"
                    if contract_ready and mc
                    else "Giảng viên chưa hoàn tất đồng ký Hợp đồng Đối tác"
                ),
            },
        ]
        passed_count = sum(1 for item in quality_checks if item["passed"])

        return {
            "id": str(course.id),
            "title": course.title,
            "slug": course.slug,
            "subtitle": course.subtitle,
            "description": course.description,
            "thumbnail_url": course.thumbnail_url,
            "promo_video_url": course.promo_video_url,
            "level": course.level or "all",
            "language": course.language or "vi",
            "delivery_type": course.delivery_type or "recorded_video",
            "is_lock_lesson": bool(course.is_lock_lesson),
            "base_price": float(course.base_price or 0),
            "currency": course.currency or "VND",
            "is_published": bool(course.is_published),
            "approval_status": course.approval_status or "pending",
            "approval_note": course.approval_note,
            "approved_at": _iso(course.approved_at),
            "review_round": int(course.review_round or 1),
            "outcomes": course.outcomes or [],
            "requirements": course.requirements or [],
            "target_audience": course.target_audience or [],
            "views": int(course.views or 0),
            "total_enrolls": int(course.total_enrolls or 0),
            "rating_avg": float(course.rating_avg or 0),
            "rating_count": int(course.rating_count or 0),
            "total_length_seconds": int(
                course.total_length_seconds or round(computed_duration)
            ),
            "sections_count": len(sections_payload),
            "lessons_count": total_lessons,
            "empty_lessons_count": empty_lessons_count,
            "preview_lessons_count": preview_lessons_count,
            "lesson_type_counts": lesson_type_counts,
            "education": education,
            "category": (
                {"id": str(course.category.id), "name": course.category.name}
                if course.category
                else None
            ),
            "topic": (
                {"id": str(course.topic.id), "name": course.topic.name}
                if course.topic
                else None
            ),
            "instructor": {
                "id": str(inst.id) if inst else str(course.instructor_id),
                "fullname": inst.fullname if inst else "Giảng viên",
                "email": inst.email if inst else "",
                "avatar": inst.avatar if inst else None,
                "bio": inst.bio if inst else None,
                "master_contract_status": mc.status if mc else "none",
                "master_contract_number": mc.contract_number if mc else None,
            },
            "approver": (
                {
                    "id": str(approver.id),
                    "fullname": approver.fullname or approver.email,
                    "email": approver.email,
                }
                if approver
                else None
            ),
            "quality_score": {
                "passed": passed_count,
                "total": len(quality_checks),
                "checks": quality_checks,
            },
            "sections": sections_payload,
            "created_at": _iso(course.created_at),
            "updated_at": _iso(course.updated_at),
        }

    # =========================================================================
    # 4. XEM TRƯỚC CHI TIẾT TỪNG BÀI HỌC (10 ĐỊNH DẠNG) CHO ADMIN
    # =========================================================================
    async def get_lesson_preview_async(
        self, course_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> dict[str, Any]:
        lesson = await self.db.scalar(
            select(Lessons)
            .options(
                selectinload(Lessons.section),
                selectinload(Lessons.lesson_videos),
                selectinload(Lessons.lesson_resources),
                selectinload(Lessons.lesson_quizzes).selectinload(
                    LessonQuizzes.lesson_quiz_options
                ),
                selectinload(Lessons.lesson_codes).options(
                    selectinload(LessonCodes.language),
                    selectinload(LessonCodes.lesson_code_files),
                    selectinload(LessonCodes.lesson_code_testcases),
                ),
                selectinload(Lessons.lesson_flashcards),
                selectinload(Lessons.lesson_listening),
                selectinload(Lessons.lesson_fill_blank),
                selectinload(Lessons.lesson_speaking),
            )
            .where(Lessons.id == lesson_id, Lessons.course_id == course_id)
        )
        if not lesson:
            raise HTTPException(404, "Không tìm thấy bài học trong khóa học này.")

        ltype = (
            lesson.lesson_type.value
            if hasattr(lesson.lesson_type, "value")
            else str(lesson.lesson_type)
        )

        vid = lesson.lesson_videos
        video_data = (
            {
                "video_url": vid.video_url,
                "file_id": vid.file_id,
                "duration": float(vid.duration or 0),
                "source_type": vid.source_type,
                "transcript": vid.transcript,
            }
            if vid
            else None
        )

        resources_data = [
            {
                "id": str(r.id),
                "title": r.title or "Tài liệu đính kèm",
                "url": r.url,
                "resource_type": r.resource_type,
                "file_size": int(r.file_size) if r.file_size is not None else None,
                "mime_type": r.mime_type,
            }
            for r in (lesson.lesson_resources or [])
        ]

        quizzes_data = [
            {
                "id": str(q.id),
                "question": q.question,
                "explanation": q.explanation,
                "difficulty_level": int(q.difficulty_level or 1),
                "created_by": q.created_by,
                "options": [
                    {
                        "id": str(opt.id),
                        "text": opt.text_,
                        "is_correct": bool(opt.is_correct),
                        "feedback": opt.feedback,
                        "position": int(opt.position or 1),
                    }
                    for opt in sorted(
                        q.lesson_quiz_options or [],
                        key=lambda o: (o.position or 0),
                    )
                ],
            }
            for q in (lesson.lesson_quizzes or [])
        ]

        codes_data = []
        for c in lesson.lesson_codes or []:
            starter_or_solution_files = [
                {
                    "id": str(f.id),
                    "filename": f.filename,
                    "content": f.content,
                    "role": (
                        f.role.value if hasattr(f.role, "value") else str(f.role)
                    ),
                    "is_main": bool(f.is_main),
                }
                for f in (c.lesson_code_files or [])
                if (f.role.value if hasattr(f.role, "value") else str(f.role))
                in ("starter", "solution")
            ]
            testcases = [
                {
                    "id": str(tc.id),
                    "input": tc.input,
                    "expected_output": tc.expected_output,
                    "is_sample": bool(tc.is_sample),
                    "order_index": int(tc.order_index or 0),
                }
                for tc in sorted(
                    c.lesson_code_testcases or [],
                    key=lambda t: (t.order_index or 0),
                )
            ]
            codes_data.append(
                {
                    "id": str(c.id),
                    "title": c.title,
                    "description": c.description,
                    "difficulty": c.difficulty or "medium",
                    "time_limit": c.time_limit,
                    "memory_limit": c.memory_limit,
                    "language": (
                        {
                            "name": getattr(c.language, "name", None),
                            "version": getattr(c.language, "version", None),
                        }
                        if c.language
                        else None
                    ),
                    "files": starter_or_solution_files,
                    "testcases": testcases,
                }
            )

        flashcards_data = [
            {
                "id": str(fc.id),
                "front_text": fc.front_text,
                "back_text": fc.back_text,
                "phonetic": fc.phonetic,
                "part_of_speech": fc.part_of_speech,
                "example_sentence": fc.example_sentence,
                "example_translation": fc.example_translation,
                "hint": fc.hint,
                "lang_code": fc.lang_code,
                "audio_url": fc.audio_url,
                "example_audio_url": fc.example_audio_url,
                "difficulty_level": int(fc.difficulty_level or 1),
                "position": int(fc.position or 0),
            }
            for fc in sorted(
                lesson.lesson_flashcards or [], key=lambda x: (x.position or 0)
            )
        ]

        ll = lesson.lesson_listening
        listening_data = (
            {
                "id": str(ll.id),
                "lang_code": ll.lang_code,
                "scenario": ll.scenario,
                "speakers": ll.speakers or [],
                "script_lines": ll.script_lines or [],
                "audio_url": ll.audio_url,
                "duration_seconds": float(ll.duration_seconds or 0),
                "max_plays": int(ll.max_plays or 0),
                "show_transcript_before_submit": bool(
                    ll.show_transcript_before_submit
                ),
                "pass_percent": int(ll.pass_percent or 70),
            }
            if ll
            else None
        )

        fb = lesson.lesson_fill_blank
        fill_blank_data = (
            {
                "id": str(fb.id),
                "lang_code": fb.lang_code,
                "mode": fb.mode,
                "prompt_text": fb.prompt_text,
                "translation": fb.translation,
                "blanks": fb.blanks or [],
                "distractors": fb.distractors or [],
                "audio_url": fb.audio_url,
                "duration_seconds": float(fb.duration_seconds or 0),
                "case_sensitive": bool(fb.case_sensitive),
                "allow_hint": bool(fb.allow_hint),
                "pass_percent": int(fb.pass_percent or 70),
            }
            if fb
            else None
        )

        sp = lesson.lesson_speaking
        speaking_data = (
            {
                "id": str(sp.id),
                "lang_code": sp.lang_code,
                "level": sp.level,
                "scenario": sp.scenario,
                "student_role": sp.student_role,
                "ai_persona": sp.ai_persona or {},
                "missions": sp.missions or [],
                "sample_phrases": sp.sample_phrases or [],
                "max_turns": int(sp.max_turns or 8),
                "pass_percent": int(sp.pass_percent or 70),
                "allow_translation": bool(sp.allow_translation),
                "allow_suggestion": bool(sp.allow_suggestion),
            }
            if sp
            else None
        )

        return {
            "id": str(lesson.id),
            "course_id": str(course_id),
            "section_id": str(lesson.section_id) if lesson.section_id else None,
            "section_title": lesson.section.title if lesson.section else None,
            "title": lesson.title,
            "lesson_type": ltype,
            "position": int(lesson.position or 0),
            "is_preview": bool(lesson.is_preview),
            "description": lesson.description,
            "outcomes": lesson.outcomes or [],
            "prerequisites": lesson.prerequisites or [],
            "video": video_data,
            "resources": resources_data,
            "quizzes": quizzes_data,
            "codes": codes_data,
            "flashcards": flashcards_data,
            "listening": listening_data,
            "fill_blank": fill_blank_data,
            "speaking": speaking_data,
            "updated_at": _iso(lesson.updated_at),
        }

    # =========================================================================
    # 5. PHÊ DUYỆT / YÊU CẦU CHỈNH SỬA / GỠ XUẤT BẢN + THÔNG BÁO REALTIME
    # =========================================================================
    async def review_course_async(
        self,
        course_id: uuid.UUID,
        admin: User,
        *,
        action: str,
        note: str | None = None,
        publish_on_approve: bool = True,
    ) -> dict[str, Any]:
        course = await self.db.scalar(
            select(Courses).where(
                Courses.id == course_id, Courses.deleted_at.is_(None)
            )
        )
        if not course:
            raise HTTPException(404, "Không tìm thấy khóa học.")

        clean_note = (note or "").strip() or None
        now_dt = get_now()

        if action == "approve":
            course.approval_status = "approved"
            course.approved_by = admin.id
            course.approved_at = now_dt
            course.approval_note = clean_note
            if publish_on_approve:
                course.is_published = True
            notif_title = "Khóa học đã được phê duyệt!"
            notif_content = (
                f"Khóa học “{course.title}” đã được Ban Quản Trị phê duyệt"
                + (" và phát hành lên sàn." if course.is_published else ".")
                + (f" Ghi chú: {clean_note}" if clean_note else "")
            )
        elif action == "reject":
            if not clean_note or len(clean_note) < 5:
                raise HTTPException(
                    400,
                    "Vui lòng nhập ghi chú / lý do yêu cầu chỉnh sửa (tối thiểu 5 ký tự) để giảng viên nắm rõ.",
                )
            course.approval_status = "rejected"
            course.approved_by = admin.id
            course.approved_at = now_dt
            course.approval_note = clean_note
            course.is_published = False
            notif_title = "Khóa học cần chỉnh sửa trước khi lên sàn"
            notif_content = (
                f"Khóa học “{course.title}” (Vòng #{course.review_round or 1}) cần bổ sung/chỉnh sửa: "
                f"{clean_note}"
            )
        elif action == "unpublish":
            course.is_published = False
            if clean_note:
                course.approval_note = clean_note
            notif_title = "Khóa học đã tạm gỡ hiển thị công khai"
            notif_content = (
                f"Khóa học “{course.title}” đã được tạm ẩn khỏi danh mục công khai."
                + (f" Lý do: {clean_note}" if clean_note else "")
            )
        elif action == "publish":
            if course.approval_status != "approved":
                raise HTTPException(
                    400,
                    "Chỉ có thể bật hiển thị công khai cho khóa học đã được phê duyệt.",
                )
            course.is_published = True
            notif_title = "Khóa học đã được bật hiển thị công khai"
            notif_content = f"Khóa học “{course.title}” đã hiển thị trở lại trên sàn Mây Mây."
        elif action == "reopen_pending":
            course.approval_status = "pending"
            if clean_note:
                course.approval_note = clean_note
            notif_title = "Khóa học chuyển về trạng thái thẩm định lại"
            notif_content = f"Khóa học “{course.title}” đang được Ban Quản Trị thẩm định lại."
        else:
            raise HTTPException(400, f"Hành động kiểm duyệt không hợp lệ: {action}")

        await self.db.commit()
        await self.db.refresh(course)

        # Gửi thông báo Realtime cho Giảng viên (bọc an toàn không làm gãy giao dịch chính)
        try:
            notif_service = NotificationService(self.db)
            await notif_service.create_notification_async(
                NotificationCreateSchema(
                    user_id=course.instructor_id,
                    title=notif_title,
                    content=notif_content,
                    url=f"/lecturer/courses/{course.id}/edit",
                    type="course",
                    role_target=["LECTURER"],
                    metadata={
                        "course_id": str(course.id),
                        "approval_status": course.approval_status,
                        "is_published": bool(course.is_published),
                    },
                )
            )
        except Exception as exc:
            logger.warning(f"[AdminCourseReview] Không gửi được thông báo WS: {exc}")

        return {
            "id": str(course.id),
            "title": course.title,
            "approval_status": course.approval_status,
            "approval_note": course.approval_note,
            "is_published": bool(course.is_published),
            "approved_at": _iso(course.approved_at),
            "review_round": int(course.review_round or 1),
        }

    async def bulk_review_async(
        self,
        course_ids: list[uuid.UUID],
        admin: User,
        *,
        action: str,
        note: str | None = None,
        publish_on_approve: bool = True,
    ) -> dict[str, Any]:
        if not course_ids:
            raise HTTPException(400, "Danh sách khóa học trống.")
        results = []
        for cid in course_ids:
            res = await self.review_course_async(
                cid,
                admin,
                action=action,
                note=note,
                publish_on_approve=publish_on_approve,
            )
            results.append(res)
        return {"updated_count": len(results), "items": results}
