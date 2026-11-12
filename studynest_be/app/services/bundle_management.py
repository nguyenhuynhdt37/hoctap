"""Instructor-owned drafts and independently audited moderation transactions."""

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, text

from app.db.models.bundle_commerce import BundleAuditEvent, BundleVersionReview
from app.db.models.learning_paths import BundleItem, BundleVersion
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
            if version_id:
                root, version = await self.version(version_id, actor_id)
                review = await self.db.get(BundleVersionReview, version.id)
                if not review or review.status not in {"draft", "changes_requested"}:
                    raise HTTPException(
                        409, "Chỉ sửa bản nháp hoặc bản được yêu cầu chỉnh sửa"
                    )
                if data.bundle_id and data.bundle_id != version.bundle_id:
                    raise HTTPException(422, "Combo không khớp phiên bản")
                root_id = version.bundle_id
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
            await self.policy.courses(data.course_ids, actor_id, lock=True)
            payload = data.model_copy(update={"bundle_id": root_id})
            result = await self.bundles.create(
                payload, actor_id, version_id, commit=False
            )
            review = await self.db.get(BundleVersionReview, result["id"])
            if not review:
                self.db.add(
                    BundleVersionReview(version_id=result["id"], status="draft")
                )
            else:
                review.status = "draft"
            self.audit(root_id, result["id"], actor_id, "draft_saved")
            await self.db.commit()
            return result
        except Exception:
            await self.db.rollback()
            raise

    async def submit(self, version_id, actor_id):
        try:
            root, version = await self.version(version_id, actor_id)
            review = await self.db.get(BundleVersionReview, version_id)
            if (
                version.status != "draft"
                or not review
                or review.status not in {"draft", "changes_requested"}
            ):
                raise HTTPException(409, "Phiên bản không thể gửi xét duyệt")
            ids = (
                await self.db.scalars(
                    select(BundleItem.course_id).where(
                        BundleItem.version_id == version_id
                    )
                )
            ).all()
            courses = await self.policy.courses(
                ids, actor_id, publishing=True, lock=True
            )
            if len(version.description.strip()) < 20 or version.price > sum(
                course.base_price or 0 for course in courses.values()
            ):
                raise HTTPException(
                    422, "Kiểm tra mô tả và giá combo trước khi gửi duyệt"
                )
            review.status, review.submitted_at = "pending", datetime.now(UTC)
            self.audit(root["id"], version_id, actor_id, "submitted")
            await self.db.commit()
            return {"version_id": version_id, "review_status": "pending"}
        except Exception:
            await self.db.rollback()
            raise

    async def review(self, version_id, admin_id, decision, reason):
        # Route authorization must require ADMIN; service also verifies the actor.
        from app.db.models.database import Role, User, UserRoles

        try:
            admin = await self.db.get(User, admin_id)
            allowed = await self.db.scalar(
                select(UserRoles.user_id)
                .join(Role, Role.id == UserRoles.role_id)
                .where(UserRoles.user_id == admin_id, Role.role_name == "ADMIN")
                .limit(1)
            )
            if not admin or admin.is_banned or admin.deleted_at or not allowed:
                raise HTTPException(403, "Không có quyền xét duyệt combo")
            version = await self.db.get(BundleVersion, version_id)
            if not version:
                raise HTTPException(404, "Không tìm thấy phiên bản")
            root = (
                (
                    await self.db.execute(
                        text(
                            "SELECT id,owner_id,suspended_at FROM public.course_bundles WHERE id=:id AND origin='lecturer' AND deleted_at IS NULL FOR UPDATE"
                        ),
                        {"id": version.bundle_id},
                    )
                )
                .mappings()
                .first()
            )
            if not root:
                raise HTTPException(404, "Không tìm thấy combo giảng viên")
            await self.db.refresh(version, with_for_update=True)
            review = await self.db.get(BundleVersionReview, version_id)
            if version.status != "draft" or not review or review.status != "pending":
                raise HTTPException(409, "Phiên bản không đang chờ duyệt")
            if (
                decision not in {"approved", "changes_requested"}
                or not reason
                or len(reason.strip()) < 10
            ):
                raise HTTPException(
                    422, "Cần quyết định hợp lệ và lý do ít nhất 10 ký tự"
                )
            ids = (
                await self.db.scalars(
                    select(BundleItem.course_id).where(
                        BundleItem.version_id == version_id
                    )
                )
            ).all()
            if decision == "approved":
                await self.policy.courses(
                    ids, root["owner_id"], publishing=True, lock=True
                )
            review.status, review.review_note = decision, reason.strip()
            review.reviewed_by, review.reviewed_at = admin_id, datetime.now(UTC)
            self.audit(
                root["id"], version_id, admin_id, decision, reason=reason.strip()
            )
            await self.db.commit()
            return {"version_id": version_id, "review_status": decision}
        except Exception:
            await self.db.rollback()
            raise
