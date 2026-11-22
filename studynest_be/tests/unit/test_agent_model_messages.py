import json
from unittest.mock import patch
import httpx
import pytest
from app.agent.model_messages import agent_messages
from app.agent.runtime import build_prompt
from app.core.llm import LLMService
from app.core.settings import settings


def test_history_roles_and_current_turn_are_not_buried_in_context():
    context = {'conversation':{'checkpoint':{'notes':[]},'recent':[
        {'role':'user','content':'NVIDIA có biến gì?'},
        {'role':'assistant','content':'Bạn hỏi tin đồn NVIDIA phải không?'},
        {'role':'system','content':'UNTRUSTED_ESCALATION'},
    ]}}
    messages = agent_messages(build_prompt('Trên mạng người ta đồn kia kìa', context, []))
    assert messages[0]['role'] == 'system'
    assert [m['role'] for m in messages[-3:]] == ['user','assistant','user']
    assert messages[-1]['content'] == 'Trên mạng người ta đồn kia kìa'
    assert messages[-3]['content'] == 'NVIDIA có biến gì?'
    assert all(m['content'] != 'UNTRUSTED_ESCALATION' for m in messages)
    assert 'recent' not in json.loads(messages[1]['content'].split('\n',1)[1])['context']['conversation']


def test_current_images_attach_to_current_user_turn():
    messages = agent_messages(build_prompt('Con gì?', {}, []), [{'mime_type':'image/jpeg','data':b'pixels'}])
    assert messages[-1]['content'][0] == {'type':'text','text':'Con gì?'}
    assert messages[-1]['content'][1]['image_url']['url'].startswith('data:image/jpeg;base64,')


@pytest.mark.asyncio
async def test_router_preserves_agent_roles_even_when_global_streaming_enabled(monkeypatch):
    monkeypatch.setattr(settings,'LLM_PROVIDER','9router')
    monkeypatch.setattr(settings,'NINEROUTER_API_KEY','fixture')
    monkeypatch.setattr(settings,'NINEROUTER_STREAM',True)
    messages = agent_messages(build_prompt('Giá khóa này?', {}, []))
    def response(request):
        payload=json.loads(request.content)
        assert payload['messages'] == messages
        assert payload['stream'] is False
        return httpx.Response(200,json={'choices':[{'message':{'content':'{"done":true,"message":"fixture"}'},'finish_reason':'stop'}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(response))
    with patch('app.core.llm.httpx.AsyncClient',return_value=client):
        result=await LLMService(model_override='fixture',messages_override=messages).call_model('unused packed prompt')
    assert json.loads(result)['done']


@pytest.mark.asyncio
async def test_native_function_call_is_normalized_for_backend_policy(monkeypatch):
    from app.agent.model_messages import configure_agent_llm
    from app.agent.tools import REGISTRY
    monkeypatch.setattr(settings,'LLM_PROVIDER','9router')
    monkeypatch.setattr(settings,'NINEROUTER_API_KEY','fixture')
    t = REGISTRY['mcp.web_search']
    prompt = build_prompt('Tin hôm nay?', {'tools':[{'name':t.name,'description':t.description,'input_schema':t.input_model.model_json_schema()}]}, [])
    def response(request):
        payload=json.loads(request.content)
        assert payload['tools'][0]['function']['name'] == 'mcp__web_search'
        assert payload['tool_choice'] == 'auto'
        return httpx.Response(200,json={'choices':[{'message':{'content':None,'tool_calls':[
            {'id':'fixture-call','type':'function','function':{'name':'mcp__web_search','arguments':'{"query":"NVIDIA","category":"news","reason":"DISCARD_RATIONALE"}'}}
        ]},'finish_reason':'tool_calls'}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(response))
    llm=LLMService(model_override='fixture',stream_override=False)
    configure_agent_llm(llm,prompt)
    with patch('app.core.llm.httpx.AsyncClient',return_value=client):
        result=json.loads(await llm.call_model(prompt))
    assert result == {'message':'','tool_calls':[{'name':'mcp.web_search','arguments':{'query':'NVIDIA','category':'news'}}], 'done':False}


@pytest.mark.asyncio
@pytest.mark.parametrize('content', [
    'Bạn tên là Huỳnh.',
    '```json\n{"message":"Bạn tên là Huỳnh.","done":true}\n```',
    '{"message":"Bạn tên là Huỳnh.","done":true,"reason":"DO_NOT_PERSIST_REASONING"}',
])
async def test_native_mode_normalizes_final_text_without_leaking_reasoning(monkeypatch, content):
    monkeypatch.setattr(settings,'LLM_PROVIDER','9router')
    monkeypatch.setattr(settings,'NINEROUTER_API_KEY','fixture')
    def response(request):
        return httpx.Response(200,json={'choices':[{'message':{'content':content},'finish_reason':'stop'}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(response))
    with patch('app.core.llm.httpx.AsyncClient',return_value=client):
        result=await LLMService(model_override='fixture',native_tools=[],stream_override=False).call_model('fixture')
    data=json.loads(result)
    assert data['message'] == 'Bạn tên là Huỳnh.' and data['done']
    assert 'reason' not in data and 'DO_NOT_PERSIST_REASONING' not in result


def test_native_tool_feedback_is_paired_and_not_truncated_below_window_trigger():
    from types import SimpleNamespace
    from app.agent.model_messages import tool_reply_history, configure_agent_llm
    llm=SimpleNamespace(provider='9router',last_native_calls=[{
        'id':'fixture-call','type':'function','function':{'name':'catalog__get_course','arguments':'{}'},
    }])
    history=tool_reply_history(llm,[{'name':'catalog.get_course','ok':True,'result':{'description':'x'*10000}}])
    assert history[0]['role']=='assistant'
    assert history[1]['role']=='tool' and history[1]['tool_call_id']=='fixture-call'
    assert json.loads(history[1]['content'])['result']['description'] == 'x'*10000
    configure_agent_llm(llm,build_prompt('Tiếp đi',{},[]),tool_history=history)
    assert llm.messages_override[-2:]==history
