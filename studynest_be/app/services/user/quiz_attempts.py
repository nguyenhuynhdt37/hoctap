"""Authorized practice grading and immutable question/answer provenance."""
import json
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.db.models.database import LessonQuizzes
from app.db.models.quiz_attempts import QuizAttempt
from app.services.user.code_security import content_hash
from app.services.user.learning_access import require_lesson_access


def serialize_attempt(row):
    return {'grading':'server_practice','attempt_id':str(row.id),'lesson_id':str(row.lesson_id),
            'correct':row.correct,'total':row.total,'score_percent':round(row.correct/row.total*100,2) if row.total else 0,
            'content_hash':row.content_hash,'details':row.details,
            'created_at':row.created_at.isoformat() if row.created_at else None}


class QuizAttemptService:
    def __init__(self,db):self.db=db

    async def current_content_hash_async(self, user_id, lesson_id):
        """Compare completion evidence with the current question set, never expose keys."""
        await require_lesson_access(self.db, user_id, lesson_id)
        questions = (await self.db.scalars(select(LessonQuizzes).options(
            selectinload(LessonQuizzes.lesson_quiz_options)).where(LessonQuizzes.lesson_id == lesson_id)
            .order_by(LessonQuizzes.id))).all()
        snapshot = [{'question_id': str(question.id), 'question': question.question,
            'explanation': question.explanation,
            'options': [{'id': str(option.id), 'text': option.text_, 'is_correct': bool(option.is_correct)}
                for option in sorted(question.lesson_quiz_options, key=lambda option: (option.position or 0, str(option.id)))]}
            for question in questions]
        return content_hash(json.dumps(snapshot, ensure_ascii=False, sort_keys=True)) if snapshot else None

    async def submit_async(self,user_id,lesson_id,payload):
        await require_lesson_access(self.db,user_id,lesson_id)
        # Lock is scoped to this learner's idempotency key; no cross-user contention.
        await self.db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))'),
            {'key':f'quiz-attempt:{user_id}:{payload.idempotency_key}'})
        request_hash=content_hash(json.dumps({'lesson_id':str(lesson_id),'answers':sorted(
            [{'question_id':str(a.question_id),'option_id':str(a.option_id)} for a in payload.answers],
            key=lambda a:a['question_id'])},sort_keys=True,separators=(',',':')))
        existing=await self.db.scalar(select(QuizAttempt).where(QuizAttempt.user_id==user_id,
            QuizAttempt.idempotency_key==payload.idempotency_key))
        if existing:
            if existing.request_hash!=request_hash:
                raise HTTPException(409,'Yêu cầu trùng mã nhưng khác nội dung.')
            return serialize_attempt(existing)
        questions=(await self.db.scalars(select(LessonQuizzes).options(
            selectinload(LessonQuizzes.lesson_quiz_options)).where(LessonQuizzes.lesson_id==lesson_id)
            .order_by(LessonQuizzes.id))).all()
        if not questions or len(questions)>200:
            raise HTTPException(422,'Bộ câu hỏi không khả dụng.')
        answers={a.question_id:a.option_id for a in payload.answers}
        if set(answers)!={q.id for q in questions}:
            raise HTTPException(422,'Cần gửi đúng danh sách câu hỏi của bài học.')
        details=[];snapshot=[]
        for q in questions:
            options=sorted(q.lesson_quiz_options,key=lambda o:(o.position or 0,str(o.id)))
            selected=next((o for o in options if o.id==answers[q.id]),None)
            correct_options=[o for o in options if o.is_correct]
            if not selected:
                raise HTTPException(422,'Lựa chọn không thuộc câu hỏi.')
            if len(correct_options)!=1:
                raise HTTPException(422,'Bài luyện tập cần đúng một đáp án đúng cho mỗi câu.')
            details.append({'question_id':str(q.id),'question':q.question,
                'selected_option_id':str(selected.id),'is_correct':bool(selected.is_correct),
                'correct_option_id':str(correct_options[0].id),'explanation':q.explanation or '',
                'options':[{'id':str(o.id),'text':o.text_} for o in options]})
            snapshot.append({'question_id':str(q.id),'question':q.question,'explanation':q.explanation,
                'options':[{'id':str(o.id),'text':o.text_,'is_correct':bool(o.is_correct)} for o in options]})
        attempt=QuizAttempt(user_id=user_id,lesson_id=lesson_id,idempotency_key=payload.idempotency_key,
            request_hash=request_hash,content_hash=content_hash(json.dumps(snapshot,ensure_ascii=False,sort_keys=True)),
            correct=sum(d['is_correct'] for d in details),total=len(details),details=details)
        self.db.add(attempt);await self.db.flush();await self.db.commit()
        return serialize_attempt(attempt)

    async def get_async(self,user_id,attempt_id):
        row=await self.db.scalar(select(QuizAttempt).where(QuizAttempt.id==attempt_id,QuizAttempt.user_id==user_id))
        if not row:raise HTTPException(404,'Không tìm thấy kết quả.')
        await require_lesson_access(self.db,user_id,row.lesson_id)
        return serialize_attempt(row)

    async def list_async(self,user_id,lesson_id,limit=10):
        await require_lesson_access(self.db,user_id,lesson_id)
        rows=(await self.db.scalars(select(QuizAttempt).where(QuizAttempt.user_id==user_id,
            QuizAttempt.lesson_id==lesson_id).order_by(QuizAttempt.created_at.desc(),QuizAttempt.id.desc())
            .limit(min(max(limit,1),20)))).all()
        return {'items':[serialize_attempt(r) for r in rows]}
