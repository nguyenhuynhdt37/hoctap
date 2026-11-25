export interface TtsVoiceOption {
  voice_id: string;
  lang_code: string;
  language: string;
  label: string;
  gender: "female" | "male" | string;
  badge: string;
}

export interface FlashcardItem {
  id?: string;
  front_text: string;
  back_text: string;
  phonetic: string;
  part_of_speech: string;
  example_sentence: string;
  example_translation: string;
  hint: string;
  lang_code: string;
  voice_id: string;
  audio_url: string;
  example_audio_url: string;
  difficulty_level: number;
  position: number;
}

export interface FlashcardStudioItem extends FlashcardItem {
  uid: string;
}
