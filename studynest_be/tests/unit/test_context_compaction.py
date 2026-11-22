import json
from app.agent.context_compaction import compact_prompt, transcript_excerpt
from app.agent.runtime import build_prompt
from app.agent.tools import REGISTRY


def huge_context():
    return {'routing':{'domain':'lesson','lesson_search_allowed':True},
        'tools':[{'name':t.name,'description':t.description,'input_schema':t.input_model.model_json_schema()} for t in REGISTRY.values()],
        'lesson_content':{section:{'content':'Nguồn bài học. '*12000} for section in ['overview','transcript','notes','exercises','quiz','resources']},
        'conversation':{'summary':'Older task '*3000,'summary_evidence':[{'content':'duplicate '*3000}],
            'recent':[{'id':str(n),'role':'user' if n%2 else 'assistant','content':f'Turn {n} '+'long '*3000} for n in range(50)]},
        'memory':[{'content':'Saved fact '*100} for _ in range(100)]}


def test_prompt_preserves_full_history_and_outputs_until_runtime_window_trigger():
    context=huge_context()
    outputs=[{'name':'learning.fetch_video_transcript','ok':True,'result':{'content':'caption '*1500,'index':i+1,'next_offset':(i+1)*12000,'total_characters':100000}} for i in range(3)]
    before=json.dumps(context)
    prompt=build_prompt('khó hiểu toàn bộ',context,outputs)
    assert len(prompt)>24000
    payload=json.loads(prompt[prompt.index('{"user_request":'):])
    assert payload['user_request']=='khó hiểu toàn bộ'
    assert not payload['context']['context_policy']['compacted']
    assert payload['context']['conversation'] == context['conversation']
    assert len(payload['tool_results'])==3
    assert json.dumps(context)==before
    assert 'next_offset chỉ là lựa chọn' in prompt


def test_current_user_message_is_never_truncated():
    message='x'*12000
    prompt=build_prompt(message,huge_context(),[])
    assert json.loads(prompt[prompt.index('{"user_request":'):])['user_request']==message
    assert len(prompt)>24000


def test_selected_tool_schemas_remain_real_json_schemas():
    prompt=build_prompt('khó hiểu toàn bộ',huge_context(),[])
    payload=json.loads(prompt[prompt.index('{"user_request":'):])
    for tool in payload['context']['tools']:
        assert 'name' in tool and tool['input_schema']['type']=='object'


def test_transcript_focus_is_near_current_time_and_overview_samples_multiple_parts():
    full='\n'.join(f'- `{n//60:02d}:{n%60:02d}` Nội dung quan trọng tại giây {n}. '+('chi tiết '*15) for n in range(0,3600,10))
    page,offset,truncated,scope=transcript_excerpt(full,seconds=1347)
    assert '22:20' in page or '22:30' in page
    assert len(page)<=5000 and offset>0 and truncated and scope=='current_video_window'
    overview,offset,truncated,scope=transcript_excerpt(full,overview=True)
    assert len(overview)<=5000 and 'Trích đoạn 6/6' in overview and scope=='representative_excerpts'
    assert transcript_excerpt('short source')[2:] == (False,'complete')
