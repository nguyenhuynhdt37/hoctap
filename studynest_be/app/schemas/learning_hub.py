from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

MasteryStatus = Literal["solid", "needs_review", "fading", "not_started", "no_quiz"]
ReviewRating = Literal["remembered", "forgot"]
GoalTarget = Literal["course", "path"]


class CourseCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    thumbnail_url: str | None


class LessonLabel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str


class SectionLabel(LessonLabel):
    position: int


class ReviewOption(BaseModel):
    id: UUID
    text: str


class ReviewQueueItem(BaseModel):
    item_id: UUID
    quiz_id: UUID
    question: str
    options: list[ReviewOption]
    due_at: datetime
    difficulty: int | None
    course: CourseCard
    section: SectionLabel | None
    lesson: LessonLabel
    lesson_href: str


class ReviewQueue(BaseModel):
    due_count: int
    items: list[ReviewQueueItem]


class ReviewAnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option_id: UUID
    self_rating: ReviewRating
    idempotency_key: UUID


class ReviewAnswerResult(BaseModel):
    correct: bool
    correct_option_id: UUID
    explanation: str
    next_due_at: datetime
    interval_days: int
    due_count: int


class CourseMasterySummary(CourseCard):
    course_score: float | None
    status: MasteryStatus
    quiz_lessons: int
    total_lessons: int


class MasteryCourses(BaseModel):
    courses: list[CourseMasterySummary]


class LessonMastery(LessonLabel):
    lesson_type: str
    position: int
    has_quiz: bool
    score: float | None
    status: MasteryStatus
    last_seen_at: datetime | None
    wrong_count: int
    href: str


class SectionMastery(SectionLabel):
    score: float | None
    status: MasteryStatus
    lessons: list[LessonMastery]


class CourseMastery(BaseModel):
    course: CourseCard
    course_score: float | None
    status: MasteryStatus
    sections: list[SectionMastery]


class StudyGoalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_type: GoalTarget
    target_id: UUID
    target_date: date
    sessions_per_week: int = Field(ge=1, le=7, strict=True)


class StudyGoalPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_type: GoalTarget | None = None
    target_id: UUID | None = None
    target_date: date | None = None
    sessions_per_week: int | None = Field(default=None, ge=1, le=7, strict=True)

    @model_validator(mode="after")
    def validate_fields(self):
        fields = self.model_fields_set
        if any(getattr(self, name) is None for name in fields):
            raise ValueError("Giá trị cập nhật không được để trống.")
        if ("target_type" in fields) != ("target_id" in fields):
            raise ValueError("Cần gửi đồng thời loại và mã mục tiêu.")
        return self


class StudyGoalView(StudyGoalInput):
    id: UUID
    title: str
    thumbnail_url: str | None
    created_at: datetime
    updated_at: datetime
    progress_percent: float
    on_track: bool
    behind_lessons: int


class StudyGoals(BaseModel):
    items: list[StudyGoalView]


class StudyPlanItem(BaseModel):
    kind: Literal["lesson", "review"]
    lesson_id: UUID | None
    title: str
    done: bool
    href: str


class StudyPlanDay(BaseModel):
    date: date
    items: list[StudyPlanItem]


class StudyPlan(BaseModel):
    goal: StudyGoalView
    days: list[StudyPlanDay]
    completed_lessons: int
    total_lessons: int
    on_track: bool
    behind_lessons: int
    suggestion: str | None


class ReportCourse(CourseCard):
    lessons_completed: int


class WeeklyReport(BaseModel):
    week_start: date
    week_end: date
    lessons_completed: int
    quizzes_taken: int
    reviews_done: int
    study_days: int
    streak: int
    top_courses: list[ReportCourse]
    share_text: str


class BadgeView(BaseModel):
    id: UUID
    name: str
    description: str | None
    image_url: str
    earned: bool
    earned_at: datetime | None


class BadgesView(BaseModel):
    badges: list[BadgeView]
