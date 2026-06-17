export type FavouriteSortField =
  | "created_at"
  | "title"
  | "rating_avg"
  | "views";

export type FavouriteLevel = "beginner" | "intermediate" | "advanced";

export interface FavouriteSortOption {
  value: FavouriteSortField;
  label: string;
}

export interface FavouriteCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail_url?: string;
  rating_avg: number;
  review_count: number;
  avg_rating: number;
  level: string;
  language: string;
  created_at: string;
  favourited_at: string;
  category_name?: string;
}

export interface FavouriteFilters {
  keyword?: string | null;
  category_id?: string | null;
  level?: FavouriteLevel | null;
  language?: string | null;
  sort_by?: FavouriteSortField;
  order?: "asc" | "desc";
}

export interface FavouriteCoursesResponse {
  page: number;
  size: number;
  total: number;
  filters: FavouriteFilters;
  favourites: FavouriteCourseItem[];
}


