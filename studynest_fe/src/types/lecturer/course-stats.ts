export interface LecturerCourseStats {
  course_id: string;
  title: string;
  thumbnail_url: string;
  base_price: number;
  views: number;
  rating_avg: number;
  total_reviews: number;
  sections_count: number;
  lessons_count: number;
  total_length_seconds: number;
  total_students: number;
  paid_students: number;
  free_students: number;
  avg_progress: number;
  completed_students: number;
  completion_rate: number;
  total_revenue?: number;
  revenue_paid?: number;
  revenue_holding?: number;
  revenue_pending?: number;
  approval_status: string;
  review_round: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelinePoint {
  time: string;
  count: number;
}

export interface LecturerTimelineResponse {
  course_id: string;
  title: string;
  mode: "day" | "month" | "quarter" | "year";
  enroll_timeline: TimelinePoint[];
  activity_timeline: TimelinePoint[];
}
