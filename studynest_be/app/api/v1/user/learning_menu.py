import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import AuthorizationService
from app.db.sesson import get_session
from app.services.user.learning_menu import (
    claim_course_gift,
    create_course_gift,
    get_player_menu_state,
    list_incoming_gifts,
    search_gift_recipients,
    set_announcement_emails,
    set_course_archived,
    set_promotional_emails,
    transfer_course_access,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/learning/player", tags=["Learning player menu"])


class ArchiveBody(BaseModel):
    archived: bool


class EmailToggleBody(BaseModel):
    enabled: bool


class GiftCreateBody(BaseModel):
    recipient_email: str


class TransferBody(BaseModel):
    recipient_user_id: uuid.UUID


@router.get("/{course_id}/state")
async def player_menu_state(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await get_player_menu_state(db, user, course_id)


@router.post("/{course_id}/archive")
async def archive_course(
    course_id: uuid.UUID,
    body: ArchiveBody,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await set_course_archived(db, user.id, course_id, body.archived)


@router.post("/{course_id}/announcement-email")
async def announcement_email(
    course_id: uuid.UUID,
    body: EmailToggleBody,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await set_announcement_emails(db, user.id, course_id, body.enabled)


@router.post("/promotional-email")
async def promotional_email(
    body: EmailToggleBody,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await set_promotional_emails(db, user.id, body.enabled)


@router.get("/{course_id}/recipients")
async def gift_recipients(
    course_id: uuid.UUID,
    q: str = "",
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await search_gift_recipients(db, user, course_id, q)


@router.post("/{course_id}/transfer")
async def transfer_course(
    course_id: uuid.UUID,
    body: TransferBody,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await transfer_course_access(db, user, course_id, body.recipient_user_id)


@router.post("/{course_id}/gifts")
async def create_gift(
    course_id: uuid.UUID,
    body: GiftCreateBody,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await create_course_gift(db, user, course_id, body.recipient_email)


@router.get("/gifts/incoming")
async def incoming_gifts(
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await list_incoming_gifts(db, user)


@router.post("/gifts/{gift_id}/claim")
async def claim_gift(
    gift_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    user = await authorization.get_current_user()
    return await claim_course_gift(db, gift_id, user)
