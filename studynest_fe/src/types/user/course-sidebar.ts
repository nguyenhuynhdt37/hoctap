export interface AvailableDiscount {
  id: string;
  name: string;
  discount_code: string;
  discount_type: "percent" | "fixed";
  percent_value: number | null;
  fixed_value: number | null;
  description: string | null;
}

export interface DiscountApplyResult {
  course_id: string;
  course_title: string;
  base_price: number;
  discounted_amount: number;
  final_price: number;
  applied: boolean;
  reason?: string;
}

export interface DiscountApplyResponse {
  discount_id: string;
  discount_code: string;
  discount_name?: string;
  discount_description?: string | null;
  discount_applies_to?: string;
  discount_type?: "percent" | "fixed";
  discount_percent_value?: number | null;
  discount_fixed_value?: number | null;
  discount_usage_limit?: number | null;
  discount_usage_count?: number;
  discount_per_user_limit?: number;
  discount_is_active?: boolean;
  discount_is_hidden?: boolean;
  discount_start_at?: string;
  discount_end_at?: string;
  user_used_transactions?: number;
  user_remaining_uses?: number;
  items: DiscountApplyResult[];
  total_discount: number;
  total_price_after: number;
}

export interface DiscountInfo {
  discount_id?: string;
  discount_code?: string;
  discount_name?: string;
  discount_description?: string | null;
  discount_applies_to?: string;
  discount_type?: "percent" | "fixed";
  discount_percent_value?: number | null;
  discount_fixed_value?: number | null;
  discount_usage_limit?: number | null;
  discount_usage_count?: number;
  discount_per_user_limit?: number;
  discount_is_active?: boolean;
  discount_is_hidden?: boolean;
  start_at?: string;
  end_at?: string;
  user_used_transactions?: number;
  user_remaining_uses?: number;
}


