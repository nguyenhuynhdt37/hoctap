"""Voice schema translation and safe shared-tool dispatch, no provider network."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4
import pytest
from fastapi import HTTPException
from app.agent.voice import VoiceAgentAdapter, live_schema
from app.agent.tools import Patch


def test_live_schema_resolves_patch_refs_without_unsupported_keys():
    schema=live_schema(Patch.model_json_schema())
    hunk=schema['properties']['patches']['items']
    assert hunk['type']=='object'
    assert hunk['properties']['replacement']['type']=='string'
    assert '$ref' not in str(schema) and '$defs' not in str(schema)
    assert schema['required']==['exercise_id','base_revision','patches']

@pytest.mark.asyncio
async def test_voice_uses_transcript_shared_policy_and_stable_call_id():
    relay=SimpleNamespace(user=SimpleNamespace(id=uuid4()),user_text='Tua video về phút 3',sources=[],emit=AsyncMock())
    adapter=VoiceAgentAdapter(relay,uuid4(),uuid4());adapter.names={'video__seek':'video.seek'}
    async def execute(*args,**kwargs):
        assert args[3]=='video.seek' and args[4]=={'seconds':180}
        assert kwargs['message']==relay.user_text
        assert kwargs['idempotency_key'].endswith(':call1')
        return {'verified':True,'actual_time':180}
    with patch('app.agent.voice.execute_external_tool_async',execute):
        result=await adapter.call_async('video__seek',{'seconds':180},'call1')
    assert result['verified'] is True

@pytest.mark.asyncio
async def test_voice_unknown_denied_and_failed_calls_never_report_verified():
    relay=SimpleNamespace(user=SimpleNamespace(id=uuid4()),user_text='',sources=[],emit=AsyncMock())
    adapter=VoiceAgentAdapter(relay,uuid4(),uuid4());adapter.names={'video__seek':'video.seek'}
    assert not (await adapter.call_async('checkout',{},'x'))['verified']
    with patch('app.agent.voice.execute_external_tool_async',AsyncMock(side_effect=HTTPException(403,'No permission'))):
        result=await adapter.call_async('video__seek',{'seconds':180},'call2')
    assert result=={'verified':False,'error':'No permission'}


@pytest.mark.asyncio
async def test_voice_tool_uses_captured_intent_after_transcript_reset():
    relay=SimpleNamespace(user=SimpleNamespace(id=uuid4()),user_text='',sources=[],emit=AsyncMock())
    adapter=VoiceAgentAdapter(relay,uuid4(),uuid4());adapter.names={'video__seek':'video.seek'}
    async def execute(*args,**kwargs):
        assert kwargs['message']=='Tua video về phút 3'
        return {'verified':True,'actual_time':180}
    with patch('app.agent.voice.execute_external_tool_async',execute):
        result=await adapter.call_async('video__seek',{'seconds':180},'captured-call',user_message='Tua video về phút 3')
    assert result['verified']
