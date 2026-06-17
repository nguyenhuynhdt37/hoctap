export interface LessonResource {
  id: string;
  url: string;
  resource_type: "pdf" | "link" | "image" | "zip" | "video";
  // Các field dưới đây có thể không có tùy API
  file_size?: number | null;
  created_at?: string;
  lesson_id?: string;
  title?: string;
  mime_type?: string | null;
  updated_at?: string;
}

export interface Lesson {
  id: string;
  title: string;
  position: number;
  is_completed: boolean;
  is_active: boolean;
  duration: number; // in seconds
  resources?: LessonResource[];
  lesson_type?: "video" | "quiz" | "code" | "info" | string;
  is_preview?: boolean;
  is_locked: boolean;
}

export interface Section {
  id: string;
  title: string;
  position: number;
  // Các field tổng hợp có thể không có tùy API
  total_lessons?: number;
  completed_lessons?: number;
  total_duration?: number; // in seconds
  progress_percent?: number;
  lessons: Lesson[];
}

export interface CurriculumResponse {
  course_id: string;
  title: string;
  is_lock_lesson?: boolean;
  active_lesson_id: string;
  // Các field tổng hợp có thể không có tùy API
  total_duration?: number; // in seconds
  total_lessons?: number;
  completed_lessons?: number;
  progress_percent?: number;
  sections: Section[];
}

export interface CurriculumError {
  message: string;
  status?: number;
}
