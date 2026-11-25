export interface ActiveLessonResource {
  id: string;
  resource_type: string;
  file_size: number | null;
  created_at: string;
  url: string;
  lesson_id: string;
  title: string;
  mime_type: string | null;
  updated_at: string;
}

export interface ActiveLessonQuizOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback: string;
  position: number;
}

export interface ActiveLessonQuiz {
  id: string;
  question: string;
  difficulty_level: number;
  explanation: string;
  options: ActiveLessonQuizOption[];
}

export interface ActiveLessonCodeFile {
  id: string;
  filename: string;
  content: string;
  role: "starter" | "solution";
  is_main: boolean;
}

export interface ActiveLessonCode {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  time_limit: number;
  memory_limit: number;
  language: {
    id: string;
    name: string;
    version: string;
    runtime: string;
  };
  files: ActiveLessonCodeFile[];
  testcases: Array<{
    id: string;
    input: string;
    expected_output: string;
    is_sample: boolean;
    order_index: number;
    hidden: boolean;
  }>;
}

export interface ActiveLessonFlashcard {
  id: string;
  front_text: string;
  back_text: string;
  phonetic?: string | null;
  part_of_speech?: string | null;
  example_sentence?: string | null;
  example_translation?: string | null;
  hint?: string | null;
  lang_code: string;
  voice_id?: string | null;
  audio_url?: string | null;
  example_audio_url?: string | null;
  difficulty_level: number;
  position: number;
}

export interface ActiveLessonListeningSpeaker {
  id: string;
  name: string;
  role?: string | null;
  voice_id: string;
  color?: string | null;
}

export interface ActiveLessonListeningLine {
  id: string;
  speaker_id: string;
  text: string;
  translation?: string | null;
  start_ms: number;
  end_ms: number;
}

export interface ActiveLessonListening {
  id: string;
  lang_code: string;
  scenario?: string | null;
  speakers: ActiveLessonListeningSpeaker[];
  script_lines: ActiveLessonListeningLine[];
  audio_url?: string | null;
  duration_seconds: number;
  max_plays: number;
  show_transcript_before_submit: boolean;
  pass_percent: number;
}

export interface ActiveLessonFillBlankItem {
  id: string;
  index: number;
  answers: string[];
  hint?: string | null;
  explanation?: string | null;
  part_of_speech?: string | null;
}

export interface ActiveLessonFillBlank {
  id: string;
  lang_code: string;
  mode: "typing" | "word_bank" | "dictation" | string;
  prompt_text: string;
  translation?: string | null;
  blanks: ActiveLessonFillBlankItem[];
  distractors: string[];
  voice_id?: string | null;
  audio_url?: string | null;
  duration_seconds: number;
  case_sensitive: boolean;
  allow_hint: boolean;
  pass_percent: number;
}

export interface ActiveLessonSpeaking {
  id: string;
  lang_code: string;
  level: string;
  scenario: string;
  student_role: string;
  ai_persona: {
    name?: string;
    role?: string;
    personality?: string;
    voice_id?: string;
    opening_line?: string;
    opening_translation?: string;
    opening_audio_url?: string;
  };
  missions: Array<{
    id: string;
    title: string;
    hint?: string;
  }>;
  sample_phrases: Array<{
    phrase: string;
    translation?: string;
  }>;
  max_turns: number;
  pass_percent: number;
  allow_translation: boolean;
  allow_suggestion: boolean;
}

export interface ActiveLessonResponse {
  id: string;
  title: string;
  description?: string | null;
  lesson_type:
    | "video"
    | "quiz"
    | "code"
    | "flashcard"
    | "listening"
    | "fill_blank"
    | "speaking"
    | "info"
    | string;
  duration: number;
  file_id: string | null;
  resources: ActiveLessonResource[];
  quizzes: ActiveLessonQuiz[];
  codes?: ActiveLessonCode[];
  flashcards?: ActiveLessonFlashcard[];
  listening?: ActiveLessonListening | null;
  fill_blank?: ActiveLessonFillBlank | null;
  speaking?: ActiveLessonSpeaking | null;
  is_completed: boolean;
  is_locked: boolean;
}
