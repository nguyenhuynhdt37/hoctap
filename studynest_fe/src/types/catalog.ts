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
}
export interface Provider {
  id: string;
  name: string;
  slug: string;
  provider_type:
    | "individual"
    | "center"
    | "exam_center"
    | "organization"
    | "school";
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  verification_status: "pending" | "verified" | "rejected";
  is_active?: boolean;
  province?: string | null;
  address?: string | null;
  website_url?: string | null;
  province_code?: string | null;
  school_code?: string | null;
  source_url?: string | null;
  source_key?: string | null;
  source_checked_at?: string | null;
  subjects?: { id: string; name: string; slug: string }[];
  grades?: { id: string; name: string; grade_number: number }[];
  course_count?: number;
  instructors?: { id: string; fullname: string; avatar: string | null }[];
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
export interface CourseEducation {
  subject: TaxonomyItem | null;
  provider: Provider | null;
  grades: TaxonomyItem[];
  learning_goals: TaxonomyItem[];
  exams: TaxonomyItem[];
  delivery_type: "recorded_video";
  needs_classification: boolean;
}
export interface CourseTaxonomyInput {
  subject_id: string | null;
  provider_id: string | null;
  grade_ids: string[];
  learning_goal_ids: string[];
  exam_ids: string[];
  delivery_type: "recorded_video";
}
export const emptyTaxonomy: CourseTaxonomyInput = {
  subject_id: null,
  provider_id: null,
  grade_ids: [],
  learning_goal_ids: [],
  exam_ids: [],
  delivery_type: "recorded_video",
};
export function taxonomyInput(value: CourseEducation): CourseTaxonomyInput {
  return {
    subject_id: value.subject?.id ?? null,
    provider_id: value.provider?.id ?? null,
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

export interface BrowseProvider {
  id: string;
  name: string;
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
  providers: BrowseProvider[];
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
  provider: { id: string; name: string; slug: string } | null;
  grades: { id: string; name: string; grade_number: number }[];
}
export interface CatalogResult {
  items: CatalogCourse[];
  next_cursor: string | null;
  has_more: boolean;
  total: number | null;
}
