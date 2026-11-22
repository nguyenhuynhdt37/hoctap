/* Real Course Advisor + memory UI tests on isolated fixture only.
   Injection scenario alone replaces an advisor response with malicious text to
   verify the actual React renderer; it does not claim model/provider coverage.
   Run after other tests using this fixture user have stopped.
   Env: AGENT_BROWSER_URL=http://localhost:3001, AGENT_BROWSER_FIXTURE_FILE=<privatejson>,
   PLAYWRIGHT_MODULE=<module path>, optional CHROME_PATH / AGENT_BROWSER_ARTIFACTS.
*/
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = (process.env.AGENT_BROWSER_URL || 'http://localhost:3001').replace(/\/$/, '');
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Only local isolated fixture allowed');
const fixture = JSON.parse(fs.readFileSync(process.env.AGENT_BROWSER_FIXTURE_FILE || '/tmp/maymay-agent-verification/browser-fixture.json', 'utf8'));
const artifacts = process.env.AGENT_BROWSER_ARTIFACTS || '/tmp/maymay-agent-verification/advisor-memory-browser';
fs.mkdirSync(artifacts, { recursive: true });
const results = [], errors = [];
let page, browser;
async function run(label, work) {
  try { await work(); results.push({ label, status: 'passed' }); console.log(`PASS ${label}`); }
  catch (error) { results.push({ label, status: 'failed', error: error.message }); console.error(`FAIL ${label}: ${error.message}`); await page?.screenshot({ path: path.join(artifacts, label.replace(/[^a-z0-9]+/gi, '-') + '.png'), fullPage: true }).catch(() => undefined); }
}
async function jsonResponse(response) { assert.equal(response.status(), 200); return response.json(); }
async function waitResponse(method, suffix, click) {
  const pending = page.waitForResponse(response => response.request().method() === method && response.url().endsWith(suffix));
  await click(); const response = await pending; assert.ok(response.ok(), `HTTP ${response.status()}`); return response.json();
}
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const guest = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const learner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const marker = await jsonResponse(await guest.request.get(`${origin}/api/agent-browser-fixture`));
    assert.equal(marker.fixture, 'agent_harness_scripted_planner');
    await learner.addCookies([{ name: 'access_token', value: fixture.token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    // Instrument only the speech invocation count. No microphone is acquired and
    // no sound is produced by the test; synthesis audio quality is NOT VERIFIED.
    await guest.addInitScript(() => {
      window.__advisorSpeechCalls = 0;
      if ('speechSynthesis' in window) {
        speechSynthesis.speak = () => { window.__advisorSpeechCalls++; };
        speechSynthesis.cancel = () => {};
      }
    });
    page = await guest.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
    let advisorResult;
    await run('guest advisor grounded public metadata and explicit speech', async () => {
      await page.goto(`${origin}/course/${fixture.course_slug}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const section = page.getByRole('region', { name: 'Tư vấn khóa học cùng Mây Mây' });
      await section.getByRole('button', { name: 'Trò chuyện với Mây Mây', exact: true }).click();
      await section.getByLabel('Lớp đang học (tùy chọn)').selectOption('12');
      await section.getByLabel('Ngân sách VND (tùy chọn)').fill('100000');
      await section.getByLabel('Mục tiêu học tập trong phiên này (tùy chọn)').fill('Ôn kiến thức lập trình');
      await section.getByLabel('Điều bạn muốn tìm hiểu').fill('Mình cần chuẩn bị kiến thức đầu vào gì?');
      const request = page.waitForRequest(request => request.url().endsWith('/api/agent/advisor') && request.method() === 'POST');
      advisorResult = await waitResponse('POST', '/api/agent/advisor', () => section.getByRole('button', { name: 'Phân tích khóa học', exact: true }).click());
      const submitted = (await request).postDataJSON(); assert.equal(submitted.course_id, fixture.course_id); assert.equal(submitted.grade, 12);
      assert.ok(advisorResult.claims.length); assert.ok(advisorResult.claims.every(claim => claim.evidence.length > 0));
      assert.ok(advisorResult.sources.some(source => source.course_id === fixture.course_id));
      const metadata = await jsonResponse(await guest.request.get(`${origin}/api/agent/advisor/${fixture.course_id}/context`));
      const requirements = advisorResult.claims.find(claim => claim.criterion === 'prerequisites');
      assert.deepEqual(requirements.evidence[0].value, metadata.requirements);
      await section.getByText('Những điều cần cân nhắc', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__advisorSpeechCalls), 0, 'advisor must never speak automatically');
      const listen = section.getByRole('button', { name: 'Nghe bản giải thích', exact: true });
      if (await listen.count()) { await listen.click(); assert.equal(await page.evaluate(() => window.__advisorSpeechCalls), 1); }
      else throw new Error('speechSynthesis unavailable; explicit speech control NOT VERIFIED');
      const consent = await guest.request.get(`${origin}/api/agent/memory/consent`); assert.equal(consent.status(), 401, 'guest cannot read private memory');
      await page.screenshot({ path: path.join(artifacts, 'guest-course-advisor.png'), fullPage: true });
    });
    await run('guest comparison uses actual public course metadata', async () => {
      const section = page.getByRole('region', { name: 'Tư vấn khóa học cùng Mây Mây' });
      const choose = section.getByLabel('Đối chiếu với khóa học khác (tùy chọn)');
      await choose.waitFor(); const values = await choose.locator('option').evaluateAll(options => options.map(option => ({ value: option.value, title: option.textContent })).filter(option => option.value));
      assert.ok(values.length, 'no public alternative course available; comparison NOT VERIFIED');
      await choose.selectOption(values[0].value);
      const compared = await waitResponse('POST', '/api/agent/advisor', () => section.getByRole('button', { name: 'Phân tích khóa học', exact: true }).click());
      assert.equal(compared.comparison.length, 1); assert.equal(compared.comparison[0].id, values[0].value);
      const source = await jsonResponse(await guest.request.get(`${origin}/api/agent/advisor/${values[0].value}/context`));
      for (const field of ['title', 'requirements', 'outcomes', 'price', 'currency']) assert.deepEqual(compared.comparison[0][field], source[field]);
      await section.getByText('Khóa học để đối chiếu', { exact: true }).waitFor();
    });
    await run('real browser rejects malicious advisor HTML and Markdown attributes', async () => {
      await page.evaluate(() => { window.__xssExecuted = 0; });
      const injected = '<img src=x onerror="window.__xssExecuted++"><svg onload="window.__xssExecuted++"><foreignObject><img src=x onerror="window.__xssExecuted++"></foreignObject></svg><math><mtext><img src=x onerror="window.__xssExecuted++"></mtext></math><iframe srcdoc="<script>parent.__xssExecuted++</script>"></iframe>\n\n__<img src=x onerror="window.__xssExecuted++">__\n\n[bad](javascript:alert(1))\n\n**attrs**{onclick="window.__xssExecuted++" style="position:fixed"}';
      await page.route('**/api/agent/advisor', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...advisorResult, content: injected }) });
      });
      const section = page.getByRole('region', { name: 'Tư vấn khóa học cùng Mây Mây' });
      await waitResponse('POST', '/api/agent/advisor', () => section.getByRole('button', { name: 'Phân tích khóa học', exact: true }).click());
      await section.locator('.markdown-content').filter({ hasText: '<img' }).waitFor();
      const inspection = await section.locator('.markdown-content').evaluate(element => ({
        activeTags: element.querySelectorAll('script,style,svg,math,iframe,object,embed').length,
        unsafeAttrs: [...element.querySelectorAll('*')].flatMap(node => [...node.attributes].filter(attribute => /^on/i.test(attribute.name) || ['srcdoc', 'style'].includes(attribute.name)).map(attribute => attribute.name)),
        unsafeLinks: [...element.querySelectorAll('[href],[src]')].filter(node => /^(?:javascript|data|vbscript):/i.test((node.getAttribute('href') || node.getAttribute('src') || '').replace(/[\x00-\x20]/g, ''))).length,
      }));
      assert.deepEqual(inspection, { activeTags: 0, unsafeAttrs: [], unsafeLinks: 0 });
      assert.equal(await page.evaluate(() => window.__xssExecuted), 0);
      await page.unroute('**/api/agent/advisor');
    });
    await run('learner memory consent proposal confirm edit delete and revoke', async () => {
      page = await learner.newPage(); page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
      // Reset ONLY this explicitly synthetic fixture learner's memory in clone.
      await jsonResponse(await learner.request.put(`${origin}/api/agent/memory/consent`, { data: { enabled: false, retention_days: 30 } }));
      await page.goto(`${origin}/learning/${fixture.course_slug}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.getByRole('button', { name: 'Hỏi trợ giảng', exact: true }).click();
      await page.getByRole('button', { name: 'Bộ nhớ học tập', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Bộ nhớ học tập của bạn' });
      await dialog.getByRole('button', { name: 'Đồng ý bật bộ nhớ dài hạn', exact: true }).waitFor();
      assert.equal((await jsonResponse(await learner.request.get(`${origin}/api/agent/memory/consent`))).enabled, false);
      await waitResponse('PUT', '/api/agent/memory/consent', () => dialog.getByRole('button', { name: 'Đồng ý bật bộ nhớ dài hạn', exact: true }).click());
      const first = 'E2E: ôn vòng lặp trong tuần này';
      await dialog.getByLabel('Điều bạn muốn Mây Mây ghi nhớ').fill(first);
      const proposed = await waitResponse('POST', '/api/agent/memory', () => dialog.getByRole('button', { name: 'Tạo đề xuất để xác nhận', exact: true }).click());
      assert.equal(proposed.status, 'proposed');
      let card = dialog.locator('article').filter({ hasText: first });
      await card.getByRole('button', { name: 'Xác nhận', exact: true }).click();
      await card.getByText('Bạn đã xác nhận', { exact: false }).waitFor();
      let memory = await jsonResponse(await learner.request.get(`${origin}/api/agent/memory`)); assert.equal(memory.items.find(item => item.id === proposed.id).status, 'confirmed');
      await card.getByRole('button', { name: 'Sửa', exact: true }).click();
      const edited = 'E2E: ôn vòng lặp và điều kiện';
      await dialog.getByLabel('Đề xuất nội dung thay thế').fill(edited);
      const replacement = await waitResponse('POST', '/api/agent/memory', () => dialog.getByRole('button', { name: 'Tạo đề xuất để xác nhận', exact: true }).click());
      assert.equal(replacement.supersedes_id, proposed.id); assert.equal(replacement.status, 'proposed');
      card = dialog.locator('article').filter({ hasText: edited }); await card.getByRole('button', { name: 'Xác nhận', exact: true }).click();
      await card.getByText('Bạn đã xác nhận', { exact: false }).waitFor();
      memory = await jsonResponse(await learner.request.get(`${origin}/api/agent/memory`)); assert.ok(!memory.items.some(item => item.id === proposed.id));
      await card.getByRole('button', { name: 'Xóa', exact: true }).click();
      memory = await jsonResponse(await learner.request.get(`${origin}/api/agent/memory`)); assert.ok(memory.items.some(item => item.id === replacement.id), 'delete needs confirmation');
      await waitResponse('DELETE', `/api/agent/memory/${replacement.id}`, () => card.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click());
      memory = await jsonResponse(await learner.request.get(`${origin}/api/agent/memory`)); assert.ok(!memory.items.some(item => item.id === replacement.id));
      await dialog.getByRole('button', { name: 'Tắt và xóa bộ nhớ dài hạn', exact: true }).click();
      assert.equal((await jsonResponse(await learner.request.get(`${origin}/api/agent/memory/consent`))).enabled, true, 'revoke needs confirmation');
      await waitResponse('PUT', '/api/agent/memory/consent', () => dialog.getByRole('button', { name: 'Xác nhận tắt và xóa', exact: true }).click());
      assert.equal((await jsonResponse(await learner.request.get(`${origin}/api/agent/memory/consent`))).enabled, false);
      assert.deepEqual((await jsonResponse(await learner.request.get(`${origin}/api/agent/memory`))).items, []);
      await page.screenshot({ path: path.join(artifacts, 'memory-revoked.png'), fullPage: true });
    });
    await run('advisor and memory browser have no uncaught errors', async () => assert.deepEqual(errors, []));
  } finally {
    await guest.close(); await learner.close(); await browser.close();
    fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ checks: results, errors, injection: 'malicious response fixture only; actual renderer', speech: 'explicit invocation verified; audio synthesis quality NOT VERIFIED' }, null, 2));
  }
  if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
