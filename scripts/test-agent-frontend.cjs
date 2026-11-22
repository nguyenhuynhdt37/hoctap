const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('../studynest_fe/node_modules/typescript');
const file = path.resolve(__dirname, '../studynest_fe/src/components/user/learning_detail/agent/action-registry.ts');
const javascript = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const modulePromise = import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));
const screen = () => ({ schema_version: 1, page_instance_id: 'tab-a', revision: 7, lesson_id: 'lesson-a', captured_at: new Date().toISOString(), route: '/learning/test' });
const request = (extra = {}) => ({ action_id: 'action-1', name: 'video.pause', arguments: {}, page_instance_id: 'tab-a', context_revision: 7, lesson_id: 'lesson-a', expires_at: new Date(Date.now() + 30000).toISOString(), ...extra });

test('rejects cross-tab, stale revision, foreign lesson and expired actions without executing', async () => {
  const { ActionRegistry } = await modulePromise;
  for (const args of [{ page_instance_id: 'tab-b' }, { context_revision: 6 }, { lesson_id: 'lesson-b' }, { expires_at: '2001-01-01' }]) {
    const registry = new ActionRegistry(screen); let calls = 0;
    registry.register('video.pause', { execute: async () => { calls++; return true; }, verify: Boolean });
    const receipt = await registry.dispatch(request(args)); assert.equal(receipt.status, 'stale_context'); assert.equal(calls, 0);
  }
});
test('deduplicates concurrent execution and rejects altered replay arguments', async () => {
  const { ActionRegistry } = await modulePromise; const registry = new ActionRegistry(screen); let calls = 0;
  registry.register('video.pause', { execute: async () => { calls++; await new Promise(r => setTimeout(r, 10)); return true; }, verify: Boolean });
  const action = request(); const receipts = await Promise.all([registry.dispatch(action), registry.dispatch(action)]);
  assert.equal(calls, 1); assert.equal(receipts[0].status, 'completed');
  const replay = await registry.dispatch({ ...action, arguments: { unsafe: true } }); assert.equal(replay.status, 'failed'); assert.equal(calls, 1);
});
test('write approval and actual verification are required', async () => {
  const { ActionRegistry } = await modulePromise; const registry = new ActionRegistry(screen); let calls = 0;
  registry.register('editor.apply_patch', { mutation: true, execute: async () => { calls++; return {}; }, verify: () => false });
  assert.equal((await registry.dispatch(request({ name: 'editor.apply_patch' }))).status, 'failed'); assert.equal(calls, 0);
  assert.equal((await registry.dispatch(request({ action_id: 'action-2', name: 'editor.apply_patch', approval_id: 'approved-1' }))).status, 'failed'); assert.equal(calls, 1);
});
test('cancellation aborts handler and never reports success', async () => {
  const { ActionRegistry } = await modulePromise; const registry = new ActionRegistry(screen);
  registry.register('video.pause', { execute: async (_args, signal) => { await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true })); return true; }, verify: Boolean });
  const pending = registry.dispatch(request()); registry.cancel(); assert.equal((await pending).status, 'cancelled');
});
test('navigation validates original lesson and reports actual target', async () => {
  const { ActionRegistry } = await modulePromise; const registry = new ActionRegistry(screen);
  registry.register('learning.navigate_lesson', { execute: async () => ({ lesson_id: 'lesson-b' }), verify: () => true });
  const receipt = await registry.dispatch(request({ name: 'learning.navigate_lesson' })); assert.equal(receipt.lesson_id, 'lesson-b'); assert.equal(receipt.context_revision, 7);
});
test('multi-file patches preserve unaffected bytes and apply atomically', async () => {
  const { applyEditorPatches } = await modulePromise; const files = { a: 'hello world', b: 'abc' };
  const patches = [{ file_id: 'a', start: 6, end: 11, expected_text: 'world', replacement: 'cloud' }, { file_id: 'b', start: 1, end: 2, expected_text: 'b', replacement: 'B' }];
  assert.deepEqual(applyEditorPatches(files, patches), { a: 'hello cloud', b: 'aBc' }); assert.deepEqual(files, { a: 'hello world', b: 'abc' });
  assert.throws(() => applyEditorPatches(files, [...patches, { file_id: 'b', start: 0, end: 2, expected_text: 'ab', replacement: 'x' }])); assert.deepEqual(files, { a: 'hello world', b: 'abc' });
  assert.throws(() => applyEditorPatches(files, [{ ...patches[0], expected_text: 'stale' }]));
  assert.throws(() => applyEditorPatches(files, [{ ...patches[0], file_id: '__proto__' }]));
});

const clientPath = path.resolve(__dirname, '../studynest_fe/src/components/user/learning_detail/agent/agent-client.ts');
const clientSource = fs.readFileSync(clientPath, 'utf8').replace(/import \{ refreshSession \} from [^;]+;/, 'const refreshSession = async () => {};');
const clientJavascript = ts.transpileModule(clientSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const clientModule = import('data:text/javascript;base64,' + Buffer.from(clientJavascript).toString('base64'));
const event = (sequence, type = 'message.delta', run_id = 'run-1') => ({ schema_version: 1, id: String(sequence), run_id, sequence, type, timestamp: new Date().toISOString(), payload: { delta: 'hello' } });
function eventResponse(events) {
  const content = events.map(value => 'data: ' + JSON.stringify(value) + '\n\n').join('');
  const bytes = new TextEncoder().encode(content);
  return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } }), { status: 200 });
}
test('agent SSE preserves frame boundaries and ignores duplicate events', async () => {
  const { consumeAgentEvents } = await clientModule; const originalFetch = global.fetch; const received = [];
  global.fetch = async () => eventResponse([event(1), event(1), event(2, 'run.completed')]);
  try { await consumeAgentEvents('run-1', async value => received.push(value.sequence), new AbortController().signal); assert.deepEqual(received, [1, 2]); }
  finally { global.fetch = originalFetch; }
});
test('agent SSE rejects gaps and events from a different run', async () => {
  const { consumeAgentEvents } = await clientModule; const originalFetch = global.fetch;
  try {
    for (const values of [[event(2, 'run.completed')], [event(1, 'run.completed', 'foreign-run')]]) {
      global.fetch = async () => eventResponse(values);
      await assert.rejects(consumeAgentEvents('run-1', async () => undefined, new AbortController().signal));
    }
  } finally { global.fetch = originalFetch; }
});
test('agent SSE reconnects GET from last sequence without resubmitting a run', async () => {
  const { consumeAgentEvents } = await clientModule; const originalFetch = global.fetch; const urls = []; const received = [];
  global.fetch = async url => { urls.push(url); return eventResponse(urls.length === 1 ? [event(1)] : [event(2, 'run.completed')]); };
  try {
    await consumeAgentEvents('run-1', async value => received.push(value.sequence), new AbortController().signal);
    assert.equal(urls.length, 2); assert.ok(urls[1].endsWith('?after=1')); assert.deepEqual(received, [1, 2]);
  } finally { global.fetch = originalFetch; }
});
