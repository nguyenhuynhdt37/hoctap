/**
 * Learning Feature Core Types
 * Core types được sử dụng trong toàn bộ Learning Feature
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type LessonType = 'video' | 'quiz' | 'code' | 'text'

export interface Lesson {
  id: string
  title: string
  lesson_type: LessonType
  description: string | null
  position: number
  is_preview: boolean
  is_locked: boolean
  is_completed: boolean
  duration: number | null
  file_id: string | null
  resources: LessonResource[]
  quizzes: Quiz[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CourseSection {
  id: string
  title: string
  position: number
  total_lessons: number
  completed_lessons: number
  total_duration: number
  lessons: Lesson[]
}

export interface CourseCurriculum {
  course_id: string
  title: string
  is_lock_lesson: boolean
  total_lessons: number
  completed_lessons: number
  total_duration: number
  progress_percent: number
  sections: CourseSection[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QuizOption {
  id: string
  text: string
  is_correct: boolean
  feedback: string
  position: number
}

export interface Quiz {
  id: string
  question: string
  difficulty_level: number
  explanation: string
  options: QuizOption[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCES TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LessonResource {
  id: string
  title: string
  url: string | null
  resource_type: 'pdf' | 'zip' | 'link' | 'other' | string
  mime_type?: string
  file_size: number
  created_at?: string
  updated_at?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMENT TYPES (QA)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Comment {
  id: string
  lesson_id: string
  root_id: string | null
  parent_id: string | null
  user_id: string
  user_name: string
  user_avatar: string | null
  content: string
  depth: number
  is_owner: boolean
  is_author: boolean
  reply_count_all: number
  created_at: string
  reactions: {
    total: number
    has_reacted: boolean
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LessonNote {
  id: string
  lesson_id: string
  time_seconds: number
  content: string
  created_at: string
  updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ActiveLesson {
  lesson_id: string
  course_id: string
  activated_at: string
}

export interface PrevNextLesson {
  current_lesson_id: string
  prev_lesson_id: string | null
  next_lesson_id: string | null
  can_prev: boolean
  can_next: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT TAB TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ContentTab = 'content' | 'qa' | 'resources' | 'notes' | 'course_overview'

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE PROPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LearningFeatureProps {
  courseId: string
  courseTitle: string
  initialCourseInfo?: any
}
