// Types for lesson creation

export interface LessonFormData {
  title: string;
  section_id: string;
  description: string;
  lesson_type: "video" | "quiz" | "code" | "info" | "article" | "";
  video_url?: string;
  video_file?: File | null;
  is_preview: boolean;
}

// Code types
export interface CodeLanguage {
  id: string;
  name: string;
  version: string;
  aliases: string[];
  runtime: string | null;
  is_active: boolean;
  last_sync: string;
}

export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  is_main: boolean;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
}

export interface CodeTestResult {
  status: string;
  passed: number;
  failed: number;
  total: number;
  language: string;
  version: string;
  details: Array<{
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
    result: string;
  }>;
}

export interface CodeExercise {
  id: string;
  title: string;
  description: string;
  selectedLanguageId: string;
  codeFiles: CodeFile[];
  activeFileId: string;
  starterCodeFiles: CodeFile[];
  activeStarterFileId: string;
  testCases: TestCase[];
  difficulty: "easy" | "medium" | "hard";
  starterCode: string;
  testResult: CodeTestResult | null;
  renamingFileId: string | null;
  renameValue: string;
  renamingStarterFileId: string | null;
  renameStarterValue: string;
  hasInsertedTemplate: boolean;
  timeLimit: number;
  memoryLimit: number;
  lastTestedSolutionFiles: string;
}

export interface LessonOption {
  id: string;
  title: string;
  lesson_type: string;
  chunk_count: number;
}

// Quiz types for form (different from API types)
export interface QuizFormOption {
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface QuizForm {
  question: string;
  explanation: string;
  difficulty_level: number;
  options: QuizFormOption[];
  code_block?: string;
}
