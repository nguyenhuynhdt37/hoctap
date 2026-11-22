import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from app.agent.semantic_compaction import Checkpoint,compact_working,compact_recent,summarize
from app.agent.context_compaction import prompt_payload


def test_checkpoint_preserves_categories_and_evidence_contract():
    state=Checkpoint.model_validate({'notes':[{'kind':'constraint','text':'Không dùng học thuộc lòng làm phương pháp duy nhất','evidence':['message:fixture']}]})
    assert state.notes[0].kind=='constraint'
    with pytest.raises(ValueError):Checkpoint.model_validate({'notes':[{'kind':'fact','text':'invented','evidence':[]}]})

@pytest.mark.asyncio
async def test_compactor_rejects_fabricated_evidence(monkeypatch):
    from app.core.llm import LLMService
    model=AsyncMock(return_value=json.dumps({'notes':[{'kind':'fact','text':'Unsupported claim','evidence':['message:foreign']}]}))
    monkeypatch.setattr(LLMService,'call_model',model)
    with pytest.raises(ValueError):await summarize({'notes':[]},[{'id':'message:owned','text':'user data'}])

@pytest.mark.asyncio
async def test_complete_middle_of_tool_output_is_processed_not_only_head_tail(monkeypatch):
    seen=[]
    async def compress(previous,delta):
        seen.extend(unit['text'] for unit in delta)
        notes=previous['notes'][:]
        if any('MIDDLE_CRITICAL_FACT' in unit['text'] for unit in delta):
            notes=[{'kind':'tool_result','text':'MIDDLE_CRITICAL_FACT: test failed, do not claim success','evidence':[delta[0]['id']]}]
        return {'notes':notes}
    monkeypatch.setattr('app.agent.semantic_compaction.summarize',compress)
    service=SimpleNamespace()
    body='a'*11000+'MIDDLE_CRITICAL_FACT'+'z'*11000
    context,raw=await compact_working(service,{},[{'name':'source','result':{'content':body}}])
    assert any('MIDDLE_CRITICAL_FACT' in note['text'] for note in context['working_checkpoint']['notes'])
    assert 'MIDDLE_CRITICAL_FACT' in ''.join(seen) and not raw
    count=len(seen)
    await compact_working(service,{},[{'name':'source','result':{'content':body}}])
    assert len(seen)==count,'Already summarized result must not be processed again'

@pytest.mark.asyncio
async def test_recent_semantic_merge_keeps_older_constraints_and_fresh_tail(monkeypatch):
    old={'kind':'constraint','text':'Use examples, no memorization','evidence':['message:old']}
    async def compress(previous,delta):
        return {'notes':previous['notes']+[{'kind':'decision','text':'Latest decision replaces Friday with Monday','evidence':[delta[0]['id']]}]}
    monkeypatch.setattr('app.agent.semantic_compaction.summarize',compress)
    context={'conversation':{'checkpoint':{'notes':[old]},'uncompacted':[{'id':'middle','role':'user','content':'Monday deadline '+'x'*5500}],
        'recent':[{'id':'new','role':'user','content':'Continue'}],'coverage':{'pending':False}}}
    result=await compact_recent(SimpleNamespace(),context)
    assert result['conversation']['checkpoint']['notes'][0]==old
    assert 'Monday' in result['conversation']['checkpoint']['notes'][1]['text']
    assert result['conversation']['recent'][0]['content']=='Continue'
    assert result['conversation']['uncompacted']==[]


def test_prompt_does_not_cut_semantic_checkpoint_notes():
    notes=[{'kind':'fact','text':f'Critical fact {n}','evidence':[f'message:{n}']} for n in range(18)]
    context={'conversation':{'checkpoint':{'notes':notes},'recent':[],'coverage':{'pending':False}},'tools':[]}
    payload=prompt_payload('Continue',context,[])
    assert payload['context']['conversation']['checkpoint']['notes']==notes


def test_secret_redaction_does_not_truncate_middle_content():
    from app.agent.semantic_compaction import redact_secrets,text_units
    text='start '+('x'*12000)+' DEADLINE_MONDAY token=demo_private_value '+('z'*12000)
    clean=redact_secrets(text)
    assert 'DEADLINE_MONDAY' in clean and 'demo_private_value' not in clean
    assert len(clean)>24000
    units=list(text_units('message:test','message','\\'*20000))
    assert ''.join(unit['text'] for unit in units)=='\\'*20000
    assert all(len(json.dumps(unit,ensure_ascii=False))<=10500 for unit in units)
