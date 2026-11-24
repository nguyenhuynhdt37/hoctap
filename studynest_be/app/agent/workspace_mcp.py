"""Session-scoped browser bridge + isolated Bash over real MCP (SDK v1 memory transport).

MCP is a protocol, not a sandbox. Browser access remains in the user's page;
program execution is exclusively delegated to the configured Piston runner.
"""
import json
import asyncio
import re
from datetime import timedelta
from typing import Literal
import httpx
from fastapi import HTTPException
from mcp.server.fastmcp import FastMCP
from mcp.shared.memory import create_connected_server_and_client_session
from mcp.types import ToolAnnotations
from pydantic import Field
from app.agent.contracts import Contract
from app.core.settings import settings

BROWSER_TOOLS={'mcp.browser_snapshot','mcp.browser_click','mcp.browser_fill','mcp.browser_scroll','mcp.browser_highlight','mcp.browser_navigate'}

class BrowserTarget(Contract):
    snapshot_id: str = Field(min_length=8,max_length=80)
    target_id: str = Field(min_length=1,max_length=40)
    target_name: str = Field(min_length=1,max_length=220)

class BrowserFill(BrowserTarget):
    value: str = Field(max_length=2000)

class BrowserScroll(Contract):
    direction: Literal["up", "down", "top", "bottom"] = "down"
    amount: int = Field(default=480, ge=80, le=2400)
    target_id: str | None = Field(default=None, min_length=1, max_length=40)
    snapshot_id: str | None = Field(default=None, min_length=8, max_length=80)

class BrowserHighlight(Contract):
    snapshot_id: str = Field(min_length=8, max_length=80)
    target_id: str = Field(min_length=1, max_length=40)
    target_name: str = Field(min_length=1, max_length=220)
    note: str = Field(default="", max_length=280)

class BrowserNavigate(Contract):
    path: str = Field(min_length=1, max_length=320, pattern=r"^/[A-Za-z0-9_./?&=%-]*$")
    label: str = Field(default="", max_length=160)

class BashFile(Contract):
    name: str = Field(min_length=1,max_length=150)
    content: str = Field(max_length=20000)

class BashCommand(Contract):
    command: str = Field(min_length=1,max_length=6000)
    files: list[BashFile] = Field(default_factory=list,max_length=8)
    timeout_ms: int = Field(default=3000,ge=100,le=10000)


async def run_bash(command, files, timeout_ms):
    if not settings.PISTON_URL:
        raise HTTPException(503,'Bash sandbox chưa được cấu hình; không chạy lệnh trên máy chủ ứng dụng.')
    from app.services.shares.code_runner import PistonService
    from app.schemas.lecturer.lesson import validate_code_filename
    prepared=[]
    for item in files:
        validate_code_filename(item['name'])
        if item['name']=='main.sh':raise ValueError('main.sh dành cho lệnh thực thi')
        prepared.append(item)
    if sum(len(item['content'].encode()) for item in prepared)>64000:raise ValueError('Tệp sandbox vượt giới hạn')
    headers={'Authorization':'Bearer '+settings.PISTON_API_KEY} if settings.PISTON_API_KEY else {}
    async with httpx.AsyncClient(timeout=8,headers=headers) as client:
        response=await client.get(settings.PISTON_URL.rstrip('/')+'/api/v2/runtimes')
        response.raise_for_status()
        version=next((row['version'] for row in response.json() if row.get('language')=='bash'),None)
    if version is None:raise HTTPException(503,'Runner chưa cài Bash; không dùng shell của máy chủ làm dự phòng.')
    result=await PistonService().run_code('bash',[{'name':'main.sh','content':command},*prepared],version,
        run_timeout_ms=timeout_ms,memory_limit=134217728)
    run=result.get('run') or {}
    if not run:raise ValueError('Runner không trả bằng chứng thực thi')
    return {'stdout':str(run.get('stdout') or '')[:8192],'stderr':str(run.get('stderr') or '')[:4096],
        'exit_code':run.get('code'),'signal':run.get('signal'),'status':run.get('status'),
        'workspace':'isolated_ephemeral_piston','persistent_files':False,'tests_executed':None,'official_grading':False,
        'passed':run.get('code') == 0 and not run.get('signal'),'evidence_kind':'external_mcp',
        'notice':'Mỗi lệnh dùng workspace tạm riêng; chỉ nhận các tệp được gửi rõ trong files. Không truy cập máy chủ, DB, cookie hay token người dùng. Đây không phải kết quả chấm bài chính thức.'}


async def exchange(name, arguments, bridge=None):
    server=FastMCP('maymay-session-workspace',log_level='ERROR')
    read=ToolAnnotations(readOnlyHint=True,destructiveHint=False,openWorldHint=False)
    act=ToolAnnotations(readOnlyHint=False,destructiveHint=False,openWorldHint=False)
    @server.tool(annotations=read)
    async def browser_snapshot() -> dict:
        """Read the visible same-origin page and fresh target IDs, excluding assistant/secrets."""
        if bridge is None:raise ValueError('No active browser bridge')
        return await bridge({})
    @server.tool(annotations=act)
    async def browser_click(snapshot_id:str,target_id:str,target_name:str) -> dict:
        """Click a fresh visible non-sensitive target after native application policy checks."""
        if bridge is None:raise ValueError('No active browser bridge')
        return await bridge({'snapshot_id':snapshot_id,'target_id':target_id,'target_name':target_name})
    @server.tool(annotations=act)
    async def browser_fill(snapshot_id:str,target_id:str,target_name:str,value:str) -> dict:
        """Fill a non-sensitive field after native user approval, never submit it."""
        if bridge is None:raise ValueError('No active browser bridge')
        return await bridge({'snapshot_id':snapshot_id,'target_id':target_id,'target_name':target_name,'value':value})
    @server.tool(annotations=act)
    async def browser_scroll(direction:str='down',amount:int=480,target_id:str|None=None,snapshot_id:str|None=None) -> dict:
        """Scroll the active learning viewport or bring a target element into view."""
        if bridge is None:raise ValueError('No active browser bridge')
        payload={'direction':direction,'amount':amount}
        if target_id:payload['target_id']=target_id
        if snapshot_id:payload['snapshot_id']=snapshot_id
        return await bridge(payload)
    @server.tool(annotations=act)
    async def browser_highlight(snapshot_id:str,target_id:str,target_name:str,note:str='') -> dict:
        """Highlight and point to a visible element on screen with an explanatory callout."""
        if bridge is None:raise ValueError('No active browser bridge')
        return await bridge({'snapshot_id':snapshot_id,'target_id':target_id,'target_name':target_name,'note':note})
    @server.tool(annotations=act)
    async def browser_navigate(path:str,label:str='') -> dict:
        """Navigate the same-origin web application to an authorized public/learning path."""
        if bridge is None:raise ValueError('No active browser bridge')
        if re.match(r'^/(?:admin|login|register|auth|checkout|payment)(?:/|$)',path):
            raise ValueError('Path is outside assistant navigation scope')
        return await bridge({'path':path,'label':label})
    @server.tool(annotations=act)
    async def bash(command:str,files:list[dict],timeout_ms:int=3000) -> dict:
        """Execute Bash only in the isolated runner, with no app credentials or host files."""
        validated=BashCommand.model_validate({'command':command,'files':files,'timeout_ms':timeout_ms})
        return await run_bash(validated.command,[f.model_dump() for f in validated.files],validated.timeout_ms)
    alias=name.removeprefix('mcp.')
    if name not in BROWSER_TOOLS|{'mcp.bash'}:raise HTTPException(403,'Workspace MCP tool không được cấp')
    try:
        async with create_connected_server_and_client_session(server,read_timeout_seconds=timedelta(seconds=25)) as session:
            result=await session.call_tool(alias,arguments)
    except asyncio.CancelledError:
        raise
    except HTTPException:
        raise
    except Exception as exc:
        detail = getattr(exc, 'detail', None) or str(exc)
        raise HTTPException(502, f'Workspace MCP chưa trả được kết quả ({detail[:200]}).') from None
    if result.isError:
        err_text = ''.join(getattr(item, 'text', '') for item in (result.content or [])).strip()
        raise HTTPException(409 if 'Màn hình đã đổi' in err_text or 'Không xác minh được' in err_text else 502,
                            err_text[:280] or 'Workspace MCP chưa thực hiện được lệnh; chưa có kết quả được xác minh.')
    data=result.structuredContent
    if data is None:data=json.loads(''.join(item.text for item in result.content if item.type=='text'))
    if not isinstance(data,dict):raise HTTPException(502,'Workspace MCP trả dữ liệu không hợp lệ.')
    return data


async def bash_handler(ctx,args):
    return await exchange('mcp.bash',args.model_dump(mode='json'))
