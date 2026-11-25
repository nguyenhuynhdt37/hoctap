export type CatalogColorToken =
  | "primary"
  | "secondary"
  | "lavender"
  | "vanilla"
  | "success"
  | "info";

export type CatalogTaxonomyKind =
  | "levels"
  | "grades"
  | "subjects"
  | "learning-goals"
  | "exams";

export interface TaxonomyItem {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  order_index: number;
  slug?: string;
  education_level_id?: string;
  grade_number?: number;
  description?: string | null;
  exam_type?: string;
  icon?: string | null;
  color_token?: CatalogColorToken | string;
  tagline?: string | null;
  is_featured?: boolean;
  metadata?: Record<string, unknown>;
  course_count?: number;
  subject_count?: number;
  grade_count?: number;
}

export interface AdminCatalogMatrixCell {
  grade_id: string;
  subject_id: string;
  course_count: number;
}

export interface AdminCatalogContentGap {
  grade_id: string;
  grade_name: string;
  grade_number: number;
  level_id: string;
  level_name: string;
  level_code: string;
  subject_id: string;
  subject_name: string;
  subject_icon?: string | null;
  subject_color?: string;
}

export interface AdminCatalogHealth {
  total_courses: number;
  published_courses: number;
  unclassified_courses: number;
  inactive_taxonomies: number;
  matrix_total_links: number;
  matrix_covered_links: number;
  content_gaps_count: number;
  content_gaps: AdminCatalogContentGap[];
}

export interface AdminCatalogOverview {
  levels: TaxonomyItem[];
  grades: TaxonomyItem[];
  subjects: TaxonomyItem[];
  learning_goals: TaxonomyItem[];
  exams: TaxonomyItem[];
  grade_subjects: AdminCatalogMatrixCell[];
  health: AdminCatalogHealth;
}

export interface CatalogAiEnrichResult {
  tagline: string;
  description: string;
  icon: string;
  color_token: CatalogColorToken;
  metadata: Record<string, unknown>;
}
export interface CatalogOptions {
  levels: TaxonomyItem[];
  grades: TaxonomyItem[];
  subjects: TaxonomyItem[];
  learning_goals: TaxonomyItem[];
  exams: TaxonomyItem[];
  grade_subjects: { grade_id: string; subject_id: string }[];
  delivery_types: { code: string; name: string }[];
}
export interface CatalogSubjectCourseCounts {
  total: number;
  by_level: Partial<Record<string, number>>;
  by_grade: Partial<Record<string, number>>;
}
export interface CatalogOptionsWithCourseCounts extends CatalogOptions {
  course_counts: {
    total: number;
    by_level: Partial<Record<string, number>>;
    by_subject: Partial<Record<string, CatalogSubjectCourseCounts>>;
  };
}
export interface CourseEducation {
  subject: TaxonomyItem | null;
  grades: TaxonomyItem[];
  learning_goals: TaxonomyItem[];
  exams: TaxonomyItem[];
  delivery_type: "recorded_video";
  needs_classification: boolean;
}
export interface CourseTaxonomyInput {
  subject_id: string | null;
  grade_ids: string[];
  learning_goal_ids: string[];
  exam_ids: string[];
  delivery_type: "recorded_video";
}
export const emptyTaxonomy: CourseTaxonomyInput = {
  subject_id: null,
  grade_ids: [],
  learning_goal_ids: [],
  exam_ids: [],
  delivery_type: "recorded_video",
};
export function taxonomyInput(value: CourseEducation): CourseTaxonomyInput {
  return {
    subject_id: value.subject?.id ?? null,
    grade_ids: value.grades.map((x) => x.id),
    learning_goal_ids: value.learning_goals.map((x) => x.id),
    exam_ids: value.exams.map((x) => x.id),
    delivery_type: value.delivery_type,
  };
}
export interface BrowseTaxonomyOption {
  id: string;
  code: string;
  name: string;
}

export interface BrowseGradeOption extends BrowseTaxonomyOption {
  education_level_id: string;
  grade_number: number;
  slug: string;
}

export interface BrowseSubjectOption extends BrowseTaxonomyOption {
  slug: string;
}

export interface BrowseFilters {
  levels: BrowseTaxonomyOption[];
  grades: BrowseGradeOption[];
  subjects: BrowseSubjectOption[];
  learning_goals: BrowseTaxonomyOption[];
  exams: BrowseTaxonomyOption[];
  grade_subjects: { grade_id: string; subject_id: string }[];
  delivery_types: { code: string; name: string }[];
}

export interface CatalogCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  base_price: number;
  currency: string;
  rating_avg: number;
  rating_count: number;
  total_enrolls: number;
  delivery_type: string;
  instructor: { id: string; fullname: string; avatar: string | null };
  subject: { id: string; name: string; slug?: string } | null;
  grades: { id: string; name: string; grade_number: number }[];
}
export interface CatalogResult {
  items: CatalogCourse[];
  next_cursor: string | null;
  has_more: boolean;
  total: number | null;
}

export interface CatalogCourseCard extends Omit<CatalogCourse, "currency" | "subject"> {
  currency: string | null;
  subject: { id: string; name: string | null } | null;
  total_hours: number;
  created_at: string | null;
  level: string | null;
  language: string | null;
  provider: { id: string; name: string; slug: string } | null;
  students_count: number;
  lessons_count: number;
  duration_seconds: number;
  original_price: number | null;
  discount_price: number | null;
  is_free: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  lecturer: { name: string; avatar: string | null };
}

export interface CatalogCourseCardResult extends Omit<CatalogResult, "items"> {
  items: CatalogCourseCard[];
}
