"""Live planner regression on conversation fixtures; does not execute actions."""
import argparse
import asyncio
import json
import sys
import time
from pydantic import ValidationError
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.agent.model_messages import configure_agent_llm, tool_reply_history
from app.agent.contracts import ModelDecision
from app.agent.runtime import build_prompt, strip_fence
from app.agent.tools import REGISTRY, available
from app.core.llm import LLMService
from app.core.settings import settings

COURSE = '11111111-1111-4111-8111-111111111111'
CAT = [{'role':'user','content':'Con gì đây?'}, {'role':'assistant','content':'Trong ảnh là những chú mèo.'}]
CATALOG = [{'role':'assistant','content':f'Khóa JavaScript có id {COURSE}; chưa tra học phí.'}]
CASES = [
    {'id':'technology_today_after_cat','message':'Thông tin bản tin về công nghệ ngày hôm nay','recent':CAT,'tools':{'mcp.web_search'}},
    {'id':'gold_today_after_cat','message':'Xem thông tin trên internet dự báo giá vàng hôm nay đi bạn.','recent':CAT,'tools':{'mcp.web_search'}},
    {'id':'nvidia_rumor_followup','message':'trên mạng người ta đồn kia kìa','recent':CAT+[{'role':'user','content':'NVIDIA có biến căng gì không?'},{'role':'assistant','content':'Bạn muốn kiểm tra tin đồn NVIDIA phải không?'}],'tools':{'mcp.web_search'}},
    {'id':'public_course_price','message':'Cho tôi xem giá khóa này hôm nay','recent':CATALOG,'tools':{'catalog.get_course','catalog.search_courses'}},
    {'id':'correct_false_capability_denial','message':'có á','recent':CATALOG+[{'role':'user','content':'Giá khóa học trên web này bao nhiêu?'},{'role':'assistant','content':'Mình không có công cụ xem học phí.'}],'tools':{'catalog.get_course','catalog.search_courses'}},
    {'id':'open_course','message':'Bạn có thể mở một khóa bất kỳ được không?','recent':CATALOG,'tools':{'mcp.browser_snapshot'}},
    {'id':'visible_screen','message':'Hiện tại tôi đang ở trang nào và đang bật những gì lên?','recent':CAT,'tools':{'mcp.browser_snapshot'}},
    {'id':'friend_identity','message':'bạn t tên gì','recent':CAT,'tools':set(),'contains':'An'},
    {'id':'own_identity','message':'tôi tên j','recent':CAT,'tools':set(),'contains':'Huỳnh'},
    {'id':'image_followup','message':'mèo j v','recent':CAT,'tools':{'memory.view_images'}},
    {'id':'empty_catalog_retry','message':'Trong web này có khóa nào hợp tôi không? Tôi thích lập trình','recent':CAT,'outputs':[{'name':'catalog.search_courses','ok':True,'result':{'items':[]}}],'tools':{'catalog.search_courses'}},
    {'id':'casual_hunger','message':'tôi đói','recent':CAT,'tools':set()},
    {'id':'discover_github_schema','message':'Đọc file src/main.py trong repo example/demo tại commit ' + 'a'*40,
     'recent':[],'tools':{'tools.discover','mcp.github_read_file'}},
]

async def probe(case):
    granted = available(SimpleNamespace(lesson_id=None, capabilities=['mcp.browser_snapshot','mcp.browser_click']))
    context = {
        'current_time':'2026-11-13T08:00:00+00:00','timezone':'Asia/Ho_Chi_Minh',
        'account':{'display_name':'Huỳnh'},'screen':{'route':'/'},
        'integrations':{'github':{'connected':True,'login':'fixture'}},
        # A misleading regex hint must not prevent model-directed research.
        'routing':{'domain':'image','advisory_only':True,'lesson_search_allowed':False},
        'image_history':[{'message_id':'image-fixture','mime_type':'image/jpeg'}],
        'memory':[{'scope':'profile','content':'Tôi tên Huỳnh. Bạn thân của tôi tên An.'}],
        'conversation':{'checkpoint':{'notes':[]},'recent':case['recent']},
        'tools':[{'name':t.name,'description':t.description,'input_schema':t.input_model.model_json_schema()} for t in granted.values()],
    }
    prompt = build_prompt(case['message'], context, case.get('outputs',[]))
    start = time.monotonic()
    try:
        trace = []
        native_history = []
        outputs = list(case.get('outputs', []))
        for turn in range(4):
            prompt = build_prompt(case['message'], context, outputs)
            llm = LLMService(model_override=settings.AGENT_MODEL or settings.TUTOR_CHAT_MODEL, stream_override=False)
            configure_agent_llm(llm, prompt, tool_history=native_history)
            raw = await asyncio.wait_for(llm.call_model(prompt, retries=1, mime_type='application/json', temperature=0, max_output_tokens=1500), timeout=45)
            decision = ModelDecision.model_validate_json(strip_fence(raw))
            trace.append([t.model_dump() for t in decision.tool_calls])
            invalid = []
            for call in decision.tool_calls:
                try:
                    granted[call.name].input_model.model_validate(call.arguments)
                except (ValidationError, KeyError) as exc:
                    invalid.append({'name':call.name,'ok':False,'error':str(type(exc).__name__) + ': wrong schema; use only declared fields'})
            if invalid:
                outputs.extend(invalid)
                native_history = tool_reply_history(llm, invalid)
                continue
            batch_start = len(outputs)
            if decision.tool_calls and all(t.name == 'tools.discover' for t in decision.tool_calls):
                for call in decision.tool_calls:
                    names = call.arguments.get('names', [])
                    schemas = [t for t in context['tools'] if t['name'] in names]
                    outputs.append({'name':'tools.discover','ok':True,'result':{'tools':schemas}})
                    context['discovered_tool_names'] = names
                native_history = tool_reply_history(llm, outputs[batch_start:])
                continue
            if case.get('contains') and decision.tool_calls and all(t.name in {'memory.read','memory.search_conversation'} for t in decision.tool_calls):
                for call in decision.tool_calls:
                    outputs.append({'name':call.name,'ok':True,'result':{'items':[{'content':'Tôi tên Huỳnh. Bạn thân của tôi tên An.'}]}})
                native_history = tool_reply_history(llm, outputs[batch_start:])
                continue
            if case['id'] == 'open_course' and decision.tool_calls and all(t.name in {'catalog.search_courses','catalog.get_course'} for t in decision.tool_calls):
                for call in decision.tool_calls:
                    result = {'id':COURSE,'title':'JavaScript','slug':'javascript-fixture','price':'100000','currency':'VND'}
                    if call.name == 'catalog.search_courses':result = {'items':[result]}
                    outputs.append({'name':call.name,'ok':True,'result':result})
                native_history = tool_reply_history(llm, outputs[batch_start:])
                continue
            break
        calls = [t.name for t in decision.tool_calls]
        valid = all(t.name in granted and granted[t.name].input_model.model_validate(t.arguments) is not None for t in decision.tool_calls)
        expected = case['tools']
        passed = valid and (bool(calls) and all(name in expected for name in calls) if expected else not calls)
        if case.get('contains'): passed = passed and case['contains'].casefold() in decision.message.casefold()
        return {'id':case['id'],'passed':bool(passed),'trace':trace,'tool_calls':[t.model_dump() for t in decision.tool_calls], 'message':decision.message,'latency_ms':round((time.monotonic()-start)*1000),'prompt_chars':len(prompt)}
    except Exception as exc:
        return {'id':case['id'],'passed':False,'error_type':type(exc).__name__, 'validation_errors':exc.errors(include_input=False) if hasattr(exc,'errors') else []}

async def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live',action='store_true');parser.add_argument('--output',type=Path,required=True);parser.add_argument('--model')
    args=parser.parse_args()
    if not args.live:parser.error('--live required for external model calls')
    if args.model:settings.AGENT_MODEL=args.model
    results=[]
    for case in CASES:
        result=await probe(case);results.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
    receipt={'timestamp':datetime.now(timezone.utc).isoformat(),'model':settings.AGENT_MODEL or settings.TUTOR_CHAT_MODEL,'synthetic_conversations':True,'tools_executed':False,'results':results,'passed':all(r['passed'] for r in results)}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(receipt,ensure_ascii=False,indent=2))
    return 0 if receipt['passed'] else 1
if __name__=='__main__':raise SystemExit(asyncio.run(main()))
