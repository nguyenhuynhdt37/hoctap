"""Self-only memory controls. Agent proposals cannot confirm themselves."""
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import AuthorizationService
from app.core.settings import settings
from app.db.sesson import get_session
from app.agent.memory import MemoryConsentInput, MemoryProposal, MemoryService

router = APIRouter(prefix='/agent/memory', tags=['AGENT MEMORY'])

async def service(auth: AuthorizationService = Depends(AuthorizationService), db: AsyncSession = Depends(get_session)):
    if not settings.AGENT_ENABLED:
        from fastapi import HTTPException
        raise HTTPException(503, 'Bộ nhớ agent chưa được bật')
    user = await auth.get_current_user()
    if user.is_banned or user.deleted_at:
        from fastapi import HTTPException
        raise HTTPException(403, 'Tài khoản không khả dụng')
    return MemoryService(db, user.id)

@router.get('/consent')
async def get_consent(memory: MemoryService = Depends(service)):
    return await memory.consent_async()

@router.put('/consent')
async def set_consent(body: MemoryConsentInput, memory: MemoryService = Depends(service)):
    return await memory.set_consent_async(body)

@router.get('')
async def list_memory(course_id: UUID | None = None, lesson_id: UUID | None = None, memory: MemoryService = Depends(service)):
    return {'items': await memory.list_async(course_id=course_id, lesson_id=lesson_id, include_proposals=True)}

@router.post('')
async def propose_memory(body: MemoryProposal, memory: MemoryService = Depends(service)):
    return await memory.propose_async(body)

@router.post('/{memory_id}/confirm')
async def confirm_memory(memory_id: UUID, memory: MemoryService = Depends(service)):
    return await memory.confirm_async(memory_id)

@router.delete('/{memory_id}')
async def delete_memory(memory_id: UUID, memory: MemoryService = Depends(service)):
    return await memory.delete_async(memory_id)

@router.delete('')
async def delete_all_memory(memory: MemoryService = Depends(service)):
    return await memory.delete_all_async()
