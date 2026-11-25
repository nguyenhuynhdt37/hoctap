import asyncio
import json
import re
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.responses import PlainTextResponse
from loguru import logger
from semantic_text_splitter import TextSplitter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.llm import LLMService, get_llm_service
from app.db.models.database import (
    Courses,
    CourseSections,
    LessonChunks,
    Lessons,
    SupportedLanguages,
)
from app.db.sesson import get_session
from app.schemas.chat.lecturer.lesson import (
    CreateDescriptionSchema,
    CreateRewriteTheTitleSchema,
)
from app.services.shares.code_runner import PistonService


class LessonService:
    def __init__(
        self,
        llm_service: LLMService = Depends(get_llm_service),
        db: AsyncSession = Depends(get_session),
        piston: PistonService = Depends(PistonService),
    ) -> None:
        self.llm_service = llm_service
        self.db: AsyncSession = db
        self.piston = piston

    @staticmethod
    def _parse_json_array(raw_text: str) -> list:
        text = (raw_text or "").strip()
        if not text:
            raise ValueError("Model trả về nội dung rỗng")

        # Gỡ markdown code fence nếu có
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text).strip()

        candidates = [text]
        first_bracket = text.find("[")
        last_bracket = text.rfind("]")
        if first_bracket != -1 and last_bracket > first_bracket:
            candidates.append(text[first_bracket : last_bracket + 1])

        last_err: Exception | None = None
        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, list):
                    return parsed
                if isinstance(parsed, dict):
                    for key in ("quizzes", "items", "data", "tasks"):
                        if isinstance(parsed.get(key), list):
                            return parsed[key]
            except json.JSONDecodeError as exc:
                last_err = exc

        raise ValueError(f"Không thể phân tích JSON từ AI: {last_err}")

    @staticmethod
    def _parse_json_object(raw_text: str) -> dict:
        text = (raw_text or "").strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text).strip()
        candidates = [text]
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last > first:
            candidates.append(text[first : last + 1])
        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
        raise ValueError("Không thể phân tích JSON object từ AI")

    async def _run_task_on_piston(
        self,
        task: dict,
        lang_name: str,
        lang_version: str,
    ) -> tuple[bool, list[dict]]:
        sol_files = task.get("solution_files") or []
        testcases = task.get("testcases") or []
        if not sol_files or not testcases:
            return False, []

        ordered = sorted(
            sol_files, key=lambda f: not bool(f.get("is_main", False))
        )
        piston_files = [
            {
                "name": str(f.get("filename") or "main"),
                "content": str(f.get("content") or ""),
            }
            for f in ordered
        ]

        details: list[dict] = []
        all_passed = True
        for idx, tc in enumerate(testcases):
            tc_input = str(tc.get("input") or "")
            tc_expected = str(tc.get("expected_output") or "").strip()
            try:
                res = await self.piston.run_code(
                    language=lang_name,
                    version=lang_version,
                    files=piston_files,
                    stdin=tc_input,
                )
                run = res.get("run") or res.get("compile") or {}
                stdout = (run.get("stdout") or "").strip()
                stderr = (run.get("stderr") or "").strip()
                exit_code = run.get("code")
                passed = (
                    stdout == tc_expected and exit_code == 0 and stderr == ""
                )
            except Exception as exc:
                stdout = ""
                stderr = str(exc)
                exit_code = -1
                passed = False

            if not passed:
                all_passed = False
            details.append(
                {
                    "index": idx,
                    "input": tc_input,
                    "expected": tc_expected,
                    "output": stdout,
                    "stderr": stderr,
                    "exit_code": exit_code,
                    "passed": passed,
                }
            )
        return all_passed, details

    async def _verify_and_repair_code_task(
        self,
        task: dict,
        lang_map: dict[str, tuple[str, str]],
    ) -> dict:
        lang_id = str(task.get("language_id") or "")
        lang_info = lang_map.get(lang_id)
        if not lang_info:
            return task
        lang_name, lang_version = lang_info

        current = task
        for attempt in range(3):
            all_passed, details = await self._run_task_on_piston(
                current, lang_name, lang_version
            )
            if all_passed:
                logger.info(
                    f"✅ AI code task '{current.get('title')}' PASS 100% ({len(details)}/{len(details)}) ở vòng {attempt}"
                )
                return current

            if attempt == 2:
                # Vòng cuối: nếu lời giải chạy sạch (exit_code=0, stderr="") nhưng vẫn có test lệch,
                # giữ lại các test PASS (nếu có ít nhất 1 test PASS) để tránh trả về bài không thể lưu.
                passed_indices = {d["index"] for d in details if d["passed"]}
                if passed_indices:
                    kept = [
                        {**tc, "order_index": i}
                        for i, tc in enumerate(
                            tc
                            for idx, tc in enumerate(
                                current.get("testcases") or []
                            )
                            if idx in passed_indices
                        )
                    ]
                    if kept and not any(t.get("is_sample") for t in kept):
                        kept[0]["is_sample"] = True
                    current["testcases"] = kept
                return current

            failed_summary = [d for d in details if not d["passed"]]
            repair_prompt = f"""
Bạn là chuyên gia sửa lỗi bài tập lập trình cho môi trường chấm tự động Piston ({lang_name} {lang_version}).
Bài tập sau đây vừa chạy thử lời giải mẫu trên Piston nhưng CHƯA PASS 100% test cases.

### Bài tập hiện tại (JSON):
{json.dumps(current, ensure_ascii=False)}

### Kết quả chạy lỗi thực tế trên Piston:
{json.dumps(failed_summary, ensure_ascii=False)}

### Nhiệm vụ bắt buộc:
1. Kiểm tra kỹ lỗi cú pháp, lỗi đọc stdin, lỗi xử lý khoảng trắng/xuống dòng hoặc tính sai expected_output.
2. Sửa lại `solution_files` (và `expected_output` của `testcases` nếu đề bài & lời giải đúng nhưng expected_output bị tính nhẩm sai) sao cho:
   - Khi chạy `solution_files` với từng `input`, kết quả `stdout.strip()` khớp CHÍNH XÁC 100% với `expected_output.strip()`, `exit_code == 0` và `stderr == ""`.
   - Với Python: đọc stdin an toàn bằng `sys.stdin.read()`.
   - Với JavaScript/TypeScript: đọc stdin bằng `const fs = require("fs"); const input = fs.readFileSync(0, "utf8");`.
3. Giữ nguyên cấu trúc JSON object của đúng 1 bài tập này (gồm `language_id`, `title`, `description`, `difficulty`, `starter_files`, `solution_files`, `testcases`).
4. Chỉ trả về duy nhất 1 JSON object hợp lệ, không thêm lời dẫn hay Markdown.
"""
            try:
                repaired_raw = await self.llm_service.call_model(
                    repair_prompt,
                    mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=6000,
                )
                repaired = self._parse_json_object(repaired_raw)
                if repaired.get("solution_files") and repaired.get("testcases"):
                    repaired["language_id"] = lang_id
                    current = repaired
            except Exception as exc:
                logger.warning(f"⚠️ Vòng tự sửa AI code #{attempt + 1} thất bại: {exc}")
                break

        return current

    async def rewrite_the_title_async(self, schema: CreateRewriteTheTitleSchema):
        try:
            prompt = f"""
                Bạn là chuyên gia biên tập nội dung đào tạo trong lĩnh vực viết nội dung cho các khóa học trực tuyến..

                Hãy **viết lại tiêu đề bài học** sao cho:
                - Ngắn gọn và súc tích
                - Giữ đúng nội dung chính của tiêu đề gốc
                - Tự nhiên, dễ hiểu, có sức hút và phù hợp với học viên CNTT
                - Không thêm ký tự đặc biệt, dấu ngoặc, hoặc Markdown
                - Chỉ trả về chuỗi văn bản tiêu đề duy nhất, không có lời giải thích

                **Tiêu đề gốc:**
                {schema.title}
                """

            return await self.llm_service.call_model(prompt)

        except Exception as e:
            raise HTTPException(500, detail=f"❌ Tạo mô tả chủ đề thất bại: {e}")

    async def create_description_async(self, schema: CreateDescriptionSchema):
        try:
            prompt = f"""
                Bạn là chuyên gia đào tạo chuyên viết nội dung cho các khóa học trực tuyến.

                Hãy viết phần **mô tả chi tiết cho bài học** sao cho chuyên nghiệp, dễ hiểu và hấp dẫn với người học.

                **Thông tin đầu vào:**
                - Tên bài học: {schema.title}
                - Nằm trong chương: {schema.section_name}

                **Yêu cầu:**
                - Viết bằng **tiếng Việt**, độ dài khoảng **4–8 câu**.
                - Trả về bằng **định dạng Markdown rõ ràng và dễ đọc**:
                - `##` cho tiêu đề bài học  
                - `###` cho phần giới thiệu hoặc nội dung trọng tâm  
                - Dùng `**...**` để nhấn mạnh khái niệm hoặc kỹ năng quan trọng  
                - Dùng `-` để liệt kê các điểm chính hoặc nội dung học được  
                - Nội dung nên bao gồm:
                - Giới thiệu ngắn gọn về nội dung bài học  
                - Kiến thức, kỹ năng hoặc giá trị mà người học sẽ nhận được  
                - Ứng dụng thực tế hoặc vai trò của bài học trong chương  
                - Văn phong tự nhiên, truyền cảm hứng, phù hợp với học viên ở mọi trình độ.
                - **Chỉ trả về phần mô tả Markdown**, không thêm lời dẫn, hướng dẫn hay ký tự thừa.
                - Không trả về tiêu đề ví dụ:  "Nền tảng CNTT và Phần mềm cho Lập trình viên Web"
                """
            result = await self.llm_service.call_model(prompt)
            return PlainTextResponse(result, media_type="text/markdown")
        except Exception as e:
            raise HTTPException(500, detail=f"❌ Tạo mô tả bài học thất bại: {e}")

    async def create_quizzes_video_async(self, lesson_id: UUID, lecturer_id: UUID):
        """
        Tự động tạo bộ câu hỏi trắc nghiệm từ transcript video bài học.
        Hỗ trợ chia nhỏ transcript nếu vượt quá 10.000 ký tự.
        """
        try:
            # 1️⃣ Kiểm tra bài học
            lesson: Lessons | None = await self.db.scalar(
                select(Lessons).where(Lessons.id == lesson_id)
            )
            if not lesson:
                raise HTTPException(404, "❌ Không tìm thấy bài học")

            # 2️⃣ Kiểm tra khóa học & quyền giảng viên
            course = await self.db.scalar(
                select(Courses)
                .options(selectinload(Courses.category))
                .where(Courses.id == lesson.course_id)
            )
            if not course:
                raise HTTPException(404, "❌ Không tìm thấy khóa học")
            if course.instructor_id != lecturer_id:
                raise HTTPException(403, "🚫 Bạn không có quyền truy cập khóa học này")

            # 3️⃣ Lấy toàn bộ chunk nội dung
            result = await self.db.scalars(
                select(LessonChunks).where(LessonChunks.lesson_id == lesson_id)
            )
            chunks = result.all()
            if not chunks:
                raise HTTPException(404, "❌ Bài học chưa có nội dung để tạo quiz")

            # 4️⃣ Gộp toàn bộ nội dung
            full_text = "\n".join([(c.text_ or "").strip() for c in chunks if c.text_])
            if not full_text.strip():
                raise HTTPException(
                    404, "❌ Nội dung bài học trống hoặc quá ngắn để tạo quiz"
                )

            # 5️⃣ Nếu nội dung > 10.000 ký tự → tóm tắt theo đoạn
            if len(full_text) > 10000:
                splitter = TextSplitter(capacity=4000, overlap=400)
                chunks = splitter.chunks(full_text)
                summarized_chunks = []

                for idx, chunk in enumerate(chunks):
                    sub_prompt = f"""
                    Tóm tắt nội dung học tập của đoạn video sau, giữ lại khái niệm, ví dụ, và phần giảng chính:

                    ### Đoạn {idx+1}:
                    {chunk}

                    ### Kết quả yêu cầu:
                    - Viết ngắn gọn nhưng đầy đủ ý chính.
                    - Tránh diễn giải lan man hoặc giới thiệu.
                    - Trả về nội dung thuần văn bản, không dùng Markdown.
                    """
                    summary = await self.llm_service.call_model(sub_prompt)
                    summarized_chunks.append(summary.strip())

                # ✅ Hợp tất cả phần tóm tắt lại
                text_result = "\n\n".join(summarized_chunks)
            else:
                text_result = full_text

            prompt = f"""
                Bạn là **chuyên gia thiết kế bài trắc nghiệm e-learning chuyên nghiệp**, có khả năng tạo câu hỏi phù hợp với mọi lĩnh vực (lập trình, thiết kế, âm nhạc, kinh doanh, ngôn ngữ, tâm lý, v.v.).

                ---
                ### 📘 Thông tin bài học:
                - Tiêu đề: "{lesson.title}"
                - Chủ đề / lĩnh vực: {course.category.name if course.category else "không xác định"}
                - Nội dung chính:
                {text_result}
                ---

                ### 🎯 Mục tiêu:
                Tạo ra **5 câu hỏi trắc nghiệm** giúp học viên:
                - Ôn tập và kiểm tra hiểu biết thực chất sau khi xem video.  
                - Học cách ghi nhớ và ứng dụng kiến thức (hoặc kỹ năng) từ bài học.  
                - Với bài học có **nội dung thực hành hoặc kỹ thuật (như code, nhạc cụ, thiết kế, vv)** → có thể kèm ví dụ minh họa (code block, nốt nhạc, sơ đồ, lệnh, cú pháp, đoạn nhạc, câu thoại, ký hiệu, v.v.).  
                - Với bài học **phi kỹ thuật** (như kỹ năng, tư duy, lịch sử, marketing, nghệ thuật, âm nhạc) → tập trung vào khái niệm, phương pháp, cảm nhận, quy tắc hoặc tình huống thực tế.  

                ---

                ### 🧩 Định dạng đầu ra:
                1. Trả về **chuỗi JSON hợp lệ duy nhất** (bắt đầu bằng `[` và kết thúc bằng `]`), không có văn bản hoặc chú thích ngoài JSON.  
                2. Mỗi phần tử là một câu hỏi có cấu trúc sau:

                [
                {{
                    "question": "string",                // Có thể chứa code block (```python```, ```sql```, ```jsx```...), ký hiệu nhạc, ví dụ tình huống hoặc hình ảnh mô tả bằng chữ.
                    "explanation": "string",             // Giải thích ngắn gọn, dễ hiểu.
                    "difficulty_level": 1,               // 1=dễ, 2=trung bình, 3=khó.
                    "options": [
                    {{
                        "text": "string",                // Một lựa chọn (có thể là code, giai điệu, hoặc mô tả).
                        "is_correct": false,
                        "feedback": "string",            // Phản hồi ngắn gọn tại sao sai.
                        "position": 1
                    }},
                    {{
                        "text": "string",
                        "is_correct": true,
                        "feedback": "string",            // Giải thích tại sao đúng.
                        "position": 2
                    }}
                    ]
                }}
                ]

                3. Toàn bộ câu hỏi, giải thích và phản hồi viết bằng **tiếng Việt tự nhiên, phù hợp lĩnh vực của bài học**.  
                4. Mỗi câu chỉ có **1 đáp án đúng duy nhất**.  
                5. Đa dạng loại câu hỏi: khái niệm, ví dụ, ứng dụng, kết quả, phân tích, cảm nhận.  
                6. Nếu nội dung có ví dụ kỹ thuật (như code, bản nhạc, lệnh, v.v.), hãy giữ **đúng cú pháp và ngôn ngữ gốc** trong block code hoặc ký hiệu.  
                """
            # 7️⃣ Gọi model chính sinh quiz
            result = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.4,
            )
            try:
                return self._parse_json_array(result)
            except ValueError as e:
                raise HTTPException(500, f"⚠️ JSON lỗi: {e}")

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"❌ Tạo quiz thất bại: {e}")

    async def create_quizzes_from_lessons_async(
        self, lesson_ids: list[UUID], lecturer_id: UUID
    ):
        """
        Tạo bộ câu hỏi trắc nghiệm tổng hợp cho danh sách bài học (lesson_ids).
        Gom nội dung từ tất cả các bài học dạng video.
        """
        try:
            if not lesson_ids:
                raise HTTPException(400, "❌ Thiếu danh sách lesson_id")

            # 1️⃣ Lấy toàn bộ bài học và kiểm tra quyền giảng viên
            stmt = (
                select(Lessons)
                .options(
                    selectinload(Lessons.lesson_chunks),
                    selectinload(Lessons.section)
                    .selectinload(CourseSections.course)
                    .selectinload(Courses.category),
                )
                .where(Lessons.id.in_(lesson_ids))
            )
            lessons = (await self.db.scalars(stmt)).all()
            # return str(lessons)
            if not lessons:
                raise HTTPException(
                    404, "❌ Không tìm thấy bài học nào trong danh sách"
                )

            # Kiểm tra tất cả bài học có cùng giảng viên
            course = lessons[0].section.course if lessons[0].section else None
            if not course:
                raise HTTPException(
                    404, "❌ Không tìm thấy khóa học của bài học đầu tiên"
                )
            if course.instructor_id != lecturer_id:
                raise HTTPException(
                    403, "🚫 Bạn không có quyền truy cập các bài học này"
                )

            # 2️⃣ Gộp nội dung từ toàn bộ bài học
            all_chunks_text = []
            for lesson in lessons:
                for chunk in lesson.lesson_chunks or []:
                    if chunk.text_:
                        all_chunks_text.append(chunk.text_.strip())

            if not all_chunks_text:
                raise HTTPException(404, "❌ Không có nội dung để tạo quiz")

            full_text = "\n".join(all_chunks_text)
            # 3️⃣ Nếu quá dài thì chia nhỏ để tóm tắt
            if len(full_text) > 10000:
                splitter = TextSplitter(capacity=4000, overlap=400)
                chunks = splitter.chunks(full_text)
                summarized_chunks = []
                print(f"tong chunk {len(chunks)}")
                for idx, chunk in enumerate(chunks):
                    sub_prompt = f"""
                    Bạn là chuyên gia biên tập e-learning, có nhiệm vụ **tóm tắt nội dung bài giảng dài** để phục vụ sinh câu hỏi trắc nghiệm.

                    🧩 Thông tin tóm tắt:
                    - Tổng độ dài văn bản gốc: khoảng {len(full_text)} ký tự.
                    - Tổng số đoạn sau khi chia: {len(chunks)} đoạn.
                    - Đây là **đoạn thứ {idx+1}/{len(chunks)}** cần xử lý.

                    ---
                    ### 📘 Đoạn gốc:
                    {chunk}

                    ---
                    ### 🎯 Yêu cầu:
                    - Tóm tắt trung thực, súc tích, **giữ lại toàn bộ khái niệm, ví dụ, công thức, mã lệnh hoặc ý chính của phần giảng**.
                    - Không viết giới thiệu hoặc lời bình, chỉ tập trung vào **nội dung cốt lõi**.
                    - Toàn bộ các đoạn tóm tắt khi ghép lại **phải có tổng số token < 8000**.
                    - Viết bằng **văn bản thuần túy**, không dùng Markdown, không thêm tiêu đề.
                    - Nếu đoạn có phần kỹ thuật (ví dụ code, cú pháp, biểu thức, nốt nhạc, ký hiệu...) thì **giữ nguyên định dạng gốc** để không mất ngữ nghĩa.

                    Trả về kết quả tóm tắt thuần văn bản.
                    """

                    summary = await self.llm_service.call_model(sub_prompt)
                    summarized_chunks.append(summary.strip())

                text_result = "\n\n".join(summarized_chunks)
                print(f"tong text_result chunk {len(chunks)}")
            else:
                text_result = full_text
            # 4️⃣ Prompt sinh quiz tổng hợp
            prompt = f"""
                    Bạn là **chuyên gia thiết kế bài trắc nghiệm e-learning chuyên nghiệp**.  
                    Hãy tạo **bộ câu hỏi tổng hợp** cho nhóm bài học thuộc khóa **"{course.title}"**  
                    (chủ đề: {course.category.name if course.category else "không xác định"}).

                    ---
                    ### 📚 Nội dung tổng hợp:
                    {text_result}

                    ---
                    ### 🎯 Yêu cầu:
                    - Sinh **8–12 câu hỏi trắc nghiệm** giúp học viên ôn tập toàn bộ các bài học trên.
                    - Câu hỏi phải bám sát **nội dung giảng dạy, ví dụ, khái niệm, quy trình hoặc ứng dụng thực tế**.
                    - Có thể bao gồm ví dụ minh họa như **đoạn code, biểu đồ, giai điệu, công thức, hoặc tình huống thực tế** nếu phù hợp với lĩnh vực.
                    - **Không được** trả thêm bất kỳ chữ, lời chào, tiêu đề hoặc chú thích nào ngoài JSON hợp lệ.
                    - Trường `question` và `explanation` **phải sử dụng cú pháp Markdown** để hiển thị đẹp trên giao diện web.
                    - Nếu nội dung liên quan đến lập trình, hãy đảm bảo có **ít nhất 1–2 câu hỏi** chứa code block ví dụ:
                    đoạn mã sau có lỗi gì?:
                    ```cpp
                    #include <iostream>
                    int main() {{ return 0; }}
                    ```
                    - đảm bảo mỗi câu hỏi đều trả về dữ liệu đầy đủ, nếu có code block thì phải đúng cú pháp.
                    ---
                    ### 🧩 Định dạng đầu ra (JSON hợp lệ):
                    [
                    {{
                        "question": "string (có thể chứa Markdown và code block)",
                        "explanation": "string (Markdown)",
                        "difficulty_level": 1,
                        "options": [
                        {{
                            "text": "string",
                            "is_correct": false,
                            "feedback": "string",
                            "position": 1
                        }},
                        {{
                            "text": "string",
                            "is_correct": true,
                            "feedback": "string",
                            "position": 2
                        }}
                        ]
                    }}
                    ]

                    - Tất cả viết bằng **tiếng Việt tự nhiên**, phù hợp lĩnh vực bài học.
                    - Mỗi câu có **1 đáp án đúng duy nhất**.
                    """

            # 5️⃣ Gọi model và xử lý kết quả
            response = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.4,
            )
            return self._parse_json_array(response)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"❌ Tạo quiz thất bại: {e}")

    async def create_coding_tasks_from_lessons_async(
        self,
        lesson_ids: list[UUID],
        lecturer_id: UUID,
    ):
        """
        Sinh bài tập lập trình (coding exercises) cho danh sách bài học.
        Model tự chọn ngôn ngữ hợp lệ và trả JSON không có time_limit, memory_limit.
        """
        try:
            if not lesson_ids:
                raise HTTPException(400, "❌ Thiếu danh sách lesson_id")

            # 1️⃣ Lấy danh sách bài học & kiểm tra quyền giảng viên
            stmt = (
                select(Lessons)
                .options(
                    selectinload(Lessons.lesson_chunks),
                    selectinload(Lessons.section)
                    .selectinload(CourseSections.course)
                    .selectinload(Courses.category),
                )
                .where(Lessons.id.in_(lesson_ids))
            )
            lessons = (await self.db.scalars(stmt)).all()
            if not lessons:
                raise HTTPException(404, "❌ Không tìm thấy bài học nào.")

            course = lessons[0].section.course if lessons[0].section else None
            if not course:
                raise HTTPException(404, "❌ Không tìm thấy khóa học của bài học.")
            if course.instructor_id != lecturer_id:
                raise HTTPException(403, "🚫 Bạn không có quyền truy cập khóa học này.")

            # 2️⃣ Gom toàn bộ nội dung
            all_texts = [
                chunk.text_.strip()
                for lesson in lessons
                for chunk in (lesson.lesson_chunks or [])
                if chunk.text_
            ]
            if not all_texts:
                raise HTTPException(404, "❌ Không có nội dung để tạo bài tập code.")

            full_text = "\n".join(all_texts)
            if len(full_text) > 8000:
                full_text = full_text[:8000]

            # 3️⃣ Lấy danh sách ngôn ngữ thật trong DB
            lang_stmt = (
                select(
                    SupportedLanguages.id,
                    SupportedLanguages.name,
                    SupportedLanguages.version,
                )
                .where(SupportedLanguages.is_active.is_(True))
                .order_by(SupportedLanguages.name)
            )
            langs = (await self.db.execute(lang_stmt)).all()
            if not langs:
                raise HTTPException(
                    404, "❌ Không có ngôn ngữ lập trình nào được kích hoạt."
                )

            langs_text = "\n".join(
                [f"- {name} (v{version}) — id: {id_}" for id_, name, version in langs]
            )

            # 4️⃣ Prompt sinh bài code (chuẩn Gemini)
            prompt = f"""
            Bạn là **chuyên gia thiết kế bài tập lập trình cho nền tảng e-learning**.  
            Nhiệm vụ của bạn là sinh **1–3 bài tập code thực hành** dựa trên nội dung khóa học "{course.title}"  
            (lĩnh vực: {course.category.name if course.category else "không xác định"}).

            ---
            ### 📚 Nội dung bài học:
            {full_text}

            ---
            ### 🧠 Danh sách ngôn ngữ hợp lệ (chỉ chọn trong danh sách này):
            {langs_text}

            ⚠️ Khi chọn ngôn ngữ, hãy dùng đúng `language_id` (UUID thật) tương ứng với tên ngôn ngữ.
            Không được tạo ngôn ngữ mới hoặc UUID ngẫu nhiên.

            ---
            ### 🎯 Yêu cầu:
            - Tạo 1–3 bài tập phù hợp với nội dung trên.
            - Mỗi bài gồm:
                * `language_id`: UUID thật từ danh sách trên.
                * `title`: tiêu đề ngắn, dễ hiểu.
                * `description`: mô tả chi tiết, tiếng Việt tự nhiên, có thể có ví dụ hoặc code minh họa.
                * `difficulty`: "easy" | "medium" | "hard".
                * `starter_files`: danh sách file khởi tạo (role="starter").
                * `solution_files`: danh sách file lời giải (role="solution").
                * `testcases`: danh sách kiểm thử (ít nhất 1 test mẫu `is_sample=false`). # lưu ý điểm này is_sample nếu false mới là test mẫu, true là test ẩn. tỷ lệ test ẩn nhiều hơn test mẫu.
            - Code trong `solution_files` phải chạy đúng.
            - Code trong `starter_files` là khung để sinh viên điền tiếp.
            - Đảm bảo `testcases` có input/output chính xác với lời giải.
            - Viết bằng **tiếng Việt**, không thêm chú thích hay lời giải thích ngoài JSON.

            ---
            ### ⚙️ Định dạng JSON đầu ra (chính xác tuyệt đối):

            [
            {{
                "language_id": "uuid",
                "title": "string",
                "description": "string",
                "difficulty": "medium",
                "starter_files": [
                {{
                    "filename": "main.py",
                    "content": "print('Hello')",
                    "is_main": true,
                    "role": "starter"
                }}
                ],
                "solution_files": [
                {{
                    "filename": "main.py",
                    "content": "print('Hello')",
                    "is_main": true,
                    "role": "solution"
                }}
                ],
                "testcases": [
                {{
                    "input": "1 2\\n",
                    "expected_output": "3\\n",
                    "is_sample": true, 
                    "order_index": 0
                }}
                ]
            }}
            ]

            ---
            ⚠️ Quy tắc xuất ra:
            - Chỉ trả về JSON hợp lệ, bắt đầu bằng `[` và kết thúc bằng `]`.
            - Không được sinh thêm text, Markdown hoặc giải thích.
            - Không được tạo các trường khác ngoài định dạng trên.
            - `language_id` phải chọn đúng từ danh sách ngôn ngữ ở trên và **TẤT CẢ các bài tập trong mảng PHẢI dùng CÙNG MỘT `language_id` duy nhất** (không trộn nhiều ngôn ngữ trong cùng một bài học).
            - Code phải hợp lệ, biên dịch/chạy được.
            - không bao gồm file html hoặc các định dạng không phải code.
            - Code phải phù hợp chạy được trong môi trường lập trình là engineer-man/piston trên github https://github.com/engineer-man/piston, với js va ts thêm keyword const fs = require("fs"); để thay input html
            """

            # 5️⃣ Gọi Gemini sinh bài code
            response = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.35,
                max_output_tokens=8000,
            )
            tasks = self._parse_json_array(response)

            # 6️⃣ Tự động chạy kiểm thử qua Piston & tự sửa nếu chưa PASS 100%
            lang_map = {str(id_): (name, version) for id_, name, version in langs}
            verified_tasks = await asyncio.gather(
                *[
                    self._verify_and_repair_code_task(task, lang_map)
                    for task in tasks
                    if isinstance(task, dict)
                ]
            )
            return list(verified_tasks)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"❌ Sinh bài code thất bại: {e}")


    async def create_flashcards_from_lessons_async(
        self,
        lesson_ids: list[UUID],
        lecturer_id: UUID,
        lang_code: str = "en-US",
    ):
        """AI sinh 8–12 thẻ Flashcard từ nội dung các bài giảng video đã embedding."""
        from app.services.shares.tts_service import resolve_tts_voice

        try:
            if not lesson_ids:
                raise HTTPException(400, "Thiếu danh sách lesson_id")

            stmt = (
                select(Lessons)
                .options(
                    selectinload(Lessons.lesson_chunks),
                    selectinload(Lessons.section)
                    .selectinload(CourseSections.course)
                    .selectinload(Courses.category),
                )
                .where(Lessons.id.in_(lesson_ids))
            )
            lessons = (await self.db.scalars(stmt)).all()
            if not lessons:
                raise HTTPException(404, "Không tìm thấy bài học nào trong danh sách")

            course = lessons[0].section.course if lessons[0].section else None
            if not course or course.instructor_id != lecturer_id:
                raise HTTPException(403, "Bạn không có quyền truy cập các bài học này")

            all_chunks_text = [
                c.text_.strip()
                for lesson in lessons
                for c in (lesson.lesson_chunks or [])
                if c.text_
            ]
            if not all_chunks_text:
                raise HTTPException(404, "Các bài học đã chọn chưa có nội dung chỉ mục AI")

            full_text = "\n".join(all_chunks_text)[:10000]
            resolved_lang, resolved_voice = resolve_tts_voice(lang_code)

            prompt = f"""
Bạn là **chuyên gia thiết kế thẻ ghi nhớ (Flashcard) e-learning đa ngôn ngữ** cho học sinh và người học ngoại ngữ.
Hãy tạo **8–12 thẻ Flashcard chất lượng cao** từ nội dung khóa học "{course.title}".

### Ngôn ngữ mục tiêu mặt trước (front_text): `{resolved_lang}`
### Nội dung bài giảng:
{full_text}

### Yêu cầu xuất ra:
1. Chỉ trả về **1 mảng JSON hợp lệ** (`[...]`), không có chữ hay giải thích ngoài JSON.
2. Mỗi thẻ có cấu trúc:
[
  {{
    "front_text": "Từ vựng / cụm từ / câu / khái niệm ngắn gọn theo ngôn ngữ {resolved_lang}",
    "back_text": "Nghĩa tiếng Việt rõ ràng, chính xác và ngắn gọn",
    "phonetic": "Phiên âm IPA (nếu tiếng Anh), Pinyin (nếu tiếng Trung), Furigana/Romaji (nếu tiếng Nhật) hoặc để trống nếu tiếng Việt",
    "part_of_speech": "noun / verb / adj / adv / idiom / phrase / concept",
    "example_sentence": "1 câu ví dụ tự nhiên sử dụng từ/khái niệm này bằng ngôn ngữ {resolved_lang}",
    "example_translation": "Bản dịch tiếng Việt của câu ví dụ",
    "hint": "Mẹo ghi nhớ nhanh hoặc từ khóa liên tưởng ngắn bằng tiếng Việt",
    "difficulty_level": 1
  }}
]
3. `difficulty_level`: 1 (Dễ), 2 (Trung bình), 3 (Khó).
4. Bám sát nội dung bài giảng, ưu tiên từ khóa, thuật ngữ, cấu trúc câu hoặc công thức trọng tâm.
"""
            response = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.4,
            )
            raw_cards = self._parse_json_array(response)
            formatted = []
            for idx, card in enumerate(raw_cards):
                if not isinstance(card, dict):
                    continue
                front = str(card.get("front_text") or "").strip()
                back = str(card.get("back_text") or "").strip()
                if not front or not back:
                    continue
                diff = card.get("difficulty_level", 1)
                if diff not in (1, 2, 3):
                    diff = 1
                formatted.append(
                    {
                        "front_text": front,
                        "back_text": back,
                        "phonetic": str(card.get("phonetic") or "").strip(),
                        "part_of_speech": str(card.get("part_of_speech") or "").strip(),
                        "example_sentence": str(card.get("example_sentence") or "").strip(),
                        "example_translation": str(card.get("example_translation") or "").strip(),
                        "hint": str(card.get("hint") or "").strip(),
                        "lang_code": resolved_lang,
                        "voice_id": resolved_voice,
                        "audio_url": None,
                        "example_audio_url": None,
                        "difficulty_level": diff,
                        "position": idx,
                    }
                )
            return formatted
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Sinh bộ thẻ Flashcard thất bại: {e}")


    async def create_listening_dialogue_async(
        self,
        *,
        lecturer_id: UUID,
        topic: str = "",
        lesson_ids: list | None = None,
        lang_code: str = "en-GB",
        turns: int = 10,
        question_count: int = 5,
    ):
        """AI sinh kịch bản hội thoại 2 nhân vật + câu hỏi nghe-hiểu từ chủ đề hoặc bài giảng video."""
        from app.services.shares.tts_service import (
            TTS_VOICE_CATALOG,
            resolve_tts_voice,
        )

        try:
            context_block = ""
            if lesson_ids:
                parsed_ids = [UUID(str(x)) for x in lesson_ids if x]
                stmt = (
                    select(Lessons)
                    .options(
                        selectinload(Lessons.lesson_chunks),
                        selectinload(Lessons.section).selectinload(CourseSections.course),
                    )
                    .where(Lessons.id.in_(parsed_ids))
                )
                lessons = (await self.db.scalars(stmt)).all()
                if lessons:
                    course = lessons[0].section.course if lessons[0].section else None
                    if course and course.instructor_id != lecturer_id:
                        raise HTTPException(403, "Bạn không có quyền truy cập các bài học này")
                    chunks_txt = [
                        c.text_.strip()
                        for l in lessons
                        for c in (l.lesson_chunks or [])
                        if c.text_
                    ]
                    if chunks_txt:
                        context_block = "\n".join(chunks_txt)[:6000]

            if not topic and not context_block:
                raise HTTPException(
                    400, "Vui lòng nhập chủ đề hội thoại hoặc chọn ít nhất 1 video."
                )

            resolved_lang, female_voice = resolve_tts_voice(lang_code)
            same_lang_voices = [
                v for v in TTS_VOICE_CATALOG if v["lang_code"] == resolved_lang
            ]
            male_voice = next(
                (v["voice_id"] for v in same_lang_voices if v.get("gender") == "male"),
                female_voice,
            )

            safe_turns = max(6, min(turns, 18))
            safe_q = max(3, min(question_count, 10))

            prompt = f"""
Bạn là **chuyên gia thiết kế bài luyện nghe ngoại ngữ chuẩn IELTS / HSK / JLPT / giao tiếp thực tế**.
Hãy tạo **1 đoạn hội thoại tự nhiên giữa 2 nhân vật** bằng ngôn ngữ `{resolved_lang}` và **bộ {safe_q} câu hỏi nghe-hiểu trắc nghiệm**.

### Đầu vào:
- Chủ đề / Tình huống yêu cầu: {topic or "(rút ra từ nội dung bài giảng bên dưới)"}
- Ngữ cảnh bài giảng (nếu có):
{context_block or "(Không có — hãy tự xây dựng tình huống tự nhiên, chân thực theo chủ đề trên)"}

### Định dạng JSON object duy nhất (không chữ ngoài JSON):
{{
  "title": "Tiêu đề bài luyện nghe ngắn gọn bằng tiếng Việt",
  "scenario": "Mô tả bối cảnh hội thoại 1-2 câu bằng tiếng Việt",
  "speakers": [
    {{ "id": "sp_a", "name": "Tên nhân vật 1 phù hợp văn hóa {resolved_lang}", "role": "Vai trò ngắn bằng tiếng Việt", "color": "blue" }},
    {{ "id": "sp_b", "name": "Tên nhân vật 2 phù hợp văn hóa {resolved_lang}", "role": "Vai trò ngắn bằng tiếng Việt", "color": "lavender" }}
  ],
  "script_lines": [
    {{
      "id": "line_1",
      "speaker_id": "sp_a",
      "text": "Lời thoại tự nhiên bằng ngôn ngữ {resolved_lang}",
      "translation": "Bản dịch tiếng Việt sát nghĩa"
    }}
  ],
  "quizzes": [
    {{
      "question": "Câu hỏi nghe-hiểu (bằng tiếng Việt hoặc {resolved_lang} phù hợp trình độ)",
      "explanation": "Giải thích rõ dựa trên chi tiết nào trong hội thoại (tiếng Việt)",
      "difficulty_level": 1,
      "options": [
        {{ "text": "Phương án A", "is_correct": false, "feedback": "Lý do sai ngắn gọn", "position": 0 }},
        {{ "text": "Phương án B", "is_correct": true, "feedback": "Lý do đúng ngắn gọn", "position": 1 }},
        {{ "text": "Phương án C", "is_correct": false, "feedback": "Lý do sai ngắn gọn", "position": 2 }},
        {{ "text": "Phương án D", "is_correct": false, "feedback": "Lý do sai ngắn gọn", "position": 3 }}
      ]
    }}
  ]
}}

### Quy tắc:
- `script_lines` có khoảng **{safe_turns} lượt thoại** luân phiên tự nhiên giữa `sp_a` và `sp_b`, câu chữ đời thực, rõ chi tiết (thời gian, địa điểm, con số, lý do...) để hỏi nghe-hiểu.
- `quizzes` có đúng **{safe_q} câu**, mỗi câu 4 phương án, chỉ 1 đáp án đúng (`is_correct: true`).
"""
            raw = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.5,
                max_output_tokens=8000,
            )
            try:
                parsed = self._parse_json_object(raw)
            except ValueError:
                # Retry 1 lần với temperature thấp hơn nếu JSON bị lỗi định dạng
                raw_retry = await self.llm_service.call_model(
                    prompt,
                    mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=8000,
                )
                parsed = self._parse_json_object(raw_retry)

            raw_speakers = parsed.get("speakers") or []
            speakers = [
                {
                    "id": str(raw_speakers[0].get("id") or "sp_a")
                    if len(raw_speakers) > 0
                    else "sp_a",
                    "name": str(raw_speakers[0].get("name") or "Speaker A")
                    if len(raw_speakers) > 0
                    else "Speaker A",
                    "role": str(raw_speakers[0].get("role") or "Nhân vật 1")
                    if len(raw_speakers) > 0
                    else "Nhân vật 1",
                    "voice_id": female_voice,
                    "color": "blue",
                },
                {
                    "id": str(raw_speakers[1].get("id") or "sp_b")
                    if len(raw_speakers) > 1
                    else "sp_b",
                    "name": str(raw_speakers[1].get("name") or "Speaker B")
                    if len(raw_speakers) > 1
                    else "Speaker B",
                    "role": str(raw_speakers[1].get("role") or "Nhân vật 2")
                    if len(raw_speakers) > 1
                    else "Nhân vật 2",
                    "voice_id": male_voice,
                    "color": "rose",
                },
            ]

            valid_sp_ids = {s["id"] for s in speakers}
            script_lines = []
            for idx, line in enumerate(parsed.get("script_lines") or []):
                txt = str(line.get("text") or "").strip()
                if not txt:
                    continue
                sp_id = str(line.get("speaker_id") or "")
                if sp_id not in valid_sp_ids:
                    sp_id = speakers[idx % 2]["id"]
                script_lines.append(
                    {
                        "id": str(line.get("id") or f"line_{idx + 1}"),
                        "speaker_id": sp_id,
                        "text": txt,
                        "translation": str(line.get("translation") or "").strip(),
                        "start_ms": 0,
                        "end_ms": 0,
                    }
                )

            quizzes = []
            for q in parsed.get("quizzes") or []:
                q_txt = str(q.get("question") or "").strip()
                opts = q.get("options") or []
                if not q_txt or len(opts) < 2:
                    continue
                formatted_opts = [
                    {
                        "text": str(o.get("text") or "").strip(),
                        "is_correct": bool(o.get("is_correct")),
                        "feedback": str(o.get("feedback") or "").strip(),
                        "position": oi,
                    }
                    for oi, o in enumerate(opts[:4])
                ]
                if not any(o["is_correct"] for o in formatted_opts):
                    formatted_opts[0]["is_correct"] = True
                quizzes.append(
                    {
                        "question": q_txt,
                        "explanation": str(q.get("explanation") or "").strip(),
                        "difficulty_level": q.get("difficulty_level")
                        if q.get("difficulty_level") in (1, 2, 3)
                        else 1,
                        "options": formatted_opts,
                    }
                )

            return {
                "title": str(parsed.get("title") or topic or "Bài luyện nghe hội thoại"),
                "scenario": str(parsed.get("scenario") or ""),
                "lang_code": resolved_lang,
                "speakers": speakers,
                "script_lines": script_lines,
                "quizzes": quizzes,
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Sinh hội thoại luyện nghe thất bại: {e}")

    async def create_fill_blank_async(
        self,
        *,
        lecturer_id: UUID,
        topic: str = "",
        lesson_ids: list | None = None,
        lang_code: str = "en-GB",
        blank_count: int = 6,
        mode: str = "typing",
    ):
        """AI sinh đoạn văn điền từ vào chỗ trống ({{1}}..{{n}}), đáp án tương đương, gợi ý, giải thích và từ nhiễu."""
        from app.services.shares.tts_service import resolve_tts_voice

        try:
            context_block = ""
            if lesson_ids:
                parsed_ids = [UUID(str(x)) for x in lesson_ids if x]
                stmt = (
                    select(Lessons)
                    .options(
                        selectinload(Lessons.lesson_chunks),
                        selectinload(Lessons.section).selectinload(CourseSections.course),
                    )
                    .where(Lessons.id.in_(parsed_ids))
                )
                lessons = (await self.db.scalars(stmt)).all()
                if lessons:
                    course = lessons[0].section.course if lessons[0].section else None
                    if course and course.instructor_id != lecturer_id:
                        raise HTTPException(403, "Bạn không có quyền truy cập các bài học này")
                    chunks_txt = [
                        c.text_.strip()
                        for l in lessons
                        for c in (l.lesson_chunks or [])
                        if c.text_
                    ]
                    if chunks_txt:
                        context_block = "\n".join(chunks_txt)[:6000]

            if not topic and not context_block:
                raise HTTPException(
                    400, "Vui lòng nhập chủ đề hoặc chọn ít nhất 1 video bài giảng."
                )

            resolved_lang, resolved_voice = resolve_tts_voice(lang_code)
            safe_blanks = max(3, min(blank_count, 15))
            safe_mode = mode if mode in ("typing", "word_bank", "dictation") else "typing"

            prompt = f"""
Bạn là **chuyên gia thiết kế bài tập Điền từ vào chỗ trống (Cloze Test / Dictation)** cho học viên ngoại ngữ.
Hãy tạo **1 đoạn văn / hội thoại ngắn tự nhiên** bằng ngôn ngữ `{resolved_lang}` có đúng **{safe_blanks} chỗ trống** được đánh dấu `{{{{1}}}}`, `{{{{2}}}}`, ..., `{{{{{safe_blanks}}}}}`.

### Đầu vào:
- Chủ đề / Ngữ pháp trọng tâm: {topic or "(rút ra từ nội dung bài giảng bên dưới)"}
- Chế độ làm bài dự kiến: {safe_mode}
- Ngữ cảnh bài giảng (nếu có):
{context_block or "(Không có — hãy tự viết đoạn văn chân thực, mạch lạc, đúng chủ đề)"}

### Chỉ trả về 1 JSON object hợp lệ (không chữ ngoài JSON):
{{
  "title": "Tiêu đề bài tập ngắn gọn bằng tiếng Việt",
  "prompt_text": "Đoạn văn bằng ngôn ngữ {resolved_lang} chứa chính xác các placeholder {{{{1}}}}, {{{{2}}}} ... đến {{{{{safe_blanks}}}}}.",
  "translation": "Bản dịch tiếng Việt hoàn chỉnh của toàn đoạn văn (đã điền đủ từ)",
  "blanks": [
    {{
      "id": "b1",
      "index": 1,
      "answers": ["đáp án chính", "biến thể tương đương nếu có"],
      "part_of_speech": "verb / noun / adj / prep / phrase",
      "hint": "Gợi ý ngắn bằng tiếng Việt (nghĩa hoặc cấu trúc)",
      "explanation": "Giải thích ngắn gọn vì sao điền từ này (tiếng Việt)"
    }}
  ],
  "distractors": ["từ nhiễu 1", "từ nhiễu 2", "từ nhiễu 3", "từ nhiễu 4"]
}}

### Quy tắc bắt buộc:
- `prompt_text` PHẢI chứa đầy đủ `{{{{1}}}}` đến `{{{{{safe_blanks}}}}}` theo đúng thứ tự.
- Mỗi phần tử trong `blanks` có `index` khớp chính xác `1..{safe_blanks}`, `answers` có ít nhất 1 từ/cụm từ ngắn gọn (1–3 từ).
- `distractors` có 3–5 từ nhiễu cùng ngôn ngữ `{resolved_lang}`, hợp ngữ cảnh nhưng sai ngữ pháp/nghĩa để dùng cho chế độ Ngân hàng từ.
"""
            raw = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.45,
                max_output_tokens=6000,
            )
            try:
                parsed = self._parse_json_object(raw)
            except ValueError:
                raw_retry = await self.llm_service.call_model(
                    prompt,
                    mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=6000,
                )
                parsed = self._parse_json_object(raw_retry)

            prompt_text = str(parsed.get("prompt_text") or "").strip()
            blanks = []
            for idx, item in enumerate(parsed.get("blanks") or [], start=1):
                if not isinstance(item, dict):
                    continue
                raw_ans = item.get("answers") or []
                if isinstance(raw_ans, str):
                    raw_ans = [raw_ans]
                answers = [str(a).strip() for a in raw_ans if str(a).strip()]
                if not answers:
                    continue
                blanks.append(
                    {
                        "id": str(item.get("id") or f"b{idx}"),
                        "index": int(item.get("index") or idx),
                        "answers": answers,
                        "part_of_speech": str(item.get("part_of_speech") or "").strip(),
                        "hint": str(item.get("hint") or "").strip(),
                        "explanation": str(item.get("explanation") or "").strip(),
                    }
                )
            blanks.sort(key=lambda x: x["index"])

            distractors = [
                str(d).strip()
                for d in (parsed.get("distractors") or [])
                if str(d).strip()
            ]

            return {
                "title": str(parsed.get("title") or topic or "Bài tập Điền từ vào chỗ trống"),
                "lang_code": resolved_lang,
                "voice_id": resolved_voice,
                "mode": safe_mode,
                "prompt_text": prompt_text,
                "translation": str(parsed.get("translation") or "").strip(),
                "blanks": blanks,
                "distractors": distractors,
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Sinh bài Điền từ vào chỗ trống thất bại: {e}")

    async def create_speaking_scenario_async(
        self,
        *,
        lecturer_id: UUID,
        topic: str = "",
        lesson_ids: list | None = None,
        lang_code: str = "en-GB",
        level: str = "B1",
        mission_count: int = 4,
    ):
        """AI sinh kịch bản đóng vai giao tiếp (Nhân vật AI, câu mở màn, 3-5 nhiệm vụ qua bài, mẫu câu gợi ý)."""
        from app.services.shares.tts_service import resolve_tts_voice

        try:
            context_block = ""
            if lesson_ids:
                parsed_ids = [UUID(str(x)) for x in lesson_ids if x]
                stmt = (
                    select(Lessons)
                    .options(
                        selectinload(Lessons.lesson_chunks),
                        selectinload(Lessons.section).selectinload(CourseSections.course),
                    )
                    .where(Lessons.id.in_(parsed_ids))
                )
                lessons = (await self.db.scalars(stmt)).all()
                if lessons:
                    course = lessons[0].section.course if lessons[0].section else None
                    if course and course.instructor_id != lecturer_id:
                        raise HTTPException(403, "Bạn không có quyền truy cập các bài học này")
                    chunks_txt = [
                        c.text_.strip()
                        for l in lessons
                        for c in (l.lesson_chunks or [])
                        if c.text_
                    ]
                    if chunks_txt:
                        context_block = "\n".join(chunks_txt)[:6000]

            if not topic and not context_block:
                raise HTTPException(
                    400, "Vui lòng nhập chủ đề tình huống hoặc chọn ít nhất 1 video bài giảng."
                )

            resolved_lang, resolved_voice = resolve_tts_voice(lang_code)
            safe_missions = max(2, min(mission_count, 6))

            prompt = f"""
Bạn là **chuyên gia thiết kế bài luyện giao tiếp đóng vai (AI Roleplay)** cho người học ngoại ngữ trình độ `{level}`.
Hãy xây dựng **1 tình huống giao tiếp thực tế** bằng ngôn ngữ `{resolved_lang}` gồm nhân vật AI, vai của học viên, câu mở màn tự nhiên, **{safe_missions} nhiệm vụ bắt buộc học viên phải nói được để qua bài**, và **5 mẫu câu gợi ý**.

### Đầu vào:
- Chủ đề / Tình huống: {topic or "(rút ra từ nội dung bài giảng bên dưới)"}
- Ngữ cảnh bài giảng (nếu có):
{context_block or "(Không có — hãy xây dựng tình huống đời thực sinh động theo chủ đề trên)"}

### Chỉ trả về 1 JSON object hợp lệ (không chữ ngoài JSON):
{{
  "title": "Tiêu đề bài đóng vai ngắn gọn bằng tiếng Việt",
  "scenario": "Mô tả bối cảnh 1-2 câu bằng tiếng Việt cho học viên hiểu tình huống",
  "student_role": "Vai của học viên bằng tiếng Việt (VD: Khách du lịch đến nhận phòng khách sạn)",
  "ai_persona": {{
    "name": "Tên nhân vật AI phù hợp văn hóa {resolved_lang}",
    "role": "Vai trò nhân vật AI bằng tiếng Việt (VD: Lễ tân khách sạn)",
    "personality": "Tính cách ngắn gọn (VD: Thân thiện, lịch sự, kiên nhẫn)",
    "opening_line": "Câu mở màn tự nhiên bằng ngôn ngữ {resolved_lang} (1-2 câu ngắn)",
    "opening_translation": "Bản dịch tiếng Việt câu mở màn"
  }},
  "missions": [
    {{
      "id": "m1",
      "title": "Mô tả nhiệm vụ ngắn gọn bằng tiếng Việt (VD: Chào hỏi và báo tên đặt phòng)",
      "hint": "Gợi ý cấu trúc hoặc từ khóa bằng {resolved_lang}"
    }}
  ],
  "sample_phrases": [
    {{
      "phrase": "Mẫu câu hữu ích bằng {resolved_lang}",
      "translation": "Nghĩa tiếng Việt"
    }}
  ]
}}
"""
            raw = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.5,
                max_output_tokens=5000,
            )
            try:
                parsed = self._parse_json_object(raw)
            except ValueError:
                raw_retry = await self.llm_service.call_model(
                    prompt,
                    mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=5000,
                )
                parsed = self._parse_json_object(raw_retry)

            raw_persona = parsed.get("ai_persona") or {}
            ai_persona = {
                "name": str(raw_persona.get("name") or "Alex").strip(),
                "role": str(raw_persona.get("role") or "Đối tác hội thoại").strip(),
                "personality": str(raw_persona.get("personality") or "Thân thiện, tự nhiên").strip(),
                "voice_id": resolved_voice,
                "opening_line": str(raw_persona.get("opening_line") or "Hello! How can I help you today?").strip(),
                "opening_translation": str(raw_persona.get("opening_translation") or "").strip(),
                "opening_audio_url": "",
            }

            missions = []
            for idx, m in enumerate(parsed.get("missions") or [], start=1):
                if not isinstance(m, dict):
                    continue
                title = str(m.get("title") or "").strip()
                if not title:
                    continue
                missions.append(
                    {
                        "id": str(m.get("id") or f"m{idx}"),
                        "title": title,
                        "hint": str(m.get("hint") or "").strip(),
                    }
                )

            sample_phrases = []
            for p in parsed.get("sample_phrases") or []:
                if not isinstance(p, dict):
                    continue
                ph = str(p.get("phrase") or "").strip()
                if not ph:
                    continue
                sample_phrases.append(
                    {
                        "phrase": ph,
                        "translation": str(p.get("translation") or "").strip(),
                    }
                )

            return {
                "title": str(parsed.get("title") or topic or "Bài luyện Giao tiếp AI"),
                "lang_code": resolved_lang,
                "level": level,
                "scenario": str(parsed.get("scenario") or "").strip(),
                "student_role": str(parsed.get("student_role") or "Học viên").strip(),
                "ai_persona": ai_persona,
                "missions": missions,
                "sample_phrases": sample_phrases,
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Sinh kịch bản giao tiếp AI thất bại: {e}")
