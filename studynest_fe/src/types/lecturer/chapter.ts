export interface Lesson {
  id: string;
  title: string;
  lesson_type?: string;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

// API Response Types
export interface ApiLesson {
  lesson_id: string;
  lesson_title: string;
  lesson_type: string;
  position: number;
}

export interface ApiSection {
  section_id: string;
  section_title: string;
  position: number;
  lessons: ApiLesson[];
}

export interface ApiSectionsResponse {
  course_id: string;
  sections: ApiSection[];
}

// UI Response Types (mapped from API)
export interface SectionsResponse {
  status: string;
  course_id: string;
  sections: Section[];
}

export interface CreateSectionData {
  course_id: string;
  title: string;
}

export interface UpdateSectionData {
  title?: string;
}

export interface CreateLessonData {
  section_id: string;
  title: string;
}

export interface UpdateLessonData {
  title?: string;
  section_id?: string; // For moving lesson between sections
}
