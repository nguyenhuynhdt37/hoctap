export interface ListeningSpeaker {
  id: string;
  name: string;
  role?: string | null;
  voice_id: string;
  color?: "blue" | "rose" | "violet" | "amber" | string | null;
}

export interface ListeningScriptLine {
  id: string;
  speaker_id: string;
  text: string;
  translation?: string | null;
  start_ms?: number;
  end_ms?: number;
}

export interface ListeningQuizOptionForm {
  text: string;
  is_correct: boolean;
  feedback?: string;
  position: number;
}

export interface ListeningQuizForm {
  uid: string;
  id?: string;
  question: string;
  difficulty_level: number;
  explanation: string;
  options: ListeningQuizOptionForm[];
}

export interface ListeningLessonPayload {
  lesson_id: string;
  lang_code: string;
  scenario?: string | null;
  speakers: ListeningSpeaker[];
  script_lines: ListeningScriptLine[];
  audio_url?: string | null;
  duration_seconds?: number;
  max_plays: number;
  show_transcript_before_submit: boolean;
  pass_percent: number;
  quizzes?: Array<{
    id?: string;
    question: string;
    difficulty_level?: number;
    explanation?: string;
    options: Array<{
      id?: string;
      text: string;
      is_correct: boolean;
      feedback?: string;
      position: number;
    }>;
  }>;
}
