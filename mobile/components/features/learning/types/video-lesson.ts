/**
 * Video Lesson Types
 * Mở rộng từ types.ts
 */

import type { Quiz, LessonResource } from '../types'

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO STATE
// ═══════════════════════════════════════════════════════════════════════════════

export type VideoPlayerState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error'

export type WatchStatus = 'not_started' | 'watching' | 'completed' | 'fast_forwarded'

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO LESSON DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface VideoLessonData {
  id: string
  title: string
  description: string | null
  youtube_id: string
  duration: number
  file_id: string | null
  resources: LessonResource[]
}

export interface VideoProgress {
  currentTime: number
  duration: number
  watchTime: number
  requiredWatchTime: number
  buffered: number
  percent: number
  watchPercent: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDED QUIZ (trong video)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmbeddedQuiz extends Quiz {
  triggeredAt: number
  isAnswered: boolean
  selectedAnswer: number | null
  isCorrect: boolean | null
}

export interface EmbeddedQuizState {
  quizzes: EmbeddedQuiz[]
  currentQuizIndex: number
  isShowing: boolean
  hasTriggeredAtCurrentTime: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

export interface VideoControlsState {
  showControls: boolean
  isFullscreen: boolean
  isMuted: boolean
  volume: number
  playbackRate: number
  showQualityMenu: boolean
  showPlaybackMenu: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface WatchTrackingData {
  lessonId: string
  startTime: number
  lastUpdateTime: number
  totalWatchTime: number
  segments: WatchSegment[]
  isCompleted: boolean
  completedAt: string | null
}

export interface WatchSegment {
  start: number
  end: number
  duration: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CelebrationConfig {
  showConfetti: boolean
  showBounce: boolean
  playSound: boolean
  message?: string
}

export type CelebrationType = 'lesson_complete' | 'quiz_pass' | 'quiz_fail' | 'code_pass' | 'streak'
