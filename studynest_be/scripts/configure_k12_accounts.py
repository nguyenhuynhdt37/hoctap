"""Replace eight explicit local legacy courses with math drafts, add grades 9–12.

Dry-run by default; --apply requires a full PostgreSQL custom-format backup.
Old content is detached, preserving original rows and progress/media references.
Course IDs/slugs, identity, roles and financial history are retained.
"""

import argparse
import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import func, select, text, update

from app.db.models.catalog import Grade, LearningGoal, Subject
from app.db.models.database import Courses, CourseSections, Lessons, User
from app.db.sesson import AsyncSessionLocal
from app.schemas.catalog import CourseTaxonomy
from app.services.catalog import CatalogService

OWNERS = [
    UUID(v)
    for v in (
        "5edae502-3d64-4181-8790-8cb0b2e46a17",
        "25d77be2-fa13-4e7b-ab6b-a0a094a444cb",
    )
]
LEGACY_IDS = [
    UUID(v)
    for v in (
        "012cceb0-1969-4b3e-b238-34a2bc626bb8",
        "7eb86d9e-6bb2-422e-9dc4-93936ac34b85",
        "075522a0-adb5-4816-9593-da0d254acf45",
        "e03af09c-57cc-4eec-b16d-47ccf745aa25",
        "3ef8b441-1ed3-48c7-9f8c-624dbaeab715",
        "70f836f5-bd06-4e51-aaa2-5ffe46105753",
        "2705f379-528a-400b-80b6-4535da27f483",
        "ea522809-43d1-46e6-878b-d6f022e75e36",
    )
]

# Introductory revision units, not a full-year or textbook coverage claim.
# Title, explanation/worked example, practice question, checked answer.
UNITS = {
    1: [
        (
            "Đếm và so sánh",
            "Đếm từng vật một lần. Nhóm 5 quả táo nhiều hơn nhóm 3 quả vì 5 > 3.",
            "Điền dấu: 4 ... 7; 6 ... 6.",
            "4 < 7; 6 = 6.",
        ),
        (
            "Cộng, trừ trong phạm vi 10",
            "Cộng là gộp thêm; trừ là bớt đi. Có 3 bút, thêm 2 bút: 3 + 2 = 5 bút.",
            "Tính 4 + 3 và 8 − 2.",
            "7 và 6.",
        ),
        (
            "Nhận biết hình",
            "Tam giác có 3 cạnh. Hình vuông có 4 cạnh bằng nhau và 4 góc vuông.",
            "Hình vuông có mấy cạnh? Hai hình tam giác có tất cả mấy cạnh?",
            "4 cạnh; 6 cạnh.",
        ),
    ],
    2: [
        (
            "Cộng, trừ có nhớ",
            "Đặt các chữ số cùng hàng thẳng cột. 27 + 15: 7 + 5 = 12, viết 2 nhớ 1; hàng chục là 2 + 1 + 1 = 4. Kết quả 42.",
            "Tính 36 + 28 và 52 − 17.",
            "64 và 35.",
        ),
        (
            "Phép nhân và phép chia",
            "Phép nhân gộp các nhóm bằng nhau. 4 nhóm, mỗi nhóm 2 bút: 2 × 4 = 8 bút. Chia đều 8 bút cho 4 bạn: mỗi bạn 2 bút.",
            "5 nhóm, mỗi nhóm 2 viên bi có bao nhiêu viên?",
            "2 × 5 = 10 viên bi.",
        ),
        (
            "Đo độ dài",
            "Đặt đầu vật ở vạch 0 trên thước. Đầu kia ở vạch 12 cm thì vật dài 12 cm.",
            "Hai đoạn dài 8 cm và 5 cm. Tổng độ dài là bao nhiêu?",
            "8 + 5 = 13 cm.",
        ),
    ],
    3: [
        (
            "Thứ tự thực hiện phép tính",
            "Trong biểu thức không có ngoặc, thực hiện nhân chia trước, cộng trừ sau. 6 + 4 × 3 = 6 + 12 = 18.",
            "Tính 24 ÷ 3 + 7 và 5 × 6 − 8.",
            "15 và 22.",
        ),
        (
            "Chu vi hình chữ nhật và hình vuông",
            "Chu vi là độ dài đường bao. Hình chữ nhật: (dài + rộng) × 2. Dài 8 cm, rộng 3 cm: chu vi 22 cm. Hình vuông: cạnh × 4.",
            "Tính chu vi hình vuông cạnh 6 cm.",
            "6 × 4 = 24 cm.",
        ),
        (
            "Bài toán hai bước",
            "Có 12 bút xanh, bút đỏ nhiều hơn 3 bút. Bút đỏ: 12 + 3 = 15; tổng: 12 + 15 = 27 bút.",
            "Có 10 sách Toán, sách Tiếng Việt nhiều hơn 4 quyển. Có tất cả bao nhiêu sách?",
            "Sách Tiếng Việt: 14; tất cả: 24 quyển.",
        ),
    ],
    4: [
        (
            "Phân số bằng nhau",
            "Phân số biểu thị số phần trong các phần bằng nhau của một đơn vị. Nhân cả tử và mẫu với cùng số khác 0 cho phân số bằng nhau: 1/2 = 2/4.",
            "Viết phân số bằng 2/3 có mẫu số 12.",
            "8/12.",
        ),
        (
            "Cộng, trừ phân số cùng mẫu",
            "Giữ nguyên mẫu, cộng hoặc trừ các tử. Ví dụ 2/7 + 3/7 = 5/7. Rút gọn kết quả nếu có thể.",
            "Tính 5/8 − 1/8 và 1/6 + 3/6.",
            "1/2 và 2/3.",
        ),
        (
            "Trung bình cộng",
            "Lấy tổng chia cho số giá trị. Đọc 10, 12, 14 trang trong ba ngày: trung bình (10 + 12 + 14) ÷ 3 = 12 trang/ngày.",
            "Tìm trung bình cộng của 6, 8, 10, 12.",
            "36 ÷ 4 = 9.",
        ),
    ],
    5: [
        (
            "Số thập phân",
            "Khi cộng trừ, đặt dấu phẩy thẳng cột. Có thể thêm 0 bên phải phần thập phân: 3,25 + 1,7 = 3,25 + 1,70 = 4,95.",
            "Tính 6,4 − 2,75.",
            "3,65.",
        ),
        (
            "Tỉ số phần trăm",
            "p% của một số bằng số đó nhân p rồi chia 100. Ví dụ 20% của 150 là 150 × 20 ÷ 100 = 30.",
            "Lớp có 40 học sinh, 25% tham gia câu lạc bộ. Có bao nhiêu bạn tham gia?",
            "40 × 25 ÷ 100 = 10 bạn.",
        ),
        (
            "Diện tích tam giác và hình thang",
            "Tam giác: đáy × cao ÷ 2. Đáy 8 cm, cao 5 cm cho diện tích 20 cm². Hình thang: (đáy lớn + đáy nhỏ) × cao ÷ 2.",
            "Hình thang có hai đáy 6 cm, 10 cm; cao 4 cm. Tính diện tích.",
            "32 cm².",
        ),
    ],
    6: [
        (
            "Số nguyên và quy tắc dấu",
            "Hai số đối nhau có tổng 0. Cộng hai số khác dấu: lấy trị tuyệt đối lớn trừ nhỏ, giữ dấu số có trị tuyệt đối lớn. −7 + 3 = −4.",
            "Tính −9 + 14 và −4 − 6.",
            "5 và −10.",
        ),
        (
            "Ước chung và bội chung",
            "ƯCLN là ước chung lớn nhất; BCNN là bội chung dương nhỏ nhất. 12 = 2² × 3, 18 = 2 × 3² nên ƯCLN = 6, BCNN = 36.",
            "Tìm ƯCLN và BCNN của 8 và 12.",
            "4 và 24.",
        ),
        (
            "Phép tính phân số",
            "Cộng khác mẫu bằng quy đồng: 1/2 + 1/3 = 5/6. Chia cho phân số khác 0 bằng nhân với phân số nghịch đảo.",
            "Tính 3/4 ÷ 2/5.",
            "3/4 × 5/2 = 15/8.",
        ),
    ],
    7: [
        (
            "Số hữu tỉ và lũy thừa",
            "Số hữu tỉ viết dưới dạng a/b với a, b nguyên, b khác 0. Nhân lũy thừa cùng cơ số thì cộng số mũ: 2³ × 2² = 2⁵ = 32.",
            "Tính (−1/2)² và 3² × 3³.",
            "1/4 và 243.",
        ),
        (
            "Đại lượng tỉ lệ thuận",
            "Tỉ lệ thuận có dạng y = kx, k khác 0. Mỗi vở 8.000 đồng thì 3 vở hết 24.000 đồng.",
            "5 kg gạo giá 90.000 đồng. Cùng đơn giá, 8 kg giá bao nhiêu?",
            "Mỗi kg 18.000 đồng; 8 kg giá 144.000 đồng.",
        ),
        (
            "Tổng ba góc tam giác",
            "Tổng ba góc trong một tam giác bằng 180°. Hai góc là 50° và 60° thì góc còn lại 180° − 50° − 60° = 70°.",
            "Hai góc là 35° và 75°. Tìm góc thứ ba.",
            "70°.",
        ),
    ],
    8: [
        (
            "Hằng đẳng thức",
            "(a + b)² = a² + 2ab + b²; (a − b)² = a² − 2ab + b². Ví dụ (x + 3)² = x² + 6x + 9.",
            "Khai triển (x − 4)².",
            "x² − 8x + 16.",
        ),
        (
            "Phương trình bậc nhất",
            "ax + b = 0, a khác 0, có nghiệm x = −b/a. 3x − 12 = 0 cho x = 4. Thử lại để kiểm tra.",
            "Giải 5x + 10 = 0.",
            "x = −2.",
        ),
        (
            "Định lí Pythagore",
            "Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông. Cạnh góc vuông 3 cm, 4 cm thì cạnh huyền √25 = 5 cm.",
            "Cạnh góc vuông là 6 cm, 8 cm. Tìm cạnh huyền.",
            "√(36 + 64) = 10 cm.",
        ),
    ],
    9: [
        (
            "Căn bậc hai",
            "Căn bậc hai số học của a ≥ 0 là số không âm có bình phương bằng a. √49 = 7; chú ý √(x²) = |x|.",
            "Tính √81 và √((−5)²).",
            "9 và 5.",
        ),
        (
            "Hệ phương trình hai ẩn",
            "Dùng thế hoặc cộng đại số. Với x + y = 5; x − y = 1, cộng hai phương trình được 2x = 6, nên x = 3, y = 2.",
            "Giải hệ x + y = 7; x − y = 3.",
            "x = 5, y = 2.",
        ),
        (
            "Phương trình bậc hai",
            "ax² + bx + c = 0, a khác 0. Δ = b² − 4ac; khi Δ ≥ 0, nghiệm là (−b ± √Δ)/(2a). x² − 5x + 6 = 0 có nghiệm 2 và 3.",
            "Giải x² − 3x + 2 = 0.",
            "x = 1 hoặc x = 2.",
        ),
    ],
    10: [
        (
            "Tập hợp và phép toán",
            "Giao gồm phần tử chung; hợp gồm phần tử thuộc ít nhất một tập. A = {1, 2, 3}, B = {3, 4}: A ∩ B = {3}; A ∪ B = {1, 2, 3, 4}.",
            "A = {2, 4, 6}, B = {4, 6, 8}. Tìm A ∩ B.",
            "{4, 6}.",
        ),
        (
            "Hàm số bậc hai",
            "y = ax² + bx + c, a khác 0, có đồ thị parabol; hoành độ đỉnh −b/(2a). y = x² − 4x + 3 có đỉnh (2; −1).",
            "Tìm đỉnh của y = x² − 2x + 3.",
            "(1; 2).",
        ),
        (
            "Vectơ trong mặt phẳng",
            "Cộng vectơ theo tọa độ: (1; 2) + (3; −1) = (4; 1). Nhân với số bằng cách nhân từng tọa độ.",
            "Tính 2u − v với u = (2; 1), v = (1; 3).",
            "(3; −1).",
        ),
    ],
    11: [
        (
            "Cấp số cộng",
            "Hiệu hai số hạng liên tiếp không đổi bằng d. uₙ = u₁ + (n − 1)d. Với u₁ = 3, d = 2 thì u₅ = 11.",
            "u₁ = 5, d = 3. Tính u₁₀.",
            "5 + 9 × 3 = 32.",
        ),
        (
            "Mũ và lôgarit",
            "Với a > 0, a khác 1, b > 0: logₐ b = c tương đương aᶜ = b. log₂ 8 = 3 vì 2³ = 8. Luôn kiểm tra điều kiện.",
            "Giải 2ˣ = 16 và tính log₃ 27.",
            "x = 4; log₃ 27 = 3.",
        ),
        (
            "Đạo hàm",
            "Đạo hàm mô tả tốc độ thay đổi tức thời. Với n nguyên dương, đạo hàm xⁿ là nxⁿ⁻¹. y = x³ + 2x có y′ = 3x² + 2.",
            "Tính đạo hàm y = x² − 4x + 7.",
            "y′ = 2x − 4.",
        ),
    ],
    12: [
        (
            "Sự biến thiên và cực trị",
            "Xét dấu đạo hàm trên từng khoảng xác định. y = x² − 2x có y′ = 2x − 2: âm khi x < 1, dương khi x > 1; cực tiểu tại (1; −1).",
            "Tìm khoảng đồng biến, nghịch biến của y = x² − 6x.",
            "Nghịch biến trên (−∞; 3), đồng biến trên (3; +∞).",
        ),
        (
            "Nguyên hàm và tích phân",
            "F là nguyên hàm của f khi F′ = f. Tích phân từ a đến b bằng F(b) − F(a). Tích phân 2x từ 0 đến 2 bằng 2² − 0² = 4.",
            "Tính tích phân 3x² từ 0 đến 1.",
            "[x³] từ 0 đến 1 = 1.",
        ),
        (
            "Tọa độ không gian",
            "Khoảng cách hai điểm bằng căn tổng bình phương các hiệu tọa độ. A(0; 0; 0), B(1; 2; 2): AB = √(1 + 4 + 4) = 3.",
            "Tính khoảng cách từ O đến M(2; 3; 6).",
            "√(4 + 9 + 36) = 7.",
        ),
    ],
}


def identity(key):
    return uuid5(NAMESPACE_URL, "maymay:k12-refresh:v1:" + key)


def course_id(grade):
    return LEGACY_IDS[grade - 1] if grade <= 8 else identity(f"course:{grade}")


async def run(args):
    async with AsyncSessionLocal() as db:
        if db.bind.url.host not in {"localhost", "127.0.0.1", "::1"}:
            raise SystemExit("Only the local database is supported")
        if args.apply:
            if (
                not args.backup
                or not args.backup.is_file()
                or args.backup.stat().st_size < 100_000
            ):
                raise SystemExit("--apply requires a full PostgreSQL backup")
            with args.backup.open("rb") as stream:
                if stream.read(5) != b"PGDMP":
                    raise SystemExit("Backup must be PostgreSQL custom format")
        await db.execute(text("SELECT pg_advisory_xact_lock(20261111, 12)"))
        subject = await db.scalar(
            select(Subject).where(Subject.code == "toan", Subject.is_active.is_(True))
        )
        goal = await db.scalar(
            select(LearningGoal).where(
                LearningGoal.code == "lay-lai-goc", LearningGoal.is_active.is_(True)
            )
        )
        grades = {
            g.grade_number: g
            for g in (
                await db.scalars(select(Grade).where(Grade.is_active.is_(True)))
            ).all()
        }
        if not subject or not goal or any(n not in grades for n in range(1, 13)):
            raise ValueError("Active K12 taxonomy must exist")
        users = []
        for owner in OWNERS:
            user = await db.get(User, owner)
            if not user or user.deleted_at or user.is_banned:
                raise ValueError(f"Account unavailable: {owner}")
            users.append(user)
        service = CatalogService(db)
        report = []
        for grade, units in UNITS.items():
            owner = OWNERS[0 if grade <= 6 else 1]
            course = await db.get(Courses, course_id(grade))
            if grade <= 8 and not course:
                raise ValueError("Explicit legacy course is missing")
            if course and (course.instructor_id != owner or course.deleted_at):
                raise ValueError("Course owner/state mismatch")
            education = CourseTaxonomy(
                subject_id=subject.id,
                grade_ids=[grades[grade].id],
                learning_goal_ids=[goal.id],
            )
            await service.validate_assignment(education, owner, admin=True)
            configured = await db.get(CourseSections, identity(f"section:{grade}:1"))
            report.append(
                {
                    "grade": grade,
                    "action": "keep"
                    if configured
                    else "replace"
                    if course
                    else "create",
                }
            )
            if not args.apply or configured:
                continue
            if course:
                archive_id = identity(f"archive:{grade}")
                values = {
                    c.name: getattr(course, c.name) for c in Courses.__table__.columns
                }
                values.update(
                    id=archive_id,
                    slug=f"archived-k12-{course.id}",
                    is_published=False,
                    deleted_at=datetime.now(UTC),
                )
                db.add(Courses(**values))
                await db.flush()
                await db.execute(
                    update(Lessons)
                    .where(Lessons.course_id == course.id)
                    .values(course_id=archive_id)
                )
                await db.execute(
                    update(CourseSections)
                    .where(CourseSections.course_id == course.id)
                    .values(course_id=archive_id)
                )
                for table in ("lesson_quizzes", "lesson_progress", "lesson_active"):
                    await db.execute(
                        text(
                            f"UPDATE {table} SET course_id=:archive WHERE course_id=:id"
                        ),
                        {"archive": archive_id, "id": course.id},
                    )
                await db.execute(
                    text(
                        "UPDATE course_enrollments SET progress=0 WHERE course_id=:id"
                    ),
                    {"id": course.id},
                )
            else:
                course = Courses(
                    id=course_id(grade),
                    instructor_id=owner,
                    title="",
                    slug=f"toan-lop-{grade}-cung-co-kien-thuc",
                    base_price=0,
                )
                db.add(course)
            course.title = f"Toán lớp {grade} · Củng cố kiến thức và luyện tập"
            course.subtitle = " · ".join(u[0] for u in units)
            course.description = (
                f"## Toán lớp {grade}\n\nÔn kiến thức nền tảng qua ví dụ có lời giải và bài tập tự luyện.\n\n### Nội dung\n\n"
                + "\n".join(f"- {u[0]}" for u in units)
                + "\n\nHọc phần củng cố theo chủ đề, chưa phải khóa trọn năm. Hãy tự làm bài trước khi xem đáp án."
            )
            course.outcomes = [f"Ôn tập và thực hành: {u[0].lower()}." for u in units]
            course.requirements = [
                "Có vở và bút để thực hành.",
                f"Đã làm quen với Toán lớp {grade}.",
            ]
            course.target_audience = [
                f"Học sinh lớp {grade} cần củng cố kiến thức Toán.",
                "Phụ huynh hỗ trợ con ôn tập tại nhà.",
            ]
            course.level, course.language = "beginner", "vi"
            course.is_published, course.approval_status = False, "pending"
            course.approved_by = course.approved_at = course.approval_note = None
            course.category_id = course.topic_id = None
            course.thumbnail_url = course.promo_video_url = None
            course.embedding = course.embedding_updated_at = None
            course.search_tsv = func.to_tsvector(
                "simple", course.title + " " + course.description
            )
            course.total_length_seconds = 0
            course.updated_at = datetime.now(UTC)
            await db.flush()
            await service.assign(course, education, owner, admin=True, commit=False)
            for position, (title, explanation, exercise, answer) in enumerate(units, 1):
                section_id = identity(f"section:{grade}:{position}")
                db.add(
                    CourseSections(
                        id=section_id,
                        course_id=course.id,
                        title=title,
                        position=position,
                    )
                )
                await db.flush()
                db.add(
                    Lessons(
                        id=identity(f"lesson:{grade}:{position}"),
                        course_id=course.id,
                        section_id=section_id,
                        position=1,
                        lesson_type="article",
                        title=title,
                        description=f"## {title}\n\n### Kiến thức và ví dụ\n\n{explanation}\n\n### Tự luyện tập\n\n{exercise}\n\n### Đáp án tham khảo\n\n{answer}",
                        outcomes=[f"Thực hành {title.lower()} qua ví dụ và bài tập."],
                        is_preview=position == 1,
                    )
                )
        if args.apply:
            await db.flush()
            for grade in range(1, 13):
                await db.execute(
                    text("""
                    INSERT INTO lesson_active (user_id, course_id, lesson_id)
                    SELECT user_id, course_id, :lesson FROM course_enrollments
                    WHERE course_id=:course AND status='active'
                    ON CONFLICT (user_id, course_id) DO NOTHING
                """),
                    {
                        "lesson": identity(f"lesson:{grade}:1"),
                        "course": course_id(grade),
                    },
                )
        if args.apply:
            for index, user in enumerate(users):
                span = "1–6" if index == 0 else "7–12"
                user.bio = f"Đồng hành cùng học sinh lớp {span} củng cố kiến thức Toán, luyện tập từng bước và hình thành thói quen tự học."
                user.instructor_description = (
                    f"## Cùng học Toán lớp {span}\n\n"
                    "Tập trung vào kiến thức nền tảng, ví dụ có lời giải và bài tập tự luyện. Mỗi học phần được gắn rõ lớp để dễ lựa chọn.\n\n"
                    "### Cách học\n\n- Đọc phần kiến thức cần nhớ.\n- Tự làm bài vào vở.\n- Đối chiếu lời giải và ghi lại chỗ chưa hiểu.\n\n"
                    "Các học phần hiện là nội dung củng cố theo chủ đề, không thay thế toàn bộ chương trình ở trường."
                )
                user.preferences_embedding = (
                    user.preferences_embedding_date_updated_at
                ) = None
                user.course_count = await db.scalar(
                    select(func.count())
                    .select_from(Courses)
                    .where(
                        Courses.instructor_id == user.id, Courses.deleted_at.is_(None)
                    )
                )
                user.update_at = datetime.now(UTC).replace(tzinfo=None)
            await db.commit()
        else:
            await db.rollback()
        print(
            json.dumps(
                {"applied": args.apply, "courses": report, "article_lessons": 36},
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup", type=Path)
    asyncio.run(run(parser.parse_args()))
