export interface ActiveLessonResource {
  id: string;
  resource_type: string;
  file_size: number | null;
  created_at: string;
  url: string;
  lesson_id: string;
  title: string;
  mime_type: string | null;
  updated_at: string;
}

export interface ActiveLessonQuizOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface ActiveLessonQuiz {
  id: string;
  question: string;
  difficulty_level: number;
  explanation: string;
  options: ActiveLessonQuizOption[];
}

export interface ActiveLessonCodeFile {
  id: string;
  filename: string;
  content: string;
  role: "starter" | "solution";
  is_main: boolean;
}

export interface ActiveLessonCode {
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
  files: ActiveLessonCodeFile[];
  testcases: Array<{
    id: string;
    input: string;
    expected_output: string;
    is_sample: boolean;
    order_index: number;
    hidden: boolean;
  }>;
}

export interface ActiveLessonResponse {
  id: string;
  title: string;
  description?: string | null;
  lesson_type: "video" | "quiz" | "code" | "info" | string;
  duration: number;
  file_id: string | null;
  resources: ActiveLessonResource[];
  quizzes: ActiveLessonQuiz[];
  codes?: ActiveLessonCode[];
  is_completed: boolean;
  is_locked: boolean;
}
