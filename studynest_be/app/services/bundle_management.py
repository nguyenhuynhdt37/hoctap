"""Instructor-owned combos. Saving a valid combo publishes it for sale."""

import re
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import text

from app.db.models.bundle_commerce import BundleAuditEvent, BundleVersionReview
from app.db.models.learning_paths import BundleVersion
from app.schemas.learning_paths import BUNDLE_PRESENTATION_FIELDS
from app.services.bundle_ownership import BundleOwnershipPolicy
from app.services.bundles import BundleService
from app.services.catalog_slugs import slugify


class BundleManagementService:
    def __init__(self, db):
        self.db = db
        self.policy = BundleOwnershipPolicy(db)
        self.bundles = BundleService(db)

    def audit(self, root, version, actor, action, **details):
        self.db.add(
            BundleAuditEvent(
                bundle_id=root,
                version_id=version,
                actor_id=actor,
                action=action,
                details=details,
            )
        )

    async def version(self, version_id, actor_id):
        # Resolve immutable parent first, then lock root before its draft/review.
        version = await self.db.get(BundleVersion, version_id)
        if not version:
            raise HTTPException(404, "Không tìm thấy phiên bản")
        root = await self.policy.root(version.bundle_id, actor_id, lock=True)
        await self.db.refresh(version, with_for_update=True)
        return root, version

    async def save(self, data, actor_id, version_id=None):
        try:
            await self.policy.lecturer(actor_id)
            cover_prefix = f"/api/storage/files/public/bundles/{actor_id}/thumbnails/"
            if data.thumbnail_url is not None and not re.fullmatch(
                re.escape(cover_prefix) + r"[a-f0-9]{32}-thumbnail\.webp",
                data.thumbnail_url,
            ):
                raise HTTPException(422, "Ảnh bìa phải được tải lên từ tài khoản của bạn")
            if version_id:
                _root, version = await self.version(version_id, actor_id)
                if data.bundle_id and data.bundle_id != version.bundle_id:
                    raise HTTPException(422, "Combo không khớp phiên bản")
                root_id = version.bundle_id
                if version.status == "published":
                    data = data.model_copy(update={
                        field: getattr(version, field)
                        for field in BUNDLE_PRESENTATION_FIELDS
                        if field not in data.model_fields_set
                    })
                    version_id = None
                elif version.status != "draft":
                    raise HTTPException(409, "Chỉ sửa được combo đang bán hoặc bản nháp")
            elif data.bundle_id:
                root = await self.policy.root(data.bundle_id, actor_id, lock=True)
                root_id = root["id"]
            else:
                root_id = uuid4()
                slug = f"{slugify(data.slug or data.title)[:140]}-{root_id.hex[:8]}"
                await self.db.execute(
                    text(
                        "INSERT INTO public.course_bundles(id,slug,owner_id,origin,code,created_at,updated_at,updated_by) VALUES (:id,:slug,:owner,'lecturer',:code,now(),now(),:owner)"
                    ),
                    {
                        "id": root_id,
                        "slug": slug,
                        "owner": actor_id,
                        "code": "BND-" + root_id.hex.upper(),
                    },
                )
            courses = await self.policy.courses(
                data.course_ids, actor_id, publishing=True, lock=True
            )
            if len(data.description.strip()) < 20 or data.price > sum(
                course.base_price or 0 for course in courses.values()
            ):
                raise HTTPException(
                    422,
                    "Cần ít nhất hai khóa, mô tả từ 20 ký tự và giá không vượt tổng giá lẻ",
                )
            payload = data.model_copy(update={"bundle_id": root_id})
            draft = await self.bundles.create(
                payload, actor_id, version_id, commit=False
            )
            published = await self.bundles.publish(draft["id"], commit=False)
            review = await self.db.get(BundleVersionReview, published["id"])
            if not review:
                self.db.add(
                    BundleVersionReview(
                        version_id=published["id"],
                        status="published",
                        published_by=actor_id,
                    )
                )
            else:
                review.status = "published"
                review.published_by = actor_id
            self.audit(root_id, published["id"], actor_id, "published")
            await self.db.commit()
            return published
        except Exception:
            await self.db.rollback()
            raise

    async def active_owned(self, bundle_id, active: bool, actor_id):
        try:
            await self.policy.root(bundle_id, actor_id, lock=True)
            await self.db.execute(
                text(
                    "UPDATE public.course_bundles SET is_active=:active, updated_at=now(), updated_by=:actor WHERE id=:id"
                ),
                {"active": active, "actor": actor_id, "id": bundle_id},
            )
            self.audit(
                bundle_id,
                None,
                actor_id,
                "activated" if active else "deactivated",
                active=active,
            )
            await self.db.commit()
            return {
                "bundle_id": bundle_id,
                "is_active": active,
                "message": "Đã bật mở bán combo" if active else "Đã tạm ẩn combo",
            }
        except Exception:
            await self.db.rollback()
            raise
