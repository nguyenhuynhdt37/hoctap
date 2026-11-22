const test = require('node:test');
const assert = require('node:assert/strict');
const { assertVerifiedUiEvidence } = require('./browser/agent-receipt-evidence.cjs');
const request = (sequence, id, name = 'ui.switch_tab') => ({ sequence, type: 'ui.action_requested', payload: { action_id: id, name, arguments: { tab: 'notes' }, page_instance_id: 'page-a', lesson_id: 'lesson-a' } });
const receipt = (sequence, id, status = 'completed') => ({ sequence, type: 'ui.action_receipt', payload: { action_id: id, status, verified: status === 'completed' } });
const completed = (sequence, id, name = 'ui.switch_tab') => ({ sequence, type: 'tool.completed', payload: { name, result: { action_id: id, verified: true } } });
const retry = { sequence: 3, type: 'tool.retry', payload: { name: 'ui.switch_tab', reason: 'stale_context' } };
const recovered = () => [request(1, 'old'), receipt(2, 'old', 'stale_context'), retry, request(4, 'fresh'), receipt(5, 'fresh'), completed(6, 'fresh')];
test('accepts direct evidence and verified scoped stale recovery', () => {
  assert.doesNotThrow(() => assertVerifiedUiEvidence([request(1, 'a'), receipt(2, 'a'), completed(3, 'a')]));
  assert.doesNotThrow(() => assertVerifiedUiEvidence(recovered()));
});
test('rejects stale success, missing receipt and changed intent or scope', () => {
  for (const mutate of [
    events => events[5].payload.result.action_id = 'old',
    events => events.splice(4, 1),
    events => events[3].payload.arguments = { tab: 'overview' },
    events => events[3].payload.lesson_id = 'lesson-b',
    events => events.splice(2, 1),
    events => events[0].payload.name = 'editor.apply_patch',
  ]) { const events = recovered(); mutate(events); assert.throws(() => assertVerifiedUiEvidence(events)); }
});
