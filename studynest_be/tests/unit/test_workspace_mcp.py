import asyncio
import json
from unittest.mock import AsyncMock,patch
import httpx
import pytest
from fastapi import HTTPException
from app.agent.workspace_mcp import exchange, run_bash
from app.core.settings import settings



@pytest.mark.asyncio
async def test_real_mcp_handshake_uses_only_this_sessions_browser_callback():
    first=AsyncMock(return_value={'snapshot_id':'page-a','text':'A'})
    second=AsyncMock(return_value={'snapshot_id':'page-b','text':'B'})
    a,b=await asyncio.gather(exchange('mcp.browser_snapshot',{},first),exchange('mcp.browser_snapshot',{},second))
    assert a['snapshot_id']=='page-a' and b['snapshot_id']=='page-b'
    first.assert_awaited_once_with({});second.assert_awaited_once_with({})


@pytest.mark.asyncio
async def test_mcp_click_preserves_target_binding_and_failure_is_not_success():
    args={'snapshot_id':'abcdefgh','target_id':'e1','target_name':'Ghi chú'}
    callback=AsyncMock(return_value={'dispatched':True})
    assert (await exchange('mcp.browser_click',args,callback))['dispatched']
    callback.assert_awaited_once_with(args)
    callback.side_effect=RuntimeError('fixture stale target')
    with pytest.raises(HTTPException):await exchange('mcp.browser_click',args,callback)
    with pytest.raises(HTTPException):await exchange('mcp.untrusted_tool',{})


@pytest.mark.asyncio
async def test_bash_only_sends_explicit_files_to_private_runner_with_limits(monkeypatch):
    monkeypatch.setattr(settings,'PISTON_URL','https://runner.example')
    monkeypatch.setattr(settings,'PISTON_API_KEY','fixture-private-key')
    original=httpx.AsyncClient;requests=[]
    def handler(request):
        requests.append(request)
        assert request.headers['Authorization']=='Bearer fixture-private-key'
        if request.method=='GET':return httpx.Response(200,json=[{'language':'bash','version':'5.2.0'}])
        body=json.loads(request.content)
        assert body['language']=='bash' and body['run_timeout']==1000
        assert body['run_memory_limit']==134217728
        assert body['files']==[{'name':'main.sh','content':'cat data.txt'},{'name':'data.txt','content':'hello'}]
        assert 'env' not in body and 'fixture-private-key' not in request.content.decode()
        return httpx.Response(200,json={'run':{'stdout':'hello','stderr':'','code':0}})
    monkeypatch.setattr('app.agent.workspace_mcp.httpx.AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(handler),**kwargs))
    result=await exchange('mcp.bash',{'command':'cat data.txt','files':[{'name':'data.txt','content':'hello'}],'timeout_ms':1000})
    assert result['exit_code']==0 and not result['persistent_files'] and not result['tests_executed']
    assert len(requests)==2


@pytest.mark.asyncio
async def test_unconfigured_sandbox_never_uses_host_shell(monkeypatch):
    monkeypatch.setattr(settings,'PISTON_URL','')
    with patch('asyncio.create_subprocess_exec',side_effect=AssertionError('No host execution')):
        with pytest.raises(HTTPException):await run_bash('printf hello',[],1000)


