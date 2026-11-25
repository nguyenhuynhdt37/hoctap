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


class LessonFlashcardItemSchema(BaseModel):
    front_text: str = Field(..., min_length=1, max_length=2000)
    back_text: str = Field(..., min_length=1, max_length=4000)
    phonetic: Optional[str] = Field(default=None, max_length=500)
    part_of_speech: Optional[str] = Field(default=None, max_length=60)
    example_sentence: Optional[str] = Field(default=None, max_length=2000)
    example_translation: Optional[str] = Field(default=None, max_length=2000)
    hint: Optional[str] = Field(default=None, max_length=1000)
    lang_code: str = Field(default="en-US", max_length=20)
    voice_id: Optional[str] = Field(default=None, max_length=120)
    audio_url: Optional[str] = None
    example_audio_url: Optional[str] = None
    difficulty_level: int = Field(default=1, ge=1, le=3)
    position: int = Field(default=0, ge=0)


class LessonFlashcardBulkCreate(BaseModel):
    lesson_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    created_by: str = "lecturer"
    auto_generate_audio: bool = True
    flashcards: List[LessonFlashcardItemSchema] = Field(..., min_length=1, max_length=100)


class FlashcardTTSPreviewSchema(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    lang_code: str = Field(default="en-US", max_length=20)
    voice_id: Optional[str] = Field(default=None, max_length=120)


class ListeningSpeakerSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    name: str = Field(..., min_length=1, max_length=120)
    role: Optional[str] = Field(default=None, max_length=120)
    voice_id: str = Field(..., min_length=1, max_length=120)
    color: Optional[str] = Field(default="blue", max_length=30)


class ListeningScriptLineSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    speaker_id: str = Field(..., min_length=1, max_length=60)
    text: str = Field(..., min_length=1, max_length=2000)
    translation: Optional[str] = Field(default="", max_length=2000)
    start_ms: Optional[int] = Field(default=0, ge=0)
    end_ms: Optional[int] = Field(default=0, ge=0)


class ListeningRenderAudioSchema(BaseModel):
    lang_code: str = Field(default="en-GB", max_length=20)
    pause_ms: int = Field(default=420, ge=150, le=2000)
    speakers: List[ListeningSpeakerSchema] = Field(..., min_length=1, max_length=6)
    script_lines: List[ListeningScriptLineSchema] = Field(..., min_length=1, max_length=80)


class LessonListeningSaveSchema(BaseModel):
    lesson_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    lang_code: str = Field(default="en-GB", max_length=20)
    scenario: Optional[str] = Field(default="", max_length=2000)
    speakers: List[ListeningSpeakerSchema] = Field(..., min_length=1, max_length=6)
    script_lines: List[ListeningScriptLineSchema] = Field(..., min_length=1, max_length=80)
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = Field(default=0, ge=0)
    max_plays: int = Field(default=0, ge=0, le=20)
    show_transcript_before_submit: bool = False
    pass_percent: int = Field(default=70, ge=10, le=100)
    auto_render_audio: bool = True
    quizzes: List[LessonQuizItemCreate] = Field(default_factory=list)


class FillBlankItemSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    index: int = Field(..., ge=1, le=50)
    answers: List[str] = Field(..., min_length=1, max_length=10)
    hint: Optional[str] = Field(default="", max_length=500)
    explanation: Optional[str] = Field(default="", max_length=1000)
    part_of_speech: Optional[str] = Field(default="", max_length=60)


class FillBlankRenderAudioSchema(BaseModel):
    prompt_text: str = Field(..., min_length=1, max_length=8000)
    blanks: List[FillBlankItemSchema] = Field(default_factory=list)
    lang_code: str = Field(default="en-GB", max_length=20)
    voice_id: Optional[str] = Field(default=None, max_length=120)


class LessonFillBlankSaveSchema(BaseModel):
    lesson_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    lang_code: str = Field(default="en-GB", max_length=20)
    mode: Literal["typing", "word_bank", "dictation"] = "typing"
    prompt_text: str = Field(..., min_length=1, max_length=8000)
    translation: Optional[str] = Field(default="", max_length=8000)
    blanks: List[FillBlankItemSchema] = Field(..., min_length=1, max_length=50)
    distractors: List[str] = Field(default_factory=list, max_length=30)
    voice_id: Optional[str] = Field(default=None, max_length=120)
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = Field(default=0, ge=0)
    case_sensitive: bool = False
    allow_hint: bool = True
    pass_percent: int = Field(default=70, ge=10, le=100)
    auto_render_audio: bool = False


class SpeakingPersonaSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    role: Optional[str] = Field(default="", max_length=160)
    personality: Optional[str] = Field(default="", max_length=400)
    voice_id: Optional[str] = Field(default=None, max_length=120)
    opening_line: str = Field(..., min_length=1, max_length=1000)
    opening_translation: Optional[str] = Field(default="", max_length=1000)
    opening_audio_url: Optional[str] = None


class SpeakingMissionSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    title: str = Field(..., min_length=1, max_length=300)
    hint: Optional[str] = Field(default="", max_length=400)


class SpeakingSamplePhraseSchema(BaseModel):
    phrase: str = Field(..., min_length=1, max_length=400)
    translation: Optional[str] = Field(default="", max_length=400)


class LessonSpeakingSaveSchema(BaseModel):
    lesson_id: uuid.UUID
    section_id: Optional[uuid.UUID] = None
    course_id: Optional[uuid.UUID] = None
    lang_code: str = Field(default="en-GB", max_length=20)
    level: str = Field(default="B1", max_length=20)
    scenario: str = Field(..., min_length=1, max_length=2000)
    student_role: str = Field(default="", max_length=200)
    ai_persona: SpeakingPersonaSchema
    missions: List[SpeakingMissionSchema] = Field(..., min_length=1, max_length=10)
    sample_phrases: List[SpeakingSamplePhraseSchema] = Field(default_factory=list, max_length=15)
    max_turns: int = Field(default=8, ge=3, le=20)
    pass_percent: int = Field(default=70, ge=10, le=100)
    allow_translation: bool = True
    allow_suggestion: bool = True
    auto_render_opening_audio: bool = True


class SpeakingHistoryMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class SpeakingTurnRequestSchema(BaseModel):
    message: str = Field(..., min_length=1, max_length=1500)
    history: List[SpeakingHistoryMessageSchema] = Field(default_factory=list, max_length=40)
    completed_mission_ids: List[str] = Field(default_factory=list)


class SpeakingEvaluateRequestSchema(BaseModel):
    history: List[SpeakingHistoryMessageSchema] = Field(..., min_length=1, max_length=40)
    completed_mission_ids: List[str] = Field(default_factory=list)


class SpeakingInlineTTSSchema(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    lang_code: str = Field(default="en-GB", max_length=20)
    voice_id: Optional[str] = Field(default=None, max_length=120)
