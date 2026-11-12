/* Run: node scripts/test-navigation-performance.cjs. No live backend writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../studynest_fe');
const ts = require(path.join(root, 'node_modules/typescript'));
const jsx = require(path.join(root, 'node_modules/react/jsx-runtime'));
const react = require(path.join(root, 'node_modules/react'));
function load(relative, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, Response, AbortSignal,
    require: name => imports[name] || (name === 'react/jsx-runtime' ? jsx : name === 'react' ? react : { __esModule: true, default: () => null }),
  });
  return module.exports;
}
async function profileTests() {
  const calls = [], redirects = [];
  let status = 200, fail = false;
  const { loadOwnProfile } = load('src/lib/server/load-own-profile.ts', {
    'next/headers': { cookies: async () => ({}) },
    'next/navigation': { redirect: url => { redirects.push(url); throw new Error('NEXT_REDIRECT'); } },
    '@/lib/utils/fetcher/server/fetcher': { fetcher: async url => {
      calls.push(url);
      if (fail) throw new Error('network');
      return new Response(JSON.stringify(status === 200 ? { fullname: 'Learner' } : { detail: 'Temporarily unavailable' }), { status });
    } },
  });
  assert.equal((await loadOwnProfile('/profile')).profile.fullname, 'Learner');
  assert.deepEqual(calls, ['/profile'], 'One protected data request, no redundant authentication round trip');
  status = 401;
  await assert.rejects(loadOwnProfile('/profile?tab=identity'), /NEXT_REDIRECT/);
  assert.equal(redirects[0], '/login?redirect=%2Fprofile%3Ftab%3Didentity');
  status = 503;
  assert.equal((await loadOwnProfile('/profile')).error, 'Temporarily unavailable');
  fail = true;
  assert.ok((await loadOwnProfile('/profile')).error);
  assert.equal(redirects.length, 1, 'Temporary failures must not redirect to login');
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat()) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}
async function layoutTests() {
  for (const role of ['user', 'admin']) {
    let calls = 0, release;
    const pending = new Promise(resolve => { release = resolve; });
    const { default: Layout } = load(`src/app/(main)/(${role})/layout.tsx`, {
      'next/headers': { cookies: async () => ({}) },
      '@/lib/utils/fetcher/server/cookieStore': { getServerCookie: () => 'valid-session' },
      '@/lib/utils/fetcher/server/fetcher': { fetcher: async () => { calls++; return pending; } },
    });
    const child = jsx.jsx('main', { children: 'Route content' });
    const shell = await Layout({ children: child });
    assert.equal(calls, 0, `${role}: route shell must not await notifications`);
    assert.ok(find(shell, node => node === child), `${role}: route content remains available`);
    const boundary = find(shell, node => node.type === react.Suspense && node.props.children?.type?.name?.endsWith('NotificationsBootstrap'));
    assert.ok(boundary, `${role}: notifications have their own streaming boundary`);
    const notificationTask = boundary.props.children.type();
    await new Promise(setImmediate);
    assert.equal(calls, 1);
    release(new Response('{}', { status: 503 }));
    await notificationTask;
  }
}
(async () => {
  await profileTests();
  await layoutTests();
  console.log('PASS: single profile request, expiry redirects, outage recovery; user/admin content streams independently of notifications');
})().catch(error => { console.error(error); process.exitCode = 1; });
