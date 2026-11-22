from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.sesson import get_session
from app.agent.advisor import AdvisorInput, AdvisorResponse, CourseAdvisorService

router = APIRouter(prefix='/agent', tags=['COURSE ADVISOR'])

@router.post('/advisor', response_model=AdvisorResponse)
async def advise_course(body: AdvisorInput, db: AsyncSession = Depends(get_session)):
    return await CourseAdvisorService(db).advise_async(body)

@router.get('/advisor/{course_id}/context')
async def course_context(course_id: UUID, db: AsyncSession = Depends(get_session)):
    return await CourseAdvisorService(db).course_context_async(course_id)
