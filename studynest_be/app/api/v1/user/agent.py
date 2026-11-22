"""Authenticated agent lifecycle; replayable SSE never retriggers execution."""
import asyncio
import json
from uuid import UUID

from fastapi import WebSocket, APIRouter, Depends, Header, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.contracts import (
    TERMINAL_STATES,
    ActionReceipt,
    ApprovalDecision,
    CreateRun,
    CreateSession,
    ScreenSnapshot,
)
from app.agent.runtime import AgentService
from app.core.deps import AuthorizationService
from app.core.settings import settings
from app.services.shares.auth import AuthService
from app.db.models.agent import AgentEvent
from app.db.sesson import AsyncSessionLocal, get_session

router = APIRouter(prefix="/agent", tags=["USER AGENT"])


async def agent_service(auth: AuthorizationService = Depends(AuthorizationService), db: AsyncSession = Depends(get_session)):
    if not settings.AGENT_ENABLED:
        raise HTTPException(503, "Agent đang được chuẩn bị. Tutor Chat hiện tại vẫn khả dụng.")
    user = await auth.get_current_user()
    sid = await auth.get_current_sid()
    return AgentService(db, user, sid)


@router.post("/sessions", status_code=201)
async def create_session(body: CreateSession, service: AgentService = Depends(agent_service)):
    return await service.create_session_async(body)


@router.get('/tools')
async def tool_status(service: AgentService = Depends(agent_service)):
    await service.principal_async()
    from app.agent.mcp_client import status
    from app.agent.tools import REGISTRY
    mcp = await status() if settings.AGENT_MCP_ENABLED else {'connected': False, 'tools': []}
    return {'mcp': mcp, 'internal_tools': [name for name in REGISTRY if not name.startswith('mcp.')]}


@router.put("/sessions/{session_id}/context")
async def update_context(session_id: UUID, body: ScreenSnapshot, service: AgentService = Depends(agent_service)):
    return await service.context_async(session_id, body)


@router.post("/runs", status_code=201)
async def create_run(body: CreateRun, service: AgentService = Depends(agent_service)):
    return await service.create_run_async(body)


@router.get("/runs/{run_id}")
async def read_run(run_id: UUID, service: AgentService = Depends(agent_service)):
    await service.reconcile_async()
    data = service.run_data(await service.get_run_async(run_id))
    final = await service.db.scalar(select(AgentEvent).where(AgentEvent.run_id == run_id, AgentEvent.type.in_(['run.completed', 'run.partially_completed'])).order_by(AgentEvent.sequence.desc()).limit(1))
    data['message'] = final.payload.get('message') if final else None
    return data


@router.post("/runs/{run_id}/cancel")
async def cancel_run(run_id: UUID, service: AgentService = Depends(agent_service)):
    return await service.cancel_async(run_id)


@router.post("/runs/{run_id}/approvals/{approval_id}")
async def approve(run_id: UUID, approval_id: UUID, body: ApprovalDecision, service: AgentService = Depends(agent_service)):
    return await service.approval_async(run_id, approval_id, body)


@router.post("/runs/{run_id}/actions/{action_id}/receipt")
async def receive_receipt(run_id: UUID, action_id: UUID, body: ActionReceipt, service: AgentService = Depends(agent_service)):
    return await service.receipt_async(run_id, action_id, body)


@router.get("/runs/{run_id}/events")
async def events(run_id: UUID, after: int = Query(0, ge=0), last_event_id: str | None = Header(None), service: AgentService = Depends(agent_service)):
    await service.get_run_async(run_id)
    owner, sid = service.user.id, service.auth_sid
    if last_event_id:
        try:
            after = max(after, int(last_event_id))
        except ValueError:
            raise HTTPException(422, "Last-Event-ID phải là event sequence") from None

    async def stream():
        sequence = after
        empty_polls = 0
        yield ": connected\n\n"
        while True:
            async with AsyncSessionLocal() as db:
                from app.db.models.database import User
                user = await db.get(User, owner)
                if user is None:
                    return
                current = AgentService(db, user, sid)
                try:
                    await current.principal_async()
                    await current.reconcile_async()
                    run = await current.get_run_async(run_id)
                except HTTPException:
                    yield 'event: error\ndata: {"error":"Phiên không còn hợp lệ"}\n\n'
                    return
                rows = (await db.scalars(select(AgentEvent).where(AgentEvent.run_id == run_id, AgentEvent.sequence > sequence).order_by(AgentEvent.sequence).limit(100))).all()
                terminal = run.state in TERMINAL_STATES
                for row in rows:
                    sequence = row.sequence
                    event = {"schema_version":1,"id":str(row.id),"run_id":str(run_id),"sequence":row.sequence,
                             "type":row.type,"timestamp":row.created_at.isoformat(),"payload":row.payload}
                    yield f"id: {row.sequence}\ndata: {json.dumps(event,ensure_ascii=False)}\n\n"
                await db.rollback()
            if terminal and len(rows) < 100:
                return
            if rows:
                empty_polls = 0
            else:
                empty_polls += 1
                if empty_polls % 20 == 0:
                    yield ': keepalive\n\n'
            await asyncio.sleep(.5)
    return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'})


@router.get('/metrics')
async def metrics(service: AgentService = Depends(agent_service)):
    from app.agent.maintenance import metrics_async
    return await metrics_async(service.db,service.user.id)


@router.get('/conversation')
async def account_conversation(before: UUID | None = None, service: AgentService = Depends(agent_service)):
    from app.db.models.database import TutorChatMessages
    from sqlalchemy.orm import selectinload
    await service.principal_async()
    thread = (await service.tutor.get_or_create_account_thread(service.user.id))['thread']
    query = select(TutorChatMessages).where(TutorChatMessages.thread_id == UUID(thread['id']), TutorChatMessages.user_id == service.user.id)
    if before:
        cursor = await service.db.scalar(select(TutorChatMessages).where(TutorChatMessages.id == before,
            TutorChatMessages.thread_id == UUID(thread['id']), TutorChatMessages.user_id == service.user.id))
        if not cursor:
            raise HTTPException(404, 'Không tìm thấy tin nhắn')
        from sqlalchemy import tuple_
        query = query.where(tuple_(TutorChatMessages.created_at, TutorChatMessages.id) < (cursor.created_at, cursor.id))
    rows = (await service.db.scalars(query.options(selectinload(TutorChatMessages.tutor_chat_images)).order_by(TutorChatMessages.created_at.desc(), TutorChatMessages.id.desc()).limit(51))).all()
    selected = rows[:50]
    from app.agent.activity import for_messages
    activity = await for_messages(service.db, service.user.id, [row.id for row in selected if row.role == 'assistant'])
    return {'thread': thread, 'messages': [{'id':str(row.id),'role':row.role,'content':row.content,'sources':row.sources or [],'created_at':row.created_at.isoformat(),'activity':activity.get(str(row.id),[]),'images':[{'id':str(image.id),'url':image.url,'file_size':image.file_size,'mime_type':image.mime_type,'ocr_text':''} for image in row.tutor_chat_images]} for row in reversed(selected)],
            'before': str(selected[-1].id) if len(rows)>50 else None}


@router.get('/github')
async def github_status(service: AgentService = Depends(agent_service)):
    from app.agent.github_connection import connection_status
    await service.principal_async()
    return await connection_status(service.db, service.user.id)


@router.post('/github/connect')
async def github_connect(service: AgentService = Depends(agent_service)):
    from app.agent.github_connection import begin
    await service.principal_async()
    return await begin(service.db, service.user.id, service.auth_sid)


@router.get('/github/callback')
async def github_callback(
    request: Request,
    state: str = Query(min_length=20, max_length=150),
    code: str | None = Query(default=None, min_length=1, max_length=500),
    error: str | None = Query(default=None, max_length=200),
    auth_service: AuthService = Depends(AuthService),
    authorization: AuthorizationService = Depends(AuthorizationService),
):
    from app.services.shares.github_auth import callback_response
    return await callback_response(request, state, code, error, auth_service, authorization)


@router.delete('/github')
async def github_disconnect(service: AgentService = Depends(agent_service)):
    from app.agent.github_connection import GitHubConnection
    await service.principal_async()
    row = await service.db.get(GitHubConnection, service.user.id)
    if row:
        await service.db.delete(row)
        await service.db.commit()
    return {'connected': False}


from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.xai_voice import VoiceName, normalize_voice


class VoicePreferences(BaseModel):
    model_config = ConfigDict(extra='forbid')
    voice: VoiceName = 'eve'
    speed: float = Field(default=1, ge=.75, le=1.25)
    mic_threshold: float = Field(default=.012, ge=.008, le=.045)

    @field_validator('voice', mode='before')
    @classmethod
    def migrate_voice(cls, value):
        return normalize_voice(value) if isinstance(value, str) else value


@router.get('/voice-settings')
async def voice_settings(service: AgentService = Depends(agent_service)):
    from app.db.models.learning_memory import LearningMemoryConsent
    await service.principal_async()
    row = await service.db.get(LearningMemoryConsent, service.user.id)
    return VoicePreferences.model_validate((row.voice_settings or {}) if row else {})


@router.put('/voice-settings')
async def save_voice_settings(body: VoicePreferences, service: AgentService = Depends(agent_service)):
    from app.agent.memory import MemoryService
    from app.db.models.learning_memory import LearningMemoryConsent
    await service.principal_async()
    await MemoryService(service.db, service.user.id)._lock_async()
    row = await service.db.get(LearningMemoryConsent, service.user.id)
    if not row:
        row = LearningMemoryConsent(user_id=service.user.id, enabled=True, retention_days=None)
        service.db.add(row)
    row.voice_settings = body.model_dump()
    await service.db.commit()
    return body


@router.get('/lessons/{lesson_id}/destination')
async def lesson_destination(lesson_id: UUID, service: AgentService = Depends(agent_service)):
    await service.principal_async()
    info = await service.tutor.validate_lesson_access(service.user.id, lesson_id)
    return {'course_id': str(info['course'].id), 'course_slug': info['course'].slug, 'lesson_id': str(info['lesson'].id)}


@router.post('/attachments/image')
async def upload_assistant_image(file: UploadFile = File(...), service: AgentService = Depends(agent_service)):
    await service.principal_async()
    from app.agent.multimodal import upload
    return await upload(service.user.id, file)


@router.post('/transcribe')
async def transcribe_assistant_audio(file: UploadFile = File(...), service: AgentService = Depends(agent_service)):
    await service.principal_async()
    from app.agent.multimodal import transcribe
    return await transcribe(service.user.id, file)


@router.post('/dictation-ticket')
async def dictation_ticket(service: AgentService = Depends(agent_service)):
    from app.agent.dictation import ticket
    return await ticket(service)


@router.websocket('/dictation')
async def dictation_stream(websocket: WebSocket):
    from app.agent.dictation import run
    await run(websocket)
