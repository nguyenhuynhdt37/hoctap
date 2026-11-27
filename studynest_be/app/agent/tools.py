from contextlib import suppress
"""Native application tools. Models choose names; code owns permissions and effects."""
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Literal
from uuid import UUID
import httpx

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select

from app.agent.contracts import Contract
from app.db.models.database import Courses, LessonCodes, LessonProgress, Lessons


class Empty(Contract):
    pass


class Search(Contract):
    query: str = Field(min_length=1, max_length=1500)


class LessonTarget(Contract):
    lesson_id: UUID


class Seek(Contract):
    seconds: float = Field(ge=0, le=1_000_000)


class Rate(Contract):
    rate: float = Field(ge=.25, le=2)


class Panel(Contract):
    panel: Literal["chat", "sidebar", "notes", "editor"]


class Tab(Contract):
    tab: Literal["lesson", "overview", "notes", "tools"]


class FileTarget(Contract):
    file_id: str = Field(min_length=1, max_length=100)


class PatchHunk(Contract):
    file_id: str = Field(min_length=1, max_length=100)
    start: int = Field(ge=0, le=500_000)
    end: int = Field(ge=0, le=500_000)
    expected_text: str = Field(max_length=50000)
    replacement: str = Field(max_length=50000)

    @model_validator(mode="after")
    def valid_span(self):
        if self.end < self.start:
            raise ValueError("Invalid patch span")
        return self


class Patch(Contract):
    exercise_id: UUID
    base_revision: int = Field(ge=0)
    patches: list[PatchHunk] = Field(min_length=1, max_length=20)


class Undo(Contract):
    exercise_id: UUID
    base_revision: int = Field(ge=0)
    patch_id: str = Field(min_length=1, max_length=100)


class CourseTarget(Contract):
    course_id: UUID


class CatalogSearch(Contract):
    query: str = Field(default="", max_length=1500)
    grade: int | None = Field(default=None, ge=1, le=12)
    subject: str | None = Field(default=None, max_length=100)
    max_price: float | None = Field(default=None, ge=0)


class ToolResult(BaseModel):
    """Common authoritative envelope; domain fields remain tool-specific data."""
    model_config = ConfigDict(extra='allow')
    verified: Literal[True]
    evidence_kind: Literal['authorized_domain','client_ui_receipt','server_code_attempt','external_mcp']


class EditorReadResult(ToolResult):
    file_id: str = Field(min_length=1,max_length=100)
    exercise_id: UUID
    content: str = Field(max_length=100000)
    revision: int = Field(ge=0)
    is_dirty: bool


class EditorPatchResult(ToolResult):
    exercise_id: UUID
    revision: int = Field(ge=0)
    patch_id: str = Field(min_length=1,max_length=100)
    applied: Literal[True]
    saved: Literal[False]


def result_model(name):
    if name in {'editor.read_file','editor.read_selection'}:
        return EditorReadResult
    if name == 'editor.apply_patch':
        return EditorPatchResult
    return ToolResult


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    input_model: type[Contract]
    risk: Literal["read", "navigation", "write"] = "read"
    timeout_seconds: int = 20
    idempotent: bool = True
    requires_approval: bool = False
    client: bool = False
    handler: Callable[[Any, Contract], Awaitable[dict]] | None = None

    def metadata(self):
        return {"name": self.name, "description": self.description,
                "input_schema": self.input_model.model_json_schema(),
                "output_schema": result_model(self.name).model_json_schema(), "risk_level": self.risk,
                "timeout_seconds": self.timeout_seconds, "idempotent": self.idempotent,
                "requires_approval": self.requires_approval,
                "required_permissions": ["learning.access"] if not self.name.startswith("catalog.") else ["catalog.public"]}


REGISTRY: dict[str, ToolDefinition] = {}


def register(tool: ToolDefinition):
    if tool.name in REGISTRY:
        raise ValueError(f"Duplicate tool: {tool.name}")
    REGISTRY[tool.name] = tool


async def lesson_info(ctx, args):
    info = await ctx.validate_lesson_async()
    lesson, course = info["lesson"], info["course"]
    completed = await ctx.db.scalar(select(LessonProgress.is_completed).where(
        LessonProgress.user_id == ctx.user.id, LessonProgress.lesson_id == lesson.id))
    return {"lesson_id": str(lesson.id), "course_id": str(course.id), "title": lesson.title,
            "course_title": course.title, "lesson_type": lesson.lesson_type,
            "description": (lesson.description or "")[:6000], "outcomes": lesson.outcomes or [],
            "is_completed": bool(completed), "progress_evidence": "stored_progress_not_mastery"}


async def curriculum(ctx, args):
    info = await ctx.validate_lesson_async()
    await ctx.tutor.validate_enrollment(ctx.user.id, info["course"].id)
    rows = (await ctx.db.execute(select(Lessons).where(Lessons.course_id == info["course"].id).order_by(Lessons.position, Lessons.id).limit(200))).scalars().all()
    return {"course_id": str(info["course"].id), "lessons": [{"id": str(x.id), "section_id": str(x.section_id) if x.section_id else None, "title": x.title, "lesson_type": x.lesson_type} for x in rows]}


async def progress(ctx, args):
    info = await ctx.validate_lesson_async()
    await ctx.tutor.validate_enrollment(ctx.user.id, info["course"].id)
    rows = (await ctx.db.execute(select(LessonProgress).where(LessonProgress.user_id == ctx.user.id, LessonProgress.course_id == info["course"].id).limit(500))).scalars().all()
    return {"course_id": str(info["course"].id), "evidence_kind": "stored_progress_not_mastery",
            "lessons": [{"lesson_id": str(x.lesson_id), "is_completed": bool(x.is_completed)} for x in rows]}


async def knowledge(ctx, args):
    from app.core.embedding import EmbeddingService
    from app.services.user.tutor_chat_message import TutorChatMessageService
    await ctx.validate_lesson_async()
    service = TutorChatMessageService(db=ctx.db, thread_service=ctx.tutor, embedding_service=EmbeddingService())
    passages = await service._rag_search(args.query, ctx.session.lesson_id, scope="lesson", user_id=ctx.user.id)
    # The domain retrieval policy excludes hidden tests and instructor solutions.
    bounded = [dict(p, content=(p.get("content") or "")[:6500]) for p in passages[:5]]
    grounded=service._ground_sources([{"index": i + 1, "summary": p.get("content", "")[:240]} for i, p in enumerate(bounded)], bounded)
    for source in grounded:
        existing=next((s for s in ctx.sources if s.get('chunk_id')==source.get('chunk_id')),None)
        if existing is None:
            source['index']=len(ctx.sources)+1
            ctx.sources.append(source)
    for passage in bounded:
        passage['index']=next((s['index'] for s in ctx.sources if s.get('chunk_id')==passage.get('chunk_id')),None)
    return {"sources": bounded, "notice": "" if bounded else "Chưa có nguồn bài học để kiểm chứng."}


async def course(ctx, args):
    from app.db.models.database import CourseEnrollments
    from app.services.catalog import CatalogService, public_course
    value = await ctx.db.scalar(select(Courses).where(Courses.id == args.course_id, public_course()))
    if value is None:
        raise HTTPException(404, "Không tìm thấy khóa học công khai")
    enrolled = bool(
        await ctx.db.scalar(
            select(CourseEnrollments.id).where(
                CourseEnrollments.user_id == ctx.user.id,
                CourseEnrollments.course_id == value.id,
                CourseEnrollments.status == "active",
            ).limit(1)
        )
    )
    return {"id": str(value.id), "slug": value.slug, "is_enrolled": enrolled,
            "url_path": f"/course/{value.slug}", "learning_path": f"/learning/{value.slug}",
            "recommended_path": f"/learning/{value.slug}" if enrolled else f"/course/{value.slug}",
            "title": value.title, "description": (value.description or "")[:7000],
            "outcomes": value.outcomes or [], "requirements": value.requirements or [],
            "target_audience": value.target_audience or [], "price": str(value.base_price),
            "currency": value.currency, "taxonomy": await CatalogService(ctx.db).course_taxonomy(value.id)}


async def courses(ctx, args):
    from app.db.models.database import CourseEnrollments
    from app.schemas.catalog import CatalogFilters
    from app.services.catalog import CatalogService
    filters = CatalogFilters(keyword=args.query, grade=args.grade, subject=args.subject, max_price=args.max_price, limit=8)
    res = await CatalogService(ctx.db).courses(filters)
    if isinstance(res, dict) and isinstance(res.get("items"), list):
        enrolled_ids = {
            str(cid)
            for cid in (
                await ctx.db.scalars(
                    select(CourseEnrollments.course_id).where(
                        CourseEnrollments.user_id == ctx.user.id,
                        CourseEnrollments.status == "active",
                    )
                )
            ).all()
        }
        for item in res["items"]:
            if isinstance(item, dict) and item.get("slug"):
                is_enrolled = str(item.get("id") or "") in enrolled_ids
                item["is_enrolled"] = is_enrolled
                item["url_path"] = f"/course/{item['slug']}"
                item["learning_path"] = f"/learning/{item['slug']}"
                item["recommended_path"] = (
                    f"/learning/{item['slug']}" if is_enrolled else f"/course/{item['slug']}"
                )
    return res


async def exercise(ctx, args):
    await ctx.validate_lesson_async()
    snapshot = ctx.session.snapshot or {}
    exercise_id = snapshot.get("exercise_id")
    if not exercise_id:
        raise HTTPException(409, "Chưa chọn bài tập lập trình")
    value = await ctx.db.scalar(select(LessonCodes).where(LessonCodes.id == UUID(exercise_id), LessonCodes.lesson_id == ctx.session.lesson_id))
    if value is None:
        raise HTTPException(404, "Bài tập không thuộc bài đang mở")
    return {"exercise_id": str(value.id), "title": value.title, "description": value.description,
            "language_id": str(value.language_id), "time_limit": value.time_limit, "memory_limit": value.memory_limit}


def available(session):
    capabilities = set(session.capabilities or [])
    from app.core.settings import settings
    return {name: tool for name, tool in REGISTRY.items()
            if (not tool.client or name in capabilities)
            and (not name.startswith('mcp.') or settings.AGENT_MCP_ENABLED)
            and (session.lesson_id is not None or name.startswith(("catalog.", "memory.", "data.", "mcp.", "tools.", "api.")))}


for tool in [
    ToolDefinition("learning.get_current_lesson", "Đọc bài học và khóa học hiện tại đã kiểm tra quyền.", Empty, handler=lesson_info),
    ToolDefinition("learning.get_curriculum", "Đọc danh sách bài trong khóa đã đăng ký.", Empty, handler=curriculum),
    ToolDefinition("learning.get_progress", "Đọc tiến độ đã lưu của chính học sinh; không suy diễn mastery.", Empty, handler=progress),
    ToolDefinition("knowledge.search_lesson", "Chỉ tìm bằng chứng khi người dùng hỏi nội dung bài đang mở; không dùng cho hồ sơ, bộ nhớ, ảnh, GitHub hoặc kiến thức chung.", Search, timeout_seconds=15, handler=knowledge),
    ToolDefinition("catalog.get_course", "Đọc metadata/học phí công khai của khóa học. Chỉ đọc dữ liệu, chưa mở trang; muốn mở dùng mcp.browser_snapshot rồi browser_click.", CourseTarget, handler=course),
    ToolDefinition("catalog.search_courses", "Tìm khóa học công khai theo từ khóa/lớp/môn/ngân sách.", CatalogSearch, handler=courses),
    ToolDefinition("code.get_exercise", "Đọc yêu cầu bài code đang mở, không có lời giải/hidden tests.", Empty, handler=exercise),
    ToolDefinition("ui.get_state", "Đọc snapshot trạng thái màn hình hiện tại.", Empty, client=True),
    ToolDefinition("video.get_state", "Đọc timestamp/playback thật từ player.", Empty, client=True),
    ToolDefinition("video.seek", "Tua player tới số giây được yêu cầu, xác minh timestamp thực.", Seek, risk="navigation", client=True),
    ToolDefinition("video.play", "Phát video khi người dùng yêu cầu.", Empty, risk="navigation", client=True),
    ToolDefinition("video.pause", "Tạm dừng video khi người dùng yêu cầu.", Empty, risk="navigation", client=True),
    ToolDefinition("video.set_playback_rate", "Đặt tốc độ video.", Rate, risk="navigation", client=True),
    ToolDefinition("learning.navigate_lesson", "Mở bài cùng khóa, kiểm tra access và trạng thái khóa.", LessonTarget, risk="navigation", client=True),
    ToolDefinition("learning.next_lesson", "Mở bài kế tiếp được phép trong khóa.", Empty, risk="navigation", client=True),
    ToolDefinition("learning.previous_lesson", "Mở bài trước được phép trong khóa.", Empty, risk="navigation", client=True),
    ToolDefinition("ui.open_panel", "Mở panel có đăng ký trong trang học.", Panel, risk="navigation", client=True),
    ToolDefinition("ui.close_panel", "Đóng panel có đăng ký trong trang học.", Panel, risk="navigation", client=True),
    ToolDefinition("ui.switch_tab", "Chuyển tab học có đăng ký.", Tab, risk="navigation", client=True),
    ToolDefinition("editor.get_state", "Đọc metadata editor và revision thật, không tự tải code.", Empty, client=True),
    ToolDefinition("editor.read_file", "Đọc buffer chưa lưu của file học sinh chọn, kèm revision.", FileTarget, client=True),
    ToolDefinition("editor.read_selection", "Đọc đoạn code đang chọn từ buffer chưa lưu, kèm revision.", Empty, client=True),
    ToolDefinition("editor.propose_patch", "Tạo diff nhỏ dựa trên buffer đã đọc, chưa áp dụng.", Patch, client=True),
    ToolDefinition("editor.apply_patch", "Áp dụng chính xác diff sau xác nhận; từ chối revision thay đổi.", Patch, risk="write", idempotent=False, requires_approval=True, client=True),
    ToolDefinition("editor.undo_patch", "Hoàn tác patch đã áp dụng, kiểm tra revision.", Undo, risk="write", idempotent=False, requires_approval=True, client=True),
    ToolDefinition("code.run_sample_tests", "Chạy sample tests với buffer editor hiện tại, không lưu và không chạy hidden test.", Empty, timeout_seconds=120, client=True),
]:
    register(tool)


from app.agent.learning_context import (
    ContentPage,
    CoursePage,
    complete,
    content,
    course_context,
    notes,
    video_transcript,
)

for tool in [
    ToolDefinition('learning.get_course_context', 'Đọc mục tiêu và mục lục theo thứ tự, chỉ rõ bài đang kích hoạt. Có next_offset thì dùng offset đọc tiếp toàn bộ khóa.', CoursePage, handler=course_context),
    ToolDefinition('learning.get_lesson_content', 'Đọc đủ nội dung bài được phép trong khóa: overview/transcript/resources/notes/exercises/quiz. Có next_offset thì đọc tiếp; không có đáp án/hidden tests.', ContentPage, handler=content),
    ToolDefinition('learning.get_notes', 'Đọc ghi chú riêng của học viên trong bài đang kích hoạt, gồm mốc giây; không tự ghi nhớ dài hạn.', Empty, handler=notes),
    ToolDefinition('learning.fetch_video_transcript', 'Khi nội dung video chưa có trong bài: đọc phụ đề YouTube thật của bài được phép; dùng offset đọc đủ. Không tự sinh transcript.', ContentPage, timeout_seconds=20, handler=video_transcript),
    ToolDefinition('learning.complete_lesson', 'Xác nhận hoàn thành bài hiện tại khi người dùng yêu cầu rõ; backend kiểm tra tiến độ/quiz/code. Không làm bài hộ hoặc tự cấp PASS.', Empty, risk='write', handler=complete),
]:
    register(tool)


class WebSearch(Contract):
    query: str = Field(min_length=2, max_length=500)
    limit: int = Field(default=5, ge=1, le=5)
    timelimit: Literal["d", "w", "m", "y"] | None = None
    category: Literal["text", "news"] = "text"


class GithubRepository(Contract):
    owner: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_.-]+$')
    repo: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_.-]+$')
    ref: str = Field(default='HEAD', min_length=1, max_length=200)


class GithubRepositories(Contract):
    page: int = Field(default=1, ge=1, le=1000)
    per_page: int = Field(default=20, ge=1, le=50)
    ownership: Literal['all', 'owner'] = 'all'


class GithubTree(Contract):
    owner: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_.-]+$')
    repo: str = Field(min_length=1, max_length=100, pattern=r'^[A-Za-z0-9_.-]+$')
    commit_sha: str = Field(pattern=r'^[0-9a-f]{40}$')
    offset: int = Field(default=0, ge=0, le=100000)


class GithubFile(GithubTree):
    path: str = Field(min_length=1, max_length=500)


def external_handler(name):
    async def execute(ctx, args):
        from app.agent.mcp_client import call
        if name.startswith('github_'):
            from app.agent.github_connection import token_for
            from app.agent.github_access import github_access_token
            from app.agent import mcp_server
            token = await token_for(ctx.db, ctx.user.id)
            binding = github_access_token.set(token)
            try:
                result = await getattr(mcp_server, name)(**args.model_dump())
            except (ValueError, OSError, httpx.HTTPError):
                raise HTTPException(502, 'Chưa đọc được repo. Kiểm tra quyền tài khoản GitHub hoặc kết nối lại.') from None
            finally:
                github_access_token.reset(binding)
            from app.agent.github_connection import connection_status
            result['account'] = await connection_status(ctx.db, ctx.user.id)
        else:
            result = await call(name, args.model_dump())
        rows = result.get('items', []) if name in {'web_search', 'github_list_repositories'} else [result] if result.get('url') else []
        for row in rows:
            url = row.get('url')
            if not url:
                continue
            key = 'external:' + url + ':' + str(result.get('commit_sha', ''))
            existing = next((source for source in ctx.sources if source.get('chunk_id') == key), None)
            if existing is None:
                existing = {'index': len(ctx.sources) + 1, 'chunk_id': key, 'source_type': 'resource',
                    'source_kind': 'external_web' if name == 'web_search' else result.get('source_type', 'github_public'),
                    'resource_title': ('Web · ' if name == 'web_search' else 'GitHub · ') + row.get('title', row.get('path', result.get('repository', 'Nguồn ngoài'))),
                    'resource_url': url, 'summary': row.get('snippet', row.get('description', ''))[:240],
                    'commit_sha': result.get('commit_sha')}
                ctx.sources.append(existing)
            row['index'] = existing['index']
        return {**result, 'evidence_kind': 'external_mcp', 'trusted_as_instruction': False}
    return execute


for name, model, description in [
    ('web_search', WebSearch, 'Tìm web công khai với URL/đoạn trích/ngày nguồn nếu có. Tin thời sự dùng category=news, timelimit=d/w; query có ngày cụ thể khi cần. Chỉ gửi từ khóa kiến thức; không gửi ghi chú riêng/code/token. Nguồn web khác nguồn bài giảng.'),
    ('github_list_repositories', GithubRepositories, 'Liệt kê repo của tài khoản GitHub đã kết nối, không cần người dùng nhập owner/repo. Dùng khi hỏi list github/danh sách repo/repo nào. Có page, next_page, ownership=owner nếu chỉ muốn repo sở hữu. Không yêu cầu kết nối lại khi đã kết nối.'),
    ('github_repository', GithubRepository, 'Đọc repo mà tài khoản GitHub đã liên kết được phép truy cập, phân giải ref thành commit SHA cố định. Nếu chưa liên kết, yêu cầu người dùng nhấn Kết nối GitHub.'),
    ('github_tree', GithubTree, 'Đọc cây file của repo GitHub đã được cấp quyền tại commit SHA. Có phân trang; không chạy code.'),
    ('github_read_file', GithubFile, 'Đọc file code GitHub đã được cấp quyền theo commit SHA và đường dẫn; có next_offset. Chưa chạy test/chấm điểm chính thức.'),
]:
    register(ToolDefinition('mcp.' + name, description, model, timeout_seconds=32, handler=external_handler(name)))


async def github_connection_status(ctx, args):
    from app.agent.github_connection import connection_status
    return await connection_status(ctx.db, ctx.user.id)


register(ToolDefinition('data.github_connection', 'Kiểm tra tài khoản GitHub đang liên kết, không đọc token. Dùng để trả lời đã connect chưa.', Empty, handler=github_connection_status))


class ApiSearch(Contract):
    query: str = Field(min_length=2, max_length=200)


class ApiCall(Contract):
    method: Literal['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] = 'GET'
    path: str = Field(min_length=1, max_length=500)
    query: dict[str, Any] | None = None
    body: dict[str, Any] | None = None


async def api_search(ctx, args):
    from app.agent.api_gateway import search_operations
    return {'operations': search_operations(args.query), 'notice': 'Danh sách lấy từ API thật của ứng dụng. Mục có "blocked" là việc Mây Mây không được làm.'}


async def api_call(ctx, args):
    from app.agent.api_gateway import call_api
    principal = {'user_id': ctx.user.id, 'sid': UUID(ctx.auth_sid)}
    return await call_api(principal, args.method, args.path, args.query, args.body)


register(ToolDefinition('api.search', 'Tìm trong API thật của ứng dụng (OpenAPI) thao tác phù hợp với việc cần làm: ghi chú, hồ sơ, thông báo, yêu thích, khóa học, hội thoại, giảng viên... Tính năng mới thêm vào API sẽ tự xuất hiện ở đây, không cần tool riêng. Trả method, path, tham số, body.', ApiSearch, handler=api_search))
register(ToolDefinition('api.call', 'Gọi một thao tác API của ứng dụng đúng quyền của người dùng (path như /learning/{lesson_id}/notes, không cần /api/v1). Dùng sau api.search. Tiền, mua/đăng ký, mở khóa, phần thưởng và tiến độ học bị chặn ở máy chủ. Đọc (GET) thì mở.', ApiCall, risk='write', timeout_seconds=40, handler=api_call))


class AttemptTarget(Contract):
    attempt_id: UUID


class CompareCourses(Contract):
    course_ids: list[UUID] = Field(min_length=2, max_length=4)


async def code_result(ctx,args):
    from app.services.user.learning import LearningService
    result=await LearningService(db=ctx.db).get_code_test_result_async(args.attempt_id,ctx.user)
    value=await ctx.db.scalar(select(LessonCodes.lesson_id).where(LessonCodes.id==UUID(result['exercise_id'])))
    if value != ctx.session.lesson_id:
        raise HTTPException(403,'Kết quả không thuộc bài đang mở')
    return {**result,'evidence_kind':'server_code_attempt'}


async def quiz_result(ctx,args):
    from app.services.user.quiz_attempts import QuizAttemptService
    if args.attempt_id:
        result=await QuizAttemptService(ctx.db).get_async(ctx.user.id,args.attempt_id)
        if result['lesson_id'] != str(ctx.session.lesson_id):
            raise HTTPException(403,'Kết quả không thuộc bài đang mở')
        return result
    return await QuizAttemptService(ctx.db).list_async(ctx.user.id,ctx.session.lesson_id,limit=3)


class QuizResultInput(Contract):
    attempt_id: UUID | None = None


class QuizOptionSelect(Contract):
    option_index: int = Field(ge=0, le=15)
    question_id: UUID | None = None



async def compare_courses(ctx,args):
    from app.agent.advisor import CourseAdvisorService
    values=[]
    for course_id in dict.fromkeys(args.course_ids):
        values.append(await CourseAdvisorService(ctx.db).course_context_async(course_id))
    return {'courses':values,'method':'metadata_criteria_without_fit_percentage'}


async def memory_read(ctx,args):
    from app.agent.memory import MemoryService
    return {'items':await MemoryService(ctx.db,ctx.user.id).context_async(ctx.session.course_id,ctx.session.lesson_id)}


async def memory_propose(ctx,args):
    from app.agent.memory import MemoryService
    result=await MemoryService(ctx.db,ctx.user.id).propose_async(args,from_agent=True)
    return {'proposal':result,'notice':'Đây là đề xuất; học viên cần xác nhận riêng trước khi dùng làm bộ nhớ.'}


from app.agent.memory import MemoryProposal

for tool in [
    ToolDefinition('code.get_test_result','Đọc bằng chứng test server đã lưu của chính học sinh trong bài hiện tại.',AttemptTarget,handler=code_result),
    ToolDefinition('learning.get_quiz_result','Đọc kết quả và giải thích từ lần nộp quiz thật của học sinh.',QuizResultInput,handler=quiz_result),
    ToolDefinition('catalog.compare_courses','So sánh metadata công khai thật của các khóa học, không bịa phần trăm phù hợp.',CompareCourses,handler=compare_courses),
    ToolDefinition('memory.read','Đọc bộ nhớ đã xác nhận trong phạm vi được phép.',Empty,handler=memory_read),
    ToolDefinition('memory.propose','Đề xuất ghi nhớ với bằng chứng tin nhắn; không tự xác nhận. Sở thích, cách giải thích và mục tiêu dài hạn dùng scope profile để theo tài khoản ở mọi trang; lesson/course chỉ cho nội dung riêng của bài/khóa.',MemoryProposal,risk='write',requires_approval=False,handler=memory_propose),
    ToolDefinition('editor.select_file','Chuyển file đang mở trong editor của bài tập hiện tại.',FileTarget,risk='navigation',client=True),
]:
    register(tool)


class AccountSQL(Contract):
    sql: str = Field(min_length=1, max_length=5000)


from app.agent.sql_sandbox import account_query
REGISTRY['data.query_account'] = ToolDefinition(
    'data.query_account',
    'SQL chỉ đọc trong sandbox dữ liệu của chính tài khoản. SQLite: my_courses(course_id,title,progress,enrolled_at), my_progress(course_id,lesson_id,lesson_title,completed). Tối đa 500 dòng đầu vào mỗi bảng, 100 dòng kết quả. Không truy cập database chính hoặc dữ liệu tài khoản khác.',
    AccountSQL, timeout_seconds=5, handler=account_query,
)


from app.agent.workspace_mcp import BrowserTarget, BrowserFill, BrowserScroll, BrowserHighlight, BrowserNavigate, BashCommand, bash_handler
for tool in [
    ToolDefinition('mcp.browser_snapshot','Đọc DOM, danh sách điều khiển và đường dẫn (href) đang hiển thị trên màn hình. Dùng trước khi nhấn nút, khoanh vùng highlight hoặc cuộn tới phần tử; không đọc desktop/cookie/iframe khác nguồn.',Empty,client=True),
    ToolDefinition('mcp.browser_click','Nhấn điều khiển hiển thị theo snapshot_id/target_id vừa đọc khi người dùng yêu cầu. Không dùng cho thanh toán, xóa, nộp bài hoặc đổi tài khoản.',BrowserTarget,risk='navigation',requires_approval=False,client=True),
    ToolDefinition('mcp.browser_navigate','Điều hướng trực tiếp màn hình tới một đường dẫn nội bộ hợp lệ (ví dụ /course/<slug> cho khóa chưa mua, /learning/<slug> cho khóa đã mua, /courses, /my-learning, /learning-paths/my, /combo, /missions, /wallets). Luôn dùng đúng slug có trong context hoặc kết quả catalog.search_courses, không tự bịa slug hay dùng /courses/<slug>.',BrowserNavigate,risk='navigation',requires_approval=False,client=True),
    ToolDefinition('mcp.browser_fill','Điền trường văn bản không nhạy cảm theo ID vừa đọc; cần xác nhận, không tự gửi form.',BrowserFill,risk='write',requires_approval=True,client=True),
    ToolDefinition('mcp.browser_scroll','Cuộn màn hình học tập lên/xuống/đầu/cuối hoặc cuộn mượt tới một target_id trong snapshot hiện tại.',BrowserScroll,risk='navigation',requires_approval=False,client=True),
    ToolDefinition('mcp.browser_highlight','Khoanh vùng sáng (Telekinesis Spotlight) và gắn chú thích trực tiếp lên phần tử target_id trên màn hình để chỉ điểm cho học viên.',BrowserHighlight,risk='navigation',requires_approval=False,client=True),
    ToolDefinition('quiz.get_state','Đọc câu hỏi trắc nghiệm và các lựa chọn đang hiển thị trên màn hình học viên (không tiết lộ đáp án ẩn của server).',Empty,client=True),
    ToolDefinition('quiz.select_option','Chọn giúp một phương án trắc nghiệm trên giao diện theo option_index (0=A, 1=B, 2=C, 3=D) khi học viên yêu cầu; không tự nộp bài.',QuizOptionSelect,risk='navigation',requires_approval=False,client=True),
    ToolDefinition('mcp.bash','Chạy Bash trong workspace sandbox tạm, đọc/xử lý các tệp được gửi trong files. Không shell máy chủ, không mạng/app credentials và không chứng minh điểm bài học.',BashCommand,risk='write',timeout_seconds=25,handler=bash_handler),
]:
    register(tool)

from app.agent.conversation_evidence import SearchConversation,ReadContextEvidence,search as search_conversation,read as read_context_evidence
register(ToolDefinition('memory.search_conversation','Tìm lại lời gốc trong toàn bộ hội thoại hiện tại theo từ khóa khi checkpoint còn thiếu chi tiết; không tìm tài liệu bài học.',SearchConversation,handler=search_conversation))
register(ToolDefinition('memory.read_context_evidence','Đọc lại bằng chứng message:/tool: từ checkpoint trong đúng hội thoại/tài khoản.',ReadContextEvidence,handler=read_context_evidence))


class DiscoverTools(Contract):
    names: list[str] = Field(min_length=1, max_length=6)


async def discover_tools(ctx, args):
    granted = available(ctx.session)
    names = list(dict.fromkeys(name.replace("__", ".") for name in args.names))
    selected = [granted[name] for name in names if name in granted]
    ctx._discovered_tool_names = list(dict.fromkeys([
        *getattr(ctx, '_discovered_tool_names', []), *(tool.name for tool in selected),
    ]))[-12:]
    return {'tools': [{'name': tool.name, 'description': tool.description,
                      'input_schema': tool.input_model.model_json_schema()} for tool in selected],
            'unavailable': [name for name in names if name not in granted]}


async def view_images(ctx, args):
    from app.agent.vision import thread_images
    ctx._view_history_images = True
    ctx.vision_images = await thread_images(ctx.db, ctx.user.id, ctx.run.thread_id,
        message_id=ctx.run.input_message_id, before=ctx.run.created_at) if ctx.run.thread_id else []
    return {'images': [{'message_id': image['message_id'], 'width': image['width'],
                        'height': image['height']} for image in ctx.vision_images],
            'notice': 'Pixel ảnh đã nạp cho lượt model tiếp theo; chỉ dùng nếu liên quan câu hỏi hiện tại.'}


register(ToolDefinition('tools.discover', 'Nạp schema của các tool trong tool_catalog trước khi gọi. Chỉ trả công cụ được cấp quyền trong phiên.', DiscoverTools, handler=discover_tools))
register(ToolDefinition('memory.view_images', 'Xem pixel ảnh gần nhất trong đúng hội thoại khi người dùng hỏi tiếp về ảnh cũ. Không dùng cho câu hỏi khác chủ đề.', Empty, handler=view_images))
