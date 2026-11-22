"""Actual auth/API/SSE/PostgreSQL + real text provider smoke; UI receipt is simulated."""
import argparse,asyncio,json,os,sys
from datetime import datetime,timedelta,timezone
from pathlib import Path
from uuid import UUID,uuid4
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
async def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--live',action='store_true');p.add_argument('--database-url-file',type=Path,required=True);p.add_argument('--fixture',type=Path,required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
 if not args.live:p.error('--live required')
 os.environ['DATABASE_ASYNC_URL']=args.database_url_file.read_text().strip();os.environ['AGENT_ENABLED']='true'
 import httpx
 from fastapi import FastAPI
 from sqlalchemy import select,delete
 from app.api.v1.user.agent import router
 from app.agent.runtime import shutdown_async
 from app.core.security import SecurityService
 from app.core.settings import settings
 from app.db.models.database import User,Sessions,CourseEnrollments,LessonProgress
 from app.db.sesson import AsyncSessionLocal,engine
 from app.middleware.request_context import RequestContextMiddleware
 fixture=json.loads(args.fixture.read_text());user_id,sid=uuid4(),uuid4()
 receipt={'timestamp':datetime.now(timezone.utc).isoformat(),'real_model':True,'real_auth_api_sse_postgresql':True,'ui':'SIMULATED CALLBACK RECEIPT','browser':'NOT EXERCISED','passed':False,'events':[]}
 try:
  async with AsyncSessionLocal() as db:
   db.add(User(id=user_id,fullname='Text model fixture',email=f'model-{user_id.hex}@example.invalid',password='unused-hash',is_banned=False));await db.flush()
   db.add(Sessions(id=sid,user_id=user_id,refresh_token_hash=uuid4().hex,expired_at=datetime.now(timezone.utc)+timedelta(hours=1),is_revoked=False))
   db.add(CourseEnrollments(user_id=user_id,course_id=UUID(fixture['course_id']),status='active'))
   db.add(LessonProgress(user_id=user_id,course_id=UUID(fixture['course_id']),lesson_id=UUID(fixture['video_lesson_id']),is_completed=False));await db.commit()
  token=await SecurityService().create_access_token(str(user_id),str(sid))
  app=FastAPI();app.add_middleware(RequestContextMiddleware);app.include_router(router,prefix='/api/v1')
  async with httpx.AsyncClient(transport=httpx.ASGITransport(app),base_url='http://fixture.local',headers={'Authorization':'Bearer '+token},timeout=180) as client:
   response=await client.post('/api/v1/agent/sessions',json={'page_instance_id':'real-model-'+uuid4().hex,'route':'/learning/test','course_id':fixture['course_id'],'lesson_id':fixture['video_lesson_id'],'capabilities':['ui.switch_tab']});response.raise_for_status();session=response.json()
   response=await client.put(f"/api/v1/agent/sessions/{session['id']}/context",json={'schema_version':1,'page_instance_id':session['page_instance_id'],'revision':1,'captured_at':datetime.now(timezone.utc).isoformat(),'route':'/learning/test','course_id':fixture['course_id'],'lesson_id':fixture['video_lesson_id'],'active_tab':'lesson'});response.raise_for_status()
   # This phrasing deliberately uses model selection, not deterministic direct-intent matching.
   response=await client.post('/api/v1/agent/runs',json={'session_id':session['id'],'message':'Bạn có thể mở tab ghi chú giúp mình không?','idempotency_key':'real-model-'+uuid4().hex});response.raise_for_status();run_id=response.json()['id']
   async def callbacks():
    from app.db.models.agent import AgentEvent
    seen=set()
    for _ in range(1200):
     async with AsyncSessionLocal() as db:
      rows=(await db.scalars(select(AgentEvent).where(AgentEvent.run_id==UUID(run_id)).order_by(AgentEvent.sequence))).all()
      for row in rows:
       if row.type=='ui.action_requested' and row.id not in seen:
        seen.add(row.id);request=row.payload
        if request['name']!='ui.switch_tab':raise AssertionError('Unexpected tool')
        body={'page_instance_id':request['page_instance_id'],'context_revision':request['context_revision'],'lesson_id':fixture['video_lesson_id'],'status':'completed','verified':True,'result':{'active_tab':request['arguments']['tab']}}
        reply=await client.post(f"/api/v1/agent/runs/{run_id}/actions/{request['action_id']}/receipt",json=body);reply.raise_for_status()
       if row.type in {'run.completed','run.partially_completed','run.failed','run.cancelled'}:return
     await asyncio.sleep(.15)
    raise TimeoutError('callback deadline')
   task=asyncio.create_task(callbacks())
   async with asyncio.timeout(180):
    response=await client.get(f'/api/v1/agent/runs/{run_id}/events');response.raise_for_status()
    for line in response.text.splitlines():
     if line.startswith('data: '):receipt['events'].append(json.loads(line[6:])['type'])
   await task
   response=await client.get(f'/api/v1/agent/runs/{run_id}');response.raise_for_status();run=response.json()
   receipt['state']=run['state'];receipt['usage']=run['usage']
   receipt['persisted_message']=bool((run.get('message') or {}).get('id'))
   receipt['passed']=run['state']=='completed' and receipt['persisted_message'] and run['usage'].get('model_calls',0)>0 and all(event in receipt['events'] for event in ['ui.action_requested','ui.action_receipt','model.usage'])
 except Exception as exc:receipt['error_type']=type(exc).__name__
 finally:
  await shutdown_async()
  async with AsyncSessionLocal() as db:await db.execute(delete(User).where(User.id==user_id));await db.commit()
  await engine.dispose();args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(receipt,ensure_ascii=False,indent=2));print(json.dumps(receipt,ensure_ascii=False))
 return 0 if receipt['passed'] else 1
if __name__=='__main__':raise SystemExit(asyncio.run(main()))
