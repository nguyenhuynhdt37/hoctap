export interface InstructorResponse {
  id: string;
  fullname: string;
  avatar: string | null;
  conscious: string | null;
  district: string | null;
  citizenship_identity: string | null;
  instructor_description: string | null; // HTML
  facebook_url: string | null;
  student_count: number;
  rating_avg: number;
  evaluated_count: number;
  course_count: number;
}

export interface InstructorDetailData {
  id: string;
  name: string;
  avatar: string | null;
  instructor_description: string | null;
  student_count: number;
  course_count: number;
  rating_avg: number;
  evaluated_count: number;
  facebook_url: string | null;
  created_at: string;
}

export interface InstructorCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  base_price: number;
  is_purchased: boolean;
  is_favorite: boolean;
  rating_avg: number;
  rating_count: number;
  total_enrolls: number;
  views: number;
  level: string;
  language: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface InstructorCoursesResponse {
  items: InstructorCourseItem[];
  next_cursor: string | null;
}

export interface InstructorError {
  message: string;
  status?: number;
}
