export type CourseApprovalStatus = "pending" | "approved" | "rejected";

export type AdminCourseFilterStatus =
  | ""
  | "pending"
  | "approved_live"
  | "approved_hidden"
  | "rejected";

export interface AdminCoursesSummary {
  total: number;
  pending: number;
  approved_live: number;
  approved_hidden: number;
  rejected: number;
  total_enrolls: number;
  total_lessons: number;
}

export interface AdminCourseInstructor {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  bio?: string | null;
  master_contract_status: string;
  master_contract_number: string | null;
}

export interface AdminCourseListItem {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  delivery_type: string;
  base_price: number;
  currency: string;
  is_published: boolean;
  approval_status: CourseApprovalStatus;
  approval_note: string | null;
  approved_at: string | null;
  review_round: number;
  sections_count: number;
  lessons_count: number;
  total_length_seconds: number;
  views: number;
  total_enrolls: number;
  rating_avg: number;
  rating_count: number;
  category: { id: string; name: string } | null;
  topic: { id: string; name: string } | null;
  instructor: AdminCourseInstructor;
  approver: { id: string; fullname: string; email?: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCoursesResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  summary: AdminCoursesSummary;
  items: AdminCourseListItem[];
}

export interface AdminCourseQualityCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AdminCourseLessonBrief {
  id: string;
  title: string;
  lesson_type: string;
  position: number;
  is_preview: boolean;
  duration_seconds: number;
  has_content: boolean;
  content_hint: string;
  resources_count: number;
}

export interface AdminCourseSection {
  id: string;
  title: string;
  position: number;
  lessons_count: number;
  lessons: AdminCourseLessonBrief[];
}

export interface AdminCourseReviewDetail extends AdminCourseListItem {
  description: string | null;
  promo_video_url: string | null;
  is_lock_lesson: boolean;
  outcomes: string[];
  requirements: string[];
  target_audience: string[];
  empty_lessons_count: number;
  preview_lessons_count: number;
  lesson_type_counts: Record<string, number>;
  education?: {
    subject?: { id: string; name: string } | null;
    provider?: { id: string; name: string } | null;
    grades?: Array<{ id: string; name: string }>;
    learning_goals?: Array<{ id: string; name: string }>;
    exams?: Array<{ id: string; name: string }>;
  } | null;
  quality_score: {
    passed: number;
    total: number;
    checks: AdminCourseQualityCheck[];
  };
  sections: AdminCourseSection[];
}

export interface AdminLessonPreviewPayload {
  id: string;
  course_id: string;
  section_id: string | null;
  section_title: string | null;
  title: string;
  lesson_type: string;
  position: number;
  is_preview: boolean;
  description: string | null;
  outcomes: string[];
  prerequisites: string[];
  video: {
    video_url: string | null;
    file_id: string | null;
    duration: number;
    source_type: string | null;
    transcript: string | null;
  } | null;
  resources: Array<{
    id: string;
    title: string;
    url: string;
    resource_type: string | null;
    file_size: number | null;
    mime_type: string | null;
  }>;
  quizzes: Array<{
    id: string;
    question: string;
    explanation: string | null;
    difficulty_level: number;
    created_by: string | null;
    options: Array<{
      id: string;
      text: string;
      is_correct: boolean;
      feedback: string | null;
      position: number;
    }>;
  }>;
  codes: Array<{
    id: string;
    title: string;
    description: string | null;
    difficulty: string;
    time_limit: number | null;
    memory_limit: number | null;
    language: { name?: string | null; version?: string | null } | null;
    files: Array<{
      id: string;
      filename: string;
      content: string;
      role: string;
      is_main: boolean;
    }>;
    testcases: Array<{
      id: string;
      input: string | null;
      expected_output: string | null;
      is_sample: boolean;
      order_index: number;
    }>;
  }>;
  flashcards: Array<{
    id: string;
    front_text: string;
    back_text: string;
    phonetic: string | null;
    part_of_speech: string | null;
    example_sentence: string | null;
    example_translation: string | null;
    hint: string | null;
    lang_code: string;
    audio_url: string | null;
    example_audio_url: string | null;
    difficulty_level: number;
    position: number;
  }>;
  listening: {
    id: string;
    lang_code: string;
    scenario: string | null;
    speakers: Array<{ id?: string; name?: string; role?: string }>;
    script_lines: Array<{
      id?: string;
      speaker?: string;
      text?: string;
      translation?: string;
      blanks?: Array<string | { answer?: string; word?: string }>;
    }>;
    audio_url: string | null;
    duration_seconds: number;
    max_plays: number;
    show_transcript_before_submit: boolean;
    pass_percent: number;
  } | null;
  fill_blank: {
    id: string;
    lang_code: string;
    mode: string;
    prompt_text: string;
    translation: string | null;
    blanks: Array<{
      index?: number;
      answer?: string;
      accepted?: string[];
      hint?: string;
    }>;
    distractors: string[];
    audio_url: string | null;
    duration_seconds: number;
    case_sensitive: boolean;
    allow_hint: boolean;
    pass_percent: number;
  } | null;
  speaking: {
    id: string;
    lang_code: string;
    level: string;
    scenario: string;
    student_role: string;
    ai_persona: { name?: string; role?: string; personality?: string };
    missions: Array<string | { title?: string; text?: string }>;
    sample_phrases: Array<
      string | { phrase?: string; text?: string; translation?: string }
    >;
    max_turns: number;
    pass_percent: number;
    allow_translation: boolean;
    allow_suggestion: boolean;
  } | null;
  updated_at: string | null;
}
