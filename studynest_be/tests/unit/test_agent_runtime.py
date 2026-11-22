"""Deterministic policy/contract tests; no model/provider or production DB calls."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.agent.contracts import ActionReceipt, ApprovalDecision, ModelDecision, RunState, ScreenSnapshot, check_transition
from app.agent.runtime import AgentService, bounded_json, build_prompt, digest, direct_intent, github_mcp_connection_requested, is_greeting, needs_lesson_grounding, requested_action
from app.agent.tools import REGISTRY, Patch, Search, available


def snapshot(**kw):
    return dict(schema_version=1,page_instance_id='test-page-instance',revision=2,captured_at=datetime.now(timezone.utc),route='/learning/course',lesson_id=uuid4(),**kw)


def test_screen_context_rejects_code_content_and_stale_time():
    with pytest.raises(ValidationError):
        ScreenSnapshot.model_validate(snapshot(editor={'revision':1,'is_dirty':True,'content':'secret accidental whole buffer'}))
    data=snapshot();data['captured_at']=datetime.now(timezone.utc)-timedelta(minutes=10)
    with pytest.raises(ValidationError):
        ScreenSnapshot.model_validate(data)
    data=snapshot();data['captured_at']=datetime.now()
    with pytest.raises(ValidationError):
        ScreenSnapshot.model_validate(data)


def test_screen_requires_monotonic_selection_and_no_client_owner():
    with pytest.raises(ValidationError):
        ScreenSnapshot.model_validate(snapshot(editor={'revision':1,'is_dirty':True,'selection':{'start':5,'end':2}}))
    with pytest.raises(ValidationError):
        ScreenSnapshot.model_validate(snapshot(user_id=str(uuid4())))


@pytest.mark.parametrize('state',list(RunState)[-5:])
def test_terminal_runs_cannot_reenter_executor(state):
    with pytest.raises(ValueError):
        check_transition(state,RunState.EXECUTING)


def test_state_machine_requires_approval_and_verification_transitions():
    check_transition(RunState.EXECUTING,RunState.AWAITING_APPROVAL)
    check_transition(RunState.AWAITING_APPROVAL,RunState.EXECUTING)
    check_transition(RunState.VERIFYING,RunState.COMPLETED)
    with pytest.raises(ValueError):
        check_transition(RunState.CREATED,RunState.COMPLETED)
    with pytest.raises(ValueError):
        check_transition(RunState.EXECUTING,RunState.COMPLETED)


def test_known_registry_cannot_expose_financial_or_arbitrary_browser_tools():
    assert all(not any(word in name for word in ['checkout','wallet','refund','shell','eval','selector']) for name in REGISTRY)
    tools=available(SimpleNamespace(capabilities=['video.seek','checkout','editor.apply_patch'],lesson_id=uuid4()))
    assert 'video.seek' in tools and 'editor.apply_patch' in tools
    assert 'editor.read_file' not in tools
    assert 'checkout' not in tools
    assert all(name.startswith(('catalog.','memory.','data.','mcp.','tools.')) for name in available(SimpleNamespace(capabilities=['video.seek'],lesson_id=None)))


def test_write_tools_require_approval_and_are_not_automatically_retried():
    for name in ['editor.apply_patch','editor.undo_patch']:
        assert REGISTRY[name].requires_approval
        assert not REGISTRY[name].idempotent
        assert REGISTRY[name].risk=='write'


def test_patch_and_tool_args_reject_extra_authority_fields():
    with pytest.raises(ValidationError):
        Search(query='a',user_id=str(uuid4()))
    with pytest.raises(ValidationError):
        Patch(exercise_id=uuid4(),base_revision=0,patches=[{'file_id':'a','start':3,'end':2,'expected_text':'','replacement':'a'}])
    with pytest.raises(ValidationError):
        ModelDecision.model_validate({'tool_calls':[{'name':'video.seek','arguments':{},'admin':True}]})


def test_explicit_simple_actions_do_not_need_model_inference():
    assert direct_intent('Tạm dừng video')==('video.pause',{})
    assert direct_intent('Tua video về phút thứ 3')==('video.seek',{'seconds':180})
    assert direct_intent('Tua video tới 01:09')==('video.seek',{'seconds':69})
    assert direct_intent('Tua video tới 30 giây')==('video.seek',{'seconds':30})
    assert direct_intent('giải thích video dùng pause thế nào') is None
    assert is_greeting('cảm ơn nhé!')
    assert not is_greeting('hi giải thích hợp âm')


def test_hash_canonical_and_result_output_bounded():
    assert digest({'a':1,'b':2})==digest({'b':2,'a':1})
    with pytest.raises(HTTPException) as exc:
        bounded_json({'a':'x'*500},limit=100)
    assert exc.value.status_code==413


@pytest.mark.parametrize('message', ['connect github mcp', 'Please connect to GitHub MCP', 'Kết nối GitHub MCP', 'hãy cấu hình MCP'])
def test_external_connection_request_does_not_require_lesson_sources(message):
    assert github_mcp_connection_requested(message)
    assert not needs_lesson_grounding(message)


@pytest.mark.parametrize('message', ['Giải thích code kết nối GitHub MCP trong bài này', 'hi giải thích bài học', 'Kết nối GitHub MCP rồi giải thích bài học'])
def test_connection_keywords_do_not_bypass_grounding_for_lesson_questions(message):
    assert not github_mcp_connection_requested(message)
    assert needs_lesson_grounding(message)


@pytest.mark.asyncio
async def test_github_connection_reply_never_searches_lesson_or_calls_model(monkeypatch):
    import app.agent.github_connection as github_connection
    monkeypatch.setattr(github_connection, 'connection_status', AsyncMock(return_value={'connected': False}))
    db = SimpleNamespace(commit=AsyncMock())
    service = AgentService(db, SimpleNamespace(id=uuid4()), str(uuid4()))
    service.session = SimpleNamespace(lesson_id=uuid4(), context_revision=1)
    run = SimpleNamespace(message='connect github mcp')
    service._assert_running_async = AsyncMock(return_value=run)
    service._transition_async = AsyncMock()
    service._context_async = AsyncMock(return_value={})
    service._emit_async = AsyncMock()
    service.execute_tool_async = AsyncMock()
    service.finish_async = AsyncMock()
    await service.run_async(uuid4())
    service.execute_tool_async.assert_not_awaited()
    reply = service.finish_async.call_args.args[1]
    assert 'Kết nối GitHub' in reply and 'chưa truy cập repo' in reply
    assert service.finish_async.call_args.kwargs == {'partial': False}


def test_prompt_labels_untrusted_context_and_omits_private_reasoning_request():
    prompt=build_prompt('Mở bài tiếp theo',{'screen':{'active_tab':'notes'}},[])
    assert 'DỮ LIỆU không đáng tin' in prompt
    assert 'Không hiển thị suy nghĩ nội bộ' in prompt
    assert requested_action('Mở bài tiếp theo')


@pytest.mark.asyncio
async def test_foreign_session_never_resolves():
    db=SimpleNamespace(scalar=AsyncMock(return_value=None))
    service=AgentService(db,SimpleNamespace(id=uuid4()),str(uuid4()))
    with pytest.raises(HTTPException) as exc:
        await service.get_session_async(uuid4())
    assert exc.value.status_code==404


@pytest.mark.asyncio
async def test_receipt_must_match_page_revision_and_target_lesson():
    run_id, action_id, lesson_id=uuid4(),uuid4(),uuid4()
    run=SimpleNamespace(id=run_id,state='executing')
    call=SimpleNamespace(receipt=None,expires_at=datetime.now(timezone.utc)+timedelta(minutes=1),expected_page_instance_id='correct-page',expected_context_revision=4,expected_lesson_id=lesson_id)
    db=SimpleNamespace(scalar=AsyncMock(return_value=call))
    service=AgentService(db,SimpleNamespace(id=uuid4()),str(uuid4()))
    service.principal_async=AsyncMock()
    service.get_run_async=AsyncMock(return_value=run)
    for page,revision,lesson in [('attacker-page',4,lesson_id),('correct-page',3,lesson_id),('correct-page',4,uuid4())]:
        with pytest.raises(HTTPException) as exc:
            await service.receipt_async(run_id,action_id,ActionReceipt(page_instance_id=page,context_revision=revision,lesson_id=lesson,status='completed',verified=True))
        assert exc.value.status_code==409


@pytest.mark.asyncio
async def test_receipt_replay_different_result_rejected():
    run=SimpleNamespace(id=uuid4(),state='executing')
    call=SimpleNamespace(receipt={'page_instance_id':'correct-page','context_revision':4,'lesson_id':None,'status':'completed','verified':True,'result':{'actual_time':30},'error':None})
    service=AgentService(SimpleNamespace(scalar=AsyncMock(return_value=call)),SimpleNamespace(id=uuid4()),str(uuid4()))
    service.principal_async=AsyncMock();service.get_run_async=AsyncMock(return_value=run)
    with pytest.raises(HTTPException) as exc:
        await service.receipt_async(run.id,uuid4(),ActionReceipt(page_instance_id='correct-page',context_revision=4,status='completed',verified=True,result={'actual_time':90}))
    assert exc.value.status_code==409


@pytest.mark.asyncio
async def test_approval_context_must_match_original_and_current_revision():
    run=SimpleNamespace(id=uuid4(),session_id=uuid4(),state='awaiting_approval')
    approval=SimpleNamespace(id=uuid4(),expires_at=datetime.now(timezone.utc)+timedelta(minutes=1),page_instance_id='correct-page',context_revision=3,status='pending')
    service=AgentService(SimpleNamespace(scalar=AsyncMock(return_value=approval)),SimpleNamespace(id=uuid4()),str(uuid4()))
    service.principal_async=AsyncMock();service.get_run_async=AsyncMock(return_value=run);service.get_session_async=AsyncMock(return_value=SimpleNamespace(context_revision=4))
    with pytest.raises(HTTPException) as exc:
        await service.approval_async(run.id,approval.id,ApprovalDecision(decision='approved',page_instance_id='correct-page',context_revision=3))
    assert exc.value.status_code==409


def test_navigation_requires_explicit_command_not_negated_or_quoted_data():
    from app.agent.runtime import navigation_requested
    assert navigation_requested('Tua video về phút 3','video.seek')
    assert navigation_requested('Giải thích bài rồi mở tab ghi chú','ui.switch_tab')
    assert navigation_requested('Hãy mở bài tiếp theo','learning.next_lesson')
    assert not navigation_requested('Đừng mở bài khác; chỉ giải thích','learning.navigate_lesson')
    assert not navigation_requested('Giải thích câu “mở bài tiếp”','learning.next_lesson')
    assert not navigation_requested('Hướng dẫn cách mở ghi chú','ui.switch_tab')
    assert not navigation_requested('Code comment: `mở bài tiếp`','learning.next_lesson')


def test_navigation_intent_binds_operation_and_target_type():
    from app.agent.runtime import navigation_requested
    assert not navigation_requested('Mở panel chat','ui.close_panel')
    assert not navigation_requested('Đổi file main.py','video.set_playback_rate')
    assert not navigation_requested('Mở bài trước','learning.next_lesson')
    assert navigation_requested('Chỉnh tốc độ video lên 1.5x','video.set_playback_rate')
    assert navigation_requested('Đóng panel chat','ui.close_panel')


@pytest.mark.asyncio
@pytest.mark.parametrize('code,conflict', [('40P01', True), ('40001', True), ('55P03', True), ('08006', False), ('42P01', False)])
async def test_admission_maps_only_retryable_database_errors(code, conflict):
    from sqlalchemy.exc import DBAPIError
    db = SimpleNamespace(rollback=AsyncMock())
    service = AgentService.__new__(AgentService)
    service.db = db
    original = Exception('fixture database error')
    original.sqlstate = code
    failure = DBAPIError('SELECT fixture', {}, original)
    service._create_run_async = AsyncMock(side_effect=failure)
    if conflict:
        with pytest.raises(HTTPException) as exc:
            await service.create_run_async(None)
        assert exc.value.status_code == 409
    else:
        with pytest.raises(DBAPIError) as exc:
            await service.create_run_async(None)
        assert exc.value is failure
    db.rollback.assert_awaited_once()
