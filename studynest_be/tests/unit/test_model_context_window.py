import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx
import pytest
from app.agent.context_window import occupancy, model_window, CACHE
from app.agent.runtime import build_prompt
from app.core.settings import settings


def test_strict_eighty_percent_boundary():
    # ASCII: 1800 chars => 600 estimated tokens, plus 200 output reserve.
    args=dict(model='fixture',window=1000,source='fixture',output_tokens=200)
    assert not occupancy('x'*1797,**args)['should_compact']
    assert not occupancy('x'*1800,**args)['should_compact']
    assert occupancy('x'*1803,**args)['should_compact']
    assert occupancy('x'*1803,**args)['percent']==80.1


def test_unknown_model_limit_never_guesses_a_compression_threshold():
    usage=occupancy('x'*100000,model='unknown',window=None,source='unknown')
    assert usage['percent'] is None and not usage['should_compact']
    assert usage['estimated']


def test_normal_prompt_keeps_full_history_and_tool_results_without_excerpts():
    recent=[{'id':str(i),'role':'user','content':str(i)+'x'*5000} for i in range(80)]
    outputs=[{'name':'fixture','result':{'content':str(i)+'y'*9000}} for i in range(10)]
    context={'conversation':{'checkpoint':{'notes':[]},'uncompacted':recent[:70],'recent':recent[70:]}}
    prompt=build_prompt('Câu hiện tại',context,outputs)
    data=json.loads(prompt[prompt.index('{"user_request":'):])
    assert data['context']['conversation']==context['conversation']
    assert data['tool_results']==outputs
    assert not data['context']['context_policy']['compacted']
    assert len(prompt)>24000


@pytest.mark.asyncio
async def test_limits_are_selected_per_model_and_provider_metadata(monkeypatch):
    CACHE.clear()
    monkeypatch.setattr(settings,'AGENT_CONTEXT_WINDOWS_JSON','{}')
    def respond(request):
        return httpx.Response(200,json={'data':[
            {'id':'model-a','context_length':1000},
            {'id':'model-b','capabilities':{'contextWindow':2000}},
        ]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(respond))
    monkeypatch.setattr('app.agent.context_window.httpx.AsyncClient',lambda **kw:client)
    assert await model_window('9router','model-a')==(1000,'provider_metadata')
    assert await model_window('9router','model-b')==(2000,'provider_metadata')
    CACHE.clear()


@pytest.mark.asyncio
async def test_explicit_model_override_does_not_use_run_budget(monkeypatch):
    monkeypatch.setattr(settings,'AGENT_CONTEXT_WINDOWS_JSON','{"fixture": 1000000}')
    monkeypatch.setattr(settings,'AGENT_MAX_INPUT_TOKENS',100)
    assert await model_window('9router','fixture')==(1000000,'operator_override')
