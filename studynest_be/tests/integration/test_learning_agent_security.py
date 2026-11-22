"""Domain permission/evidence integration. Only runs against an explicit scratch DB."""
import os
import json
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, patch
from uuid import uuid4
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select,func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.database import (User,Courses,CourseSections,Lessons,CourseEnrollments,
    SupportedLanguages,LessonCodes,LessonCodeFiles,LessonCodeTestcases,LessonQuizzes,LessonQuizOptions)
from app.db.models.code_attempts import CodeTestAttempt
from app.db.models.quiz_attempts import QuizAttempt
from app.schemas.lecturer.lesson import LessonCodeSaveFile,LessonCodeUserTest
from app.schemas.user.quiz_attempts import SubmitQuizAttempt
from app.services.user.learning import LearningService
from app.services.user.tutor_chat import TutorChatService
from app.services.user.tutor_chat_message import TutorChatMessageService
from app.services.user.quiz_attempts import QuizAttemptService
from app.services.user.code_security import content_hash

pytestmark=[pytest.mark.asyncio,pytest.mark.skipif(not os.getenv('TEST_DATABASE_ASYNC_URL'),reason='Explicit scratch DB required')]


@pytest_asyncio.fixture
async def db_session(async_engine):
    async with async_engine.connect() as connection:
        transaction=await connection.begin()
        async with AsyncSession(bind=connection,expire_on_commit=False,join_transaction_mode="create_savepoint") as session:
            yield session
        await transaction.rollback()


@pytest_asyncio.fixture
async def domain(db_session):
    db=db_session
    owner=User(fullname='Test instructor',email=f'{uuid4()}@example.test',password='unused')
    learner=User(fullname='Test learner',email=f'{uuid4()}@example.test',password='unused')
    outsider=User(fullname='Outsider',email=f'{uuid4()}@example.test',password='unused')
    db.add_all([owner,learner,outsider]);await db.flush()
    course=Courses(title='Agent fixture',slug=f'agent-fixture-{uuid4()}',instructor_id=owner.id,
        is_lock_lesson=False,is_published=True,approval_status='approved')
    lang=SupportedLanguages(name='python',version='3.11.0',is_active=True)
    db.add_all([course,lang]);await db.flush()
    section=CourseSections(course_id=course.id,title='Section',position=0);db.add(section);await db.flush()
    lesson=Lessons(course_id=course.id,section_id=section.id,title='Exercise',lesson_type='code',position=0,is_preview=False)
    db.add(lesson);await db.flush()
    db.add(CourseEnrollments(user_id=learner.id,course_id=course.id,status='active'))
    code=LessonCodes(lesson_id=lesson.id,title='Add',language_id=lang.id,time_limit=2,memory_limit=256000000,is_active=True)
    db.add(code);await db.flush()
    starter=LessonCodeFiles(lesson_code_id=code.id,role='starter',filename='main.py',content='pass',is_main=True)
    solution=LessonCodeFiles(lesson_code_id=code.id,role='solution',filename='main.py',content='TEACHER_SECRET',is_main=True)
    db.add_all([starter,solution,LessonCodeTestcases(lesson_code_id=code.id,input='1',expected_output='2',is_sample=True),
        LessonCodeTestcases(lesson_code_id=code.id,input='HIDDEN_INPUT',expected_output='2',is_sample=False)])
    q=LessonQuizzes(lesson_id=lesson.id,question='2+2?',explanation='4')
    db.add(q);await db.flush()
    o1=LessonQuizOptions(quiz_id=q.id,text_='4',is_correct=True,position=0)
    o2=LessonQuizOptions(quiz_id=q.id,text_='3',is_correct=False,position=1)
    db.add_all([o1,o2]);await db.flush()
    return NS(db=db,learner=learner,outsider=outsider,course=course,lesson=lesson,code=code,lang=lang,q=q,o1=o1,o2=o2)


async def test_unauthorized_execution_never_reaches_runner(domain):
    d=domain;runner=NS(run_code=AsyncMock())
    payload=LessonCodeUserTest(language_id=d.lang.id,files=[dict(filename='main.py',content='print(2)',is_main=True)])
    with pytest.raises(HTTPException) as exc:
        await LearningService(d.db,runner).test_user_code_async(payload,d.outsider,d.code.id)
    assert exc.value.status_code==403;runner.run_code.assert_not_awaited()


async def test_hidden_and_solution_never_reach_tutor_or_student_response(domain):
    d=domain;threads=TutorChatService(d.db)
    service=TutorChatMessageService(db=d.db,thread_service=threads,embedding_service=AsyncMock())
    sources=await service._rag_search('hint',d.lesson.id,user_id=d.learner.id)
    assert 'TEACHER_SECRET' not in json.dumps(sources);assert 'HIDDEN_INPUT' not in json.dumps(sources)
    data=await LearningService(d.db,AsyncMock()).get_lesson_code_async(d.lesson.id,d.learner)
    assert 'TEACHER_SECRET' not in json.dumps(data);assert 'HIDDEN_INPUT' not in json.dumps(data)
    assert any(t['input']=='1' and not t['hidden'] for t in data['codes'][0]['testcases'])


async def test_tested_buffer_does_not_mark_stale_db_pass_and_cas_save_conflicts(domain):
    d=domain;runner=NS(run_code=AsyncMock(return_value={'run':{'code':0,'stdout':'2'}}))
    service=LearningService(d.db,runner)
    await service.save_single_user_code_async(d.code.id,d.learner,LessonCodeSaveFile(filename='main.py',content='print(0)',is_main=True))
    payload=LessonCodeUserTest(language_id=d.lang.id,files=[dict(filename='main.py',content='print(2)',is_main=True)],buffer_revision=12)
    result=await service.test_user_code_async(payload,d.learner,d.code.id)
    assert result['status']=='passed';assert result['saved'] is False
    assert 'HIDDEN_INPUT' not in json.dumps(result)
    attempt=await d.db.get(CodeTestAttempt,result['attempt_id'])
    assert attempt.content_hash==result['content_hash'];assert attempt.buffer_revision==12
    file=await d.db.scalar(select(LessonCodeFiles).where(LessonCodeFiles.user_id==d.learner.id,LessonCodeFiles.lesson_code_id==d.code.id))
    assert file.content=='print(0)' and not file.is_pass
    # Both current content and optimistic baseline are supplied by caller; stale write must fail.
    with pytest.raises(HTTPException) as exc:
        await service.save_single_user_code_async(d.code.id,d.learner,LessonCodeSaveFile(
            filename='main.py',content='stale overwrite',is_main=True,expected_content_hash=content_hash('pass')))
    assert exc.value.status_code==409


async def test_quiz_evidence_idempotency_and_user_isolation(domain):
    d=domain;svc=QuizAttemptService(d.db)
    payload=SubmitQuizAttempt(idempotency_key=uuid4(),answers=[dict(question_id=d.q.id,option_id=d.o2.id)])
    result=await svc.submit_async(d.learner.id,d.lesson.id,payload)
    again=await svc.submit_async(d.learner.id,d.lesson.id,payload)
    assert result['attempt_id']==again['attempt_id'] and result['correct']==0
    assert await d.db.scalar(select(func.count()).select_from(QuizAttempt).where(QuizAttempt.user_id==d.learner.id))==1
    with pytest.raises(HTTPException) as exc:await svc.get_async(d.outsider.id,result['attempt_id'])
    assert exc.value.status_code==404
    payload.answers[0].option_id=d.o1.id
    with pytest.raises(HTTPException) as exc:await svc.submit_async(d.learner.id,d.lesson.id,payload)
    assert exc.value.status_code==409


async def test_execution_lease_is_cross_connection_and_releases(async_engine):
    key=uuid4()
    async with AsyncSession(async_engine) as one,AsyncSession(async_engine) as two:
        await LearningService(one,AsyncMock())._admit_code_execution_async(key)
        with pytest.raises(HTTPException) as exc:
            await LearningService(two,AsyncMock())._admit_code_execution_async(key)
        assert exc.value.status_code==409
        await one.rollback();await two.rollback()
        await LearningService(two,AsyncMock())._admit_code_execution_async(key)
        await two.rollback()


async def test_retrieval_enriches_verified_anchors_and_discards_replaced_video_chunks(domain):
    from app.db.models.database import LessonChunks,LessonVideos
    d=domain;d.lesson.lesson_type='video'
    d.db.add(LessonVideos(lesson_id=d.lesson.id,video_url='https://www.youtube.com/watch?v=fixture',file_id='current'))
    verified=LessonChunks(lesson_id=d.lesson.id,chunk_index=0,text_='Caption with fake 99:00',embedding=[1.0]*1536,
        source_kind='youtube_transcript',source_reference='youtube:current',timestamps_verified=True,timestamp_anchors=[12])
    unknown=LessonChunks(lesson_id=d.lesson.id,chunk_index=1,text_='Generated old 03:00 claim',embedding=[1.0]*1536)
    stale=LessonChunks(lesson_id=d.lesson.id,chunk_index=2,text_='Old video text',embedding=[1.0]*1536,
        source_kind='youtube_transcript',source_reference='youtube:old',timestamps_verified=True,timestamp_anchors=[50])
    d.db.add_all([verified,unknown,stale]);await d.db.flush()
    embedding=NS(embed_query=AsyncMock(return_value=[1.0]*1536))
    service=TutorChatMessageService(db=d.db,thread_service=TutorChatService(d.db),embedding_service=embedding)
    result=await service._rag_search('caption',d.lesson.id,user_id=d.learner.id)
    assert {r['chunk_id'] for r in result}=={str(verified.id),str(unknown.id)}
    grounded=service._ground_sources([{'chunk_id':str(verified.id),'timestamp_seconds':5940},
        {'chunk_id':str(unknown.id),'timestamp_seconds':180}],result)
    assert grounded[0]['timestamp_seconds']==12
    assert 'timestamp_seconds' not in grounded[1]
