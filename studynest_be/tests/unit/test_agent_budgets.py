"""Deterministic spend admission and provider usage bookkeeping, no network."""
import json
from unittest.mock import AsyncMock,patch
import httpx
import pytest
from fastapi import HTTPException
from app.agent.budgets import record_reported,reserve_model
from app.core.llm import LLMService
from app.core.settings import settings


def test_cost_limit_fails_closed_when_selected_model_has_no_declared_rate(monkeypatch):
    monkeypatch.setattr(settings,'AGENT_MAX_RUN_COST_USD',.01)
    monkeypatch.setattr(settings,'AGENT_MODEL_PRICES_JSON','{}')
    with pytest.raises(HTTPException) as exc:reserve_model({},'hello','unknown',100)
    assert exc.value.status_code==503


def test_output_reservation_is_bounded_across_calls(monkeypatch):
    monkeypatch.setattr(settings,'AGENT_MAX_RUN_COST_USD',None)
    monkeypatch.setattr(settings,'AGENT_MAX_OUTPUT_TOKENS_TOTAL',3000)
    usage=reserve_model({},'hello','model',2500)
    with pytest.raises(HTTPException) as exc:reserve_model(usage,'hello','model',501)
    assert exc.value.status_code==429
    assert usage['reserved_output_tokens']==2500
    assert 'provider_reported_completion_tokens' not in usage


def test_monetary_reservation_prevents_dispatch_over_operator_cap(monkeypatch):
    monkeypatch.setattr(settings,'AGENT_MAX_RUN_COST_USD',.000001)
    monkeypatch.setattr(settings,'AGENT_MODEL_PRICES_JSON',json.dumps({'model':{'input_per_million_usd':10,'output_per_million_usd':20}}))
    with pytest.raises(HTTPException) as exc:reserve_model({},'hello','model',100)
    assert exc.value.status_code==429


def test_reported_usage_is_distinct_from_reserved_and_missing_is_not_invented(monkeypatch):
    monkeypatch.setattr(settings,'AGENT_MODEL_PRICES_JSON',json.dumps({'model':{'input_per_million_usd':1,'output_per_million_usd':2}}))
    usage=record_reported({'reserved_output_tokens':3000},{},'model')
    assert usage['provider_usage_missing_calls']==1
    assert 'provider_reported_completion_tokens' not in usage
    usage=record_reported(usage,{'prompt_tokens':10,'completion_tokens':20,'total_tokens':30},'model')
    assert usage['provider_reported_prompt_tokens']==10
    assert usage['provider_reported_completion_tokens']==20
    assert usage['reserved_output_tokens']==3000
    assert usage['priced_reported_usage_usd']==.00005
    assert 'actual_billed_cost_usd' not in usage


@pytest.mark.asyncio
async def test_ninerouter_string_api_preserves_usage_metadata(monkeypatch):
    monkeypatch.setattr(settings,'LLM_PROVIDER','9router')
    monkeypatch.setattr(settings,'NINEROUTER_API_KEY','fixture-key')
    monkeypatch.setattr(settings,'NINEROUTER_STREAM',False)
    client=httpx.AsyncClient(transport=httpx.MockTransport(lambda request:httpx.Response(200,json={'usage':{'prompt_tokens':100,'completion_tokens':20,'total_tokens':120},'choices':[{'finish_reason':'stop','message':{'content':'{"ok":true}'}}]})))
    with patch('app.core.llm.httpx.AsyncClient',return_value=client):
        llm=LLMService(model_override='fixture-model')
        assert json.loads(await llm.call_model('fixture'))=={'ok':True}
    assert llm.last_usage=={'prompt_tokens':100,'completion_tokens':20,'total_tokens':120}
    assert llm.last_model=='fixture-model'


@pytest.mark.asyncio
async def test_ninerouter_sse_usage_only_frame_is_recorded(monkeypatch):
    monkeypatch.setattr(settings,'LLM_PROVIDER','9router')
    monkeypatch.setattr(settings,'NINEROUTER_API_KEY','fixture-key')
    monkeypatch.setattr(settings,'NINEROUTER_STREAM',True)
    data=[{'choices':[{'delta':{'content':'{"ok":true}'},'finish_reason':'stop'}]}, {'usage':{'prompt_tokens':8,'completion_tokens':4,'total_tokens':12},'choices':[]}]
    def handle(request):
        assert json.loads(request.content)['stream_options']['include_usage']
        return httpx.Response(200,text=''.join('data: '+json.dumps(event)+'\n\n' for event in data)+'data: [DONE]\n\n')
    client=httpx.AsyncClient(transport=httpx.MockTransport(handle))
    with patch('app.core.llm.httpx.AsyncClient',return_value=client):
        llm=LLMService(model_override='fixture-model')
        assert json.loads(await llm.call_model('fixture'))=={'ok':True}
    assert llm.last_usage=={'prompt_tokens':8,'completion_tokens':4,'total_tokens':12}
