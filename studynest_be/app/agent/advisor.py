"""Evidence-first course advice. Criteria are rules, never unvalidated fit scores.

Public metadata is the only input for guests. Declared goals stay in the current
request. This service neither starts checkout nor reads private learner history.
"""
import re
from decimal import Decimal
from typing import Literal
from uuid import UUID
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.database import Courses, CourseSections, Lessons, User
from app.services.catalog import CatalogService, public_course


class AdvisorInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    course_id: UUID
    question: str = Field(default='Khóa học này phù hợp với ai?', max_length=2000)
    goals: str | None = Field(default=None, max_length=800)
    grade: int | None = Field(default=None, ge=1, le=12)
    budget: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    currency: Literal['VND', 'USD'] = 'VND'
    compare_course_ids: list[UUID] = Field(default_factory=list, max_length=3)


class AdvisorEvidence(BaseModel):
    field: str
    value: str | list[str] | int | None


class AdvisorClaim(BaseModel):
    criterion: str
    assessment: Literal['matches', 'consider', 'unknown', 'information']
    explanation: str
    evidence: list[AdvisorEvidence]


class AdvisorResponse(BaseModel):
    course_id: UUID
    content: str
    claims: list[AdvisorClaim]
    limitations: list[str]
    follow_up_questions: list[str]
    sources: list[dict]
    comparison: list[dict] = Field(default_factory=list)
    method: str = 'metadata_criteria_v1'


def clean_text(value, limit=1800):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', str(value or ''))).strip()[:limit]


def criterion(criterion, assessment, explanation, field, value):
    return AdvisorClaim(criterion=criterion, assessment=assessment, explanation=explanation, evidence=[AdvisorEvidence(field=field, value=value)])


class CourseAdvisorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def course_context_async(self, course_id):
        course = await self.db.scalar(select(Courses).where(Courses.id == course_id, public_course()))
        if not course:
            raise HTTPException(404, 'Không tìm thấy khóa học công khai')
        taxonomy = await CatalogService(db=self.db).course_taxonomy(course.id)
        instructor = await self.db.scalar(select(User.fullname).where(User.id == course.instructor_id))
        curriculum = (await self.db.execute(select(CourseSections.title, func.count(Lessons.id).label('lesson_count')).outerjoin(Lessons, Lessons.section_id == CourseSections.id).where(CourseSections.course_id == course.id).group_by(CourseSections.id, CourseSections.title, CourseSections.position).order_by(CourseSections.position,CourseSections.id).limit(101))).all()
        return {
            'id': str(course.id), 'title': clean_text(course.title,240), 'slug': course.slug,
            'description': clean_text(course.description),
            'requirements': [clean_text(x, 500) for x in (course.requirements or [])][:20],
            'outcomes': [clean_text(x, 500) for x in (course.outcomes or [])][:20],
            'target_audience': [clean_text(x, 500) for x in (course.target_audience or [])][:20],
            'level': course.level, 'instructor': clean_text(instructor),
            'price': str(course.base_price), 'currency': course.currency,
            'delivery_type': course.delivery_type,
            'grades': [{'grade_number': x['grade_number'], 'name': x['name']} for x in taxonomy['grades']],
            'subject': taxonomy['subject']['name'] if taxonomy['subject'] else None,
            'learning_goals': [x['name'] for x in taxonomy['learning_goals']],
            'exams': [x['name'] for x in taxonomy['exams']],
            'provider': taxonomy['provider']['name'] if taxonomy['provider'] else None,
            'curriculum': [{'title': clean_text(x.title, 200), 'lesson_count': x.lesson_count} for x in curriculum[:100]],
            'curriculum_truncated':len(curriculum)>100,
            'updated_at': course.updated_at.isoformat() if course.updated_at else None,
        }

    async def advise_async(self, request: AdvisorInput):
        data = await self.course_context_async(request.course_id)
        claims, limits = [], []
        if data.get("curriculum_truncated"):
            limits.append("Phân tích chỉ sử dụng 100 chương đầu; cần xem curriculum đầy đủ trước khi quyết định.")
        if request.grade:
            grades = [x['grade_number'] for x in data['grades']]
            if grades:
                match = request.grade in grades
                claims.append(criterion('grade', 'matches' if match else 'consider', f"Khóa học được gắn lớp {', '.join(map(str, grades))}; {'có' if match else 'chưa có'} lớp {request.grade} bạn khai báo.", 'grades', grades_as_text(data)))
            else:
                claims.append(criterion('grade', 'unknown', 'Chưa có phân loại lớp để đối chiếu.', 'grades', []))
        if data['subject']:
            claims.append(criterion('subject', 'information', f"Môn học được phân loại: {data['subject']}.", 'subject', data['subject']))
        if data['target_audience']:
            claims.append(criterion('audience', 'information', 'Đối tượng do khóa học công bố: ' + '; '.join(data['target_audience'][:4]), 'target_audience', data['target_audience']))
        if data['requirements']:
            claims.append(criterion('prerequisites', 'consider', 'Hãy đối chiếu kiến thức đầu vào: ' + '; '.join(data['requirements'][:4]), 'requirements', data['requirements']))
        else:
            limits.append('Khóa học chưa công bố yêu cầu đầu vào đầy đủ; không thể xác nhận bạn đã đủ nền tảng.')
        if data['outcomes']:
            claims.append(criterion('outcomes', 'information', 'Mục tiêu được khóa học công bố: ' + '; '.join(data['outcomes'][:4]), 'outcomes', data['outcomes']))
        else:
            limits.append('Chưa có mục tiêu đầu ra đủ để đối chiếu.')
        if request.goals:
            claims.append(criterion('goal_alignment', 'unknown', 'Hãy so sánh mục tiêu bạn vừa nêu với các chuẩn đầu ra và nội dung bên dưới; hệ thống chưa kiểm định mức đạt mục tiêu cá nhân.', 'outcomes', data['outcomes']))
        price = Decimal(data['price']) if data['price'] not in {'None', ''} else None
        if price is not None:
            explanation = f"Giá niêm yết hiện tại: {price:,.0f} {data['currency']}. Giá thanh toán cần kiểm tra ở quy trình mua khóa."
            assessment = 'information'
            if request.budget is not None:
                if request.currency != data['currency']:
                    assessment = 'unknown'
                    explanation += ' Ngân sách khác loại tiền; chưa quy đổi để so sánh.'
                else:
                    matches = price <= request.budget
                    assessment = 'matches' if matches else 'consider'
                    explanation += ' ' + ('Trong' if matches else 'Vượt') + ' ngân sách bạn khai báo.'
            claims.append(criterion('budget', assessment, explanation, 'base_price', f"{price} {data['currency']}"))
        if data['curriculum']:
            claims.append(criterion('coverage', 'information', 'Các chương: ' + '; '.join(x['title'] for x in data['curriculum'][:8]), 'curriculum', [x['title'] for x in data['curriculum']]))
        claims.append(criterion('delivery', 'information', f"Hình thức: {data['delivery_type']}.", 'delivery_type', data['delivery_type']))
        limits.append('Metadata là thông tin khóa học công bố, không phải chứng nhận độc lập về chất lượng, thành tích hoặc cam kết điểm số.')
        limits.append('Không tính phần trăm phù hợp; chưa đủ bằng chứng để cam kết kết quả thi hoặc năng lực sau khóa học.')
        # Order evidence around the question, without trusting question text as instructions.
        question = request.question.casefold()
        preferred = ('prerequisites' if any(x in question for x in ('đầu vào','nền tảng','yêu cầu')) else 'budget' if any(x in question for x in ('giá','tiền','ngân sách')) else 'coverage' if any(x in question for x in ('chương','nội dung','học gì')) else 'outcomes')
        claims.sort(key=lambda x: 0 if x.criterion == preferred else 1)
        content = f"Về khóa **{data['title']}**:\n\n" + '\n\n'.join(x.explanation for x in claims[:6])
        comparisons = []
        for course_id in dict.fromkeys(request.compare_course_ids):
            if course_id == request.course_id:
                continue
            other = await self.course_context_async(course_id)
            comparisons.append({key: other[key] for key in ('id','title','grades','subject','requirements','outcomes','price','currency','delivery_type')})
        return AdvisorResponse(course_id=request.course_id, content=content, claims=claims, limitations=limits, follow_up_questions=['Bạn đang học lớp nào và muốn đạt mục tiêu gì?', 'Bạn đã học những kiến thức đầu vào nào?', 'Bạn muốn đối chiếu với khóa học công khai nào khác?'], sources=[{'type':'course_metadata','course_id':data['id'],'title':data['title'],'updated_at':data['updated_at']}], comparison=comparisons)


def grades_as_text(data):
    return [str(x['grade_number']) for x in data['grades']]
