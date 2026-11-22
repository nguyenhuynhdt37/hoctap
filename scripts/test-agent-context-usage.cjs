const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../studynest_fe/node_modules/typescript');
(async () => {
  const source = fs.readFileSync('studynest_fe/src/components/user/learning_detail/agent/activity.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const { activityEvent, safeActivity } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  const result = activityEvent({ type: 'context.usage', payload: { model: 'fixture', used_tokens: 42, context_window_tokens: 1000, percent: 4.2, estimated: true, access_token: 'secret' } });
  assert.equal(result.payload.used_tokens, 42);
  assert.equal(result.payload.context_window_tokens, 1000);
  assert.equal(result.payload.percent, 4.2);
  assert.equal(result.payload.estimated, true);
  assert.equal(result.payload.access_token, undefined);
  assert.deepEqual(safeActivity({ used_tokens: 'secret', access_token: 123 }), { used_tokens: '[ẩn]', access_token: '[ẩn]' });
  console.log('Context usage projection passed');
})();
