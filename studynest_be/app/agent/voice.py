"""Realtime voice adapter to the native tool runtime; no second policy engine."""
import asyncio
from contextlib import suppress
from uuid import UUID, uuid4
from fastapi import HTTPException
from sqlalchemy import select
from app.agent.runtime import AgentService, execute_external_tool_async
from app.agent.tools import available
from app.core.security import SecurityService
from app.core.settings import settings
from app.db.models.agent import AgentEvent
from app.db.models.database import User
from app.db.sesson import AsyncSessionLocal


def live_schema(schema):
    """Resolve Pydantic local refs into the realtime function schema."""
    definitions = schema.get('$defs', {})
    def walk(value):
        if not isinstance(value, dict):
            return value
        if '$ref' in value:
            return walk(definitions[value['$ref'].rsplit('/',1)[-1]])
        result={key:walk(v) if isinstance(v,dict) else [walk(x) for x in v] if isinstance(v,list) else v for key,v in value.items() if key in {'type','description','properties','required','items','enum','minimum','maximum','anyOf'}}
        # properties map is not itself a Schema object.
        if 'properties' in value:
            result['properties']={k:walk(v) for k,v in value['properties'].items()}
        return result
    return walk(schema)


class VoiceAgentAdapter:
    def __init__(self, relay, session_id, auth_sid):
        self.relay, self.session_id, self.auth_sid = relay, UUID(str(session_id)), str(auth_sid)
        self.namespace = uuid4().hex
        self.names = {}
        self.total_calls = 0

    @classmethod
    async def bind_async(cls, relay, session_id):
        if not settings.AGENT_ENABLED:
            raise HTTPException(503, 'Agent chưa được bật')
        if settings.AGENT_MAX_RUN_COST_USD is not None:
            raise HTTPException(503, 'Voice chưa có đo chi phí audio đủ để thực thi ngân sách tiền tệ; chưa thể mở phiên.')
        ws=relay.ws
        # Existing voice authenticates subprotocol into Authorization before bind.
        token=ws.headers.get('authorization') or ws.cookies.get('access_token')
        if token and token.lower().startswith('bearer '): token=token.split(' ',1)[1]
        if not token: raise HTTPException(401,'Thiếu phiên đăng nhập voice')
        async with SecurityService() as security:
            payload=await security.decode_access_token(token)
        if str(payload.get('sub')) != str(relay.user.id) or not payload.get('sid'):
            raise HTTPException(401,'Voice identity mismatch')
        adapter=cls(relay,session_id,payload['sid'])
        async with AsyncSessionLocal() as db:
            svc=AgentService(db,relay.user,adapter.auth_sid)
            await svc.principal_async()
            session=await svc.get_session_async(adapter.session_id)
            if session.lesson_id != relay.lesson_id:
                raise HTTPException(409,'Voice không thuộc bài học đang mở')
            if session.lesson_id:
                await svc.validate_lesson_async()
            adapter.names={name.replace('.','__'):name for name in available(session)}
        return adapter

    async def declarations_async(self):
        async with AsyncSessionLocal() as db:
            service=AgentService(db,self.relay.user,self.auth_sid)
            await service.principal_async()
            session=await service.get_session_async(self.session_id)
            tools=available(session)
            return [{'name':alias,'description':tools[name].description,'type':'function','parameters':live_schema(tools[name].input_model.model_json_schema())} for alias,name in self.names.items() if name in tools]

    async def _events_async(self, run_id, done):
        sequence=0
        while True:
            async with AsyncSessionLocal() as db:
                user=await db.get(User,self.relay.user.id)
                if user is None: return
                service=AgentService(db,user,self.auth_sid)
                await service.principal_async()
                await service.get_run_async(run_id)
                rows=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==run_id,AgentEvent.sequence>sequence).order_by(AgentEvent.sequence).limit(100))).all()
                for event in rows:
                    sequence=event.sequence
                    await self.relay.emit('agent_event',event={'schema_version':1,'id':str(event.id),'run_id':str(run_id),'sequence':event.sequence,'type':event.type,'timestamp':event.created_at.isoformat(),'payload':event.payload})
            if done.is_set() and len(rows)<100: return
            try: await asyncio.wait_for(done.wait(),timeout=.15)
            except TimeoutError: pass

    async def call_async(self, alias, arguments, call_id, user_message=None):
        name=self.names.get(alias)
        if not name: return {'verified':False,'error':'Công cụ không khả dụng'}
        self.total_calls+=1
        if self.total_calls>40: return {'verified':False,'error':'Phiên voice đã hết ngân sách công cụ'}
        done=asyncio.Event();pump=None
        async def started(run_id):
            nonlocal pump
            pump=asyncio.create_task(self._events_async(run_id,done))
        try:
            result=await execute_external_tool_async(self.relay.user,self.auth_sid,self.session_id,name,arguments,channel='voice',message=(user_message if user_message is not None else self.relay.user_text).strip() or 'Yêu cầu đọc ngữ cảnh học tập',idempotency_key=f'voice:{self.namespace}:{call_id}'[:100],on_run_created=started)
            if name=='knowledge.search_lesson':
                from app.services.user.tutor_chat_message import TutorChatMessageService
                passages=result.get('sources',[])
                sources=TutorChatMessageService._ground_sources([{'index':i+1,'summary':(p.get('content') or '')[:240]} for i,p in enumerate(passages)],passages)
                for source in sources:
                    if not any(x.get('chunk_id')==source.get('chunk_id') for x in self.relay.sources):
                        self.relay.sources.append(dict(source,index=len(self.relay.sources)+1))
                await self.relay.emit('sources',sources=self.relay.sources)
            return result
        except HTTPException as exc:
            return {'verified':False,'error':exc.detail}
        except asyncio.CancelledError:
            raise
        except Exception:
            return {'verified':False,'error':'Công cụ voice chưa hoàn tất; không được báo thành công.'}
        finally:
            done.set()
            if pump:
                with suppress(Exception): await asyncio.wait_for(pump,timeout=2)
