"""Opt-in real Piston checks; never executes submitted programs inside FastAPI.

Uses existing backend settings, emits only bounded observations, does not write DB.
Run: .venv/bin/python scripts/verify_agent_code_security.py --live
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
from app.services.shares.code_runner import PistonService
from app.services.user.code_security import classify_execution


async def verify():
    runner=PistonService()
    async with httpx.AsyncClient(timeout=15,headers=runner.headers) as client:
        response=await client.get(runner.base_url+'/api/v2/runtimes')
        response.raise_for_status()
        runtimes=response.json()
    python=next(r for r in runtimes if r['language']=='python')
    cpp=next(r for r in runtimes if r['language']=='c++')
    report={'runtime_versions':{'python':python['version'],'c++':cpp['version']},'checks':[]}
    async def run(name,files,*,stdin='',language=python,limit=1000,memory=128_000_000):
        response=await runner.run_code(language=language['language'],version=language['version'],files=files,
            stdin=stdin,run_timeout_ms=limit,memory_limit=memory)
        stage=response.get('run') or response.get('compile') or {}
        observed={'name':name,'exit_code':stage.get('code'),'status':stage.get('status'),
            'signal':stage.get('signal'),'stdout_bytes':len(stage.get('stdout','').encode()),
            'stderr_bytes':len(stage.get('stderr','').encode())}
        report['checks'].append(observed)
        return response,stage,observed
    _,stage,check=await run('multi_file_stdin',[
        {'name':'main.py','content':'from helper import add\na,b=map(int,input().split())\nprint(add(a,b))'},
        {'name':'helper.py','content':'def add(a,b): return a+b'}],stdin='20 22\n')
    check['passed']=stage.get('code')==0 and stage.get('stdout','').strip()=='42'
    _,stage,check=await run('timeout',[{'name':'main.py','content':'while True: pass'}],limit=250)
    check['passed']=stage.get('status')=='TO' and stage.get('code')!=0
    _,stage,check=await run('network_isolation',[{'name':'main.py','content':
        "import socket\ntry:\n s=socket.socket();s.settimeout(.3);s.connect(('1.1.1.1',80));print('NETWORK_OPEN')\nexcept OSError as e: print('DENIED:'+str(e.errno))"}])
    check['observation']=stage.get('stdout','').strip()
    check['passed']=stage.get('code')==0 and check['observation'] in {'DENIED:1','DENIED:13','DENIED:101'}
    _,stage,check=await run('output_cap',[{'name':'main.py','content':"print('x'*200000)"}])
    check['passed']=check['stdout_bytes']<=65_536 and stage.get('status') in {'OL','RE','SG'}
    response,stage,check=await run('compile_error_separation',[{'name':'main.cpp','content':'int main( { syntax error }'}],language=cpp)
    check['verdict']=classify_execution(response,'')[0]
    check['passed']=check['verdict']=='compile_error'
    _,stage,check=await run('memory_limit',[{'name':'main.py','content':"x=bytearray(300000000);print('UNBOUNDED')"}],memory=32_000_000)
    check['passed']=stage.get('code')!=0 and 'UNBOUNDED' not in stage.get('stdout','')
    report['passed']=all(c['passed'] for c in report['checks'])
    output=Path('/tmp/maymay-agent-verification/piston-security.json')
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    if not report['passed']:raise SystemExit(1)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--live',action='store_true');args=parser.parse_args()
    if not args.live:parser.error('Pass --live to authorize actual configured sandbox requests')
    asyncio.run(verify())
