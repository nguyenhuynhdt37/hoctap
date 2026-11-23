export type ComboLevel = "tieu-hoc" | "thcs" | "thpt";

export interface CatalogCombo {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  description: string;
  levels: ComboLevel[];
  subjects: { code: string; name: string }[];
  course_count: number;
  lesson_count: number;
  duration_seconds: number;
  currency: "VND";
  price: string;
  standalone_total: string;
  savings_amount: string;
  savings_percent: number;
  courses: { id: string; title: string; thumbnail: string | null }[];
  instructor: { id: string; name: string };
  promotion: { status: "coupon_required"; ends_at: string } | null;
}

export interface CatalogCombosResponse {
  items: CatalogCombo[];
  available_levels: ComboLevel[];
  has_public_combos: boolean;
}
