from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from app.agent.activity import safe, public_event


def test_activity_projects_execution_without_model_reasoning_or_message_content():
    event = SimpleNamespace(id=uuid4(), run_id=uuid4(), sequence=3, type='tool.started',
        created_at=datetime.now(timezone.utc), payload={'name':'data.query_account',
            'arguments':{'sql':'SELECT count(*) FROM my_courses', 'access_token':'private'},
            'reasoning':'private reasoning', 'thought':'private thought', 'message':{'content':'private'}})
    projected = public_event(event)
    assert projected['payload']['arguments']['access_token'] == '[ẩn]'
    assert 'reasoning' not in projected['payload'] and 'thought' not in projected['payload']
    assert 'message' not in projected['payload']


def test_activity_bounds_outputs_and_redacts_nested_credentials():
    value = safe({'password':'private', 'nested':[{'client_secret':'private'}], 'stdout':'Bearer xyz github_pat_abcdef', 'long':'x'*10000})
    assert value['password'] == '[ẩn]' and value['nested'][0]['client_secret'] == '[ẩn]'
    assert 'xyz' not in value['stdout'] and 'github_pat_' not in value['stdout']
    assert len(value['long']) == 2000


def test_completed_event_does_not_publish_arbitrary_tool_result():
    event = SimpleNamespace(id=uuid4(), run_id=uuid4(), sequence=4, type='tool.completed',
        created_at=datetime.now(timezone.utc), payload={'name':'mcp.github_list_repositories',
        'result':{'items':[{'full_name':'owner/private'}], 'access_token':'private', 'reasoning':'hidden'}})
    assert public_event(event)['payload']['result'] == {'item_count':1}


def test_context_usage_survives_projection_without_exposing_credentials():
    event=SimpleNamespace(id=uuid4(),run_id=uuid4(),sequence=4,type='context.usage',created_at=datetime.now(timezone.utc),payload={
        'model':'fixture','used_tokens':800001,'context_window_tokens':1000000,'percent':80.0001,'estimated':True,'access_token':'secret',
    })
    projected=public_event(event)['payload']
    assert projected['used_tokens']==800001 and projected['context_window_tokens']==1000000
    assert projected['percent']==80.0001 and projected['estimated']
    assert 'access_token' not in projected
    assert safe({'used_tokens':'actual-secret','access_token':123})=={'used_tokens':'[ẩn]','access_token':'[ẩn]'}
