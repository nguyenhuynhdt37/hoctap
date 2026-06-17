/**
 * Mock Data cho Learning Feature
 * Mô phỏng API response từ backend StudyNest
 */

import type {
  CourseCurriculum,
  CourseSection,
  Lesson,
  QuizOption,
  Quiz,
  LessonResource,
  Comment,
  LessonNote,
  ActiveLesson,
  PrevNextLesson,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// INSTRUCTOR
// ═══════════════════════════════════════════════════════════════════════════════

export const mockInstructor = {
  id: 'inst-001',
  fullname: 'Nguyễn Văn Minh',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=minh',
  instructor_description: 'Giảng viên với 10+ năm kinh nghiệm trong lĩnh vực AI và Machine Learning',
  student_count: 15420,
  course_count: 8,
  rating_avg: 4.8,
}

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON RESOURCES
// ═══════════════════════════════════════════════════════════════════════════════

export const mockResources: LessonResource[] = [
  {
    id: 'res-001',
    title: 'Slide bài giảng - Python cơ bản',
    file_url: 'https://example.com/slides/python-basics.pdf',
    file_type: 'pdf',
    file_size: 2500000,
  },
  {
    id: 'res-002',
    title: 'Mã nguồn mẫu',
    file_url: 'https://example.com/code/sample.zip',
    file_type: 'zip',
    file_size: 120000,
  },
  {
    id: 'res-003',
    title: 'Tài liệu tham khảo',
    file_url: 'https://python.org/doc',
    file_type: 'link',
    file_size: 0,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const mockQuizOptions: QuizOption[][] = [
  // Quiz 1
  [
    { id: 'opt-1-1', text: 'print("Hello World")', is_correct: true, feedback: 'Đúng! Hàm print() dùng để xuất dữ liệu ra màn hình.', position: 1 },
    { id: 'opt-1-2', text: 'echo("Hello World")', is_correct: false, feedback: 'echo là cú pháp của PHP, không phải Python.', position: 2 },
    { id: 'opt-1-3', text: 'console.log("Hello World")', is_correct: false, feedback: 'console.log là cú pháp của JavaScript.', position: 3 },
    { id: 'opt-1-4', text: 'printf("Hello World")', is_correct: false, feedback: 'printf là cú pháp của C/C++.', position: 4 },
  ],
  // Quiz 2
  [
    { id: 'opt-2-1', text: '4', is_correct: false, feedback: 'Không đúng. Hãy xem lại vòng lặp.', position: 1 },
    { id: 'opt-2-2', text: '5', is_correct: true, feedback: 'Đúng! Vòng lặp chạy với i = 0,1,2,3,4 tức 5 lần.', position: 2 },
    { id: 'opt-2-3', text: '6', is_correct: false, feedback: 'Không đúng. range(5) tạo các giá trị 0-4.', position: 3 },
    { id: 'opt-2-4', text: '3', is_correct: false, feedback: 'Sai rồi. Đếm lại số lần lặp.', position: 4 },
  ],
  // Quiz 3
  [
    { id: 'opt-3-1', text: '[1, 2, 3, 4, 5]', is_correct: false, feedback: 'Không đúng. append thêm vào cuối list.', position: 1 },
    { id: 'opt-3-2', text: '[1, 2, 3, 4, 5, 6]', is_correct: true, feedback: 'Đúng! List ban đầu [1,2,3,4,5], thêm 6 vào cuối.', position: 2 },
    { id: 'opt-3-3', text: '[6, 1, 2, 3, 4, 5]', is_correct: false, feedback: 'Không đúng. append thêm vào cuối, không phải đầu.', position: 3 },
    { id: 'opt-3-4', text: '[1, 2, 3, 4, 5, [6]]', is_correct: false, feedback: 'append thêm phần tử, không tạo nested list.', position: 4 },
  ],
  // Quiz 4
  [
    { id: 'opt-4-1', text: 'str', is_correct: false, feedback: 'Không đúng. Hãy kiểm tra kiểu của "42".', position: 1 },
    { id: 'opt-4-2', text: 'int', is_correct: false, feedback: '"42" là string, không phải int.', position: 2 },
    { id: 'opt-4-3', text: 'float', is_correct: false, feedback: '"42" không phải float.', position: 3 },
    { id: 'opt-4-4', text: 'Lỗi cú pháp', is_correct: true, feedback: 'Đúng! Phép cộng string + int sẽ gây TypeError.', position: 4 },
  ],
  // Quiz 5
  [
    { id: 'opt-5-1', text: 'def my_function():', is_correct: false, feedback: 'Thiếu thụt lề ở phần thân hàm.', position: 1 },
    { id: 'opt-5-2', text: 'def my_function():\n    pass', is_correct: true, feedback: 'Đúng! Đây là cú pháp định nghĩa hàm hợp lệ.', position: 2 },
    { id: 'opt-5-3', text: 'function my_function():', is_correct: false, feedback: 'Python dùng def, không phải function.', position: 3 },
    { id: 'opt-5-4', text: 'my_function() = def:', is_correct: false, feedback: 'Sai cú pháp hoàn toàn.', position: 4 },
  ],
]

export const mockQuizzes: Quiz[] = [
  {
    id: 'quiz-001',
    question: 'Lệnh nào dùng để in "Hello World" ra màn hình trong Python?',
    difficulty_level: 'easy',
    explanation: 'Trong Python, hàm print() được sử dụng để xuất dữ liệu ra màn hình console. Đây là hàm built-in của Python.',
    options: mockQuizOptions[0],
  },
  {
    id: 'quiz-002',
    question: 'Vòng lặp `for i in range(5):` sẽ chạy bao nhiêu lần?',
    difficulty_level: 'easy',
    explanation: 'Hàm range(5) tạo ra các số từ 0 đến 4, tức 5 giá trị. Vòng lặp chạy 5 lần với i = 0, 1, 2, 3, 4.',
    options: mockQuizOptions[1],
  },
  {
    id: 'quiz-003',
    question: 'Kết quả của đoạn code: `nums = [1,2,3,4,5]\nnums.append(6)\nprint(nums)` là gì?',
    difficulty_level: 'medium',
    explanation: 'Phương thức append() thêm một phần tử vào cuối list. List ban đầu [1,2,3,4,5] sau khi append(6) sẽ thành [1,2,3,4,5,6].',
    options: mockQuizOptions[2],
  },
  {
    id: 'quiz-004',
    question: 'Đoạn code sau có lỗi không? `result = "42" + 8`',
    difficulty_level: 'medium',
    explanation: 'Trong Python, không thể cộng trực tiếp string và integer. Điều này sẽ gây ra TypeError: unsupported operand type(s) for +: \'str\' and \'int\'.',
    options: mockQuizOptions[3],
  },
  {
    id: 'quiz-005',
    question: 'Cú pháp nào để định nghĩa một hàm trong Python?',
    difficulty_level: 'easy',
    explanation: 'Trong Python, từ khóa def được sử dụng để định nghĩa hàm. Cú pháp: def function_name(parameters): statements',
    options: mockQuizOptions[4],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CODE EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

export const mockCodeExercises = [
  {
    id: 'code-001',
    title: 'Bài 1: Viết hàm tính tổng',
    description: 'Viết một hàm `sum_numbers(a, b)` nhận vào hai số và trả về tổng của chúng.',
    language: { id: 'lang-py', name: 'python' },
    files: [
      {
        id: 'file-001',
        filename: 'solution.py',
        content: '# Viết hàm tính tổng ở đây\ndef sum_numbers(a, b):\n    pass\n',
        is_main: true,
      },
    ],
    testcases: [
      { id: 'tc-001', input: 'sum_numbers(1, 2)', expected: '3', description: 'Tổng 1 + 2 = 3' },
      { id: 'tc-002', input: 'sum_numbers(0, 0)', expected: '0', description: 'Tổng 0 + 0 = 0' },
      { id: 'tc-003', input: 'sum_numbers(-1, 1)', expected: '0', description: 'Tổng -1 + 1 = 0' },
    ],
    is_pass: false,
  },
  {
    id: 'code-002',
    title: 'Bài 2: Kiểm tra số chẵn/lẻ',
    description: 'Viết hàm `is_even(n)` trả về True nếu n là số chẵn, False nếu là số lẻ.',
    language: { id: 'lang-py', name: 'python' },
    files: [
      {
        id: 'file-002',
        filename: 'solution.py',
        content: '# Viết hàm kiểm tra số chẵn ở đây\ndef is_even(n):\n    pass\n',
        is_main: true,
      },
    ],
    testcases: [
      { id: 'tc-004', input: 'is_even(4)', expected: 'True', description: '4 là số chẵn' },
      { id: 'tc-005', input: 'is_even(7)', expected: 'False', description: '7 là số lẻ' },
      { id: 'tc-006', input: 'is_even(0)', expected: 'True', description: '0 là số chẵn' },
    ],
    is_pass: false,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// LESSONS
// ═══════════════════════════════════════════════════════════════════════════════

const YOUTUBE_IDS = [
  'kqtD5dpn9C8', // Python tutorial
  'rfscVS0vtbw', // Python full course
  'uqnoID1mZQ0', // Python for beginners
  'xg9PGlGaL6A', // Python basics
  '_H3R5i5CQq8', // Python programming
]

const createVideoLesson = (
  id: string,
  title: string,
  duration: number,
  sectionIndex: number,
  position: number,
  isCompleted = false,
  isLocked = false,
  hasQuizzes = false,
): Lesson => ({
  id,
  title,
  lesson_type: 'video',
  description: `Bài học số ${position} trong phần ${sectionIndex + 1}. Nội dung bao gồm lý thuyết và thực hành với các ví dụ cụ thể.`,
  position,
  is_preview: position === 1,
  is_locked: isLocked,
  is_completed: isCompleted,
  duration,
  file_id: YOUTUBE_IDS[(sectionIndex * 4 + position - 1) % YOUTUBE_IDS.length],
  resources: position % 3 === 0 ? mockResources : [],
  quizzes: hasQuizzes ? mockQuizzes.slice(0, 2) : [],
})

const createQuizLesson = (
  id: string,
  title: string,
  sectionIndex: number,
  position: number,
  isCompleted = false,
): Lesson => ({
  id,
  title,
  lesson_type: 'quiz',
  description: `Bài kiểm tra cuối phần ${sectionIndex + 1}. Gồm 5 câu hỏi trắc nghiệm với các mức độ khó khác nhau.`,
  position,
  is_preview: false,
  is_locked: false,
  is_completed: isCompleted,
  duration: null,
  file_id: null,
  resources: [],
  quizzes: mockQuizzes,
})

const createCodeLesson = (
  id: string,
  title: string,
  duration: number,
  sectionIndex: number,
  position: number,
  isCompleted = false,
): Lesson => ({
  id,
  title,
  lesson_type: 'code',
  description: `Bài tập lập trình thực hành. Áp dụng kiến thức đã học để giải quyết các bài toán cụ thể.`,
  position,
  is_preview: false,
  is_locked: false,
  is_completed: isCompleted,
  duration,
  file_id: null,
  resources: [],
  quizzes: [],
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const mockSections: CourseSection[] = [
  {
    id: 'sec-001',
    title: 'Phần 1: Giới thiệu Python và Cài đặt môi trường',
    position: 1,
    total_lessons: 4,
    completed_lessons: 3,
    total_duration: 1800,
    lessons: [
      createVideoLesson('les-001', 'Bài 1: Python là gì? Tại sao nên học Python?', 480, 0, 1, true, false, true),
      createVideoLesson('les-002', 'Bài 2: Cài đặt Python và IDE (VS Code, PyCharm)', 600, 0, 2, true),
      createVideoLesson('les-003', 'Bài 3: Chạy chương trình Python đầu tiên', 420, 0, 3, true),
      createCodeLesson('les-004', 'Bài 4: Thực hành - Viết chương trình Hello World', 300, 0, 4, false),
    ],
  },
  {
    id: 'sec-002',
    title: 'Phần 2: Biến, Kiểu dữ liệu và Toán tử',
    position: 2,
    total_lessons: 5,
    completed_lessons: 1,
    total_duration: 2400,
    lessons: [
      createVideoLesson('les-005', 'Bài 5: Biến và cách khai báo biến', 540, 1, 1, true),
      createVideoLesson('les-006', 'Bài 6: Các kiểu dữ liệu cơ bản (int, float, str, bool)', 720, 1, 2, false),
      createVideoLesson('les-007', 'Bài 7: Toán tử số học và toán tử so sánh', 480, 1, 3, false),
      createVideoLesson('les-008', 'Bài 8: Ép kiểu dữ liệu (Type Conversion)', 360, 1, 4, false),
      createCodeLesson('les-009', 'Bài 9: Thực hành - Tính toán cơ bản', 300, 1, 5, false),
    ],
  },
  {
    id: 'sec-003',
    title: 'Phần 3: Cấu trúc điều khiển',
    position: 3,
    total_lessons: 4,
    completed_lessons: 0,
    total_duration: 2100,
    lessons: [
      createVideoLesson('les-010', 'Bài 10: Câu lệnh if - else', 600, 2, 1, false, false, true),
      createVideoLesson('les-011', 'Bài 11: Vòng lặp for', 540, 2, 2, false, false),
      createVideoLesson('les-012', 'Bài 12: Vòng lặp while', 480, 2, 3, false, false),
      createQuizLesson('les-013', 'Bài 13: Kiểm tra - Cấu trúc điều khiển', 2, 3, false),
    ],
  },
  {
    id: 'sec-004',
    title: 'Phần 4: Hàm và Module',
    position: 4,
    total_lessons: 4,
    completed_lessons: 0,
    total_duration: 1950,
    lessons: [
      createVideoLesson('les-014', 'Bài 14: Định nghĩa và gọi hàm', 600, 3, 1, false, true),
      createVideoLesson('les-015', 'Bài 15: Tham số và đối số của hàm', 540, 3, 2, false, true),
      createVideoLesson('les-016', 'Bài 16: Giá trị trả về của hàm (return)', 420, 3, 3, false, true),
      createCodeLesson('les-017', 'Bài 17: Thực hành - Viết các hàm xử lý', 390, 3, 4, false, true),
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// CURRICULUM
// ═══════════════════════════════════════════════════════════════════════════════

export const mockCurriculum: CourseCurriculum = {
  course_id: 'course-001',
  title: 'Python Cơ Bản cho Người Mới Bắt Đầu',
  is_lock_lesson: true,
  total_lessons: 17,
  completed_lessons: 4,
  total_duration: 8250,
  progress_percent: Math.round((4 / 17) * 100),
  sections: mockSections,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE LESSON
// ═══════════════════════════════════════════════════════════════════════════════

export const mockActiveLesson: ActiveLesson = {
  lesson_id: 'les-006',
  course_id: 'course-001',
  activated_at: new Date().toISOString(),
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

export const mockNavigation: PrevNextLesson = {
  current_lesson_id: 'les-006',
  prev_lesson_id: 'les-005',
  next_lesson_id: 'les-007',
  can_prev: true,
  can_next: true,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENTS (Q&A)
// ═══════════════════════════════════════════════════════════════════════════════

export const mockComments: Comment[] = [
  {
    id: 'cmt-001',
    lesson_id: 'les-006',
    root_id: null,
    parent_id: null,
    user_id: 'user-001',
    user_name: 'Trần Thị Lan',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lan',
    content: 'Em không hiểu sao khi dùng hàm type() nó lại trả về <class \'int\'> thay vì chỉ là int?',
    depth: 0,
    is_owner: false,
    is_author: false,
    reply_count_all: 2,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    reactions: { total: 12, has_reacted: false },
  },
  {
    id: 'cmt-002',
    lesson_id: 'les-006',
    root_id: 'cmt-001',
    parent_id: 'cmt-001',
    user_id: 'user-002',
    user_name: 'Lê Hoàng Nam',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nam',
    content: 'Đó là cách Python biểu diễn kiểu dữ liệu. <class \'int\'> có nghĩa là "class integer". Trong Python, mọi thứ đều là object, kể cả số nguyên.',
    depth: 1,
    is_owner: false,
    is_author: false,
    reply_count_all: 0,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    reactions: { total: 8, has_reacted: true },
  },
  {
    id: 'cmt-003',
    lesson_id: 'les-006',
    root_id: 'cmt-001',
    parent_id: 'cmt-002',
    user_id: 'user-001',
    user_name: 'Trần Thị Lan',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lan',
    content: 'Cảm ơn anh! Em hiểu rồi. Vậy mình có thể dùng isinstance() để kiểm tra kiểu thay vì so sánh trực tiếp không?',
    depth: 2,
    is_owner: false,
    is_author: false,
    reply_count_all: 0,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    reactions: { total: 3, has_reacted: false },
  },
  {
    id: 'cmt-004',
    lesson_id: 'les-006',
    root_id: null,
    parent_id: null,
    user_id: 'user-003',
    user_name: 'Phạm Minh Đức',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=duc',
    content: 'Mình muốn hỏi về sự khác nhau giữa int và float. Khi nào nên dùng float thay vì int?',
    depth: 0,
    is_owner: false,
    is_author: true,
    reply_count_all: 1,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    reactions: { total: 5, has_reacted: false },
  },
  {
    id: 'cmt-005',
    lesson_id: 'les-006',
    root_id: 'cmt-004',
    parent_id: 'cmt-004',
    user_id: 'inst-001',
    user_name: 'Nguyễn Văn Minh',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=minh',
    content: 'Float dùng cho số thập phân (có phần sau dấu chấm), còn int cho số nguyên. Ví dụ: 5 là int, 5.0 là float. Trong toán học, 5 và 5.0 bằng nhau, nhưng trong Python chúng là 2 kiểu khác nhau.',
    depth: 1,
    is_owner: false,
    is_author: false,
    reply_count_all: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    reactions: { total: 15, has_reacted: false },
  },
  {
    id: 'cmt-006',
    lesson_id: 'les-006',
    root_id: null,
    parent_id: null,
    user_id: 'user-004',
    user_name: 'Hoàng Thị Mai',
    user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mai',
    content: 'Bài giảng rất dễ hiểu! Cho mình hỏi cách định dạng số thập phân trong Python với ạ?',
    depth: 0,
    is_owner: false,
    is_author: false,
    reply_count_all: 0,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    reactions: { total: 7, has_reacted: false },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════════

export const mockNotes: LessonNote[] = [
  {
    id: 'note-001',
    lesson_id: 'les-006',
    time_seconds: 120,
    content: 'Python có 4 kiểu số: int (số nguyên), float (số thập phân), complex (số phức), bool (True/False)',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'note-002',
    lesson_id: 'les-006',
    time_seconds: 340,
    content: 'Hàm type() trả về kiểu dữ liệu của một biến. Ví dụ: type(42) → <class \'int\'>',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'note-003',
    lesson_id: 'les-006',
    time_seconds: 560,
    content: 'Ép kiểu: int("42") → 42, str(42) → "42", float(42) → 42.0',
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// TUTOR CHAT MESSAGES (AI Tutor)
// ═══════════════════════════════════════════════════════════════════════════════

export const mockChatMessages = [
  {
    id: 'msg-001',
    role: 'user' as const,
    content: 'Cho mình hỏi, tại sao 5 / 2 trong Python lại ra 2.5 thay vì 2?',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'msg-002',
    role: 'assistant' as const,
    content: `Trong Python 3, toán tử **/** luôn trả về kết quả dạng **float** (số thập phân), bất kể kết quả có phần thập phân hay không.

**Ví dụ:**
- \`5 / 2\` → \`2.5\` (float)
- \`10 / 2\` → \`5.0\` (float)

Nếu bạn muốn chia lấy phần nguyên, dùng **//**:
- \`5 // 2\` → \`2\` (int)

Nếu muốn lấy phần dư, dùng **%**:
- \`5 % 2\` → \`1\`

Đây là thiết kế có chủ đích của Python 3 để tránh confusion với Python 2 (nơi \`/\` là integer division).`,
    created_at: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'msg-003',
    role: 'user' as const,
    content: 'À mình hiểu rồi! Cảm ơn bạn. Vậy muốn kiểm tra kiểu dữ liệu thì làm sao?',
    created_at: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'msg-004',
    role: 'assistant' as const,
    content: `Bạn có thể dùng:

**1. type()** - Trả về kiểu:
\`\`\`python
x = 42
print(type(x))  # <class 'int'>
\`\`\`

**2. isinstance()** - Kiểm tra kiểu (nên dùng cách này):
\`\`\`python
x = 42
print(isinstance(x, int))     # True
print(isinstance(x, float))    # False
print(isinstance(x, (int, float)))  # True (int hoặc float)
\`\`\`

**Best practice:** Nên dùng \`isinstance()\` vì nó hỗ trợ kiểm tra nhiều kiểu cùng lúc và hoạt động tốt với inheritance.`,
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const mockCourseInfo = {
  id: 'course-001',
  title: 'Python Cơ Bản cho Người Mới Bắt Đầu',
  thumbnail: 'https://picsum.photos/seed/python-course/800/450',
  instructor: mockInstructor,
  total_students: 12847,
  total_rating: 4.8,
  total_reviews: 3241,
  last_updated: '2026-04-15',
  language: 'Python',
  level: 'Người mới bắt đầu',
  subtitle: 'Học lập trình Python từ con số 0, xây dựng nền tảng vững chắc cho sự nghiệp lập trình',
  what_you_will_learn: [
    'Nắm vững kiến thức cơ bản về lập trình Python',
    'Hiểu và sử dụng được các cấu trúc dữ liệu trong Python',
    'Viết được các chương trình tự động hóa công việc',
    'Xây dựng được ứng dụng đơn giản bằng Python',
  ],
  requirements: [
    'Máy tính kết nối internet',
    'Không cần kiến thức lập trình trước',
    'Ý chí quyết tâm học hỏi',
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STATE MOCK (cho YouTube player)
// ═══════════════════════════════════════════════════════════════════════════════

export const mockVideoState = {
  lessonId: 'les-006',
  youtubeId: 'kqtD5dpn9C8', // Example Python tutorial video
  currentTime: 0,
  duration: 720,
  isPlaying: false,
  watchTime: 0,
  requiredWatchTime: 540, // 75% of 720
  isCompleted: false,
  embeddedQuizzes: mockQuizzes.slice(0, 2).map(q => ({
    ...q,
    triggeredAt: Math.floor(q.id === 'quiz-001' ? 120 : 400),
    isAnswered: false,
    isCorrect: false,
  })),
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RESULTS MOCK
// ═══════════════════════════════════════════════════════════════════════════════

export const mockTestResult = {
  status: 'partial' as const,
  passed: 2,
  failed: 1,
  total: 3,
  saved: true,
  details: [
    {
      id: 'tc-001',
      index: 0,
      result: 'passed' as const,
      input: 'sum_numbers(1, 2)',
      expected: '3',
      output: '3',
      cpu_time: 0.001,
    },
    {
      id: 'tc-002',
      index: 1,
      result: 'passed' as const,
      input: 'sum_numbers(0, 0)',
      expected: '0',
      output: '0',
      cpu_time: 0.001,
    },
    {
      id: 'tc-003',
      index: 2,
      result: 'failed' as const,
      input: 'sum_numbers(-1, 1)',
      expected: '0',
      output: 'None',
      stderr: '',
      cpu_time: 0.002,
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tìm lesson theo ID từ curriculum
 */
export function findLessonById(lessonId: string): Lesson | null {
  for (const section of mockSections) {
    const lesson = section.lessons.find(l => l.id === lessonId)
    if (lesson) return lesson
  }
  return null
}

/**
 * Tìm section chứa lesson
 */
export function findSectionByLessonId(lessonId: string): CourseSection | null {
  for (const section of mockSections) {
    if (section.lessons.some(l => l.id === lessonId)) {
      return section
    }
  }
  return null
}

/**
 * Tạo navigation data cho một lesson
 */
export function createNavigationForLesson(lessonId: string): PrevNextLesson {
  const allLessons = mockSections.flatMap(s => s.lessons)
  const currentIndex = allLessons.findIndex(l => l.id === lessonId)

  return {
    current_lesson_id: lessonId,
    prev_lesson_id: currentIndex > 0 ? allLessons[currentIndex - 1].id : null,
    next_lesson_id: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].id : null,
    can_prev: currentIndex > 0,
    can_next: currentIndex < allLessons.length - 1,
  }
}

/**
 * Format thời lượng
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) return `${h} giờ ${m} phút`
  if (m > 0) return `${m} phút ${s} giây`
  return `${s} giây`
}

/**
 * Format thời gian tương đối
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}
