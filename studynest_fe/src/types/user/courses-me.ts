export type CoursesMeVariant = "purchased" | "wishlist";

export type CoursesMeLevel = "beginner" | "intermediate" | "advanced";

export interface CoursesMeItem {
  id: string;
  title: string;
  slug: string;
  thumbnail_url?: string;
  rating_avg: number;
  total_length_seconds: number;
  level: string;
  language: string;
  created_at: string;
  enrolled_at?: string | null;
  review_count: number;
  progress_percent?: number;
}

export interface CoursesMeResponse {
  page: number;
  size: number;
  total: number;
  courses: CoursesMeItem[];
}

export interface CoursesMeCategory {
  id: string;
  name: string;
  slug: string;
}

export type CoursesMeSortField =
  | "enrolled_at"
  | "created_at"
  | "title"
  | "rating_avg"
  | "updated_at"
  | "views"
  | "progress";

export interface CoursesMeSortOption {
  value: CoursesMeSortField;
  label: string;
}
