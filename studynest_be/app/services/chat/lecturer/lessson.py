import json
import re
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.responses import PlainTextResponse
from semantic_text_splitter import TextSplitter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.llm import LLMService
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


class LessonService:
    def __init__(
        self,
        llm_service: LLMService = Depends(LLMService),
        db: AsyncSession = Depends(get_session),
    ) -> None:
        self.llm_service = llm_service
        self.db: AsyncSession = db

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
                - Chủ đề / lĩnh vực: {course.category.name or "không xác định"}
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
            result = await self.llm_service.call_model(prompt)
            clean = re.sub(r"```(json)?", "", result).strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
            clean = clean.strip()

            try:
                quizzes_data = json.loads(clean)
                return quizzes_data
            except json.JSONDecodeError as e:
                raise HTTPException(500, f"⚠️ JSON lỗi: {e}\n\nRaw: {clean[:500]}")

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
            response = await self.llm_service.call_model(prompt)
            try:
                data = json.loads(response)
            except json.JSONDecodeError:
                # Trường hợp model trả thêm ký tự thừa (vd: \n hoặc ```json)
                cleaned = (
                    raw.strip().removeprefix("```json").removesuffix("```").strip()
                )
                data = json.loads(cleaned)
            return data
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
            - `language_id` phải chọn đúng từ danh sách ngôn ngữ ở trên.
            - Code phải hợp lệ, biên dịch/chạy được.
            - không bao gồm file html hoặc các định dạng không phải code.
            - Code phải phù hợp chạy được trong môi trường lập trình là engineer-man/piston trên github https://github.com/engineer-man/piston, với js va ts thêm keyword const fs = require("fs"); để thay input html
            """

            # 5️⃣ Gọi Gemini
            response = await self.llm_service.call_model(
                prompt,
                mime_type="application/json",
                temperature=0.4,
                max_output_tokens=8000,
            )
            try:
                data = json.loads(response)
            except json.JSONDecodeError:
                # Trường hợp model trả thêm ký tự thừa (vd: \n hoặc ```json)
                cleaned = (
                    raw.strip().removeprefix("```json").removesuffix("```").strip()
                )
                data = json.loads(cleaned)
            return data
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"❌ Sinh bài code thất bại: {e}")