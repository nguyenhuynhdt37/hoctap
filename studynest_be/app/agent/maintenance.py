"""Distributed recovery and content retention; never retries unknown mutations."""
import asyncio
import logging
from datetime import timedelta
from types import SimpleNamespace

from sqlalchemy import and_, delete, func, or_, select, text, update

from app.agent.contracts import ACTIVE_STATES, TERMINAL_STATES, RunState
from app.agent.runtime import AgentService, now
from app.core.settings import settings
from app.db.models.agent import AgentApproval, AgentEvent, AgentRun, AgentSession, AgentToolCall
from app.db.models.database import TutorChatThreads
from app.db.models.learning_memory import AgentThreadSummary, LearningMemoryItem
from app.db.sesson import AsyncSessionLocal

logger=logging.getLogger(__name__)


async def run_once_async():
    if not settings.AGENT_ENABLED:
        return {'enabled':False}
    async with AsyncSessionLocal() as db:
        locked=await db.scalar(text("SELECT pg_try_advisory_xact_lock(hashtext('maymay-agent-maintenance-v1'))"))
        if not locked:
            return {'enabled':True,'lock_acquired':False}
        instant=now()
        stale=instant-timedelta(seconds=45)
        active=[s.value for s in ACTIVE_STATES]
        runs=(await db.scalars(select(AgentRun).where(AgentRun.state.in_(active),or_(
            AgentRun.deadline<=instant,
            and_(AgentRun.heartbeat_at.is_not(None),AgentRun.heartbeat_at<stale),
            and_(AgentRun.heartbeat_at.is_(None),AgentRun.created_at<stale))).with_for_update(skip_locked=True))).all()
        expired=0
        for run in runs:
            session=await db.get(AgentSession,run.session_id)
            service=AgentService(db,SimpleNamespace(id=run.user_id),session.auth_session_id)
            await service._transition_async(run,RunState.EXPIRED,error='worker_lost' if run.deadline>instant else 'deadline_exceeded')
            await service._close_pending_async(run.id,'expired')
            await service._emit_async(run,'run.failed',{'state':'expired','error':'Tác vụ đã mất worker hoặc hết thời gian. Kiểm tra trạng thái thực trước khi thử lại; không tự chạy lại thay đổi.'})
            expired+=1
        cutoff=instant-timedelta(days=max(1,settings.AGENT_EVENT_RETENTION_DAYS))
        purged_runs=await db.execute(delete(AgentRun).where(AgentRun.state.in_([s.value for s in TERMINAL_STATES]),AgentRun.updated_at<cutoff))
        purged_sessions=await db.execute(delete(AgentSession).where(AgentSession.expires_at<cutoff))
        memory=await db.execute(update(LearningMemoryItem).where(LearningMemoryItem.expires_at<=instant,
            or_(LearningMemoryItem.status!='deleted',LearningMemoryItem.content!='',LearningMemoryItem.evidence!=[]))
            .values(status='deleted',content='',evidence=[],confidence=0,updated_at=instant))
        deleted_threads=select(TutorChatThreads.id).where(TutorChatThreads.is_deleted.is_(True))
        summaries=await db.execute(delete(AgentThreadSummary).where(or_(AgentThreadSummary.updated_at<cutoff,AgentThreadSummary.thread_id.in_(deleted_threads))))
        await db.commit()
        from app.agent.semantic_compaction import resume_pending
        await resume_pending(db)
        result={'enabled':True,'lock_acquired':True,'expired_runs':expired,'purged_runs':purged_runs.rowcount,
                'purged_sessions':purged_sessions.rowcount,'expired_memory':memory.rowcount,'purged_summaries':summaries.rowcount}
        logger.info('Agent maintenance %s',result)
        return result


async def start_maintenance_async():
    """Call once on each API worker boot; advisory lock coordinates workers."""
    await run_once_async()
    async def loop():
        while True:
            await asyncio.sleep(15)
            try:
                await run_once_async()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning('Agent maintenance failed error=%s',type(exc).__name__)
    return asyncio.create_task(loop(),name='agent-maintenance')


async def metrics_async(db,user_id):
    """Owner-scoped aggregates without chat/code/PII payloads."""
    state_rows=(await db.execute(select(AgentRun.state,func.count(AgentRun.id)).where(AgentRun.user_id==user_id)
        .group_by(AgentRun.state))).all()
    tool_rows=(await db.execute(select(AgentToolCall.name,AgentToolCall.status,func.count(AgentToolCall.id))
        .join(AgentRun,AgentRun.id==AgentToolCall.run_id).where(AgentRun.user_id==user_id)
        .group_by(AgentToolCall.name,AgentToolCall.status))).all()
    denied=await db.scalar(select(func.count(AgentEvent.id)).join(AgentRun,AgentRun.id==AgentEvent.run_id).where(AgentRun.user_id==user_id,AgentEvent.type=='tool.denied'))
    return {'permission_denials':denied,'runs_by_state':{state:count for state,count in state_rows},
            'tools':[{'name':name,'status':status,'count':count} for name,status,count in tool_rows],
            'retention_days':settings.AGENT_EVENT_RETENTION_DAYS}
