export interface CourseStudentItem {
  user_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  price_paid: number;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  enrolled_at: string | null;
  last_activity: string | null;
}

export interface CourseStudentsResponse {
  course_id: string;
  title: string;
  page: number;
  limit: number;
  total: number;
  students: CourseStudentItem[];
}


