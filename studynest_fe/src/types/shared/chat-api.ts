// Chat API Response Types
// Backend trả về dữ liệu trực tiếp (không wrap trong object)

// ============================================
// Quiz Types (cho lesson quiz generation)
// ============================================

export interface QuizOption {
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface Quiz {
  question: string;
  explanation: string;
  difficulty_level: 1 | 2 | 3;
  options: QuizOption[];
}

// ============================================
// Coding Task Types
// ============================================

export interface CodeFile {
  filename: string;
  content: string;
  is_main: boolean;
  role: "starter" | "solution";
}

export interface Testcase {
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

export interface CodingTask {
  language_id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  starter_files: CodeFile[];
  solution_files: CodeFile[];
  testcases: Testcase[];
}

// ============================================
// Request Schemas
// ============================================

export interface CreateShortCourseDescriptionSchema {
  course_name: string;
}

export interface CreateCourseDescriptionSchema {
  course_name: string;
  category_name: string;
  short_description: string;
  topic_name?: string | null;
}

export interface CreateTopicDescriptionSchema {
  name: string;
  category_name: string;
}

export interface RewriteTitleSchema {
  title: string;
}

export interface CreateLessonDescriptionSchema {
  title: string;
  section_name: string;
}
