/**
 * Code Lesson Types
 * Mở rộng từ types.ts
 */

import type { CodeTestResult } from '../types'

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeLanguage {
  id: string
  name: string
  display_name: string
  extensions: string[]
  monaco_language: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeFile {
  id: string
  filename: string
  content: string
  language: CodeLanguage
  is_main: boolean
  is_readonly?: boolean
  size?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASE
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestCase {
  id: string
  input: string
  expected: string
  description: string
  is_sample?: boolean
}

export interface TestCaseResult {
  id: string
  index: number
  result: 'passed' | 'failed' | 'runtime_error' | 'time_limit_exceeded' | 'internal_error'
  input?: string
  expected?: string
  output?: string
  stderr?: string
  cpu_time?: number
  memory?: number
  error_message?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE EXERCISE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeExercise {
  id: string
  title: string
  description: string
  language: CodeLanguage
  files: CodeFile[]
  testcases: TestCase[]
  hints?: string[]
  solution?: string
  is_pass: boolean
  order: number
}

export interface CodeLessonData {
  id: string
  title: string
  description: string | null
  exercises: CodeExercise[]
  currentExerciseIndex: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR STATE
// ═══════════════════════════════════════════════════════════════════════════════

export type EditorTheme = 'light' | 'dark' | 'system'

export interface EditorState {
  activeFileId: string | null
  userCode: Record<string, string>
  isModified: boolean
  isSaving: boolean
  isRunning: boolean
  lastSaved: string | null
  cursorPosition?: { line: number; column: number }
}

export interface RunResult {
  status: 'idle' | 'running' | 'success' | 'error'
  testResult: CodeTestResult | null
  executedAt: string | null
  executionTime?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE STATE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExerciseProgress {
  exerciseId: string
  isPass: boolean
  attempts: number
  lastAttemptAt: string | null
  bestScore: number
}

export interface CodeLessonProgress {
  lessonId: string
  exercisesProgress: Record<string, ExerciseProgress>
  isLessonCompleted: boolean
  completedAt: string | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SaveFilePayload {
  exerciseId: string
  fileId: string
  filename: string
  content: string
  isMain: boolean
}

export interface RunCodePayload {
  exerciseId: string
  languageId: string
  files: Array<{
    filename: string
    content: string
    is_main: boolean
  }>
}

export interface SaveFileResult {
  saved: boolean
  saved_at: string
  file_id: string
}

export interface RunCodeResult {
  status: 'success' | 'error'
  test_result: CodeTestResult
  execution_time_ms: number
}
