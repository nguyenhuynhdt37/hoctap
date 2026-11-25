export type FillBlankMode = "typing" | "word_bank" | "dictation";

export interface FillBlankItem {
  id: string;
  index: number;
  answers: string[];
  hint?: string;
  explanation?: string;
  part_of_speech?: string;
}

export interface FillBlankLessonPayload {
  lesson_id: string;
  lang_code: string;
  mode: FillBlankMode;
  prompt_text: string;
  translation?: string | null;
  blanks: FillBlankItem[];
  distractors: string[];
  voice_id?: string | null;
  audio_url?: string | null;
  duration_seconds?: number;
  case_sensitive: boolean;
  allow_hint: boolean;
  pass_percent: number;
}
