from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.schemas.admin.platform_settings import (
    UpdateAISettingsSchema,
    UpdateSettingsSchema,
)
from app.services.admin.ai_settings import get_ai_settings, save_ai_settings
from app.services.admin.platform_settings import (
    PlatformSettingsService,
    get_platform_settings_service,
)

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


@router.get("/ai")
async def get_ai_configuration(
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
):
    await authorization.require_role(["ADMIN"])
    return await get_ai_settings(db)


@router.put("/ai")
async def update_ai_configuration(
    body: UpdateAISettingsSchema,
    authorization: AuthorizationService = Depends(AuthorizationService),
    db: AsyncSession = Depends(get_session),
):
    admin = await authorization.require_role(["ADMIN"])
    return await save_ai_settings(db, body.model, admin.id)


@router.get("", status_code=200)
async def get_settings(
    service: PlatformSettingsService = Depends(get_platform_settings_service),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    await authorization.require_role(["ADMIN"])
    return await service.get()


@router.put("")
async def update_settings(
    body: UpdateSettingsSchema,
    authorization=Depends(AuthorizationService),
    service=Depends(get_platform_settings_service),
):
    admin = await authorization.require_role(["ADMIN"])
    return await service.update(body, admin.id)
