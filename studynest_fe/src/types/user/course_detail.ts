export type Lesson = {
  id: string;
  title: string;
  lesson_type: "video" | "article" | string;
  position: number;
  is_preview: boolean;
  duration: number | null; // seconds
};

export type Section = {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
};

export type Instructor = {
  id: string;
  fullname: string;
  avatar: string | null;
  instructor_description: string | null;
  student_count: number;
  course_count: number;
  rating_avg: number | null;
  evaluated_count: number;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  description: string; // HTML
  level: "beginner" | "intermediate" | "advanced" | string;
  language: string; // e.g. 'vi'
  last_updated: string; // ISO datetime
  rating: number;
  rating_count: number;
  total_enrolls: number;
  views: number;
  thumbnail_url: string;
  outcomes: string[];
  currency: string; // e.g. 'VND'
  base_price: number; // integer price in currency units
  requirements: string[];
  target_audience: string[];
  promo_video_url: string | null;
  instructor: Instructor;
  sections: Section[];
  is_favourite: boolean;
};

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
};

export type SampleReview = {
  id: string;
  user_id: string;
  user_fullname: string;
  user_avatar: string | null;
  rating: number;
  content: string;
  created_at: string;
};

export type CourseDetailData = {
  course: Course;
  category_chain: CategoryItem[];
  sample_reviews?: SampleReview[];
};
