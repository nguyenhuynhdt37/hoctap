const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('../studynest_fe/node_modules/typescript');
const root = 'studynest_fe/src/components/user/assistant/';
function load(file, extras = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(root + file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => extras.modules?.[name], ...extras.globals });
  return module.exports;
}
const text = load('dictation-text.ts', { globals: { URL } });
test('snapshots preserve existing draft without duplicating interim words', () => {
  assert.equal(text.dictationDraft('Nháp', 'xin'), 'Nháp xin');
  assert.equal(text.dictationDraft('Nháp', 'xin chào'), 'Nháp xin chào');
  assert.equal(text.dictationDraft('x'.repeat(11999), 'nói tiếp').length, 12000);
  assert.equal(text.transcriptEvent({ type: 'transcript', text: 'old', seq: 1 }, 2), null);
  assert.equal(text.transcriptEvent({ type: 'transcript', text: 'duplicate', seq: 2 }, 2), null);
  assert.equal(text.transcriptEvent({ type: 'complete', text: 'final', seq: 2 }, 2).text, 'final');
});
test('socket URL uses TLS and never carries auth in query parameters', () => {
  assert.equal(text.dictationSocketUrl('https://api.example', 'https://app.example'), 'wss://api.example/api/v1/agent/dictation');
  assert.equal(text.dictationSocketUrl('ws://localhost:8000', 'http://localhost:3000'), 'ws://localhost:8000/api/v1/agent/dictation');
  assert.throws(() => text.dictationSocketUrl('ws://api.example', 'https://app.example'));
});
function harness({ pendingMic = false } = {}) {
  const updates = [], states = [], errors = [], cleanup = [], sockets = [], processors = [], contexts = [];
  let stateIndex = 0, resolveMic, mediaCalls = 0, ticketCalls = 0, stopped = 0;
  const track = { onended: null, stop() { stopped++; } };
  const stream = { getTracks: () => [track] };
  class Context {
    constructor() { this.state = 'running'; contexts.push(this); this.audioWorklet = { addModule: async () => {} }; }
    async resume() {} async close() { this.state = 'closed'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createGain() { return { gain: { value: 1 }, connect(target) { return target; }, disconnect() {} }; }
  }
  class Processor {
    constructor() { processors.push(this); this.port = { onmessage: null, postMessage() {}, close() {} }; }
    connect(target) { return target; } disconnect() {}
  }
  class Socket {
    static OPEN = 1;
    constructor(url, protocols) { this.url = url; this.protocols = protocols; this.readyState = 1; this.bufferedAmount = 0; this.sent = []; sockets.push(this); }
    send(value) { this.sent.push(value); } close() { this.readyState = 3; }
    event(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
  }
  const react = {
    useCallback: fn => fn, useRef: value => ({ current: value }),
    useEffect: fn => cleanup.push(fn()),
    useState: value => { const index = stateIndex++; return [value, next => (index === 0 ? states : errors).push(next)]; },
  };
  const hook = load('use-dictation.ts', {
    modules: { react, './dictation-text': text, '@/lib/utils/fetcher/client/axios': { default: { post: async () => { ticketCalls++; return { data: { ticket: 'one-use-ticket' } }; } } } },
    globals: { window: { isSecureContext: true, AudioContext: Context, AudioWorkletNode: Processor, location: { origin: 'http://localhost:3000' }, addEventListener() {}, removeEventListener() {} }, navigator: { mediaDevices: { getUserMedia: () => { mediaCalls++; return pendingMic ? new Promise(resolve => { resolveMic = resolve; }) : Promise.resolve(stream); } } }, AudioContext: Context, AudioWorkletNode: Processor, WebSocket: Socket, MessageEvent: class {}, AbortController, ArrayBuffer, setTimeout, clearTimeout, process: { env: {} }, console },
  }).useDictation(() => 'Nháp', value => updates.push(value));
  return { hook, states, errors, updates, sockets, processors, contexts, get stopped() { return stopped; }, get mediaCalls() { return mediaCalls; }, get ticketCalls() { return ticketCalls; }, resolveMic: () => resolveMic(stream), cleanup: () => cleanup.forEach(fn => fn?.()) };
}
test('updates during recording, stops mic immediately and waits for final text', async () => {
  const h = harness();
  try {
    await h.hook.start(); const ws = h.sockets[0]; ws.event({ type: 'ready', sample_rate: 16000, max_seconds: 120 });
    ws.event({ type: 'transcript', seq: 1, text: 'xin', final: false });
    ws.event({ type: 'transcript', seq: 2, text: 'xin chào', final: false });
    assert.equal(h.updates.at(-1), 'Nháp xin chào'); assert.equal(h.stopped, 0);
    h.hook.stop(); assert.ok(h.stopped > 0); assert.equal(h.states.at(-1), 'finishing');
    h.processors[0].port.onmessage({ data: { type: 'flushed' } });
    assert.equal(JSON.parse(ws.sent.at(-1)).type, 'stop');
    ws.event({ type: 'complete', seq: 3, text: 'xin chào bạn.', final: true });
    assert.equal(h.updates.at(-1), 'Nháp xin chào bạn.'); assert.equal(h.states.at(-1), 'idle');
    assert.equal(ws.readyState, 3); assert.equal(h.contexts[0].state, 'closed');
  } finally { h.cleanup(); }
});
test('cancel while permission is pending stops a late media stream without opening a socket', async () => {
  const h = harness({ pendingMic: true });
  try {
    const start = h.hook.start(); await new Promise(setImmediate); h.hook.stop(); h.resolveMic(); await start;
    assert.ok(h.stopped > 0); assert.equal(h.sockets.length, 0); assert.equal(h.ticketCalls, 0);
  } finally { h.cleanup(); }
});
test('backpressure tears down microphone and retains already received text', async () => {
  const h = harness();
  try {
    await h.hook.start(); const ws = h.sockets[0]; ws.event({ type: 'ready', sample_rate: 16000, max_seconds: 120 });
    ws.event({ type: 'transcript', seq: 1, text: 'đã nhận' }); ws.bufferedAmount = 64001;
    h.processors[0].port.onmessage({ data: new ArrayBuffer(3200) });
    assert.ok(h.stopped > 0); assert.equal(h.states.at(-1), 'idle'); assert.equal(h.updates.at(-1), 'Nháp đã nhận');
  } finally { h.cleanup(); }
});
test('unmount ignores stale transcripts and duplicate starts acquire only one mic', async () => {
  const h = harness();
  const first = h.hook.start(); await h.hook.start(); await first;
  const ws = h.sockets[0]; ws.event({ type: 'ready', sample_rate: 16000, max_seconds: 120 });
  const stale = ws.onmessage; h.cleanup(); stale({ data: JSON.stringify({ type: 'transcript', seq: 1, text: 'late' }) });
  assert.equal(h.mediaCalls, 1); assert.equal(h.updates.length, 0); assert.ok(h.stopped > 0);
});
