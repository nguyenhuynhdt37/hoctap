"""Deterministic policy/contract tests; no model/provider or production DB calls."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.agent.contracts import ActionReceipt, ApprovalDecision, ModelDecision, RunState, ScreenSnapshot, check_transition
from app.agent.runtime import AgentService, bounded_json, build_prompt, digest
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
    assert all(name.startswith(('catalog.','memory.','data.','mcp.','tools.','api.')) for name in available(SimpleNamespace(capabilities=['video.seek'],lesson_id=None)))


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




def test_hash_canonical_and_result_output_bounded():
    assert digest({'a':1,'b':2})==digest({'b':2,'a':1})
    with pytest.raises(HTTPException) as exc:
        bounded_json({'a':'x'*500},limit=100)
    assert exc.value.status_code==413










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






@pytest.mark.asyncio
async def test_hannes_lite_turn_engine_gate_and_reread_deduplication():
    from app.agent.turn_engine import TurnToolRuntime, UNCHANGED_NOTICE
    runtime = TurnToolRuntime(max_shared=2)
    r1 = await runtime.gate.acquire(exclusive=False)
    r2 = await runtime.gate.acquire(exclusive=False)
    r1()
    r2()
    ex = await runtime.gate.acquire(exclusive=True)
    ex()

    first, is_new_1 = runtime.record_outcome(
        'learning.get_current_lesson', {}, 'read', {'title': 'Bài 1', 'verified': True}, revision=3
    )
    assert is_new_1 is True and not first.get('unchanged')

    second, is_new_2 = runtime.record_outcome(
        'learning.get_current_lesson', {}, 'read', {'title': 'Bài 1', 'verified': True}, revision=3
    )
    assert is_new_2 is False and second.get('unchanged') is True and second['notice'] == UNCHANGED_NOTICE

    # A navigation action invalidates cached read fingerprints
    runtime.record_outcome('ui.switch_tab', {'tab': 'notes'}, 'navigation', {'active_tab': 'notes', 'verified': True}, revision=3)
    third, is_new_3 = runtime.record_outcome(
        'learning.get_current_lesson', {}, 'read', {'title': 'Bài 1', 'verified': True}, revision=3
    )
    assert is_new_3 is True and not third.get('unchanged')


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
