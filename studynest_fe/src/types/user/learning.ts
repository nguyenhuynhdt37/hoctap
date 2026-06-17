export interface LearningCourseData {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  level: string;
  language: string;
  thumbnail_url: string;
  promo_video_url: string | null;
  is_published: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  outcomes: string[];
  requirements: string[];
  target_audience: string[];
  views: number;
}

export interface LearningError {
  status: number;
  message: string;
}

export interface LearningDetailProps {
  courseData: LearningCourseData | null;
  error?: LearningError;
  accessToken?: string;
}

// ========== Code Lesson Interfaces ==========
export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  role: "starter" | "solution" | "user";
  is_main: boolean;
}

export interface CodeTestCase {
  id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
  hidden: boolean;
}

export interface CodeExercise {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit: number;
  memory_limit: number;
  language: {
    id: string;
    name: string;
    version: string;
    runtime: string;
  };
  files: CodeFile[];
  testcases: CodeTestCase[];
  is_pass?: boolean;
}

export interface TestResultDetail {
  id: string;
  index: number;
  input?: string;
  expected?: string;
  output?: string;
  stderr?: string;
  exit_code: number;
  cpu_time: number;
  memory: number;
  language: string;
  version: string;
  result: "passed" | "failed";
  is_hidden: boolean;
}

export interface TestResult {
  status: "passed" | "failed";
  passed: number;
  failed: number;
  total: number;
  saved: boolean;
  language: string;
  version: string;
  details: TestResultDetail[];
}

// ========== Quiz Interfaces ==========
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  difficulty_level?: number;
}

// ========== Lesson Overview Interface ==========
export interface LessonOverview {
  id: string;
  section_id?: string;
  title: string;
  description?: string | null;
  lesson_type?: string;
  duration?: number;
  resources?: Array<{
    id: string;
    title?: string;
    url: string;
    resource_type: string;
    file_size?: number | null;
  }>;
  quizzes_count?: number;
  quizzes?: QuizQuestion[];
}

// ========== Lesson Note Interface ==========
export interface LessonNote {
  id: string;
  lesson_id: string;
  time_seconds: number;
  content: string;
  created_at: string;
}
