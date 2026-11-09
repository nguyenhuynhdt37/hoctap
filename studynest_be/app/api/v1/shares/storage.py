"""Stable file URLs; issue short-lived R2 URLs only after authorization."""

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.models.database import CourseEnrollments, Courses, Lessons
from app.db.sesson import get_session
from app.services.shares.file_storage import (
    FileStorageService,
    get_file_storage_service,
)

router = APIRouter(prefix="/storage", tags=["Storage"])


async def authorize_file(key, auth, db):
    parts = key.split("/")
    if any(not part or part in {".", ".."} or not re.fullmatch(r"[\w.()-]+", part) for part in parts):
        raise HTTPException(404, "Không tìm thấy file.")
    if parts[0] == "public" and len(parts) >= 3:
        return
    user = await auth.get_current_user()
    try:
        if len(parts) >= 5 and parts[:2] == ["private", "users"]:
            if UUID(parts[2]) == user.id:
                return
        elif len(parts) == 8 and parts[:2] == ["private", "courses"] and parts[3] == "lessons" and parts[5] == "resources":
            course_id, lesson_id = UUID(parts[2]), UUID(parts[4])
            course = await db.get(Courses, course_id)
            lesson = await db.get(Lessons, lesson_id)
            if course and lesson and lesson.course_id == course.id:
                if course.instructor_id == user.id or lesson.is_preview:
                    return
                enrollment = await db.scalar(select(CourseEnrollments.id).where(
                    CourseEnrollments.user_id == user.id,
                    CourseEnrollments.course_id == course_id,
                    CourseEnrollments.status == "active",
                ).limit(1))
                if enrollment:
                    return
    except ValueError:
        pass
    raise HTTPException(403, "Bạn không có quyền truy cập file này.")


@router.get("/files/{key:path}")
async def download_file(
    key: str,
    auth: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
    storage: FileStorageService = Depends(get_file_storage_service),
):
    await authorize_file(key, auth, db)
    return RedirectResponse(await storage.signed_download_url(key), status_code=302,
                            headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


@router.get("/urls/{key:path}")
async def get_download_url(
    key: str,
    response: Response,
    auth: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
    storage: FileStorageService = Depends(get_file_storage_service),
):
    # Native apps authenticate this request with Bearer, then open the URL in
    # the system browser, which does not have the app's authentication token.
    await authorize_file(key, auth, db)
    response.headers["Cache-Control"] = "no-store"
    return {"url": await storage.signed_download_url(key)}
