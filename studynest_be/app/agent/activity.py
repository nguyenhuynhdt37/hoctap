"""Account-owned, bounded execution activity; never model reasoning or credentials."""
import re
import math
from sqlalchemy import select
from app.db.models.agent import AgentEvent, AgentRun

KINDS = {'memory.saved', 'run.started', 'context.resolved', 'context.usage', 'context.compacted', 'context.compacting', 'context.compaction_deferred', 'plan.created', 'plan.updated', 'budget.reserved',
    'tool.started', 'tool.completed', 'tool.failed', 'tool.denied', 'tool.awaiting_approval',
    'run.completed', 'run.partially_completed', 'run.failed', 'run.cancelled', 'run.expired'}
SECRET = re.compile(r'(?:authorization|token|secret|password|api.?key|cookie|credential)', re.I)


def safe(value, depth=0):
    if depth > 4:
        return '[…]'
    if isinstance(value, dict):
        return {str(k): ('[ẩn]' if SECRET.search(str(k)) and not (k in {'used_tokens','context_window_tokens','includes_output_reserve'} and isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)) else safe(v, depth+1))
            for k, v in list(value.items())[:20] if k not in {'expected_text','replacement','verifier','nonce_hash'}}
    if isinstance(value, list):
        return [safe(v, depth+1) for v in value[:10]]
    if isinstance(value, str):
        value = re.sub(r'(?i)(Bearer\s+|(?:token|secret|password|api_key)\s*[=:]\s*)[^\s,"\'}]+', r'\1[ẩn]', value)
        value = re.sub(r'\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b', '[ẩn]', value)
        return value[:2000]
    return value if value is None or isinstance(value, (bool, int, float)) else str(value)[:200]


def public_event(event):
    p = event.payload or {}
    allowed = ('name', 'tool_name', 'tool_call_id', 'arguments', 'steps', 'latency_ms', 'image_count', 'count', 'before_characters', 'after_characters', 'history_preserved', 'method', 'coverage_pending', 'model', 'used_tokens', 'context_window_tokens', 'percent', 'estimated', 'threshold_percent', 'limit_source', 'error', 'error_code', 'state')
    payload = {k: p[k] for k in allowed if k in p}
    result = p.get('result')
    if isinstance(result, dict):
        preview = {k: result[k] for k in ('verified','notice','rows','columns','stdout','stderr','exit_code','passed','tests_executed','next_page','next_offset','repository','path') if k in result}
        if isinstance(result.get('items'), list):
            preview['item_count'] = len(result['items'])
        payload['result'] = preview
    return {'schema_version':1, 'id':str(event.id), 'run_id':str(event.run_id),
        'sequence':event.sequence, 'type':event.type, 'timestamp':event.created_at.isoformat(), 'payload':safe(payload)}


async def for_messages(db, user_id, message_ids):
    ids = [str(i) for i in message_ids][:50]
    if not ids:
        return {}
    completed = (await db.scalars(select(AgentEvent).join(AgentRun, AgentRun.id == AgentEvent.run_id).where(
        AgentRun.user_id == user_id, AgentEvent.type.in_(['run.completed','run.partially_completed']),
        AgentEvent.payload['message']['id'].astext.in_(ids)))).all()
    mapping = {e.run_id: str(e.payload['message']['id']) for e in completed}
    if not mapping:
        return {}
    events = (await db.scalars(select(AgentEvent).where(AgentEvent.run_id.in_(mapping),
        AgentEvent.type.in_(KINDS)).order_by(AgentEvent.run_id, AgentEvent.sequence).limit(4000))).all()
    result = {}
    for event in events:
        result.setdefault(mapping[event.run_id], []).append(public_event(event))
    return result
