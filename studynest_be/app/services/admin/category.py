import uuid
from operator import or_
from typing import Any

from fastapi import Depends, HTTPException
from sqlalchemy import asc, case, delete, desc, func, outerjoin, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.database import Categories, Courses, Topics, DiscountTargets
from app.db.sesson import get_session
from app.services.catalog_slugs import create_slugged
from app.schemas.admin.category import CreateCategory, UpdateCategory


class CategoryService:
    def __init__(self, db: AsyncSession = Depends(get_session)):
        self.db = db

    async def get_categories_paginated_async(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        parent_id: str | None = None,
        sort_by: str = "order_index",  # name | course_count | created_at
        sort_order: str = "asc",  # asc | desc
        level: int | None = None,  # 0 | 1 | 2 (độ sâu thật)
    ):
        try:
            offset = (page - 1) * page_size

            # 1) Map cột sort
            # Lưu ý: vì có aggregate, dùng func min/ count cho an toàn khi group_by
            sort_map = {
                "name": Categories.name,
                "order_index": Categories.order_index,
                "course_count": func.count(Courses.id),
                "created_at": func.min(Courses.created_at),
            }
            sort_column = sort_map.get(sort_by, Categories.order_index)
            sort_func = asc if sort_order.lower() == "asc" else desc

            # 2) CTE bậc theo độ sâu
            level0 = (
                select(Categories.id)
                .where(Categories.parent_id.is_(None))
                .cte("level0")
            )
            level1 = (
                select(Categories.id)
                .where(Categories.parent_id.in_(select(level0.c.id)))
                .cte("level1")
            )
            # level2 = parent là id của level1 (không ràng child_count)
            # (nếu bạn muốn hỗ trợ sâu hơn thì build tiếp level3 bằng parent in level2)
            # Ở đây dùng trực tiếp khi filter

            # 3) Base query (join Courses để đếm)
            stmt = (
                select(
                    Categories.id,
                    Categories.name,
                    Categories.slug,
                    Categories.parent_id,
                    Categories.order_index,
                    func.count(Courses.id).label("course_count"),
                )
                .select_from(
                    outerjoin(Categories, Courses, Categories.id == Courses.category_id)
                )
                .group_by(Categories.id)
            )

            # 4) Tìm kiếm
            if search:
                search_term = f"%{search.lower()}%"
                stmt = stmt.where(
                    func.lower(Categories.name).like(search_term)
                    | func.lower(Categories.slug).like(search_term)
                )

            # 5) Filter theo level (độ sâu thật)
            if level is not None:
                if level == 0:
                    stmt = stmt.where(Categories.id.in_(select(level0.c.id)))
                elif level == 1:
                    stmt = stmt.where(Categories.id.in_(select(level1.c.id)))
                elif level == 2:
                    stmt = stmt.where(Categories.parent_id.in_(select(level1.c.id)))
                else:
                    raise HTTPException(
                        status_code=400, detail="Level không hợp lệ (chỉ 0, 1, 2)."
                    )

            # 6) Filter theo parent_id (nếu truyền)
            if parent_id:
                stmt = stmt.where(Categories.parent_id == parent_id)

            # 7) Đếm tổng
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = await self.db.scalar(count_stmt)

            # 8) Sắp xếp + phân trang
            stmt = stmt.order_by(sort_func(sort_column)).offset(offset).limit(page_size)

            # 9) Thực thi
            result = await self.db.execute(stmt)
            rows = result.all()

            # 10) Trả kết quả
            return {
                "items": [
                    {
                        "id": str(row.id),
                        "name": row.name,
                        "slug": row.slug,
                        "parent_id": str(row.parent_id) if row.parent_id else None,
                        "order_index": row.order_index or 0,
                        "course_count": int(row.course_count or 0),
                        "direct_course_count_all_statuses": int(row.course_count or 0),
                    }
                    for row in rows
                ],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_items": int(total or 0),
                    "total_pages": int(((total or 0) + page_size - 1) // page_size),
                },
            }

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh mục: {e}")

    async def get_parent_and_second_level_categories(self):

        parent_ids_subq = (
            select(Categories.id).where(Categories.parent_id.is_(None)).subquery()
        )

        stmt = (
            select(Categories)
            .where(
                or_(
                    Categories.parent_id.is_(None),  # cấp 0
                    Categories.parent_id.in_(select(parent_ids_subq.c.id)),  # cấp 1
                )
            )
            .order_by(
                case((Categories.parent_id.is_(None), 0), else_=1),
                asc(Categories.order_index),
            )
        )

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update_category_async(
        self, category_id: uuid.UUID, schema: UpdateCategory
    ):
        """
        ✅ Cập nhật danh mục (đổi tên + đổi parent + chèn vào vị trí mong muốn)
        - Nếu chỉ đổi tên → giữ nguyên thứ tự
        - Nếu đổi parent_id → đưa sang nhóm mới
        - Nếu có order_index đầu vào → chèn đúng vị trí, dịch các phần tử sau +1
        """
        try:
            category = await self.db.scalar(
                select(Categories).where(Categories.id == category_id)
            )
            if not category:
                raise HTTPException(404, "Không tìm thấy danh mục")

            if 'name' in schema.model_fields_set and (schema.name is None or not schema.name.strip()):
                raise HTTPException(422, 'Tên danh mục không được trống')
            if 'order_index' in schema.model_fields_set and schema.order_index is None:
                raise HTTPException(422, 'Thứ tự không được null')
            old_parent_id = category.parent_id
            old_order_index = category.order_index
            await self.db.execute(text('LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE'))
            new_parent_id = schema.parent_id if 'parent_id' in schema.model_fields_set else old_parent_id
            await self._validate_tree(category_id, new_parent_id)
            new_index = getattr(schema, "order_index", None)

            # 1️⃣ Kiểm tra cha hợp lệ
            if new_parent_id and new_parent_id == category_id:
                raise HTTPException(400, "Danh mục không thể là cha của chính nó")

            if new_parent_id:
                parent_exists = await self.db.scalar(
                    select(Categories.id).where(Categories.id == new_parent_id)
                )
                if not parent_exists:
                    raise HTTPException(400, "Danh mục cha không hợp lệ")

            # 2️⃣ Nếu đổi parent_id → normalize nhóm cũ
            if new_parent_id != old_parent_id:
                await self.db.execute(
                    update(Categories)
                    .where(
                        Categories.parent_id == old_parent_id,
                        Categories.order_index > old_order_index,
                    )
                    .values(order_index=Categories.order_index - 1)
                )

            # 3️⃣ Tính toán order_index mới
            if new_parent_id != old_parent_id:
                # 🔹 Nếu có order_index đầu vào → chèn vào vị trí đó
                if new_index is not None:
                    # Dịch phần tử sau index lên +1
                    await self.db.execute(
                        update(Categories)
                        .where(
                            Categories.parent_id == new_parent_id,
                            Categories.order_index >= new_index,
                        )
                        .values(order_index=Categories.order_index + 1)
                    )
                    new_order_index = new_index
                else:
                    # 🔹 Nếu không có → cho xuống cuối nhóm
                    result = await self.db.scalar(
                        select(func.max(Categories.order_index)).where(
                            Categories.parent_id == new_parent_id
                        )
                    )
                    new_order_index = (result if result is not None else -1) + 1
            else:
                # ✅ Cùng nhóm cũ
                new_order_index = old_order_index
                if new_index is not None and new_index != old_order_index:
                    # Dịch chuyển trong cùng nhóm
                    if new_index > old_order_index:
                        # Kéo xuống → dồn lên
                        await self.db.execute(
                            update(Categories)
                            .where(
                                Categories.parent_id == old_parent_id,
                                Categories.order_index > old_order_index,
                                Categories.order_index <= new_index,
                            )
                            .values(order_index=Categories.order_index - 1)
                        )
                    else:
                        # Kéo lên → dồn xuống
                        await self.db.execute(
                            update(Categories)
                            .where(
                                Categories.parent_id == old_parent_id,
                                Categories.order_index < old_order_index,
                                Categories.order_index >= new_index,
                            )
                            .values(order_index=Categories.order_index + 1)
                        )
                    new_order_index = new_index

            # 4️⃣ Chuẩn bị dữ liệu update
            slug = category.slug
            update_data: dict[str, Any] = {
                "name": schema.name.strip() if schema.name is not None else category.name,
                "slug": slug,
                "parent_id": new_parent_id,
                "order_index": new_order_index,
            }

            # 5️⃣ Cập nhật danh mục
            await self.db.execute(
                update(Categories)
                .where(Categories.id == category_id)
                .values(**update_data)
                .execution_options(synchronize_session="fetch")
            )
            await self.db.commit()

            return {
                "message": "Cập nhật danh mục thành công",
                "new_parent_id": str(new_parent_id) if new_parent_id else None,
                "new_order_index": new_order_index,
            }

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi cập nhật danh mục: {e}")

    async def get_last_order_index_same_level_async(
        self, category_id: uuid.UUID
    ) -> int:
        """
        ✅ Lấy order_index cuối cùng trong nhóm cùng cấp với category hiện tại
        (cùng parent_id)
        """
        try:
            # 1️⃣ Lấy thông tin danh mục hiện tại
            category = await self.db.scalar(
                select(Categories).where(Categories.id == category_id)
            )
            if not category:
                raise HTTPException(404, "Không tìm thấy danh mục")

            parent_id = category.parent_id

            # 2️⃣ Tìm order_index lớn nhất của nhóm cùng parent
            last_index = await self.db.scalar(
                select(func.max(Categories.order_index)).where(
                    Categories.parent_id == parent_id
                )
            )

            # 3️⃣ Nếu chưa có phần tử nào cùng cấp (nhóm trống)
            return int(last_index or 0)

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            raise HTTPException(
                500, f"Lỗi khi lấy order_index cuối cùng của nhóm cùng cấp: {e}"
            )

    async def delete_category_async(self, category_id: uuid.UUID):
        """
        ✅ Xóa danh mục:
        - Không cho phép xóa nếu có khóa học hoặc danh mục con.
        - Nếu xóa thành công → normalize lại order_index của nhóm cùng cấp.
        """
        try:
            # 1️⃣ Lấy danh mục hiện tại
            category = await self.db.scalar(
                select(Categories).where(Categories.id == category_id)
            )
            if not category:
                raise HTTPException(404, "Không tìm thấy danh mục")

            parent_id = category.parent_id
            order_index = category.order_index

            # 2️⃣ Kiểm tra có khóa học thuộc danh mục này không
            has_course = await self.db.scalar(
                select(func.count())
                .select_from(Courses)
                .where(Courses.category_id == category_id)
            )
            if has_course and has_course > 0:
                raise HTTPException(
                    400, "Không thể xóa vì danh mục này đang chứa khóa học"
                )

            # 3️⃣ Kiểm tra có danh mục con không
            has_child = await self.db.scalar(
                select(func.count())
                .select_from(Categories)
                .where(Categories.parent_id == category_id)
            )
            if has_child and has_child > 0:
                raise HTTPException(
                    400, "Không thể xóa vì danh mục này có danh mục con"
                )

            used_topics = await self.db.scalar(select(func.count()).select_from(Topics).where(Topics.category_id == category_id))
            used_discounts = await self.db.scalar(select(func.count()).select_from(DiscountTargets).where(DiscountTargets.category_id == category_id))
            if used_topics or used_discounts:
                raise HTTPException(409, 'Danh mục đang chứa chủ đề hoặc được chương trình giảm giá sử dụng')

            # 4️⃣ Xóa danh mục
            await self.db.execute(
                delete(Categories).where(Categories.id == category_id)
            )

            # 5️⃣ Normalize lại order_index trong nhóm cùng cấp
            await self.db.execute(
                update(Categories)
                .where(
                    Categories.parent_id == parent_id,
                    Categories.order_index > order_index,
                )
                .values(order_index=Categories.order_index - 1)
            )

            await self.db.commit()

            return {"message": "Đã xóa danh mục thành công"}

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi xóa danh mục: {e}")

    async def create_category_async(self, schema: CreateCategory):
        """
        ✅ Tạo danh mục mới:
        - Tự sinh slug từ tên.
        - Nếu trùng slug -> thêm hậu tố UUID ngắn.
        - Nếu có parent_id -> order_index = max(order_index) + 1 trong nhóm cha.
        - Nếu không -> tính theo nhóm gốc.
        """
        try:
            await self.db.execute(text('LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE'))
            await self._validate_tree(None, schema.parent_id)
            if not schema.name.strip():
                raise HTTPException(422, 'Tên danh mục không được để trống')
            # 3️⃣ Nếu có parent_id → kiểm tra hợp lệ
            if schema.parent_id:
                parent_exists = await self.db.scalar(
                    select(Categories.id).where(Categories.id == schema.parent_id)
                )
                if not parent_exists:
                    raise HTTPException(400, "Danh mục cha không hợp lệ")

            # 4️⃣ Tìm order_index cuối cùng trong nhóm cùng parent
            last_index = await self.db.scalar(
                select(func.max(Categories.order_index)).where(
                    Categories.parent_id == schema.parent_id
                )
            )
            order_index = (last_index if last_index is not None else -1) + 1

            # 5️⃣ Tạo danh mục mới
            new_category = await create_slugged(
                self.db, Categories, schema.name,
                id=uuid.uuid4(),
                name=schema.name.strip(),
                parent_id=schema.parent_id,
                order_index=order_index,
            )

            self.db.add(new_category)
            await self.db.commit()
            await self.db.refresh(new_category)

            return {
                "message": "Tạo danh mục thành công",
                "id": str(new_category.id),
                "slug": new_category.slug,
                "parent_id": (
                    str(new_category.parent_id) if new_category.parent_id else None
                ),
                "order_index": new_category.order_index,
            }

        except HTTPException:
            await self.db.rollback()
            raise
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(500, f"Lỗi khi tạo danh mục: {e}")

    async def _validate_tree(self, category_id, parent_id):
        # Snapshot under table lock prevents two concurrent moves forming a cycle.
        rows = (await self.db.execute(select(Categories.id, Categories.parent_id))).all()
        parents = {row.id: row.parent_id for row in rows}
        if parent_id is not None and parent_id not in parents:
            raise HTTPException(422, 'Danh mục cha không tồn tại')
        node = category_id or uuid.uuid4()
        parents[node] = parent_id
        for start in parents:
            visited = set()
            current = start
            depth = 0
            while current is not None:
                if current in visited:
                    raise HTTPException(422, 'Không được tạo chu trình danh mục')
                visited.add(current)
                current = parents.get(current)
                if current is not None:
                    depth += 1
                if depth > 2:
                    raise HTTPException(422, 'Danh mục chỉ hỗ trợ tối đa 3 cấp (0–2)')
