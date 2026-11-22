/** Browser contract regression, no running app or real account required. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const sources = ['action-registry.ts', 'browser-workspace.ts'].map(file => fs.readFileSync(path.join(root, 'src/components/user/learning_detail/agent', file), 'utf8'));
const compiled = sources.map(source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText).join('\n');
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE} : {})});
 try {
  const page = await browser.newPage();
  await page.route('https://fixture.invalid/**', route => route.fulfill({contentType:'text/html',body:`<html><head><meta charset="utf-8"><title>Workspace fixture</title></head><body>
   <h1>Visible lesson text</h1><div data-agent-private>PRIVATE_CHAT_SENTINEL</div><p hidden>HIDDEN_SENTINEL</p>
   <button type="button" onclick="document.querySelector('#status').textContent='Opened notes'">Ghi chú</button><p id="status">Closed</p>
   <input type="search" placeholder="Tìm nội dung"><input type="password" aria-label="Mật khẩu" value="SECRET_SENTINEL">
   <form><button type="submit">Gửi bài</button></form><button>Xóa tài khoản</button><a href="https://outside.invalid">External</a>
   </body></html>`}));
  await page.goto('https://fixture.invalid/learning/test');
  await page.addScriptTag({content:`(()=>{const exports={};${compiled}\nwindow.WorkspaceHarness=exports;})();`});
  const result = await page.evaluate(async () => {
   const {BrowserWorkspace,ActionRegistry,registerBrowserWorkspace}=window.WorkspaceHarness;
   const workspace = new BrowserWorkspace(), first = workspace.snapshot();
   const find = name => first.controls.find(control=>control.name===name);
   const secretFree = !JSON.stringify(first).match(/PRIVATE_CHAT_SENTINEL|HIDDEN_SENTINEL|SECRET_SENTINEL|Mật khẩu/);
   const blockedTargets = ['Gửi bài','Xóa tài khoản','External'].every(name=>!find(name));
   const clicked = await workspace.click({snapshot_id:first.snapshot_id,target_id:find('Ghi chú').target_id,target_name:'Ghi chú'},new AbortController().signal);
   let stale=false;try{await workspace.click({snapshot_id:first.snapshot_id,target_id:find('Ghi chú').target_id,target_name:'Ghi chú'},new AbortController().signal);}catch{stale=true;}
   const snap=workspace.snapshot(), field=snap.controls.find(c=>c.can_fill);
   document.querySelector('input[type=search]').value='User typing';
   let preserved=false;try{workspace.fill({snapshot_id:snap.snapshot_id,target_id:field.target_id,target_name:field.name,value:'overwrite'});}catch{preserved=document.querySelector('input[type=search]').value==='User typing';}
   const state={schema_version:1,page_instance_id:'page-fixture',revision:1,captured_at:new Date().toISOString(),route:location.pathname};
   const registry=new ActionRegistry(()=>state);const cleanup=registerBrowserWorkspace(registry);
   const request=(name,args,approval)=>({name,arguments:args,action_id:crypto.randomUUID(),page_instance_id:state.page_instance_id,context_revision:1,expires_at:new Date(Date.now()+60000).toISOString(),...(approval?{approval_id:'approved'}:{})});
   const read=await registry.dispatch(request('mcp.browser_snapshot',{}));
   const target=read.result.controls.find(c=>c.can_fill);
   const args={snapshot_id:read.result.snapshot_id,target_id:target.target_id,target_name:target.name,value:'New search'};
   const denied=await registry.dispatch(request('mcp.browser_fill',args));
   const accepted=await registry.dispatch(request('mcp.browser_fill',args,true));
   cleanup();
   return {secretFree,blockedTargets,clickVerified:clicked.dispatched&&document.querySelector('#status').textContent==='Opened notes',stale,preserved,approvalEnforced:denied.status==='failed'&&accepted.verified,inputValue:document.querySelector('input[type=search]').value};
  });
  assert.equal(result.secretFree,true);assert.equal(result.blockedTargets,true);assert.equal(result.clickVerified,true);assert.equal(result.stale,true);assert.equal(result.preserved,true);assert.equal(result.approvalEnforced,true);assert.equal(result.inputValue,'New search');
  console.log(JSON.stringify({passed:true,...result}));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
