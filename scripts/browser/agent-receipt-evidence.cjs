const assert = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');

/** A rejected stale action is not success. Success requires a different,
 * later action's completed receipt linked to the completed tool result. */
function assertVerifiedUiEvidence(events) {
  const retryableTools = new Set(['video.get_state', 'video.seek', 'video.play', 'video.pause', 'video.set_playback_rate', 'learning.navigate_lesson', 'learning.next_lesson', 'learning.previous_lesson', 'ui.get_state', 'ui.open_panel', 'ui.close_panel', 'ui.switch_tab', 'editor.get_state', 'editor.read_file', 'editor.read_selection', 'editor.propose_patch', 'code.run_sample_tests']);
  const requests = events.filter(event => event.type === 'ui.action_requested');
  const receipts = events.filter(event => event.type === 'ui.action_receipt');
  const completed = events.filter(event => event.type === 'tool.completed');
  const requestsById = new Map(requests.map(event => [event.payload.action_id, event]));
  const receiptsById = new Map(receipts.map(event => [event.payload.action_id, event]));
  const clientToolNames = new Set(requests.map(event => event.payload.name));
  for (const tool of completed.filter(event => clientToolNames.has(event.payload.name))) {
    const actionId = tool.payload.result?.action_id;
    assert.ok(actionId, `completed UI tool ${tool.payload.name} lacks an action ID`);
    const request = requestsById.get(actionId), receipt = receiptsById.get(actionId);
    assert.ok(request && receipt, `completed tool ${tool.payload.name} lacks matching request/receipt`);
    assert.equal(request.payload.name, tool.payload.name);
    assert.equal(tool.payload.result.verified, true, 'tool result must itself be verified');
    assert.equal(receipt.payload.status, 'completed'); assert.equal(receipt.payload.verified, true);
    assert.ok(request.sequence < receipt.sequence && receipt.sequence < tool.sequence, 'tool must complete after verified receipt');
  }
  for (const receipt of receipts) {
    const request = requestsById.get(receipt.payload.action_id);
    assert.ok(request, 'receipt has no matching action request');
    if (receipt.payload.status === 'completed') { assert.equal(receipt.payload.verified, true); continue; }
    assert.equal(receipt.payload.status, 'stale_context', 'unresolved failed/cancelled action in completed run');
    assert.equal(receipt.payload.verified, false, 'stale action cannot claim verification');
    assert.ok(!request.payload.approval_id && retryableTools.has(request.payload.name), 'mutation or unknown tool must never retry stale context');
    assert.ok(!receipt.payload.result?.applied && !receipt.payload.result?.undone, 'stale receipt must not report a committed mutation');
    assert.ok(!completed.some(event => event.payload.result?.action_id === receipt.payload.action_id), 'stale action cannot appear in a completed tool result');
    const fresh = requests.find(candidate => candidate.sequence > receipt.sequence && candidate.payload.action_id !== receipt.payload.action_id && candidate.payload.name === request.payload.name && candidate.payload.page_instance_id === request.payload.page_instance_id && candidate.payload.lesson_id === request.payload.lesson_id && isDeepStrictEqual(candidate.payload.arguments, request.payload.arguments) && receiptsById.get(candidate.payload.action_id)?.payload.status === 'completed' && receiptsById.get(candidate.payload.action_id)?.payload.verified === true && completed.some(event => event.payload.result?.action_id === candidate.payload.action_id));
    assert.ok(fresh, 'stale action needs a later verified action with identical intent and scope');
    assert.ok(events.some(event => event.type === 'tool.retry' && event.sequence > receipt.sequence && event.sequence < fresh.sequence && event.payload.name === request.payload.name && event.payload.reason === 'stale_context'), 'retry must be explicitly recorded by runtime');
  }
}
module.exports = { assertVerifiedUiEvidence };
