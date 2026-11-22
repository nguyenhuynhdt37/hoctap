/* Run against the isolated Hannes fixture (scripted planner, real SQL sandbox/SSE).
   No production account, microphone or provider calls are used. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const modulePath = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(modulePath);
const { expect } = require(modulePath + '/test');
const origin = process.env.HANNES_BROWSER_ORIGIN || 'http://localhost:3107';
const fixture = JSON.parse(fs.readFileSync(process.env.HANNES_BROWSER_FIXTURE || '/tmp/hannes-verification/browser-fixture.json'));

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const context = await browser.newContext({viewport:{width:1100,height:900}});
    await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin + '/chat-sql', {waitUntil:'domcontentloaded',timeout:90000});
    const panel = page.locator('div[aria-label="Hội thoại Hannes"]:visible').locator('..');
    await expect(panel).toBeVisible({timeout:30000});
    await expect(panel.getByText('Đang tải hội thoại…',{exact:true})).toBeHidden({timeout:30000});
    const question = '[Activity verification] xem tiến độ tài khoản ' + Date.now();
    await panel.getByRole('textbox',{name:'Nhắn Hannes',exact:true}).fill(question);
    await panel.getByRole('button',{name:'Gửi cho Hannes',exact:true}).click();
    await expect(panel.getByText('Đang suy nghĩ · phân tích yêu cầu…',{exact:true})).toBeVisible({timeout:30000});
    await expect(panel.getByText('Đã đọc SQL sandbox của tài khoản.',{exact:true}).last()).toBeVisible({timeout:30000});
    const trace = panel.locator('details[aria-label="Tiến trình thực hiện"]').last();
    await expect(trace).toHaveJSProperty('open',false,{timeout:10000});
    await trace.locator(':scope > summary').click();
    await expect(trace.getByText('Truy vấn SQL sandbox',{exact:true})).toBeVisible();
    await trace.locator('details > summary').click();
    await expect(trace.getByText('data.query_account',{exact:true})).toBeVisible();
    assert((await trace.locator('pre').first().textContent()).includes('SELECT count(*)'));
    assert((await trace.locator('pre').last().textContent()).includes('rows'));
    await page.reload({waitUntil:'domcontentloaded'});
    const restored = panel.locator('details[aria-label="Tiến trình thực hiện"]').last();
    await restored.locator(':scope > summary').click();
    await expect(restored.getByText('Truy vấn SQL sandbox',{exact:true})).toBeVisible();
    assert.deepEqual(errors, []);
    const report = {passed:true,checks:['live analysis status','actual tool activity','SQL input and result','history survives reload','no browser errors']};
    fs.writeFileSync('/tmp/hannes-verification/activity-browser-report.json',JSON.stringify(report,null,2));
    await page.screenshot({path:'/tmp/hannes-verification/activity-desktop.png'});
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
