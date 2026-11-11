const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', 'studynest_fe');
const ts = require(path.join(root, 'node_modules/typescript'));
const axios = require(path.join(root, 'node_modules/axios/dist/node/axios.cjs'));
const next = require(path.join(root, 'node_modules/next/server'));
const redirects = [];
const state = { authenticated: false, refreshStatus: 200, refreshes: 0, replayFails: false, attempts: 0 };
const location = { pathname: '/learning/guitar', search: '?tab=chat', assign: url => redirects.push(url) };
function response(config, status, data) {
  const result = { config, status, data, statusText: String(status), headers: {} };
  if (status >= 400) throw new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, result);
  return result;
}
axios.defaults.adapter = async config => {
  if (config.url.endsWith('/auth/me')) return response(config, state.authenticated ? 200 : 401, {});
  if (config.url.endsWith('/auth/refresh')) {
    state.refreshes++;
    await new Promise(resolve => setTimeout(resolve, 10));
    if (state.refreshStatus !== 200) return response(config, state.refreshStatus, {});
    state.authenticated = true;
    return response(config, 200, { access_token: 'fresh-access' });
  }
  state.attempts++;
  return response(config, !state.authenticated || state.replayFails ? 401 : 200, { success: true });
};
function load(relative, imports = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, require: name => imports[name] ?? (name === 'axios' ? axios : require(name)),
    console, process, URL, Headers, Request, Response, AbortSignal, AbortController, TextDecoder,
    setTimeout, clearTimeout, atob, window: { location }, navigator: { locks: { request: async (_, callback) => callback() } },
    ...globals,
  }, { filename: relative });
  return module.exports;
}
function reset() { Object.assign(state, { authenticated: false, refreshStatus: 200, refreshes: 0, replayFails: false, attempts: 0 }); }
async function clientTests() {
  const refresh = load('src/lib/utils/fetcher/client/refresh-session.ts');
  const api = load('src/lib/utils/fetcher/client/axios.ts', { './refresh-session': refresh }).default;
  reset();
  await Promise.all(Array.from({ length: 8 }, () => api.get('/private')));
  assert.equal(state.refreshes, 1); assert.equal(state.attempts, 16);
  reset(); state.replayFails = true;
  await assert.rejects(api.get('/private'));
  assert.equal(state.refreshes, 1); assert.equal(state.attempts, 2);
  reset(); state.refreshStatus = 503;
  await assert.rejects(api.get('/private'));
  assert.equal(redirects.length, 0);
  state.refreshStatus = 200;
  await api.get('/private'); assert.equal(state.refreshes, 2);
  reset();
  const events = load('src/lib/utils/fetcher/client/chat-events.ts');
  const chat = load('src/lib/utils/fetcher/client/chat-stream.ts', { './refresh-session': refresh, './chat-events': events }, {
    fetch: async () => state.authenticated
      ? new Response('data: {"type":"delta","delta":"hello"}\n\ndata: {"type":"done","data":{"content":"hello"}}\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
      : new Response(null, { status: 401 }),
  });
  const [_, result] = await Promise.all([api.get('/private'), chat.postChatStream('/chat', {}, () => {})]);
  assert.equal(state.refreshes, 1); assert.equal(result.content, 'hello');
  reset();
  await api.post('/auth/logout');
  assert.equal(state.refreshes, 1);
  reset(); state.refreshStatus = 401;
  await Promise.allSettled([api.get('/private'), api.get('/private')]);
  assert.equal(redirects.length, 1); assert.match(redirects[0], /tab%3Dchat/);
  console.log('PASS: Axios burst, bounded retries, temporary failures, chat shared refresh, one genuine-expiry redirect');
}
async function middlewareTests() {
  let mode = 'normal', roles = ['USER'], refreshCount = 0;
  const fetch = async (url, config) => {
    if (url.endsWith('/refresh')) {
      refreshCount++;
      if (mode === 'invalid') return new Response('{}', { status: 401 });
      if (mode === 'refresh-down') return new Response('{}', { status: 503 });
      const headers = new Headers({ 'Content-Type': 'application/json' });
      headers.append('Set-Cookie', 'access_token=access-new; HttpOnly; Path=/; Max-Age=1800; SameSite=Lax');
      headers.append('Set-Cookie', 'refresh_token=refresh-new; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax');
      return new Response(JSON.stringify({ access_token: 'access-new', refresh_token: 'refresh-new' }), { headers });
    }
    if (mode === 'down') return new Response('{}', { status: 503 });
    return new Response(JSON.stringify({ roles, is_banned: false }), {
      status: config.headers.Cookie.includes('access_token=access-new') ? 200 : 401,
    });
  };
  const middleware = load('src/middleware.ts', { 'next/server': next }, { fetch }).middleware;
  const request = route => new next.NextRequest(`http://localhost:3000${route}`, {
    headers: { cookie: 'access_token=expired; refresh_token=refresh; theme=dark' },
  });
  let result = await middleware(request('/profile?tab=settings'));
  assert.equal(result.status, 200); assert.equal(result.headers.getSetCookie().length, 2);
  assert.match(result.headers.get('x-middleware-request-cookie'), /access_token=access-new/);
  assert.match(result.headers.get('x-middleware-request-cookie'), /theme=dark/);
  result = await middleware(request('/'));
  assert.equal(result.status, 200); assert.equal(result.headers.getSetCookie().length, 2);
  result = await middleware(request('/admin'));
  assert.equal(result.status, 307); assert.equal(result.headers.getSetCookie().length, 2);
  mode = 'down'; const before = refreshCount;
  result = await middleware(request('/profile'));
  assert.equal(result.status, 503); assert.equal(refreshCount, before);
  assert.equal(result.headers.get('location'), null); assert.equal(result.headers.getSetCookie().length, 0);
  mode = 'refresh-down'; result = await middleware(request('/profile'));
  assert.equal(result.status, 503); assert.equal(result.headers.getSetCookie().length, 0);
  mode = 'invalid'; result = await middleware(request('/login'));
  assert.equal(result.status, 200); assert.equal(result.headers.getSetCookie().length, 2);
  assert.doesNotMatch(result.headers.get('x-middleware-request-cookie') ?? '', /access_token|refresh_token/);
  console.log('PASS: middleware SSR cookie propagation, public pages, role redirects, upstream outages, invalid-cookie cleanup');
}
(async () => { await clientTests(); await middlewareTests(); })().catch(error => { console.error(error); process.exitCode = 1; });
