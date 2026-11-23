from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.schemas.user.quiz_attempts import SubmitQuizAttempt
from app.services.user.quiz_attempts import QuizAttemptService


def fixture():
    u,l,q,o1,o2= [uuid4() for _ in range(5)]
    question=NS(id=q,question='2+2?',explanation='2 plus2 equals4',lesson_quiz_options=[
        NS(id=o1,text_='4',position=0,is_correct=True),NS(id=o2,text_='3',position=1,is_correct=False)])
    db=AsyncMock();db.add=Mock();db.scalar.return_value=None;db.scalars.return_value.all=Mock(return_value=[question])
    payload=SubmitQuizAttempt(idempotency_key=uuid4(),answers=[dict(question_id=q,option_id=o2)])
    return u,l,question,db,payload


@pytest.mark.asyncio
async def test_grading_uses_server_answer_not_client_score():
    u,l,q,db,p=fixture()
    commits_at_publish = []

    async def published(_event):
        commits_at_publish.append(db.commit.await_count)

    with (
        patch("app.services.user.quiz_attempts.require_lesson_access", AsyncMock()),
        patch("app.services.user.quiz_attempts.event_bus.publish", AsyncMock(side_effect=published)) as publish,
    ):
        result=await QuizAttemptService(db).submit_async(u,l,p)
    publish.assert_awaited_once()
    event = publish.await_args.args[0]
    assert (event.event_name, event.user_id, event.source_id) == ("quiz.attempted", u, l)
    assert commits_at_publish == [1]
    assert result['correct']==0;assert result['total']==1
    assert result['details'][0]['selected_option_id']==str(q.lesson_quiz_options[1].id)
    assert result['details'][0]['correct_option_id']==str(q.lesson_quiz_options[0].id)
    assert result['content_hash'];db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_foreign_question_option_rejected_without_evidence_write():
    u,l,q,db,p=fixture();p.answers[0].option_id=uuid4()
    with patch('app.services.user.quiz_attempts.require_lesson_access',AsyncMock()),pytest.raises(HTTPException) as exc:
        await QuizAttemptService(db).submit_async(u,l,p)
    assert exc.value.status_code==422;db.add.assert_not_called();db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_cross_user_read_has_no_result():
    _,_,_,db,_=fixture()
    with pytest.raises(HTTPException) as exc:await QuizAttemptService(db).get_async(uuid4(),uuid4())
    assert exc.value.status_code==404


def test_duplicate_questions_rejected():
    q=uuid4()
    with pytest.raises(ValidationError):SubmitQuizAttempt(idempotency_key=uuid4(),answers=[
        dict(question_id=q,option_id=uuid4()),dict(question_id=q,option_id=uuid4())])
