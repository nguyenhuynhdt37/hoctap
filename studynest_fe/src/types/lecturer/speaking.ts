export interface SpeakingPersona {
  name: string;
  role: string;
  personality: string;
  voice_id: string;
  opening_line: string;
  opening_translation: string;
  opening_audio_url?: string;
}

export interface SpeakingMission {
  id: string;
  title: string;
  hint?: string;
}

export interface SpeakingSamplePhrase {
  phrase: string;
  translation?: string;
}

export interface SpeakingLessonPayload {
  lesson_id: string;
  lang_code: string;
  level: string;
  scenario: string;
  student_role: string;
  ai_persona: SpeakingPersona;
  missions: SpeakingMission[];
  sample_phrases: SpeakingSamplePhrase[];
  max_turns: number;
  pass_percent: number;
  allow_translation: boolean;
  allow_suggestion: boolean;
}
