"""Real Grok Voice native-tool/PCM smoke with a simulated player receipt.

Uses disposable PostgreSQL fixture records. No microphone, real browser player,
or backend WebSocket is claimed: user text enters Grok Voice through the provider WebSocket.
"""
import argparse
import asyncio
import base64
import json
import os
import sys
from datetime import datetime,timedelta,timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID,uuid4
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))


async def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--live',action='store_true');parser.add_argument('--database-url-file',type=Path,required=True)
 parser.add_argument('--fixture',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
 args=parser.parse_args()
 if not args.live:parser.error('--live is required for provider calls')
 os.environ['DATABASE_ASYNC_URL']=args.database_url_file.read_text().strip()
 os.environ['AGENT_ENABLED']='true'
 from sqlalchemy import delete,select
 from app.agent.contracts import ActionReceipt,CreateSession,ScreenSnapshot
 from app.agent.runtime import AgentService
 from app.agent.voice import VoiceAgentAdapter
 from app.core.xai_voice import open_realtime, send_event
 from app.db.models.agent import AgentEvent
 from app.db.models.database import User,Sessions,CourseEnrollments,LessonProgress
 from app.db.sesson import AsyncSessionLocal,engine
 fixture=json.loads(args.fixture.read_text());user_id,sid=uuid4(),uuid4();session_id=None
 record={'timestamp':datetime.now(timezone.utc).isoformat(),'real_grok_voice':True,'real_native_model_tool_call':False,
         'real_runtime_and_postgresql':True,'microphone':'NOT VERIFIED','backend_websocket':'NOT EXERCISED',
         'ui_receipt':'SIMULATED PLAYER FIXTURE','pcm_bytes':0,'tool_calls':[],'events':[],'passed':False}
 try:
  async with AsyncSessionLocal() as db:
   user=User(id=user_id,fullname='Live adapter fixture',email=f'voice-{user_id.hex}@example.invalid',password='unused-fixture-hash',is_banned=False)
   db.add(user);await db.flush()
   lesson_id,course_id=UUID(fixture['video_lesson_id']),UUID(fixture['course_id'])
   db.add(Sessions(id=sid,user_id=user_id,refresh_token_hash=uuid4().hex,expired_at=datetime.now(timezone.utc)+timedelta(hours=1),is_revoked=False))
   db.add(CourseEnrollments(user_id=user_id,course_id=course_id,status='active'))
   db.add(LessonProgress(user_id=user_id,course_id=course_id,lesson_id=lesson_id,is_completed=False));await db.commit()
   svc=AgentService(db,SimpleNamespace(id=user_id),sid)
   session=await svc.create_session_async(CreateSession(page_instance_id='live-probe-'+uuid4().hex,route='/learning/fixture',course_id=course_id,lesson_id=lesson_id,capabilities=['video.seek','video.get_state']))
   session_id=UUID(session['id'])
   await svc.context_async(session_id,ScreenSnapshot(page_instance_id=session['page_instance_id'],revision=1,captured_at=datetime.now(timezone.utc),route='/learning/fixture',course_id=course_id,lesson_id=lesson_id,video={'current_time':0,'duration':600,'is_playing':False}))
  simulated={'current_time':0.0,'is_playing':False}
  async def emit(kind,**values):
   if kind!='agent_event':return
   event=values['event'];record['events'].append(event['type'])
   if event['type']=='ui.action_requested':
    request=event['payload']
    if request['name']=='video.seek':simulated['current_time']=float(request['arguments']['seconds'])
    result={'actual_time':simulated['current_time'],'current_time':simulated['current_time'],'is_playing':simulated['is_playing']}
    async with AsyncSessionLocal() as db:
     svc=AgentService(db,SimpleNamespace(id=user_id),sid)
     await svc.receipt_async(UUID(event['run_id']),UUID(request['action_id']),ActionReceipt(page_instance_id=request['page_instance_id'],context_revision=request['context_revision'],lesson_id=lesson_id,status='completed',verified=True,result=result))
  relay=SimpleNamespace(user=SimpleNamespace(id=user_id),lesson_id=lesson_id,user_text='Tua video về phút thứ 3',sources=[],emit=emit)
  adapter=VoiceAgentAdapter(relay,session_id,sid)
  async with AsyncSessionLocal() as db:
   svc=AgentService(db,relay.user,sid);await svc.principal_async();session=await svc.get_session_async(session_id)
   from app.agent.tools import available
   adapter.names={name.replace('.','__'):name for name in available(session)}
  declarations=await adapter.declarations_async();record['declaration_count']=len(declarations)
  instructions='Bạn là trợ giảng Mây Mây. Khi học sinh yêu cầu tua video, gọi video__seek trước. Chỉ báo đã tua khi kết quả tool verified=true. Trả lời ngắn bằng tiếng Việt.'
  async with asyncio.timeout(75):
   async with open_realtime(instructions,'eve',1,declarations) as live:
    record['connected']=True
    await send_event(live,'conversation.item.create',item={
      'type':'message','role':'user','content':[{'type':'input_text','text':relay.user_text}],
    })
    await send_event(live,'response.create')
    calls=[]
    async for raw in live:
     event=json.loads(raw)
     kind=event['type']
     if kind=='error':raise ConnectionError('Grok Voice rejected probe event')
     if kind=='response.function_call_arguments.done':
      calls.append(event)
     if kind=='response.output_audio.delta':
      record['pcm_bytes']+=len(base64.b64decode(event['delta']))
     if kind=='response.done':
      if not calls:break
      for call in calls:
       name=call['name']
       arguments=json.loads(call['arguments'])
       record['tool_calls'].append({'name':name,'arguments':arguments})
       if name=='video__seek':record['real_native_model_tool_call']=True
       result=await adapter.call_async(name,arguments,call['call_id'])
       record['verified_result']=bool(result.get('verified'))
       await send_event(live,'conversation.item.create',item={
         'type':'function_call_output','call_id':call['call_id'],'output':json.dumps(result),
       })
      calls.clear()
      await send_event(live,'response.create')
  record['passed']=record['real_native_model_tool_call'] and record.get('verified_result') and 'ui.action_receipt' in record['events'] and 'tool.completed' in record['events'] and record['pcm_bytes']>0
 except Exception as exc:
  record['error_type']=type(exc).__name__
 finally:
  async with AsyncSessionLocal() as db:
   await db.execute(delete(User).where(User.id==user_id));await db.commit()
  await engine.dispose()
  args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(record,ensure_ascii=False,indent=2))
  print(json.dumps(record,ensure_ascii=False))
 return 0 if record['passed'] else 1
if __name__=='__main__':raise SystemExit(asyncio.run(main()))
