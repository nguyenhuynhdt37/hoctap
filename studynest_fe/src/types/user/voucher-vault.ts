export type VoucherSource = "personal" | "public" | "combo";
export type VoucherStatus = "available" | "used" | "expired" | "revoked";

export interface VoucherVaultItem {
  id: string;
  source: VoucherSource;
  title: string;
  description: string;
  code: string | null;
  code_masked: string;
  can_reveal: boolean;
  discount_type: "percent" | "fixed" | string;
  percent_value: number | null;
  fixed_value: number | null;
  applies_to: "global" | "all" | "course" | "category" | "specific" | "combo" | string;
  target_names: string[];
  target_count: number;
  primary_course_slug: string | null;
  primary_bundle_slug?: string | null;
  status: VoucherStatus;
  expiring_soon: boolean;
  expires_at: string | null;
  used_at: string | null;
  remaining_uses: number | null;
  per_user_limit: number | null;
}

export interface VoucherVaultSummary {
  total_available: number;
  personal_available: number;
  public_available: number;
  combo_available?: number;
  expiring_soon: number;
  total_used: number;
  total_saved_vnd: number;
}

export interface VoucherVaultResponse {
  summary: VoucherVaultSummary;
  items: VoucherVaultItem[];
}

export interface RevealPersonalCouponResponse {
  id: string;
  code: string;
  code_masked: string | null;
  expires_at: string | null;
}
