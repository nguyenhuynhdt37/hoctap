/**
 * Code Lesson Types
 * Mirrors the web learning code-lesson contract.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeLanguage {
  id: string
  name: string
  version: string
  runtime: string | null
  display_name?: string
  extensions?: string[]
  monaco_language?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeFile {
  id: string
  filename: string
  content: string
  role?: 'starter' | 'solution' | 'user'
  language?: CodeLanguage
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
  expected?: string
  expected_output?: string
  description?: string
  hidden?: boolean
  is_sample?: boolean
  order_index?: number
}

export interface TestCaseResult {
  id: string
  index: number
  result: 'passed' | 'failed' | 'runtime_error' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'internal_error'
  input?: string
  expected?: string
  output?: string
  stderr?: string
  cpu_time?: number
  memory?: number
  language?: string
  version?: string
  exit_code?: number
  is_hidden?: boolean
  error_message?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE EXERCISE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeExercise {
  id: string
  title: string
  description: string
  difficulty?: 'easy' | 'medium' | 'hard'
  time_limit?: number
  memory_limit?: number
  language: CodeLanguage
  files: CodeFile[]
  testcases: TestCase[]
  hints?: string[]
  solution?: string
  is_pass?: boolean
  order?: number
}

export interface CodeLessonTestResult {
  status: 'passed' | 'failed' | 'success' | 'partial' | 'error'
  passed: number
  failed: number
  total: number
  saved?: boolean
  language?: string
  version?: string
  details: TestCaseResult[]
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
  testResult: CodeLessonTestResult | null
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
  files: {
    filename: string
    content: string
    is_main: boolean
  }[]
}

export interface SaveFileResult {
  saved: boolean
  saved_at: string
  file_id: string
}

export interface RunCodeResult {
  status: 'success' | 'error'
  test_result: CodeLessonTestResult
  execution_time_ms: number
}
