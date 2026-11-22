import uuid
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class CreateLesson(BaseModel):
    section_id: uuid.UUID
    title: str
    description: str | None = None
    is_preview: bool | None = False
    lesson_type: str


class CreateLessonVideo(BaseModel):
    lesson_id: uuid.UUID


class MoveLessonSchema(BaseModel):
    section_id: uuid.UUID
    position: int


class UpdateLessonTitleSchema(BaseModel):
    title: str


class UpdateLessonVideoSchema(BaseModel):
    video_url: str


class UpdateLessonResourcesLinkSchema(BaseModel):
    title: str
    url: str


class LessonQuizOptionCreate(BaseModel):
    text: str
    is_correct: bool = False
    feedback: Optional[str] = None
    position: Optional[int] = None


class LessonQuizItemCreate(BaseModel):
    question: str
    explanation: Optional[str] = None
    difficulty_level: Optional[int] = 1
    options: List[LessonQuizOptionCreate]


class LessonQuizBulkCreate(BaseModel):
    lesson_id: uuid.UUID
    created_by: str = "lecturer"
    section_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    quizzes: List[LessonQuizItemCreate]


class LessonCodeFileCreate(BaseModel):
    filename: str = Field(..., examples=["main.py"])
    content: str = Field(..., examples=["print('Hello')"])
    is_main: bool = Field(default=False, examples=[True])
    role: Optional[str] = Field(default="starter", examples=["starter"])


class LessonCodeTestcaseCreate(BaseModel):
    input: str = Field(default="", examples=["1 2\n"])
    expected_output: str = Field(default="", examples=["3\n"])
    is_sample: bool = Field(default=False, examples=[True])
    order_index: Optional[int] = None


class LessonCodeVerify(BaseModel):
    language_id: uuid.UUID
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = "medium"
    time_limit: Optional[float] = 2.0
    memory_limit: Optional[int] = 256_000_000
    files: List[LessonCodeFileCreate]
    testcases: List[LessonCodeTestcaseCreate]


class LessonCodeCreate(BaseModel):
    language_id: uuid.UUID
    title: str
    description: Optional[str] = None
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    time_limit: int = Field(default=2, ge=1, le=1000)
    memory_limit: int = Field(default=256000000, ge=1_000_000)
    starter_files: List[LessonCodeFileCreate] = Field(default_factory=list)
    solution_files: List[LessonCodeFileCreate] = Field(default_factory=list)
    testcases: List[LessonCodeTestcaseCreate] = Field(default_factory=list)


def validate_code_filename(value: str) -> str:
    import re
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}", value) or ".." in value:
        raise ValueError("Tên file không hợp lệ; chỉ hỗ trợ file trong thư mục bài tập.")
    return value


class LessonCodeSaveFile(BaseModel):
    filename: str
    content: str = Field(max_length=200_000)
    is_main: bool = False
    expected_content_hash: Optional[str] = Field(default=None, pattern=r"^[a-f0-9]{64}$")

    _filename = field_validator("filename")(validate_code_filename)


class CodeFile(BaseModel):
    filename: str
    content: str = Field(max_length=200_000)
    is_main: bool

    _filename = field_validator("filename")(validate_code_filename)


class LessonCodeUserTest(BaseModel):
    language_id: uuid.UUID
    files: List[CodeFile] = Field(min_length=1, max_length=20)
    sample_only: bool = False
    buffer_revision: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_files(self):
        if len({f.filename for f in self.files}) != len(self.files):
            raise ValueError("Tên file bị trùng")
        if sum(f.is_main for f in self.files) != 1:
            raise ValueError("Cần đúng một file chính")
        if sum(len(f.content.encode("utf-8")) for f in self.files) > 500_000:
            raise ValueError("Tổng nội dung code vượt giới hạn")
        return self


class UpdateLessonSchema(BaseModel):
    title: str
    description: str
    is_preview: bool


class LessonCodeFileSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    filename: Optional[str] = Field(None, description="Tên file, ví dụ main.py")
    content: Optional[str] = Field(None, description="Nội dung file")
    role: Optional[Literal["starter", "solution"]] = "starter"
    is_main: Optional[bool] = False
    type: Literal["create", "update", "delete"] = "update"


# --- Testcase Schema ---
class LessonCodeTestcaseSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    input: Optional[str] = None
    expected_output: Optional[str] = None
    is_sample: Optional[bool] = False
    order_index: Optional[int] = None
    type: Literal["create", "update", "delete"] = "update"


# --- Batch Update Schema ---
class LessonCodeUpdateBatch(BaseModel):
    lesson_code_id: Optional[uuid.UUID] = Field(
        None, description="ID của bài code nếu đã tồn tại"
    )
    type: Literal["create", "update", "delete"] = "update"

    # Metadata của LessonCode
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = Field(None, description="Mức độ: easy / medium / hard")
    language_id: Optional[uuid.UUID] = None
    time_limit: Optional[int] = Field(None, description="Giới hạn thời gian (ms)")
    memory_limit: Optional[int] = Field(None, description="Giới hạn bộ nhớ (MB)")

    # Danh sách con
    files: Optional[List[LessonCodeFileSchema]] = Field(default_factory=list)
    testcases: Optional[List[LessonCodeTestcaseSchema]] = Field(default_factory=list)
