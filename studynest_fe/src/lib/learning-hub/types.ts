export type HubDataSource = "mock" | "api";
export type ReviewSelfRating = "remembered" | "forgot";

export interface ReviewQueueParams {
  course_id?: string;
  limit?: number;
}

export interface HubCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export interface ReviewQueueItem {
  item_id: string;
  quiz_id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  due_at: string;
  difficulty: number | null;
  course: HubCourse;
  section: { id: string; title: string; position: number } | null;
  lesson: { id: string; title: string };
  lesson_href: string;
}

export interface ReviewQueueResponse {
  due_count: number;
  items: ReviewQueueItem[];
}

export interface SubmitReviewAnswerInput {
  option_id: string;
  self_rating: ReviewSelfRating;
  idempotency_key: string;
}

export interface SubmitReviewAnswerResponse {
  correct: boolean;
  correct_option_id: string;
  explanation: string;
  next_due_at: string;
  interval_days: number;
  due_count: number;
}

export type MasteryStatus = "solid" | "needs_review" | "fading" | "not_started" | "no_quiz";

export interface MasteryCourse extends HubCourse {
  course_score: number | null;
  status: MasteryStatus;
  quiz_lessons: number;
  total_lessons: number;
}

export interface CourseMasteryResponse {
  course: HubCourse;
  course_score: number | null;
  status: MasteryStatus;
  sections: Array<{
    id: string;
    title: string;
    position: number;
    score: number | null;
    status: MasteryStatus;
    lessons: Array<{
      id: string;
      title: string;
      lesson_type: string;
      position: number;
      has_quiz: boolean;
      score: number | null;
      status: MasteryStatus;
      last_seen_at: string | null;
      wrong_count: number;
      href: string;
    }>;
  }>;
}

export interface StudyGoalSchedule {
  target_date: string;
  sessions_per_week: number;
}

export interface CreateStudyGoalInput extends StudyGoalSchedule {
  target_type: "course" | "path";
  target_id: string;
}

export interface StudyGoal extends CreateStudyGoalInput {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  progress_percent: number;
  on_track: boolean;
  behind_lessons: number;
}

export interface StudyGoalsListResponse {
  items: StudyGoal[];
}

export interface StudyPlanDayItem {
  kind: "lesson" | "review";
  lesson_id: string | null;
  title: string;
  done: boolean;
  href: string;
}

export interface StudyGoalPlanResponse {
  goal: StudyGoal;
  days: Array<{ date: string; items: StudyPlanDayItem[] }>;
  completed_lessons: number;
  total_lessons: number;
  on_track: boolean;
  behind_lessons: number;
  suggestion: string | null;
}

export interface WeeklyLearningReport {
  week_start: string;
  week_end: string;
  lessons_completed: number;
  quizzes_taken: number;
  reviews_done: number;
  study_days: number;
  streak: number;
  top_courses: Array<HubCourse & { lessons_completed: number }>;
  share_text: string;
}

export interface LearningBadge {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  earned: boolean;
  earned_at: string | null;
}

export interface LearningHubApi {
  getReviewQueue(params?: ReviewQueueParams): Promise<ReviewQueueResponse>;
  submitReviewAnswer(itemId: string, payload: SubmitReviewAnswerInput): Promise<SubmitReviewAnswerResponse>;
  getMasteryCourses(): Promise<{ courses: MasteryCourse[] }>;
  getCourseMastery(courseId: string): Promise<CourseMasteryResponse>;
  getGoals(): Promise<StudyGoalsListResponse>;
  getGoal(goalId: string): Promise<StudyGoal>;
  createGoal(payload: CreateStudyGoalInput): Promise<StudyGoal>;
  updateGoal(goalId: string, payload: StudyGoalSchedule | CreateStudyGoalInput): Promise<StudyGoal>;
  deleteGoal(goalId: string): Promise<void>;
  getGoalPlan(goalId: string): Promise<StudyGoalPlanResponse>;
  getWeeklyReport(): Promise<WeeklyLearningReport>;
  getBadges(): Promise<{ badges: LearningBadge[] }>;
}
