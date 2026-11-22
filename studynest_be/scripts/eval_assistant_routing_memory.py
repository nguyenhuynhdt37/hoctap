"""Opt-in real model eval on synthetic inputs, no writes. Run with --live --output /tmp/report.json."""
import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.agent.routing import route_request,tool_relevant
from app.agent.runtime import build_prompt,strip_fence
from app.agent.contracts import ModelDecision
from app.agent.semantic_memory import validate_selection
from app.agent.tools import REGISTRY
from app.core.llm import LLMService
from app.core.settings import settings
from app.agent.budgets import reserve_model

SMOKE={'general-python','general-github-concept','personal-name-slang','personal-preference','memory-reported','github-list','account-progress','lesson-summary','lesson-content','quoted-source','followup-more','memory-optout'}
MEMORY=[
 ('occupation','Mình làm kế toán, hãy lấy ví dụ liên quan công việc để giải thích nhé?',True),
 ('learning-style','Mỗi khi học, mình tiếp thu tốt hơn bằng sơ đồ và ví dụ thực tế',True),
 ('long-goal','Sau giờ làm tôi thường học tiếng Nhật để thi N3 năm sau',True),
 ('ephemeral','Hôm nay tôi đang đói, gợi ý bữa trưa giúp tôi',False),
 ('hypothetical','Giả sử tôi làm bác sĩ thì nên học môn gì?',False),
 ('optout','Đừng lưu thông tin này: mình làm kế toán',False),
]

async def main(args):
 cases=json.loads((Path(__file__).resolve().parents[1]/'tests/evals/assistant_routing_cases.json').read_text())
 cases=[c for c in cases if c['id'] in SMOKE]
 cases += [dict(id='semantic-'+key,message=text,search=False,expect_memory=expect) for key,text,expect in MEMORY]
 if args.case_ids:cases=[case for case in cases if case['id'] in args.case_ids.split(',')]
 slots=asyncio.Semaphore(2)
 async def evaluate(case):
  async with slots:
   route=route_request(case['message'])
   names=['knowledge.search_lesson','mcp.github_list_repositories','data.query_account']
   tools=[dict(name=name,description=REGISTRY[name].description,input_schema=REGISTRY[name].input_model.model_json_schema()) for name in names if name in REGISTRY and tool_relevant(name,case['message'])]
   context={'routing':route.public(),'tools':tools,'screen':{},'account':{'display_name':'Test User'},'memory':[],'lesson':{'title':'Fixture lesson: vòng lặp','course_title':'Fixture course'},'integrations':{'github':{'connected':True,'login':'fixture-user'}}}
   llm=LLMService(model_override=settings.AGENT_MODEL or settings.TUTOR_CHAT_MODEL or None, stream_override=False)
   if llm.provider=='9router':
    from app.services.admin.ai_settings import get_chat_model
    llm.model_override=llm.model_override or await get_chat_model();model=llm.model_override
   else:model=llm.primary_model
   prompt=build_prompt(case['message'],context,[]);reserve_model({},prompt,model,1200)
   started=time.monotonic()
   try:
    raw=await asyncio.wait_for(llm.call_model(prompt,retries=1,mime_type='application/json',temperature=0,max_output_tokens=1200),timeout=settings.AGENT_MODEL_TIMEOUT_SECONDS)
    decision=ModelDecision.model_validate_json(strip_fence(raw));names=[call.name for call in decision.tool_calls]
    valid=[m for m in decision.memories if validate_selection(case['message'],m)]
    passed=not ('knowledge.search_lesson' in names and not case['search'])
    if case.get('ground'):passed=passed and 'knowledge.search_lesson' in names
    if 'expect_memory' in case:passed=passed and bool(valid)==case['expect_memory']
    row={'id':case['id'],'passed':passed,'seconds':round(time.monotonic()-started,2),'tools':names,'selected_memories':len(decision.memories),'validated_memories':len(valid),'usage':getattr(llm,'last_usage',{})}
   except Exception as exc:row={'id':case['id'],'passed':False,'seconds':round(time.monotonic()-started,2),'error_type':type(exc).__name__}
   print(json.dumps(row,ensure_ascii=False),flush=True);return row
 rows=await asyncio.gather(*(evaluate(case) for case in cases))
 report={'case_count':len(rows),'passed':sum(row['passed'] for row in rows),'cases':rows,'synthetic_data_only':True}
 Path(args.output).write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({'summary':{'passed':report['passed'],'total':len(rows)}}),flush=True)
 return 0 if report['passed']==len(rows) else 1

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--case-ids');parser.add_argument('--live',action='store_true');parser.add_argument('--output',required=True);args=parser.parse_args()
 if not args.live:parser.error('Use --live to enable provider requests')
 raise SystemExit(asyncio.run(main(args)))
