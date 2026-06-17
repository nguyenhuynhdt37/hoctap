export interface CourseSummary {
  id: string;
  title: string;
  total_lessons: number;
}

export interface StudentSummary {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  enrolled_at: string | null;
  last_accessed: string | null;
  last_activity: string | null;
}

export interface PurchaseInfo {
  price_paid: number;
  original_price: number;
  discount_amount: number;
  discount_code: string | null;
  purchase_time: string | null;
}

export interface ProgressInfo {
  completed_lessons: number;
  total_lessons: number;
  progress_percent: number;
  course_completed_at: string | null;
  current_lesson: {
    lesson_id: string;
    title: string;
    position: number;
  } | null;
}

export interface LessonProgressItem {
  lesson_id: string;
  title: string;
  type: string;
  position: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface StudentDetailResponse {
  course: CourseSummary;
  student: StudentSummary;
  purchase: PurchaseInfo | null;
  progress: ProgressInfo;
  lessons: LessonProgressItem[];
}


