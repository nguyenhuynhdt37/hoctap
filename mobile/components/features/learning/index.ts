// Learning Feature - Public API
// Tuân thủ AGILE SKILL RULES cho mobile development

export { LearningFeature } from './LearningFeature'
export type { LearningFeatureProps } from './LearningFeature'

// Hooks
export { useLearning, useNotes, useComments } from './hooks/useLearning'

// Services
export { learningService } from './services/learning.service'

// Types
export type {
  LessonType,
  Lesson,
  LessonResource,
  Quiz,
  QuizOption,
  CourseSection,
  CourseCurriculum,
  ActiveLesson,
  PrevNextLesson,
  LessonNote,
  Comment,
  CommentsResponse,
  CommentDepth,
  LearningTab,
  VideoPlayerState,
  SidebarState,
  CodeTestResult,
  CreateNotePayload,
  UpdateNotePayload,
  CreateCommentPayload,
} from './types'
