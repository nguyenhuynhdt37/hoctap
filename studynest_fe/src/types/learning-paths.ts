export type Money = number | string;
export interface CourseOption {
  course_id: string;
  title: string;
  slug?: string;
  thumbnail?: string | null;
  base_price?: Money;
  currency?: string;
  available: boolean;
  owned: boolean;
  completed: boolean;
}
export interface PathGroup {
  id: string;
  title: string;
  position: number;
  options: CourseOption[];
  completed: boolean;
}
export interface PathStage {
  id: string;
  title: string;
  description: string;
  position: number;
  target_level_id: string | null;
  groups: PathGroup[];
  completed: boolean;
}
export interface LearningPath {
  id: string;
  path_id: string;
  slug: string;
  subject_id: string;
  version: number;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
  thumbnail_url?: string | null;
  is_active?: boolean;
  stages?: PathStage[];
  following?: boolean;
  completed_stages?: number;
  completion_note?: string;
}
export interface BundleItem {
  course_id: string;
  position: number;
  title: string;
  slug: string | null;
  thumbnail: string | null;
  list_price: Money;
  allocated_price: Money;
  available: boolean;
}
export interface BundleCoursePreview {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  base_price?: number;
}
export interface BundleActiveCoupon {
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  ends_at: string | null;
  label: string;
}
export interface Bundle {
  id: string;
  bundle_id: string;
  slug: string;
  version: number;
  title: string;
  description: string;
  thumbnail_url?: string | null;
  subtitle?: string | null;
  target_audience?: string[] | null;
  requirements?: string[] | null;
  outcomes?: string[] | null;
  price: Money;
  currency: string;
  status: "draft" | "published" | "archived";
  is_active?: boolean;
  path_version_id: string | null;
  items?: BundleItem[];
  refund_policy?: string;
  course_count?: number;
  instructor?: { id: string; name: string; avatar?: string | null } | null;
  standalone_total?: number;
  savings_amount?: number;
  savings_percent?: number;
  courses_preview?: BundleCoursePreview[];
  lesson_count?: number;
  duration_seconds?: number;
  levels?: string[];
  subjects?: { code: string; name: string }[];
  active_coupon?: BundleActiveCoupon | null;
  purchase_count?: number;
  is_bookmarked?: boolean;
}
export interface BundleQuote {
  version_id: string;
  title: string;
  items: {
    course_id: string;
    title: string;
    list_price: Money;
    allocated_price: Money;
    payable: Money;
    already_owned: boolean;
  }[];
  total: Money;
  full_price: Money;
  owned_credit: Money;
  subtotal: Money;
  discount_amount: Money;
  coupon_code: string | null;
  auto_applied?: boolean;
  currency: string;
  quote_hash: string;
  refund_days: number;
  policy: string;
}
export interface BundleReceipt {
  id: string;
  title: string;
  bundle_slug?: string | null;
  thumbnail_url?: string | null;
  subtitle?: string | null;
  total_paid: Money;
  total_paid_coin?: number;
  total_list_price?: Money;
  total_list_price_coin?: number;
  total_savings_coin?: number;
  currency: string;
  created_at: string;
  coupon_code: string | null;
  discount_amount: Money;
  discount_coin?: number;
  lines: {
    id: string;
    title: string;
    course_id: string;
    course_slug?: string | null;
    course_thumbnail_url?: string | null;
    list_price?: Money;
    list_price_coin?: number;
    paid: Money;
    paid_coin?: number;
    already_owned: boolean;
    purchase_item_id: string | null;
    purchase_status: string | null;
    refund_deadline: string | null;
  }[];
}
export interface Framework {
  id: string;
  name: string;
  code: string;
  subject_id: string;
  levels: { id: string; name: string; code: string; position: number }[];
}
export interface CourseChoice {
  id: string;
  title: string;
  slug: string;
  subject_id: string | null;
  base_price: Money;
  currency: string;
  is_published: boolean;
  approval_status: string;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  summary?: {
    max_savings_percent: number;
    with_coupon_count: number;
    bookmarked_count: number;
  };
}
export interface PathDraft {
  path_id?: string;
  slug: string;
  subject_id: string;
  title: string;
  description: string;
  stages: {
    title: string;
    description: string;
    target_level_id: string | null;
    groups: { title: string; course_ids: string[] }[];
  }[];
}
export interface BundleDraft {
  bundle_id?: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  course_ids: string[];
  path_version_id: string | null;
}

export interface BundleCoupon {
  id: string;
  bundle_id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: Money;
  min_total: Money;
  max_discount: Money | null;
  starts_at: string;
  ends_at: string;
  max_uses: number | null;
  per_user_limit: number;
  is_active: boolean;
  usage_count: number;
}

export interface RoadmapTierDefinition {
  key: "tieu-hoc" | "thcs" | "thpt";
  label: string;
  region_name: string;
  grade_range: string;
  grades: number[];
  tagline: string;
}

export interface LearningTrackOption {
  code: string;
  tier: "tieu-hoc" | "thcs" | "thpt";
  label: string;
  badge: string;
  description: string;
  default_subjects: string[];
}

export interface LearningGoalOption {
  code: string;
  label: string;
  description: string;
}

export interface GradeStation {
  grade: number;
  label: string;
  tier: "tieu-hoc" | "thcs" | "thpt";
  total_courses: number;
  enrolled_courses: number;
  progress_percent: number;
  is_user_grade: boolean;
  is_active: boolean;
}

export interface RoadmapSubjectChip {
  slug: string;
  name: string;
  count: number;
  is_focus: boolean;
}

export interface RoadmapCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  subject_name: string;
  subject_slug: string;
  base_price: number;
  rating_avg: number;
  total_enrolls: number;
  level: string;
  is_enrolled: boolean;
  progress_percent: number;
  is_focus: boolean;
  match_reason: string;
}

export interface RoadmapStage {
  index: number;
  code: string;
  title: string;
  subtitle: string;
  accent: "sky" | "lavender" | "vanilla";
  progress_percent: number;
  courses: RoadmapCourseItem[];
}

export interface PersonalizedRoadmapProfile {
  fullname: string;
  avatar: string | null;
  is_configured: boolean;
  grade_level: number | null;
  learning_track: string;
  learning_track_label: string;
  focus_subjects: string[];
  goal_mode: string;
  goal_label: string;
  daily_goal_minutes: number;
}

export interface PersonalizedRoadmapBlueprint {
  profile: PersonalizedRoadmapProfile;
  active_grade: number;
  active_tier: RoadmapTierDefinition;
  active_track: LearningTrackOption;
  active_grade_stats: GradeStation;
  grade_map: GradeStation[];
  available_subjects: RoadmapSubjectChip[];
  stages: RoadmapStage[];
  following_paths: { version_id: string; title: string; slug: string }[];
  catalog: {
    tiers: RoadmapTierDefinition[];
    tracks: LearningTrackOption[];
    goals: LearningGoalOption[];
  };
}

export interface LearningPreferencesPayload {
  grade_level: number;
  learning_track: string;
  focus_subjects: string[];
  goal_mode: string;
  daily_goal_minutes: number;
}
