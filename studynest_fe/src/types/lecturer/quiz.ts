export interface QuizOption {
  id?: string;
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface LessonQuiz {
  id: string;
  question: string;
  explanation: string;
  difficulty_level: number;
  options: QuizOption[];
}

export interface CreateQuizOption {
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface CreateQuizData {
  question: string;
  explanation: string;
  difficulty_level: number;
  options: CreateQuizOption[];
}

export interface CreateBulkQuizzesRequest {
  lesson_id: string;
  created_by: string;
  course_id: string;
  quizzes: CreateQuizData[];
}

export interface CreateBulkQuizzesResponse {
  message: string;
  total: number;
  lesson_id: string;
}
