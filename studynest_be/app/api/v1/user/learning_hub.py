import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from loguru import logger
from redis.exceptions import RedisError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuthorizationService
from app.core.redis import get_redis
from app.db.sesson import get_session
from app.schemas.learning_hub import (
    CourseMastery, MasteryCourses, ReviewAnswerInput, ReviewAnswerResult, ReviewQueue,
    StudyGoalInput, StudyGoalPatch, StudyGoals, StudyGoalView, StudyPlan, WeeklyReport,
)
from app.services.user.learning_hub.goals import GoalService
from app.services.user.learning_hub.mastery import MasteryService
from app.services.user.learning_hub.review import ReviewService
from app.services.user.learning_hub.weekly import WeeklyService


class LearningHubRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def localized_validation(request: Request):
            try:
                return await handler(request)
            except RequestValidationError as exc:
                # Avoid returning raw inputs or Pydantic exception context to the client or logs.
                errors = [{"loc": list(error["loc"]), "msg": "Giá trị không hợp lệ hoặc bị thiếu."}
                          for error in exc.errors()]
                raise HTTPException(422, errors) from None

        return localized_validation


async def current_learner(request: Request, authorization: Annotated[AuthorizationService, Depends()]) -> UUID:
    user = await authorization.get_current_user()
    route = request.scope["route"]
    limit = 60 if request.method == "GET" or route.name == "answer_review" else 30
    key = f"learning-hub:{route.name}:{user.id}:{int(time.time()) // 60}"
    try:
        async with get_redis().pipeline(transaction=True) as pipeline:
            count, _ = await pipeline.incr(key).expire(key, 90).execute()
    except RedisError as exc:
        logger.warning("Không kiểm tra được giới hạn yêu cầu học tập ({})", type(exc).__name__)
    else:
        if count > limit:
            raise HTTPException(429, "Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
                                headers={"Retry-After": "60"})
    return user.id


router = APIRouter(prefix="/user", tags=["Learning Hub"], route_class=LearningHubRoute)
Learner = Annotated[UUID, Depends(current_learner)]
Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("/review/queue", response_model=ReviewQueue)
async def review_queue(
    user_id: Learner, db: Session, course_id: UUID | None = None, section_id: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await ReviewService(db).queue(user_id, course_id=course_id, section_id=section_id, limit=limit)


@router.post("/review/{item_id}/answer", response_model=ReviewAnswerResult)
async def answer_review(item_id: UUID, payload: ReviewAnswerInput, user_id: Learner, db: Session):
    return await ReviewService(db).answer(user_id, item_id, payload)


@router.get("/mastery/courses", response_model=MasteryCourses)
async def mastery_courses(user_id: Learner, db: Session):
    return await MasteryService(db).courses(user_id)


@router.get("/courses/{course_id}/mastery", response_model=CourseMastery)
async def course_mastery(course_id: UUID, user_id: Learner, db: Session):
    return await MasteryService(db).course(user_id, course_id)


@router.post("/goals", response_model=StudyGoalView, status_code=201)
async def create_goal(payload: StudyGoalInput, user_id: Learner, db: Session):
    return await GoalService(db).create(user_id, payload)


@router.get("/goals", response_model=StudyGoals)
async def list_goals(user_id: Learner, db: Session):
    return await GoalService(db).list(user_id)


@router.get("/goals/{goal_id}", response_model=StudyGoalView)
async def get_goal(goal_id: UUID, user_id: Learner, db: Session):
    return await GoalService(db).get(user_id, goal_id)


@router.patch("/goals/{goal_id}", response_model=StudyGoalView)
async def patch_goal(goal_id: UUID, payload: StudyGoalPatch, user_id: Learner, db: Session):
    return await GoalService(db).patch(user_id, goal_id, payload)


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(goal_id: UUID, user_id: Learner, db: Session):
    await GoalService(db).delete(user_id, goal_id)
    return Response(status_code=204)


@router.get("/goals/{goal_id}/plan", response_model=StudyPlan)
async def goal_plan(goal_id: UUID, user_id: Learner, db: Session):
    return await GoalService(db).plan(user_id, goal_id)


@router.get("/reports/weekly", response_model=WeeklyReport)
async def weekly_report(user_id: Learner, db: Session):
    return await WeeklyService(db).report(user_id)
