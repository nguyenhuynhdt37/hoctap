import type {
  BrowseGradeOption,
  BrowseProvider,
  BrowseSubjectOption,
  BrowseTaxonomyOption,
} from "@/types/catalog";

export type {
  BrowseGradeOption,
  BrowseProvider,
  BrowseSubjectOption,
  BrowseTaxonomyOption,
};

export interface InstructorResponse {
  id: string;
  fullname: string;
  avatar: string | null;
  conscious: string | null;
  district: string | null;
  citizenship_identity: string | null;
  instructor_description: string | null; // Plain safe text or legacy
  facebook_url: string | null;
  student_count: number;
  rating_avg: number;
  evaluated_count: number;
  course_count: number;
}

export interface InstructorSubject {
  id: string;
  name: string;
  slug: string;
}

export interface InstructorGrade {
  id: string;
  name: string;
  grade_number: number;
}

export interface InstructorTaxonomyOption {
  id: string;
  code: string;
  name: string;
}

export interface InstructorProviderAffiliation {
  id: string;
  name: string;
  slug: string;
}

/**
 * Instructor V2 Directory Item (GET /users/instructors)
 */
export interface InstructorItem {
  id: string;
  name: string;
  avatar: string | null;
  short_bio: string | null;
  subjects: InstructorSubject[];
  grades: InstructorGrade[];
  exams: InstructorTaxonomyOption[];
  learning_goals: InstructorTaxonomyOption[];
  providers: InstructorProviderAffiliation[];
  public_course_count: number;
  course_count: number;
  student_count: number;
  rating_avg: number;
  evaluated_count: number;
  rating_count: number;
  first_public_course_at: string | null;
}

/**
 * Instructor V2 Detail Profile (GET /users/instructors/{uuid})
 */
export interface InstructorDetailProfile extends InstructorItem {
  instructor_description: string | null; // Safe plain text from BE
  facebook_url: string | null;
  created_at: string | null;
}

/**
 * Backward compatible detail data
 */
export interface InstructorDetailData extends Partial<InstructorItem> {
  id: string;
  name: string;
  avatar: string | null;
  instructor_description: string | null;
  student_count: number;
  course_count: number;
  rating_avg: number;
  evaluated_count: number;
  facebook_url: string | null;
  created_at: string | null;
}

export interface InstructorCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  currency?: string | null;
  is_purchased?: boolean;
  is_favorite?: boolean;
  rating_avg: number;
  rating_count: number;
  total_enrolls: number;
  views?: number | null;
  level?: string | null;
  language?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  topic?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface InstructorCoursesResponse {
  items: InstructorCourseItem[];
  next_cursor: string | null;
  has_more?: boolean;
  total?: number | null;
}

export interface InstructorDirectoryEnvelope {
  items: InstructorItem[];
  next_cursor: string | null;
  has_more: boolean;
  total: number | null;
}

export interface InstructorFilterOptions {
  levels: BrowseTaxonomyOption[];
  grades: BrowseGradeOption[];
  subjects: BrowseSubjectOption[];
  learning_goals: BrowseTaxonomyOption[];
  exams: BrowseTaxonomyOption[];
  grade_subjects: { grade_id: string; subject_id: string }[];
  delivery_types: { code: string; name: string }[];
  providers: BrowseProvider[];
}

export interface SavedInstructorIdsResponse {
  ids: string[];
}

export interface InstructorError {
  message: string;
  status?: number;
}
