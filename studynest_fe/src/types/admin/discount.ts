// Admin Discount Types (extended from lecturer types)

export interface Discount {
  id: string;
  name: string;
  discount_code: string;
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  applies_to: "course" | "global" | "category";
  usage_count: number;
  usage_limit: number | null;
  per_user_limit: number;
  start_at: string;
  end_at: string;
  is_hidden: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
  created_by: string;
  created_role: string;
}

export interface DiscountsResponse {
  total: number;
  page: number;
  limit: number;
  items: Discount[];
}

export interface DiscountsQueryParams {
  page: number;
  limit: number;
  search?: string;
  discount_type?: "percent" | "fixed";
  is_active?: boolean | null;
  validity?: "expired" | "running" | "upcoming";
  sort_by?: string;
  order_dir?: "asc" | "desc";
}

export interface DiscountsTableProps {
  data: Discount[];
  sortBy: string;
  orderDir: "asc" | "desc";
  onSort: (column: string) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, currentStatus: boolean) => void;
}

// Discount Course (for admin)
export interface DiscountCourse {
  id: string;
  title: string;
  base_price: number;
  thumbnail: string | null;
  rating_avg: number;
  total_enrolls: number;
}

export interface DiscountCoursesResponse {
  page: number;
  limit: number;
  total: number;
  items: DiscountCourse[];
}

// Discount Category
export interface DiscountCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface DiscountCategoriesResponse {
  categories: DiscountCategory[];
}

// Discount Form Data (extended for admin)
export interface DiscountFormData {
  name: string;
  description: string;
  discount_code: string;
  is_hidden: boolean;
  applies_to: "course" | "global" | "category";
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  start_at: string;
  end_at: string;
  auto_targets_weak_courses: boolean;
  targets: Array<{ course_id?: string; category_id?: string }>;
}

// Discount Filters Types
export interface DiscountsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  discountType: "percent" | "fixed" | "";
  onDiscountTypeChange: (value: "percent" | "fixed" | "") => void;
  isActive: boolean | null;
  onIsActiveChange: (value: boolean | null) => void;
  validity: "expired" | "running" | "upcoming" | "";
  onValidityChange: (value: "expired" | "running" | "upcoming" | "") => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
  onReset: () => void;
}

// Discount Detail Types
export interface DiscountDetailDiscount {
  id: string;
  code: string;
  name: string;
  description: string | null;
  applies_to: "course" | "global" | "category";
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  is_hidden: boolean;
}

export interface DiscountDetailTarget {
  course_id: string | null;
  course_title: string | null;
  category_id: string | null;
  category_name: string | null;
}

export interface DiscountDetailUsageHistory {
  user_id: string;
  user_name: string;
  avatar: string | null;
  course_id: string;
  course_title: string;
  discounted_amount: number;
  used_at: string;
}

export interface DiscountDetail {
  discount: DiscountDetailDiscount;
  targets: DiscountDetailTarget[];
  usage_history: DiscountDetailUsageHistory[];
}

// Weak Course (for auto-target feature)
export interface WeakCourse {
  course_id: string;
  title: string;
  rating_avg: number;
  views: number;
  total_enrolls: number;
  revenue: number;
  weak_score: number;
}
