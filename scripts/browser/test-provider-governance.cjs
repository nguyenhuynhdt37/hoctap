/* End-to-end test against the isolated frontend + browser auth fixture.
   The provider APIs, PostgreSQL transactions and notification WebSockets are real.
   Configure PLAYWRIGHT_MODULE and PROVIDER_BROWSER_URL when rerunning. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PROVIDER_BROWSER_URL || 'http://localhost:3108';
const suffix = Date.now().toString(36);
const errors = [];
const watchdog = setTimeout(() => { console.error('Browser test exceeded 300 seconds'); process.exit(1); }, 300000); watchdog.unref();
const events = { admin: [], lecturer: [] };
const connections = new Set();
const artifacts = process.env.PROVIDER_BROWSER_ARTIFACTS || '/tmp/hoctap-provider-browser-results';
fs.mkdirSync(artifacts, { recursive: true });
async function wait(test, label) {
  for (let i = 0; i < 300; i++) { if (await test()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error(`Timeout: ${label}`);
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const contexts = [];
  const pages = [];
  try {
    async function actor(label) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } }); contexts.push(context);
      await context.addCookies([{ name: 'access_token', value: label, url: origin }]);
      const page = await context.newPage(); pages.push(page);
      page.setDefaultTimeout(30000);
      page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
      if (process.env.PROVIDER_DEBUG) page.on('console', message => { if (/WebSocket|WS closed|Connecting|Component unmounting/.test(message.text())) console.log(label, message.text().slice(0,180)); });
      if (events[label]) page.on('websocket', socket => socket.on('framereceived', frame => {
        try { const event = JSON.parse(String(frame.payload)); if (event.type === 'fixture.ready') connections.add(label); if (event.type === 'notification.created') events[label].push(event.data); if (process.env.PROVIDER_DEBUG) console.log(label, event.type, event.data?.title, event.data?.metadata); } catch {}
      }));
      await page.goto(`${origin}/${label === 'admin' ? 'admin' : 'lecturer'}/providers`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.getByRole('heading', { name: 'Đơn vị cung cấp', exact: true }).waitFor();
      if (events[label]) await wait(() => connections.has(label), `${label} websocket ready`);
      console.log(`Opened ${label}`); return page;
    }
    const admin = await actor('admin');
    const lecturer = await actor('lecturer');
    async function create(name) {
      console.log(`Creating ${name}`);
      await lecturer.getByRole('button', { name: 'Yêu cầu tạo đơn vị', exact: true }).click();
      const form = lecturer.getByRole('dialog');
      await form.getByLabel('Tên đầy đủ của đơn vị').fill(name);
      await form.getByLabel('Giới thiệu đơn vị').fill('Trung tâm giáo dục kiểm thử luồng xét duyệt, tại Hà Nội.');
      await form.getByLabel('Email liên hệ').fill('provider-test@example.com');
      await form.getByLabel('Lý do đề nghị tạo đơn vị').fill('Tôi là giảng viên phụ trách và đề nghị tạo đơn vị để quản lý khóa học.');
      await form.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
      await lecturer.getByRole('dialog').getByRole('heading', { name: name, exact: true }).waitFor();
      return new URL(lecturer.url()).searchParams.get('request_id');
    }
    const name = `Trung tâm Browser ${suffix}`;
    const id = await create(name);
    assert(id);
    if (process.env.PROVIDER_DEBUG) console.log('Submitted', id, 'admin received', JSON.stringify(events.admin.map(event => ({title:event.title, metadata:event.metadata}))));
    await wait(() => events.admin.some(event => event.title === 'Yêu cầu tạo đơn vị mới' && event.metadata.request_id === id), 'admin realtime submission');
    await wait(() => events.lecturer.some(event => event.title === 'Đã tiếp nhận yêu cầu tạo đơn vị' && event.metadata.request_id === id), 'lecturer submission receipt');
    await admin.getByRole('button', { name: /^Yêu cầu chờ duyệt/ }).click();
    await admin.getByLabel('Tìm yêu cầu theo tên đơn vị').fill(name);
    await admin.getByRole('button', { name: `Xem chi tiết ${name}`, exact: true }).click();
    const review = admin.getByRole('dialog');
    assert(await review.getByRole('button', { name: 'Từ chối', exact: true }).isDisabled());
    await review.getByLabel('Ghi chú xét duyệt').fill('Đã xác minh thông tin trong môi trường kiểm thử.');
    await review.getByRole('button', { name: 'Duyệt yêu cầu', exact: true }).click();
    await review.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await review.getByText('Đã duyệt', { exact: true }).waitFor();
    await lecturer.getByRole('dialog').getByText('Đã duyệt', { exact: true }).waitFor();
    await wait(() => events.lecturer.some(event => event.title === 'Yêu cầu tạo đơn vị được duyệt' && event.metadata.request_id === id), 'lecturer realtime approval');
    await lecturer.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    await lecturer.getByRole('button', { name: 'Đơn vị được cấp quyền', exact: true }).click();
    await lecturer.getByRole('heading', { name, exact: true }).waitFor();
    for (const close of await lecturer.getByRole('button', { name: 'Đóng thông báo', exact: true }).all()) await close.click().catch(() => {});
    await lecturer.waitForTimeout(400);
    await lecturer.screenshot({ path: path.join(artifacts, 'lecturer-desktop.png'), fullPage: true });
    await admin.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    await admin.screenshot({ path: path.join(artifacts, 'admin-desktop.png'), fullPage: true });
    await admin.getByRole('button', { name: 'Quản lý đơn vị', exact: true }).click();
    await admin.getByLabel('Tìm theo tên đơn vị').fill(name);
    await admin.getByRole('button', { name: `Quản lý đơn vị ${name}`, exact: true }).click();
    const membersDialog = admin.getByRole('dialog');
    assert.equal(await membersDialog.getByLabel('Vai trò thành viên').count(), 0);
    await membersDialog.getByRole('heading', { name: 'Lịch sử liên kết giảng viên', exact: true }).waitFor();
    await membersDialog.getByLabel('Tìm giảng viên theo tên hoặc email').fill('provider-browser-other@example.test');
    await membersDialog.getByLabel('Tài khoản giảng viên').selectOption({ label: 'Kiểm thử đơn vị other · provider-browser-other@example.test' });
    await membersDialog.getByRole('button', { name: 'Cấp liên kết', exact: true }).click();
    await membersDialog.getByRole('button', { name: 'Thu hồi quyền của Kiểm thử đơn vị other', exact: true }).waitFor();
    await membersDialog.getByRole('button', { name: 'Thu hồi quyền của Kiểm thử đơn vị other', exact: true }).click();
    assert(await membersDialog.getByRole('button', { name: 'Xác nhận thu hồi', exact: true }).isDisabled());
    await membersDialog.getByLabel('Lý do thu hồi').fill('Kết thúc liên kết trong kiểm thử');
    await membersDialog.getByRole('button', { name: 'Xác nhận thu hồi', exact: true }).click();
    await membersDialog.getByText('Đã thu hồi', { exact: true }).waitFor();
    await admin.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    const managedName = `Đơn vị admin tạo ${suffix}`;
    await admin.getByRole('button', { name: 'Thêm đơn vị', exact: true }).click();
    await admin.getByRole('dialog').getByLabel(/^Tên đơn vị/).fill(managedName);
    await admin.getByRole('dialog').getByLabel('Giới thiệu', { exact: true }).fill('Đơn vị được admin trực tiếp tạo để kiểm thử quản trị.');
    const imageInput = admin.getByRole('dialog').getByLabel('Ảnh đại diện đơn vị', { exact: true });
    const uploadResponse = admin.waitForResponse(response => response.url().includes('/admin/providers/assets/avatar') && response.request().method() === 'POST', { timeout: 90000 });
    await imageInput.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAfElEQVR4nNXOQREAMAjAsK7+PTMRPLhGQR4MZRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncRIncV4Htj5QhwF/4nP9ugAAAABJRU5ErkJggg==', 'base64') });
    const uploaded = await uploadResponse;
    assert.equal(uploaded.status(), 200, await uploaded.text());
    const uploadedUrl = (await uploaded.json()).url;
    assert(uploadedUrl.startsWith('/api/storage/files/public/providers/catalog/avatars/'));
    await admin.getByRole('dialog').getByRole('img', { name: 'Ảnh đại diện đơn vị', exact: true }).waitFor();
    await admin.getByRole('dialog').getByRole('button', { name: 'Lưu đơn vị', exact: true }).click();
    await admin.getByRole('dialog').waitFor({ state: 'hidden' });
    await admin.getByLabel('Tìm theo tên đơn vị').fill(managedName);
    await admin.getByRole('heading', { name: managedName, exact: true }).waitFor();
    const savedImage = admin.getByRole('img', { name: `Ảnh đại diện ${managedName}`, exact: true });
    await savedImage.waitFor();
    await savedImage.evaluate(image => image.decode());
    assert.equal(await savedImage.getAttribute('src'), uploadedUrl);
    await admin.getByRole('button', { name: `Quản lý đơn vị ${managedName}`, exact: true }).click();
    assert.equal(await admin.getByRole('dialog').getByRole('img', { name: 'Ảnh đại diện đơn vị', exact: true }).getAttribute('src'), uploadedUrl);
    await admin.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();

    await admin.getByRole('button', { name: /^Yêu cầu chờ duyệt/ }).click();
    const rejectedName = `Đơn vị từ chối ${suffix}`;
    const rejectedId = await create(rejectedName);
    await admin.getByLabel('Tìm yêu cầu theo tên đơn vị').fill(rejectedName);
    await admin.getByRole('button', { name: `Xem chi tiết ${rejectedName}`, exact: true }).click();
    await admin.getByRole('dialog').getByLabel('Ghi chú xét duyệt').fill('Cần bổ sung thông tin minh chứng về đơn vị.');
    await admin.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click();
    await admin.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await lecturer.getByRole('dialog').getByText('Cần bổ sung thông tin minh chứng về đơn vị.', { exact: true }).waitFor();
    await lecturer.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    const cancelName = `Đơn vị hủy ${suffix}`;
    await create(cancelName);
    await lecturer.getByRole('dialog').getByRole('button', { name: 'Hủy yêu cầu', exact: true }).click();
    await lecturer.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await lecturer.getByRole('dialog').getByText('Đã hủy', { exact: true }).waitFor();
    await lecturer.setViewportSize({ width: 390, height: 844 });
    for (const close of await lecturer.getByRole('button', { name: 'Đóng thông báo', exact: true }).all()) await close.click().catch(() => {});
    await lecturer.waitForTimeout(400);
    await lecturer.screenshot({ path: path.join(artifacts, 'lecturer-mobile-dialog.png'), fullPage: true });
    assert(await lecturer.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page must not overflow horizontally');
    await lecturer.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    await lecturer.getByRole('button', { name: 'Danh sách đơn vị', exact: true }).click();
    await lecturer.screenshot({ path: path.join(artifacts, 'lecturer-mobile-directory.png'), fullPage: true });
    assert(await lecturer.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const other = await actor('other');
    const privateResult = await other.request.get(`${origin}/api/lecturer/provider-requests/${id}`);
    assert.equal(privateResult.status(), 404);
    const forbidden = await other.request.post(`${origin}/api/admin/provider-requests/${rejectedId}/decision`, { data: { decision: 'approved' } });
    assert.equal(forbidden.status(), 403);
    // Request affiliation with a different lecturer account; no access before review.
    await other.getByLabel('Loại đơn vị', { exact: true }).selectOption('center');
    await other.getByLabel('Sắp xếp đơn vị', { exact: true }).selectOption('newest');
    await other.getByLabel('Tìm theo tên đơn vị').fill(managedName);
    await other.getByRole('button', { name: `Xin gia nhập ${managedName}`, exact: true }).click();
    await other.getByRole('dialog').getByLabel('Vị trí / môn giảng dạy tại đơn vị').fill('Giáo viên Toán');
    await other.getByRole('dialog').getByLabel('Email cơ quan (nếu có)').fill('teacher@example.test');
    await other.getByRole('dialog').getByLabel('Thông tin đối chiếu công tác').fill('Giáo viên tổ Toán đang công tác, đề nghị đối chiếu danh sách nhân sự chính thức của trường.');
    await other.getByRole('dialog').getByLabel('Tôi xác nhận đang công tác tại đơn vị này và thông tin cung cấp là chính xác.').check();
    await other.getByRole('dialog').getByRole('button', { name: 'Gửi yêu cầu gia nhập', exact: true }).click();
    await other.getByRole('dialog').getByText('Email cơ quan không hợp lệ. Vui lòng kiểm tra lại hoặc để trống.', { exact: true }).waitFor();
    assert.equal(await other.getByRole('dialog').getByLabel('Vị trí / môn giảng dạy tại đơn vị').inputValue(), 'Giáo viên Toán');
    await other.getByRole('dialog').getByLabel('Email cơ quan (nếu có)').fill('teacher@example.com');
    await other.getByRole('dialog').getByRole('button', { name: 'Gửi yêu cầu gia nhập', exact: true }).click();
    await other.getByRole('dialog').waitFor({ state: 'hidden' });
    await other.getByRole('button', { name: `Xem yêu cầu gia nhập ${managedName}`, exact: true }).waitFor();
    if (await admin.getByRole('dialog').count()) await admin.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click();
    await admin.getByRole('button', { name: 'Yêu cầu gia nhập', exact: true }).click();
    await admin.getByRole('button', { name: `Xem yêu cầu gia nhập ${managedName}`, exact: true }).click();
    await admin.getByRole('dialog').getByLabel('Kết quả đối chiếu / lý do xét duyệt').fill('Đã đối chiếu danh sách nhân sự và liên hệ chính thức tại trường.');
    await admin.getByRole('dialog').getByLabel('Tôi đã đối chiếu minh chứng và xác nhận giảng viên đang công tác tại đơn vị.').check();
    await admin.getByRole('dialog').getByRole('button', { name: 'Xác nhận xét duyệt gia nhập', exact: true }).click();
    await admin.getByRole('dialog').waitFor({ state: 'hidden' });
    await other.locator('span').filter({ hasText: /^Đã duyệt$/ }).first().waitFor();
    await other.getByRole('button', { name: 'Đơn vị được cấp quyền', exact: true }).click();
    await other.getByRole('heading', { name: managedName, exact: true }).waitFor();
    // A second active affiliation must coexist with the first.
    await other.getByRole('button', { name: 'Danh sách đơn vị', exact: true }).click();
    await other.getByLabel('Loại đơn vị', { exact: true }).selectOption('');
    await other.getByLabel('Tìm theo tên đơn vị').fill(name);
    await other.getByRole('button', { name: `Xin gia nhập ${name}`, exact: true }).click();
    await other.getByRole('dialog').getByLabel('Vị trí / môn giảng dạy tại đơn vị').fill('Giảng viên cộng tác môn Toán');
    await other.getByRole('dialog').getByLabel('Thông tin đối chiếu công tác').fill('Tôi đang công tác giảng dạy tại đơn vị thứ hai, đề nghị kiểm tra danh sách nhân sự chính thức.');
    await other.getByRole('dialog').getByLabel('Tôi xác nhận đang công tác tại đơn vị này và thông tin cung cấp là chính xác.').check();
    await other.getByRole('dialog').getByRole('button', { name: 'Gửi yêu cầu gia nhập', exact: true }).click();
    await other.getByRole('dialog').waitFor({ state: 'hidden' });
    await admin.getByRole('button', { name: `Xem yêu cầu gia nhập ${name}`, exact: true }).click();
    await admin.getByRole('dialog').getByLabel('Kết quả đối chiếu / lý do xét duyệt').fill('Đã xác minh giảng viên đang công tác tại đơn vị thứ hai.');
    await admin.getByRole('dialog').getByLabel('Tôi đã đối chiếu minh chứng và xác nhận giảng viên đang công tác tại đơn vị.').check();
    await admin.getByRole('dialog').getByRole('button', { name: 'Xác nhận xét duyệt gia nhập', exact: true }).click();
    await admin.getByRole('dialog').waitFor({ state: 'hidden' });
    await other.getByRole('button', { name: 'Đơn vị được cấp quyền', exact: true }).click();
    await other.getByRole('heading', { name: managedName, exact: true }).waitFor();
    await other.getByRole('heading', { name: name, exact: true }).waitFor();
    await other.setViewportSize({ width: 390, height: 844 });
    await other.screenshot({ path: path.join(artifacts, 'lecturer-joined-unit-mobile.png'), fullPage: true });
    assert(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log(JSON.stringify({ passed: true, checks: ['create request', 'admin realtime', 'lecturer receipt', 'review reason validation', 'approve', 'member list', 'lecturer realtime decision', 'reject', 'cancel', 'private request 404', 'admin mutation 403', 'mobile width', 'admin creates provider', 'member search', 'grant member', 'revoke member', 'R2 avatar upload', 'saved avatar display and reopen', 'employment join submit', 'admin employment review', 'joined unit access', 'multiple affiliations coexist', 'directory filters and sort', 'validation preserves form'], artifacts }, null, 2));
  } catch (error) {
    console.error("Browser check failed", error);
    for (let i = 0; i < pages.length; i++) { await pages[i].screenshot({ path: path.join(artifacts, `failure-${i}.png`), fullPage: true }).catch(() => {}); fs.writeFileSync(path.join(artifacts, `failure-${i}.txt`), await pages[i].locator('body').innerText().catch(() => 'unavailable')); }
    throw error;
  } finally { for (const context of contexts) await Promise.race([context.close(),new Promise(r=>setTimeout(r,3000))]); await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]); clearTimeout(watchdog); }
})().catch(error => { console.error(error); process.exitCode = 1; });
