from uuid import UUID
from pydantic import BaseModel, Field, model_validator


class QuizAnswer(BaseModel):
    question_id: UUID
    option_id: UUID


class SubmitQuizAttempt(BaseModel):
    idempotency_key: UUID
    answers: list[QuizAnswer]=Field(min_length=1,max_length=200)

    @model_validator(mode='after')
    def unique_questions(self):
        if len({a.question_id for a in self.answers})!=len(self.answers):
            raise ValueError('Câu hỏi bị trùng')
        return self
