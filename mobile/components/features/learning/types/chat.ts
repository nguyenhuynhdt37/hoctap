/**
 * Chat & AI Tutor Types
 */

import type { Comment } from '../types'

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

export type ChatRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  created_at: string
  status: MessageStatus
  error?: string
  sources?: ChatSource[]
  actions?: ChatAction[]
}

export interface ChatSource {
  title: string
  url: string
  snippet?: string
}

export interface ChatAction {
  id: string
  label: string
  payload?: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT THREAD
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatThread {
  id: string
  lesson_id: string
  title: string
  preview: string
  created_at: string
  updated_at: string
  message_count: number
  is_pinned: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatState {
  isOpen: boolean
  isLoading: boolean
  messages: ChatMessage[]
  threads: ChatThread[]
  activeThreadId: string | null
  inputText: string
  isStreaming: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatContext {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  sectionId?: string
  currentVideoTime?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS / CHIPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatChip {
  id: string
  label: string
  icon?: string
  action: 'suggest' | 'explain' | 'example' | 'hint'
}

export const DEFAULT_CHIPS: ChatChip[] = [
  { id: 'chip-1', label: 'Giải thích', icon: 'bulb', action: 'explain' },
  { id: 'chip-2', label: 'Ví dụ', icon: 'code', action: 'example' },
  { id: 'chip-3', label: 'Gợi ý', icon: 'lightbulb', action: 'hint' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// QA COMMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QAComment extends Comment {
  replies?: QAComment[]
  isExpanded?: boolean
  isLoadingReplies?: boolean
}

export interface CreateCommentForm {
  content: string
  parentId?: string | null
  rootId?: string | null
}

export interface QAState {
  comments: QAComment[]
  isLoading: boolean
  isSubmitting: boolean
  replyingTo: string | null
  editingCommentId: string | null
  expandedComments: Set<string>
}
