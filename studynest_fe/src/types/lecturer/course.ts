export interface LecturerCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string;
  rating_avg: number;
  views: number;
  total_enrolls: number;
  revenue: number;
  base_price: number;
  currency: string;
  approval_status: "pending" | "approved" | "rejected";
  approval_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_round: number;
  is_published: boolean;
  sections_count: number;
  lessons_count: number;
  progress_percent?: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

export interface LecturerCoursesResponse {
  status: string;
  lecturer: {
    id: string;
    fullname: string;
    avatar: string | null;
  };
  courses: LecturerCourse[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface CourseFormData {
  title: string;
  subtitle: string;
  category_id: string;
  topic_id: string;
  description: string;
  level: "all" | "beginner" | "intermediate" | "advanced";
  language: string;
  outcomes: string[];
  requirements: string[];
  target_audience: string[];
  base_price: number;
  currency: string;
  is_published: boolean;
  is_lock_lesson: boolean;
}

export interface CourseDetailResponse {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  level: "all" | "beginner" | "intermediate" | "advanced";
  language: string;
  is_published: boolean;
  is_lock_lesson: boolean;
  approval_status: "pending" | "approved" | "rejected";
  approval_note: string | null;
  review_round: number;
  base_price: number;
  currency: string;
  thumbnail_url: string | null;
  outcomes: string[];
  requirements: string[];
  target_audience: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  topic: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at: string;
  updated_at: string;
}
