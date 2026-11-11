# app/services/category_service.py


import datetime
import uuid
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import (
    TEXT,
    UUID,
    and_,
    asc,
    cast,
    func,
    literal,
    literal_column,
    select,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.db.models.database import Categories, Courses, User
from app.db.sesson import get_session
from app.services.catalog import public_course


class CategoryService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def get_categories_async(self, limit_parent: int = 10, limit_child: int = 15):
        try:
            stmt = (
                select(Categories)
                .options(selectinload(Categories.parent_reverse))
                .where(Categories.parent_id.is_(None), Categories.is_onboarding_visible.is_(True))
                .order_by(Categories.order_index)
                .limit(limit_parent)
            )
            result = await self.db.scalars(stmt)
            categories = result.unique().all()

            # sắp xếp và giới hạn con
            for cat in categories:
                cat.parent_reverse.sort(key=lambda x: x.order_index)
                cat.parent_reverse = cat.parent_reverse[:limit_child]

            return categories

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi lấy danh mục: {e}")

    async def get_all_categories_async(self):
        query = select(
            Categories.id,
            Categories.name,
            Categories.slug,
        ).order_by(asc(Categories.name))

        result = await self.db.execute(query)
        data = result.mappings().all()
        return data

    async def get_all_subcategories(self, category_slug: str):
        try:
            category: Categories | None = await self.db.scalar(
                select(Categories).where(Categories.slug == category_slug)
            )
            if category is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
            category_id = category.id
            query = text("SELECT * FROM fn_get_category_tree(:cid)")
            rows = await self.db.execute(query, {"cid": str(category_id)})
            return [r[0] for r in rows.all()]
        except Exception as e:
            raise e

    async def get_categories_with_topics(self):
        try:

            stmt = (
                select(Categories)
                .options(selectinload(Categories.topics))
                .where(Categories.is_onboarding_visible.is_(True))
                .order_by(Categories.order_index.asc(), Categories.name.asc())
            )

            rows = (await self.db.execute(stmt)).scalars().all()

            return [
                {
                    "id": str(cat.id),
                    "name": cat.name,
                    "slug": cat.slug,
                    "parent_id": str(cat.parent_id) if cat.parent_id else None,
                    "topics": [
                        {"id": str(t.id), "name": t.name, "slug": t.slug}
                        for t in cat.topics
                    ],
                }
                for cat in rows
            ]

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi lấy danh mục với chủ đề: {e}")

    # hàm lấy những danh mục liên quan
    async def get_related_categories(self, slug: str):
        try:
            stmt = select(
                literal_column("id"),
                literal_column("name"),
                literal_column("slug"),
                literal_column("parent_id"),
                literal_column("total_courses"),
            ).select_from(func.fn_get_related_categories_by_slug(slug))

            rows = (await self.db.execute(stmt)).mappings().all()

            return [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "slug": r["slug"],
                    "parent_id": str(r["parent_id"]) if r["parent_id"] else None,
                    "total_courses": int(r["total_courses"]),
                }
                for r in rows
            ]

        except Exception as e:
            print("❌ Category related function error:", e)
            raise e

    async def get_related_courses_async(self, user_id: uuid.UUID, category_slug: str):
        try:
            category = await self.db.scalar(
                select(Categories).where(Categories.slug == category_slug)
            )
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found",
                )

            stmt = select(
                literal_column("course_id"),
                literal_column("course_title"),
                literal_column("course_thumbnail"),
                literal_column("instructor_id"),
                literal_column("instructor_name"),
                literal_column("instructor_avatar"),
                literal_column("views"),
                literal_column("enrolls"),
                literal_column("rating"),
                literal_column("score"),
            ).select_from(
                func.fn_related_courses(
                    cast(literal(str(user_id)), UUID),  # ⬅ FIX CHUẨN
                    cast(literal(str(category.id)), UUID),  # ⬅ FIX CHUẨN
                )
            )

            rows = (await self.db.execute(stmt)).mappings().all()
            visible_ids = set((await self.db.scalars(select(Courses.id).where(
                Courses.id.in_([row['course_id'] for row in rows]), public_course()
            ))).all())
            rows = [row for row in rows if row['course_id'] in visible_ids]


            return {
                "items": [
                    {
                        "id": str(r["course_id"]),
                        "title": r["course_title"],
                        "thumbnail": r["course_thumbnail"],
                        "instructor": {
                            "id": str(r["instructor_id"]),
                            "name": r["instructor_name"],
                            "avatar": r["instructor_avatar"],
                        },
                        "views": r["views"],
                        "enrolls": r["enrolls"],
                        "rating": float(r["rating"]),
                        "score": float(r["score"]),
                    }
                    for r in rows
                ]
            }

        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi related courses: {e}")

    async def get_top_instructors(self, category_slug: str):
        # 2) Lấy subtree categories
        category_ids = await self.get_all_subcategories(category_slug)

        # 3) SELECT group by instructor
        stmt = (
            select(
                Courses.instructor_id,
                func.count(Courses.id).label("total_courses"),
                func.sum(func.coalesce(Courses.total_enrolls, 0)).label(
                    "total_enrolls"
                ),
                User.fullname,
                User.avatar,
            )
            .join(User, User.id == Courses.instructor_id)
            .where(
                Courses.category_id.in_(category_ids),
                public_course(),
            )
            .group_by(Courses.instructor_id, User.fullname, User.avatar)
            .order_by(func.sum(func.coalesce(Courses.total_enrolls, 0)).desc())
            .limit(20)
        )

        rows = (await self.db.execute(stmt)).mappings().all()

        return {
            "items": [
                {
                    "instructor_id": str(r["instructor_id"]),
                    "instructor_name": r["fullname"],
                    "instructor_avatar": r["avatar"],
                    "total_courses": r["total_courses"],
                    "total_enrolls": r["total_enrolls"],
                }
                for r in rows
            ]
        }

    async def get_category_courses(
        self, category_slug: str, limit: int = 20, cursor: Optional[str] = None,
        rating: Optional[float] = None, duration: Optional[str] = None,
        level: Optional[str] = None, language: Optional[str] = None,
        sort: str = 'newest', price: Optional[str] = None,
    ):
        from app.schemas.catalog import CatalogFilters
        from app.services.catalog import CatalogService
        category_ids = await self.get_all_subcategories(category_slug)
        conditions = []
        if duration:
            low, high = {'0-1': (0, 3600), '1-3': (3600, 10800), '3-6': (10800, 21600), '6-17': (21600, 61200)}[duration]
            conditions += [Courses.total_length_seconds >= low, Courses.total_length_seconds <= high]
        if level:
            conditions.append(Courses.level == level)
        if language:
            conditions.append(Courses.language == language)
        if price == 'paid':
            conditions.append(Courses.base_price > 0)
        filters = CatalogFilters(limit=limit, cursor=cursor, rating=rating, currency=None,
            max_price=0 if price == 'free' else None,
            sort={'newest': 'newest', 'top_rated': 'rating', 'most_popular': 'popular'}[sort])
        return await CatalogService(self.db).courses(filters, category_ids, conditions,
            scope=f'{duration}:{level}:{language}:{price}')

    async def get_root_and_level1_async(self, slug: str):
        try:
            stmt = select(
                literal_column("id"),
                literal_column("name"),
                literal_column("slug"),
                literal_column("level"),
            ).select_from(
                func.fn_get_root_and_level1_from_slug(
                    cast(literal_column(f"'{slug}'"), TEXT)
                )
            )

            rows = (await self.db.execute(stmt)).mappings().all()

            return {
                "items": [
                    {
                        "id": str(r["id"]),
                        "name": r["name"],
                        "slug": r["slug"],
                        "level": int(r["level"]),
                    }
                    for r in rows
                ]
            }

        except Exception as e:
            await self.db.rollback()
            raise e
