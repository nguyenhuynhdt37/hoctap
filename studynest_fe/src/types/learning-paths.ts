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
  is_active?: boolean;
  stages?: PathStage[];
  following?: boolean;
  completed_stages?: number;
  completion_note?: string;
}
export interface BundleItem {
  course_id: string;
  title: string;
  slug: string | null;
  thumbnail: string | null;
  list_price: Money;
  allocated_price: Money;
  available: boolean;
}
export interface Bundle {
  id: string;
  bundle_id: string;
  slug: string;
  version: number;
  title: string;
  description: string;
  price: Money;
  currency: string;
  status: "draft" | "published" | "archived";
  is_active?: boolean;
  path_version_id: string | null;
  items?: BundleItem[];
  refund_policy?: string;
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
  currency: string;
  quote_hash: string;
  refund_days: number;
  policy: string;
}
export interface BundleReceipt {
  id: string;
  title: string;
  total_paid: Money;
  currency: string;
  created_at: string;
  coupon_code: string | null;
  discount_amount: Money;
  lines: {
    id: string;
    title: string;
    course_id: string;
    paid: Money;
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
