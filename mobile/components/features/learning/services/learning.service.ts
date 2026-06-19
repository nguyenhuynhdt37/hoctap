// Learning Service
// API calls cho learning feature
// Tuân thủ AGILE SKILL RULES

import { api } from '@/src/services/api'
import type {
  CourseCurriculum,
  Lesson,
  LessonNote,
  Comment,
  CommentsResponse,
  CreateNotePayload,
  UpdateNotePayload,
  CreateCommentPayload,
} from '../types'
import type { CodeLessonTestResult } from '../types/code-lesson'

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = '/learning'

const learningEndpoints = {
  // Curriculum
  curriculum: (courseId: string) => `/learning/${courseId}/curriculum`,
  courseBySlug: (slug: string) => `/learning/${slug}`,

  // Lesson
  activeLesson: (courseId: string) => `/learning/${courseId}/view/active`,
  setActiveLesson: (courseId: string, lessonId: string) => `${API_BASE}/${courseId}/active/${lessonId}`,

  // Navigation
  prevNext: (lessonId: string) => `${API_BASE}/${lessonId}/check_prev_next`,
  nextLesson: (lessonId: string) => `${API_BASE}/${lessonId}/next`,
  prevLesson: (lessonId: string) => `${API_BASE}/${lessonId}/prev`,

  // Progress
  markCompleted: (lessonId: string) => `${API_BASE}/${lessonId}/complete`,

  // Code lessons
  saveCodeFile: (lessonCodeId: string) => `${API_BASE}/code/${lessonCodeId}/save`,
  testCodeExercise: (lessonCodeId: string) => `${API_BASE}/code/${lessonCodeId}/test`,

  // Notes
  notes: (lessonId: string) => `${API_BASE}/${lessonId}/lesson_notes`,
  createNote: (lessonId: string) => `${API_BASE}/lesson_note/${lessonId}/create`,
  updateNote: (noteId: string) => `${API_BASE}/lesson_notes/${noteId}`,
  deleteNote: (noteId: string) => `${API_BASE}/lesson_notes/${noteId}`,

  // Comments / Q&A
  comments: (lessonId: string) => `${API_BASE}/${lessonId}/comments`,
  createComment: (lessonId: string) => `${API_BASE}/${lessonId}/lesson_comments`,
  updateComment: (commentId: string) => `${API_BASE}/comments/${commentId}`, // Check if this matches backend
  deleteComment: (commentId: string) => `${API_BASE}/comments/${commentId}`,
  commentReactions: (commentId: string) => `${API_BASE}/comments/${commentId}/reacts`,
  toggleReaction: (commentId: string) => `${API_BASE}/comments/${commentId}/reacts`,
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const learningService = {
  // ─────────────────────────────────────────────────────────────────────────────
  // CURRICULUM
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lấy thông tin khóa học bằng slug (chỉ dành cho khóa đã đăng ký)
   */
  getCourseBySlug: async (slug: string): Promise<any> => {
    const response = await api.get<any>(learningEndpoints.courseBySlug(slug))
    return response.data
  },

  /**
   * Lấy curriculum của khóa học (sections + lessons + progress)
   */
  getCurriculum: async (courseId: string): Promise<CourseCurriculum> => {
    const response = await api.get<CourseCurriculum>(learningEndpoints.curriculum(courseId))
    return response.data
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LESSON
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lấy thông tin bài học đang active (full details)
   */
  getActiveLesson: async (courseId: string): Promise<Lesson | null> => {
    const response = await api.get<Lesson>(learningEndpoints.activeLesson(courseId))
    return response.data
  },

  /**
   * Set bài học đang active
   */
  setActiveLesson: async (courseId: string, lessonId: string): Promise<void> => {
    await api.post(learningEndpoints.setActiveLesson(courseId, lessonId))
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lấy bài trước/sau
   */
  getPrevNextLesson: async (lessonId: string): Promise<{
    current_lesson_id: string
    prev_lesson_id: string | null
    next_lesson_id: string | null
    can_prev: boolean
    can_next: boolean
  }> => {
    const response = await api.get(learningEndpoints.prevNext(lessonId))
    return response.data
  },

  /**
   * Lấy bài học kế tiếp
   */
  getNextLesson: async (lessonId: string): Promise<{ next_lesson_id: string; can_next: boolean }> => {
    const response = await api.get(learningEndpoints.nextLesson(lessonId))
    return response.data
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PROGRESS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Đánh dấu bài học hoàn thành
   */
  markLessonCompleted: async (lessonId: string): Promise<{
    status: string
    completion_percent: number
    next_lesson_suggestion?: { id: string; title: string }
  }> => {
    const response = await api.post(learningEndpoints.markCompleted(lessonId))
    return response.data
  },

  /**
   * Lưu file code của user cho một exercise.
   */
  saveCodeFile: async (
    lessonCodeId: string,
    payload: { filename: string; content: string; is_main: boolean }
  ): Promise<void> => {
    await api.post(learningEndpoints.saveCodeFile(lessonCodeId), payload)
  },

  /**
   * Chạy test cases cho một exercise code.
   */
  testCodeExercise: async (
    lessonCodeId: string,
    payload: {
      language_id: string
      files: { filename: string; content: string; is_main: boolean }[]
    }
  ): Promise<CodeLessonTestResult> => {
    const response = await api.post<CodeLessonTestResult>(
      learningEndpoints.testCodeExercise(lessonCodeId),
      payload
    )
    return response.data
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lấy tất cả ghi chú của bài học
   */
  getNotes: async (lessonId: string): Promise<LessonNote[]> => {
    const response = await api.get<LessonNote[]>(learningEndpoints.notes(lessonId))
    return response.data
  },

  /**
   * Tạo ghi chú mới
   */
  createNote: async (lessonId: string, payload: CreateNotePayload): Promise<LessonNote> => {
    const response = await api.post<LessonNote>(learningEndpoints.createNote(lessonId), payload)
    return response.data
  },

  /**
   * Cập nhật ghi chú
   */
  updateNote: async (noteId: string, payload: UpdateNotePayload): Promise<LessonNote> => {
    const response = await api.put<LessonNote>(learningEndpoints.updateNote(noteId), payload)
    return response.data
  },

  /**
   * Xóa ghi chú
   */
  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(learningEndpoints.deleteNote(noteId))
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMENTS / Q&A
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Lấy bình luận theo cấp (depth)
   */
  getComments: async (
    lessonId: string,
    options: {
      depth?: 0 | 1 | 2
      root_id?: string
      limit?: number
      cursor?: string
    } = {}
  ): Promise<CommentsResponse> => {
    const { depth = 0, root_id, limit = 10, cursor } = options

    const params = new URLSearchParams()
    params.append('depth_target', String(depth))
    if (root_id) params.append('root_id', root_id)
    params.append('limit', String(limit))
    if (cursor) params.append('cursor', cursor)

    const response = await api.get<CommentsResponse>(
      `${learningEndpoints.comments(lessonId)}?${params.toString()}`
    )
    return response.data
  },

  /**
   * Tạo bình luận mới
   */
  createComment: async (lessonId: string, payload: CreateCommentPayload): Promise<{
    type: string
    comment: Comment
  }> => {
    const response = await api.post(learningEndpoints.createComment(lessonId), payload)
    return response.data
  },

  /**
   * Cập nhật bình luận
   */
  updateComment: async (
    commentId: string,
    payload: { content: string }
  ): Promise<{ type: string; comment: Comment }> => {
    const response = await api.put(learningEndpoints.updateComment(commentId), payload)
    return response.data
  },

  /**
   * Xóa bình luận
   */
  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(learningEndpoints.deleteComment(commentId))
  },

  /**
   * Toggle reaction (like/unlike)
   */
  toggleReaction: async (commentId: string): Promise<{
    type: string
    comment_id: string
    reactions: { total: number; has_reacted: boolean }
  }> => {
    const response = await api.post(learningEndpoints.toggleReaction(commentId))
    return response.data
  },
}
