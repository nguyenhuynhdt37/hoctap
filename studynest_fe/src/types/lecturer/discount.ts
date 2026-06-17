// Discount Types

export interface Discount {
  id: string;
  name: string;
  discount_code: string;
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  applies_to: "course" | "global" | "category" | "specific";
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

// Discount Detail Types
export interface DiscountDetailDiscount {
  id: string;
  code: string;
  name: string;
  description: string;
  applies_to: string;
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

export interface DiscountTarget {
  course_id: string | null;
  course_title: string | null;
  category_id: string | null;
  category_name: string | null;
}

export interface DiscountUsageHistory {
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
  targets: DiscountTarget[];
  usage_history: DiscountUsageHistory[];
}

export interface DiscountDetailsProps {
  discountId: string;
}

// Discount Edit Response Type
export interface DiscountEditResponse {
  discount_id: string;
  name: string;
  description: string;
  discount_code: string;
  is_hidden: boolean;
  applies_to: "course" | "global";
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  targets: Array<{
    course_id: string;
    category_id: string | null;
  }>;
  usage_count: number;
  created_by: string;
  created_role: string;
}

// Discount Create/Edit Types
export interface DiscountCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  base_price: number;
  approval_status: string;
  is_published: boolean;
  category: {
    id: string;
    name: string;
  } | null;
}

export interface DiscountCoursesResponse {
  courses: DiscountCourse[];
  count: number;
}

export interface DiscountFormData {
  name: string;
  description: string;
  discount_code: string;
  is_hidden: boolean;
  applies_to: "course" | "global";
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  usage_limit: number | null;
  per_user_limit: number;
  start_at: string;
  end_at: string;
  targets: Array<{ course_id: string }>;
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
