/* Real browser/runtime/domain/Piston verification on a disposable clone only.
   Planner can be scripted through tests.browser.agent_harness_app (reported as
   scripted, never a real-model quality benchmark). No fake action receipts.

   Required env: AGENT_BROWSER_URL, AGENT_BROWSER_TOKEN, AGENT_BROWSER_COURSE_ID,
   AGENT_BROWSER_COURSE_SLUG, AGENT_BROWSER_VIDEO_LESSON_ID, AGENT_BROWSER_CODE_LESSON_ID.
   Optional: PLAYWRIGHT_MODULE, CHROME_PATH, AGENT_BROWSER_ARTIFACTS.
   Backend launch: AGENT_BROWSER_SCRIPTED_MODEL=1 DATABASE_ASYNC_URL=<test clone>
     AGENT_ENABLED=true .venv/bin/python -m uvicorn tests.browser.agent_harness_app:app
     --host 127.0.0.1 --port 8001 --lifespan off
   Frontend launch (separate build cache): NEXT_PUBLIC_URL_BACKEND=http://127.0.0.1:8001
     NEXT_PUBLIC_URL_BACKEND_WS=ws://127.0.0.1:8001 NEXT_DIST_DIR=.next-agent-verify
     pnpm exec next dev --port 3001
*/
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { assertVerifiedUiEvidence } = require('./agent-receipt-evidence.cjs');
const required = name => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; };
const origin = required('AGENT_BROWSER_URL').replace(/\/$/, '');
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Only a localhost test frontend is allowed');
const token = required('AGENT_BROWSER_TOKEN');
const courseId = required('AGENT_BROWSER_COURSE_ID');
const slug = required('AGENT_BROWSER_COURSE_SLUG');
const videoLesson = required('AGENT_BROWSER_VIDEO_LESSON_ID');
const codeLesson = required('AGENT_BROWSER_CODE_LESSON_ID');
const artifacts = process.env.AGENT_BROWSER_ARTIFACTS || '/tmp/hoctap-agent-browser-results';
fs.mkdirSync(artifacts, { recursive: true });
const checks = [], failures = [], browserErrors = [], eventsByRun = new Map();
let page, context;
async function check(label, work) {
  try { await work(); checks.push({ label, status: 'passed' }); console.log(`PASS ${label}`); }
  catch (error) { failures.push(label); checks.push({ label, status: 'failed', error: error.message }); console.error(`FAIL ${label}: ${error.message}`); await page?.screenshot({ path: path.join(artifacts, `${label.replace(/[^a-z0-9]+/gi, '-')}.png`), fullPage: true }).catch(() => undefined); }
}
async function openLesson(lessonId) {
  const result = await context.request.post(`${origin}/api/learning/${courseId}/active/${lessonId}`);
  assert.equal(result.status(), 200, 'fixture setup could not select lesson');
  await page.goto(`${origin}/learning/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: 'Hỏi trợ giảng', exact: true }).click();
  await page.getByPlaceholder('Hỏi trợ giảng Mây Mây...').waitFor();
}
async function send(message, onPending, beforeSubmit) {
  const created = page.waitForResponse(response => response.url().endsWith('/api/agent/runs') && response.request().method() === 'POST');
  await page.getByPlaceholder('Hỏi trợ giảng Mây Mây...').fill(message);
  if (beforeSubmit) {
    await beforeSubmit();
    // Dispatch the real form's Enter handler without blurring the editor. This
    // explicitly verifies the unsaved buffer path; no tool output is replaced.
    await page.getByPlaceholder('Hỏi trợ giảng Mây Mây...').dispatchEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
  } else await page.getByPlaceholder('Hỏi trợ giảng Mây Mây...').press('Enter');
  const response = await created; assert.equal(response.status(), 201, 'run admission failed');
  const run = await response.json();
  if (onPending) await onPending(run);
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const snapshot = await context.request.get(`${origin}/api/agent/runs/${run.id}`);
    assert.equal(snapshot.status(), 200);
    const data = await snapshot.json();
    if (['completed', 'partially_completed', 'failed', 'cancelled', 'expired'].includes(data.state)) {
      assert.equal(data.state, 'completed', `run ended ${data.state}: ${data.last_error || ''}`);
      const response = await context.request.get(`${origin}/api/agent/runs/${run.id}/events?after=0`);
      const frames = (await response.text()).split('\n\n').flatMap(frame => {
        const text = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5)).join('\n');
        return text ? [JSON.parse(text)] : [];
      });
      eventsByRun.set(run.id, frames);
      assert.ok(frames.some(event => event.type === 'run.completed'));
      assertVerifiedUiEvidence(frames);
      return { run: data, events: frames };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('run did not reach terminal state');
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: 'access_token', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
    const identity = await context.request.get(`${origin}/api/agent-browser-fixture`);
    assert.equal(identity.status(), 200, 'refusing to mutate without isolated fixture marker');
    assert.equal((await identity.json()).fixture, 'agent_harness_scripted_planner');
    page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => browserErrors.push(error.message));
    await check('video pause and seek verified receipts', async () => {
      await openLesson(videoLesson);
      await page.waitForFunction(lessonId => { const fn = window[`getCurrentTime_${lessonId}`]; return typeof fn === 'function' && Boolean(document.querySelector(`iframe#youtube-player-${lessonId}`)); }, videoLesson, { timeout: 30000 });
      const paused = await send('pause video');
      assert.ok(paused.events.some(event => event.type === 'tool.completed' && event.payload.name === 'video.pause'));
      const seek = await send('tua video đến 3 giây');
      const receipt = seek.events.find(event => event.type === 'ui.action_receipt' && event.payload.result?.requested_timestamp === 3);
      assert.ok(receipt && Math.abs(receipt.payload.result.current_time - 3) < 1.5);
    });
    await check('open notes through application state', async () => {
      await openLesson(videoLesson);
      const result = await send('Mở ghi chú [E2E_NOTES]');
      assert.ok(result.events.some(event => event.type === 'tool.completed' && event.payload.name === 'ui.switch_tab'));
      await page.getByRole('heading', { name: 'Ghi chú của bạn', exact: true }).waitFor();
    });
    await check('unsaved editor diff approval sample test and undo', async () => {
      await openLesson(codeLesson);
      const editor = page.locator('.cm-content[contenteditable="true"]').first(); await editor.waitFor();
      const result = await send('Sửa code hiện tại rồi chạy test mẫu [E2E_CODE]', async () => {
        const approval = page.getByRole('dialog', { name: 'Xem lại thay đổi' }); await approval.waitFor({ timeout: 90000 });
        await approval.getByText('print(0)', { exact: true }).waitFor(); await approval.getByText('print(42)', { exact: true }).waitFor();
        await approval.getByRole('button', { name: 'Đồng ý áp dụng', exact: true }).click();
      }, () => editor.fill('print(0)\n# unsaved E2E buffer'));
      const read = result.events.find(event => event.type === 'tool.completed' && event.payload.name === 'editor.read_file');
      assert.ok(read?.payload.result.content.includes('# unsaved E2E buffer'));
      assert.equal(read.payload.result.is_dirty, true, 'agent must read the unsaved client buffer');
      const applied = result.events.find(event => event.type === 'tool.completed' && event.payload.name === 'editor.apply_patch');
      assert.ok(applied?.payload.result.patch_id);
      const tested = result.events.find(event => event.type === 'tool.completed' && event.payload.name === 'code.run_sample_tests');
      assert.ok(tested?.payload.result.attempt_id); assert.equal(tested.payload.result.sample_only, true);
      assert.equal(tested.payload.result.passed, tested.payload.result.total); assert.ok(tested.payload.result.total > 0);
      assert.equal(tested.payload.result.evidence_kind, 'server_code_attempt');
      assert.ok((await editor.innerText()).includes('print(42)'));
      const undone = await send(`Hoàn tác code [E2E_UNDO:${applied.payload.result.patch_id}]`, async () => {
        const approval = page.getByRole('dialog', { name: 'Xem lại thay đổi' }); await approval.waitFor({ timeout: 90000 });
        await approval.getByRole('button', { name: 'Đồng ý áp dụng', exact: true }).click();
      });
      assert.ok(undone.events.some(event => event.type === 'tool.completed' && event.payload.name === 'editor.undo_patch'));
      assert.ok((await editor.innerText()).includes('print(0)'));
      assert.ok((await editor.innerText()).includes('# unsaved E2E buffer'));
    });
    await check('next lesson navigation has target-bound verified receipt', async () => {
      await openLesson(videoLesson);
      const result = await send('mở bài tiếp theo');
      const receipt = result.events.find(event => event.type === 'ui.action_receipt' && event.payload.status === 'completed' && event.payload.verified === true);
      assert.ok(receipt && receipt.payload.lesson_id !== videoLesson && receipt.payload.verified === true);
    });
    await check('mobile learning panel has no horizontal overflow', async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await openLesson(codeLesson);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false);
      await page.screenshot({ path: path.join(artifacts, 'mobile-agent-panel.png'), fullPage: true });
    });
    await check('browser runtime has no uncaught errors', async () => { assert.deepEqual(browserErrors, []); });
  } finally {
    fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify({ planner: 'scripted fixture; real tool results', checks, browserErrors, runs: [...eventsByRun].map(([id, events]) => ({ id, events: events.map(event => ({ type: event.type, sequence: event.sequence })) })) }, null, 2));
    await context?.close(); await browser.close();
  }
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
