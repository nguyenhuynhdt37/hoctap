"""Admin-curated immutable paths. Popularity never changes academic ordering."""

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from app.db.models.catalog import Subject
from app.db.models.database import CourseEnrollments, Courses, LessonProgress, Lessons
from app.db.models.learning_paths import (
    CourseProficiency,
    LearningPath,
    PathStage,
    PathVersion,
    ProficiencyFramework,
    ProficiencyLevel,
    StageGroup,
    StageOption,
    UserLearningPath,
)
from app.services.catalog import public_course, record, require_real_course
from app.services.catalog_slugs import create_slugged


class LearningPathService:
    def __init__(self, db):
        self.db = db

    async def frameworks(self):
        frameworks = (
            await self.db.scalars(
                select(ProficiencyFramework)
                .where(ProficiencyFramework.is_active.is_(True))
                .order_by(ProficiencyFramework.name)
            )
        ).all()
        levels = (
            await self.db.scalars(
                select(ProficiencyLevel).order_by(ProficiencyLevel.position)
            )
        ).all()
        return [
            {
                **record(f),
                "levels": [
                    record(level) for level in levels if level.framework_id == f.id
                ],
            }
            for f in frameworks
        ]

    async def create_framework(self, data):
        if not await self.db.get(Subject, data.subject_id):
            raise HTTPException(422, "Môn học không tồn tại")
        if len(set(data.levels)) != len(data.levels) or any(
            not x.strip() or len(x) > 30 for x in data.levels
        ):
            raise HTTPException(422, "Mức trình độ phải duy nhất, dài tối đa 30 ký tự")
        item = ProficiencyFramework(
            code=data.code, name=data.name, subject_id=data.subject_id
        )
        self.db.add(item)
        try:
            await self.db.flush()
            self.db.add_all(
                [
                    ProficiencyLevel(
                        framework_id=item.id, code=value, name=value, position=index
                    )
                    for index, value in enumerate(data.levels, 1)
                ]
            )
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(409, "Mã framework đã tồn tại") from None
        return record(item)

    async def label_course(self, course_id, data, reviewer_id):
        course = await self.db.get(Courses, course_id)
        target = await self.db.get(ProficiencyLevel, data.target_level_id)
        if not course or not target:
            raise HTTPException(422, "Khóa học hoặc trình độ không hợp lệ")
        framework = await self.db.get(ProficiencyFramework, target.framework_id)
        if not framework.is_active or framework.subject_id != course.subject_id:
            raise HTTPException(422, "Framework không khớp môn học")
        if data.entry_level_id:
            entry = await self.db.get(ProficiencyLevel, data.entry_level_id)
            if (
                not entry
                or entry.framework_id != target.framework_id
                or entry.position > target.position
            ):
                raise HTTPException(422, "Trình độ đầu vào không hợp lệ")
        # Existing approved labels referenced by published paths must not be silently changed.
        label = await self.db.scalar(
            select(CourseProficiency).where(
                CourseProficiency.course_id == course_id,
                CourseProficiency.target_level_id == target.id,
            )
        )
        if label and label.status == "approved":
            raise HTTPException(
                409,
                "Nhãn đã duyệt được giữ ổn định; cần quy trình rà soát riêng để thay đổi",
            )
        if label is None:
            label = CourseProficiency(course_id=course_id)
            self.db.add(label)
        for key, value in data.model_dump().items():
            setattr(label, key, value)
        label.reviewed_by = reviewer_id
        await self.db.commit()
        return record(label)

    async def labels(self, course_id):
        return [
            record(r)
            for r in (
                await self.db.scalars(
                    select(CourseProficiency).where(
                        CourseProficiency.course_id == course_id
                    )
                )
            ).all()
        ]

    async def create(self, data, admin_id, version_id=None):
        subject = await self.db.get(Subject, data.subject_id)
        if not subject or not subject.is_active:
            raise HTTPException(422, "Môn học không hoạt động")
        course_ids = {
            course_id
            for stage in data.stages
            for group in stage.groups
            for course_id in group.course_ids
        }
        if (
            sum(
                len(group.course_ids) for stage in data.stages for group in stage.groups
            )
            > 500
        ):
            raise HTTPException(422, "Lộ trình hỗ trợ tối đa 500 lựa chọn khóa")
        courses = (
            await self.db.scalars(select(Courses).where(Courses.id.in_(course_ids)))
        ).all()
        found = {course.id for course in courses}
        if found != course_ids:
            raise HTTPException(422, "Có khóa học không tồn tại")
        for course in courses:
            require_real_course(course)
        level_ids = {
            stage.target_level_id for stage in data.stages if stage.target_level_id
        }
        found_levels = set(
            (
                await self.db.scalars(
                    select(ProficiencyLevel.id).where(
                        ProficiencyLevel.id.in_(level_ids)
                    )
                )
            ).all()
        )
        if level_ids != found_levels:
            raise HTTPException(422, "Trình độ không tồn tại")
        version = None
        if version_id:
            version = await self.db.scalar(
                select(PathVersion)
                .where(PathVersion.id == version_id)
                .with_for_update()
            )
            if not version or version.status != "draft":
                raise HTTPException(
                    409,
                    "Chỉ sửa được bản nháp; hãy tạo phiên bản mới từ bản đã xuất bản",
                )
            if data.path_id and data.path_id != version.path_id:
                raise HTTPException(422, "Lộ trình không khớp bản nháp")
        root_id = version.path_id if version else data.path_id
        if root_id:
            path = await self.db.scalar(
                select(LearningPath).where(LearningPath.id == root_id).with_for_update()
            )
            if not path or path.deleted_at:
                raise HTTPException(404, "Không tìm thấy lộ trình")
            if path.subject_id != data.subject_id:
                raise HTTPException(409, "Không được đổi môn của lộ trình hiện có")
        else:
            path = await create_slugged(
                self.db, LearningPath, data.title, data.slug, subject_id=data.subject_id
            )
        if version:
            stage_ids = select(PathStage.id).where(PathStage.version_id == version.id)
            group_ids = select(StageGroup.id).where(StageGroup.stage_id.in_(stage_ids))
            await self.db.execute(
                delete(StageOption).where(StageOption.group_id.in_(group_ids))
            )
            await self.db.execute(
                delete(StageGroup).where(StageGroup.stage_id.in_(stage_ids))
            )
            await self.db.execute(
                delete(PathStage).where(PathStage.version_id == version.id)
            )
            version.title = data.title
            version.description = data.description
        else:
            number = (
                await self.db.scalar(
                    select(func.max(PathVersion.version)).where(
                        PathVersion.path_id == path.id
                    )
                )
                or 0
            ) + 1
            version = PathVersion(
                path_id=path.id,
                version=number,
                title=data.title,
                description=data.description,
                status="draft",
                created_by=admin_id,
            )
            self.db.add(version)
        await self.db.flush()
        ids = set()
        for position, stage in enumerate(data.stages, 1):
            row = PathStage(
                version_id=version.id,
                title=stage.title,
                description=stage.description,
                position=position,
                target_level_id=stage.target_level_id,
            )
            self.db.add(row)
            await self.db.flush()
            for index, group in enumerate(stage.groups, 1):
                if len(group.course_ids) != len(set(group.course_ids)):
                    raise HTTPException(422, "Khóa học bị lặp trong cùng học phần")
                item = StageGroup(stage_id=row.id, title=group.title, position=index)
                self.db.add(item)
                await self.db.flush()
                for order, course_id in enumerate(group.course_ids, 1):
                    self.db.add(
                        StageOption(
                            group_id=item.id, course_id=course_id, position=order
                        )
                    )
                    ids.add(course_id)
        found = set(
            (await self.db.scalars(select(Courses.id).where(Courses.id.in_(ids)))).all()
        )
        if found != ids:
            raise HTTPException(422, "Có khóa học không tồn tại")
        for stage in data.stages:
            if stage.target_level_id and not await self.db.get(
                ProficiencyLevel, stage.target_level_id
            ):
                raise HTTPException(422, "Trình độ không tồn tại")
        await self.db.commit()
        return await self.detail(version.id, admin=True)

    async def listing(
        self,
        admin=False,
        page=1,
        limit=12,
        keyword="",
        status=None,
        active=None,
        history_id=None,
    ):
        stmt = (
            select(PathVersion, LearningPath.slug, LearningPath.is_active)
            .join(LearningPath, LearningPath.id == PathVersion.path_id)
            .where(LearningPath.deleted_at.is_(None))
        )
        latest_stmt = select(
            PathVersion.path_id, func.max(PathVersion.version).label("number")
        )
        if not admin:
            latest_stmt = latest_stmt.where(PathVersion.status == "published")
        if not history_id:
            latest = latest_stmt.group_by(PathVersion.path_id).subquery()
            stmt = stmt.join(
                latest,
                (latest.c.path_id == PathVersion.path_id)
                & (latest.c.number == PathVersion.version),
            )
        else:
            stmt = stmt.where(LearningPath.id == history_id)
        if not admin:
            stmt = stmt.where(LearningPath.is_active.is_(True))
        if keyword:
            stmt = stmt.where(PathVersion.title.ilike("%" + keyword + "%"))
        if status:
            stmt = stmt.where(PathVersion.status == status)
        if active is not None:
            stmt = stmt.where(LearningPath.is_active == active)
        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = (
            await self.db.execute(
                stmt.order_by(PathVersion.title, PathVersion.version.desc())
                .offset((page - 1) * limit)
                .limit(limit)
            )
        ).all()
        return {
            "items": [
                {**record(v), "slug": slug, "is_active": visible}
                for v, slug, visible in rows
            ],
            "total": total,
            "page": page,
            "limit": limit,
        }

    async def by_slug(self, slug, user_id=None):
        version = await self.db.scalar(
            select(PathVersion)
            .join(LearningPath, LearningPath.id == PathVersion.path_id)
            .where(
                LearningPath.slug == slug,
                LearningPath.is_active.is_(True),
                LearningPath.deleted_at.is_(None),
                PathVersion.status == "published",
            )
            .order_by(PathVersion.version.desc())
            .limit(1)
        )
        if not version:
            raise HTTPException(404, "Không tìm thấy lộ trình")
        return await self.detail(version.id, user_id=user_id)

    async def detail(self, version_id, admin=False, user_id=None):
        version = await self.db.get(PathVersion, version_id)
        if not version:
            raise HTTPException(404, "Không tìm thấy lộ trình")
        root = await self.db.get(LearningPath, version.path_id)
        following = (
            await self.db.scalar(
                select(UserLearningPath.id).where(
                    UserLearningPath.user_id == user_id,
                    UserLearningPath.version_id == version.id,
                )
            )
            if user_id
            else None
        )
        if root.deleted_at and (admin or not following):
            raise HTTPException(404, "Lộ trình đã lưu trữ")
        if not admin and (
            version.status != "published" or (not root.is_active and not following)
        ):
            raise HTTPException(404, "Không tìm thấy lộ trình")
        stages = (
            await self.db.scalars(
                select(PathStage)
                .where(PathStage.version_id == version.id)
                .order_by(PathStage.position)
            )
        ).all()
        groups = (
            await self.db.scalars(
                select(StageGroup)
                .where(StageGroup.stage_id.in_([s.id for s in stages]))
                .order_by(StageGroup.position)
            )
        ).all()
        rows = (
            await self.db.execute(
                select(StageOption, Courses)
                .join(Courses, Courses.id == StageOption.course_id)
                .where(StageOption.group_id.in_([g.id for g in groups]))
                .order_by(StageOption.position)
            )
        ).all()
        visible = set(
            (
                await self.db.scalars(
                    select(Courses.id).where(
                        Courses.id.in_([c.id for _, c in rows]), public_course()
                    )
                )
            ).all()
        )
        owned = (
            set(
                (
                    await self.db.scalars(
                        select(CourseEnrollments.course_id).where(
                            CourseEnrollments.user_id == user_id,
                            CourseEnrollments.status == "active",
                        )
                    )
                ).all()
            )
            if user_id
            else set()
        )
        completed = set()
        if user_id:
            lesson_counts = (
                select(Lessons.course_id, func.count(Lessons.id).label("total"))
                .group_by(Lessons.course_id)
                .subquery()
            )
            done = (
                select(
                    LessonProgress.course_id,
                    func.count(func.distinct(LessonProgress.lesson_id)).label("done"),
                )
                .join(
                    Lessons,
                    (Lessons.id == LessonProgress.lesson_id)
                    & (Lessons.course_id == LessonProgress.course_id),
                )
                .where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.is_completed.is_(True),
                )
                .group_by(LessonProgress.course_id)
                .subquery()
            )
            completed = (
                set(
                    (
                        await self.db.scalars(
                            select(lesson_counts.c.course_id)
                            .join(done, done.c.course_id == lesson_counts.c.course_id)
                            .where(
                                lesson_counts.c.total > 0,
                                done.c.done >= lesson_counts.c.total,
                            )
                        )
                    ).all()
                )
                & owned
            )
        group_data = {}
        for group in groups:
            options = []
            for option, course in rows:
                if option.group_id != group.id:
                    continue
                accessible = course.id in visible or course.id in owned or admin
                if not accessible:
                    options.append(
                        {
                            "course_id": course.id,
                            "title": "Khóa học đang ngừng nhận đăng ký",
                            "available": False,
                            "owned": False,
                            "completed": False,
                        }
                    )
                    continue
                options.append(
                    {
                        "course_id": course.id,
                        "title": course.title,
                        "slug": course.slug,
                        "thumbnail": course.thumbnail_url,
                        "base_price": str(course.base_price or 0),
                        "currency": course.currency,
                        "available": course.id in visible,
                        "owned": course.id in owned,
                        "completed": course.id in completed,
                    }
                )
            group_data[group.id] = {
                **record(group),
                "options": options,
                "completed": any(o["completed"] for o in options),
            }
        result = []
        for stage in stages:
            items = [group_data[g.id] for g in groups if g.stage_id == stage.id]
            result.append(
                {
                    **record(stage),
                    "groups": items,
                    "completed": bool(items) and all(g["completed"] for g in items),
                }
            )
        return {
            **record(version),
            "is_active": root.is_active,
            "slug": root.slug,
            "subject_id": root.subject_id,
            "stages": result,
            "following": bool(following),
            "completed_stages": sum(s["completed"] for s in result),
            "completion_note": "Tiến độ nội dung, không xác nhận đạt chứng chỉ hoặc trình độ.",
        }

    async def publish(self, version_id):
        version = await self.db.scalar(
            select(PathVersion).where(PathVersion.id == version_id).with_for_update()
        )
        if not version or version.status != "draft":
            raise HTTPException(409, "Chỉ có thể xuất bản bản nháp")
        root = await self.db.scalar(
            select(LearningPath)
            .where(LearningPath.id == version.path_id)
            .with_for_update()
        )
        if not root or root.deleted_at:
            raise HTTPException(404, "Lộ trình đã lưu trữ")
        latest_published = await self.db.scalar(
            select(func.max(PathVersion.version)).where(
                PathVersion.path_id == root.id, PathVersion.status == "published"
            )
        )
        if latest_published is not None and latest_published >= version.version:
            raise HTTPException(
                409, "Đã có bản xuất bản mới hơn; hãy tạo phiên bản mới từ bản hiện tại"
            )
        detail = await self.detail(version.id, admin=True)
        if len(version.description.strip()) < 20:
            raise HTTPException(
                422, "Cần giới thiệu lộ trình ít nhất 20 ký tự trước khi xuất bản"
            )
        if not detail["stages"] or any(
            not s["groups"] or any(not g["options"] for g in s["groups"])
            for s in detail["stages"]
        ):
            raise HTTPException(422, "Lộ trình cần chặng và học phần")
        last_position = -1
        framework_id = None
        for stage in detail["stages"]:
            if stage["target_level_id"]:
                level = await self.db.get(ProficiencyLevel, stage["target_level_id"])
                framework = await self.db.get(ProficiencyFramework, level.framework_id)
                if (
                    not framework.is_active
                    or framework.subject_id != root.subject_id
                    or (framework_id and framework_id != framework.id)
                    or level.position < last_position
                ):
                    raise HTTPException(
                        422, "Thứ tự hoặc framework trình độ không hợp lệ"
                    )
                last_position = level.position
                framework_id = framework.id
            for group in stage["groups"]:
                for option in group["options"]:
                    course = await self.db.get(Courses, option["course_id"])
                    if not option["available"] or course.subject_id != root.subject_id:
                        raise HTTPException(422, "Khóa học phải công khai và đúng môn")
                    if stage["target_level_id"]:
                        approved = await self.db.scalar(
                            select(CourseProficiency.id).where(
                                CourseProficiency.course_id == course.id,
                                CourseProficiency.target_level_id
                                == stage["target_level_id"],
                                CourseProficiency.status == "approved",
                            )
                        )
                        if not approved:
                            raise HTTPException(
                                422, "Khóa học cần nhãn trình độ đã duyệt cho chặng này"
                            )
        version.status = "published"
        version.published_at = datetime.now(UTC)
        await self.db.commit()
        return await self.detail(version.id, admin=True)

    async def follow(self, version_id, user_id):
        await self.detail(version_id, user_id=user_id)
        from sqlalchemy.dialects.postgresql import insert

        await self.db.execute(
            insert(UserLearningPath)
            .values(user_id=user_id, version_id=version_id)
            .on_conflict_do_nothing(index_elements=["user_id", "version_id"])
        )
        await self.db.commit()
        return await self.detail(version_id, user_id=user_id)
