export interface LecturerOverview {
  total_revenue: number;
  total_students: number;
  total_courses: number;
  average_rating: number;
  total_reviews: number;
  this_month_revenue: number;
  last_month_revenue: number;
  revenue_growth: number;
}

export interface RevenueChartItem {
  date: string; // "YYYY-MM-DD" (month) or "YYYY-MM" (year)
  revenue: number;
  courses_sold: number;
}

export interface CoursePerformanceItem {
  course_id: string;
  title: string;
  thumbnail: string | null;
  status: string;
  revenue: number;
  total_students: number;
  average_rating: number;
  reviews_count: number;
  this_month_revenue: number;
}

export interface StudentsByCourseItem {
  course_id: string;
  course_title: string;
  count: number;
}

export interface StudentAnalyticsResponse {
  total_new_students: number;
  active_students: number;
  retention_rate: number;
  students_by_course: StudentsByCourseItem[];
}
