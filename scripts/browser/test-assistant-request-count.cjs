/* Isolated fixture: own-name query must not refetch history/integrations or run tools. */
const fs=require('node:fs');const assert=require('node:assert/strict');
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';const {chromium}=require(modulePath);const {expect}=require(modulePath+'/test');
const origin=process.env.HANNES_BROWSER_ORIGIN||'http://localhost:3107';
const fixture=JSON.parse(fs.readFileSync(process.env.HANNES_BROWSER_FIXTURE||'/tmp/hannes-verification/browser-fixture.json'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext();await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();const requests=[];
  page.on('request',r=>{requests.push(new URL(r.url()).pathname);});
  await page.goto(origin+'/chat-sql',{waitUntil:'domcontentloaded',timeout:90000});
  const panel=page.locator('div[aria-label="Hội thoại Hannes"]:visible').locator('..');await expect(panel).toBeVisible();await expect(panel.getByText('Đang tải hội thoại…',{exact:true})).toBeHidden({timeout:30000});
  await page.waitForTimeout(500);const before=requests.length;
  await page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new Event('focus'));});
  await panel.getByRole('textbox',{name:'Nhắn Hannes'}).fill('tớ tên gì');await panel.getByRole('button',{name:'Gửi cho Hannes'}).click();
  await expect(panel.getByText(/Theo hồ sơ tài khoản, tên bạn là/).last()).toBeVisible({timeout:15000});
  await page.waitForTimeout(500);
  const extra=requests.slice(before);const forbidden=extra.filter(path=>['/api/agent/github','/api/agent/memory/consent','/api/agent/memory','/api/agent/conversation','/api/catalog/filters'].includes(path));
  assert.deepEqual(forbidden,[],'Focus and a name question must not trigger auxiliary fetches');
  const report={passed:true,extraRequests:extra,unrelatedRequests:forbidden.length,checks:['focus does not refresh memory/GitHub','name answered from account profile','no full conversation reload']};
  fs.writeFileSync('/tmp/hannes-verification/request-count-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
