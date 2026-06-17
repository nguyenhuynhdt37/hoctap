// ============================================
// COMMON API TYPES
// ============================================

/**
 * Lesson detail from API
 */
export interface LessonDetail {
  id: string;
  title: string;
  description: string;
  lesson_type: string;
  section_id: string;
  course_id: string;
  position: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// CODE LESSON API TYPES
// ============================================

/**
 * Code language from API
 */
export interface CodeLanguage {
  id: string;
  name: string;
  version: string;
  aliases: string[];
  runtime: string | null;
  is_active: boolean;
  last_sync: string;
}

/**
 * Code file (internal use)
 */
export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  is_main: boolean;
}

/**
 * Test case (internal use)
 */
export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
}

/**
 * Test result detail
 */
export interface TestResultDetail {
  index: number;
  input: string;
  expected: string;
  output: string;
  stderr: string;
  exit_code: number;
  cpu_time: number;
  memory: number;
  language: string;
  version: string;
  result: "passed" | "failed";
}

/**
 * Test result
 */
export interface TestResult {
  status: "passed" | "failed";
  passed: number;
  failed: number;
  total: number;
  language: string;
  version: string;
  details: TestResultDetail[];
  time_limit?: number;
  memory_limit?: number;
}

/**
 * Code exercise (internal use for form state)
 */
export interface CodeExercise {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  codeFiles: CodeFile[];
  starterCodeFiles: CodeFile[];
  testCases: TestCase[];
  activeFileId: string;
  activeStarterFileId: string;
  renamingFileId: string | null;
  renameValue: string;
  testResult: TestResult | null;
  lastTestedSnapshot: string | null;
}

/**
 * Code exercise file from API
 */
export interface CodeExerciseFile {
  id: string;
  filename: string;
  content: string;
  is_main: boolean;
  role: string;
  is_pass: boolean;
}

/**
 * Code exercise testcase from API
 */
export interface CodeExerciseTestcase {
  id: string;
  input: string | null;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

/**
 * Code exercise from API
 */
export interface CodeExerciseFromAPI {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  time_limit: number;
  memory_limit: number;
  starter_files: CodeExerciseFile[];
  solution_files: CodeExerciseFile[];
  testcases: CodeExerciseTestcase[];
}

// ============================================
// QUIZ LESSON API TYPES
// ============================================

/**
 * Quiz form data (internal use)
 */
export interface QuizFormData {
  title: string;
  description: string;
}

// ============================================
// VIDEO LESSON API TYPES
// ============================================

/**
 * Video form data (internal use)
 */
export interface VideoFormData {
  title: string;
  description: string;
  is_preview: boolean;
  uploadMethod: "youtube" | "file" | "";
  video_url: string;
  video_file: File | null;
}

/**
 * Video data from API
 */
export interface VideoData {
  video_url: string;
  file_id: string;
  source_type: string;
  duration_seconds: number;
  duration_hms: number;
  transcript_length: number;
}

/**
 * Upload progress
 */
export interface UploadProgress {
  task_id: string;
  percent: number;
  speed_mb_s: number;
  uploaded_mb: number;
  total_mb: number;
  video_url: string | null;
  video_id: string | null;
  is_completed: boolean;
}
