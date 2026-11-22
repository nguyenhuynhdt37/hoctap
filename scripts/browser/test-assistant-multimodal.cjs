/* Isolated account/database, real private upload + native image parts transport.
   Planner and dictation response are deterministic here; provider tests run separately. */
const fs=require('node:fs');const assert=require('node:assert/strict');
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=require(modulePath);const {expect}=require(modulePath+'/test');
const origin=process.env.HANNES_BROWSER_ORIGIN||'http://localhost:3107';
const fixture=JSON.parse(fs.readFileSync(process.env.HANNES_BROWSER_FIXTURE||'/tmp/hannes-verification/browser-fixture.json'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const context=await browser.newContext({viewport:{width:1000,height:950},permissions:['microphone']});
  await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
  await context.addInitScript(()=>{window.__dictationStreams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await original(...args);window.__dictationStreams.push(stream);return stream;};});
  const page=await context.newPage();console.log('Synthetic browser ready');const errors=[];let submitted=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/agent/runs'))submitted++;});
  await page.route('**/api/agent/transcribe',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({text:'Mình muốn hỏi về con vật trong ảnh.'})}));
  await page.goto(origin+'/chat-sql',{waitUntil:'domcontentloaded',timeout:90000});
  const panel=page.locator('div[aria-label="Hội thoại Hannes"]:visible').locator('..');
  await expect(panel).toBeVisible();await expect(panel.getByText('Đang tải hội thoại…',{exact:true})).toBeHidden({timeout:30000});
  await panel.getByLabel('Chọn ảnh để hỏi trợ lý').setInputFiles('/tmp/hannes-verification/vision-fixture.jpg');
  await expect(panel.getByText('Sẵn sàng',{exact:true})).toBeVisible({timeout:30000});
  await panel.getByRole('textbox',{name:'Nhắn Hannes'}).fill('Xem ảnh đính kèm [multimodal browser '+Date.now()+']');
  await panel.getByRole('button',{name:'Gửi cho Hannes'}).click();
  await expect(panel.getByText('Ảnh được gửi tới mô hình thị giác.',{exact:true}).last()).toBeVisible({timeout:30000});
  await expect(panel.getByLabel('Ảnh chờ gửi')).toHaveCount(0,{timeout:15000});
  await expect(panel.locator('img').last()).toBeVisible();
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(panel.locator('img').last()).toBeVisible({timeout:15000});
  const before=submitted;
  await panel.getByRole('button',{name:'Nhập bằng giọng nói',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Dừng nhập bằng giọng nói'})).toBeVisible();
  await page.waitForTimeout(600);
  await panel.getByRole('button',{name:'Dừng nhập bằng giọng nói'}).click();
  await expect(panel.getByRole('textbox',{name:'Nhắn Hannes'})).toHaveValue('Mình muốn hỏi về con vật trong ảnh.',{timeout:15000});
  await expect(panel.getByRole('button',{name:'Gửi cho Hannes'})).toBeEnabled();
  assert.equal(submitted,before,'Dictation fills text without submitting it');
  assert(await page.evaluate(()=>window.__dictationStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  assert.deepEqual(errors,[]);
  const report={passed:true,checks:['image upload and preview','actual image parts reach planner','image history survives reload','dictation fills editable input without sending','mic tracks released','no browser errors']};
  fs.writeFileSync('/tmp/hannes-verification/multimodal-browser-report.json',JSON.stringify(report,null,2));await page.screenshot({path:'/tmp/hannes-verification/multimodal-desktop.png'});console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
