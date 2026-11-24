import type { Equipment } from "@/lib/learning-hub/shop-types";

export type CoursesMeVariant = "purchased" | "wishlist";

export type CoursesMeLevel = "beginner" | "intermediate" | "advanced";

export type LearningListTone = "sky" | "rose" | "lavender" | "vanilla";

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
  archived_at?: string | null;
  pinned_at?: string | null;
  is_pinned?: boolean;
  completed_lessons?: number;
  total_lessons?: number;
  list_ids?: string[];
  review_count: number;
  progress_percent?: number;
  gifted_by_id?: string | null;
  gifted_by_name?: string | null;
  gifted_by_avatar?: string | null;
}

export interface CoursesMeResponse {
  page: number;
  size: number;
  total: number;
  archived_count?: number;
  courses: CoursesMeItem[];
}

export interface LearningListItem {
  id: string;
  name: string;
  description?: string | null;
  color_tone: LearningListTone | string;
  course_ids: string[];
  course_count: number;
}

export interface WeeklyActivityDay {
  date: string;
  label: string;
  completed_lessons: number;
  is_today: boolean;
}

export interface ContinueLearningCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
  level?: string | null;
  is_pinned?: boolean;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
  next_lesson_title?: string | null;
  gifted_by_id?: string | null;
  gifted_by_name?: string | null;
  gifted_by_avatar?: string | null;
}

export interface OwnedBundleCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
}

export interface OwnedBundleItem {
  order_id: string;
  bundle_id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  thumbnail_url?: string | null;
  purchased_at?: string | null;
  course_count: number;
  completed_courses: number;
  progress_percent: number;
  courses: OwnedBundleCourseItem[];
}

export interface LearningCockpitResponse {
  user: {
    id: string;
    fullname: string;
    avatar: string | null;
  };
  gamification: {
    level: number;
    current_streak: number;
    equipment?: Equipment;
  };
  continue_learning: ContinueLearningCourse | null;
  weekly_activity: WeeklyActivityDay[];
  weekly_total_completed: number;
  lists: LearningListItem[];
  owned_bundles?: OwnedBundleItem[];
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
