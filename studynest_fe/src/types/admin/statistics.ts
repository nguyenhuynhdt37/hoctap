// Overview Dashboard
export interface OverviewResponse {
  total_users: number;
  total_courses: number;
  total_instructors: number;
  total_revenue: number;
  today_revenue: number;
  pending_withdrawals: number;
  pending_refunds: number;
}

// Revenue Stats
export interface RevenueDataPoint {
  date: string;
  amount: number;
  count: number;
}

export interface RevenueStatsResponse {
  total: number;
  platform_income: number;
  instructor_payout: number;
  data: RevenueDataPoint[];
}

// Revenue by Category
export interface RevenueByCategoryItem {
  category_id: string;
  category_name: string;
  revenue: number;
  percentage: number;
}

export interface RevenueByCategoryResponse {
  data: RevenueByCategoryItem[];
}

// User Stats
export interface UserRoleCount {
  role: string;
  count: number;
}

export interface UserGrowthPoint {
  date: string;
  new_users: number;
  active_users: number;
}

export interface UserStatsResponse {
  total: number;
  verified: number;
  banned: number;
  by_role: UserRoleCount[];
  growth: UserGrowthPoint[];
}

// Course Stats
export interface CourseStatsResponse {
  total: number;
  by_status: {
    published: number;
    draft: number;
    archived: number;
  };
  by_level: {
    beginner: number;
    intermediate: number;
    advanced: number;
    all: number;
  };
  avg_rating: number;
  total_enrollments: number;
}

// Top Courses
export interface TopCourseItem {
  course_id: string;
  title: string;
  instructor_name: string;
  thumbnail: string | null;
  value: number;
  metric: string;
}

export interface TopCoursesResponse {
  data: TopCourseItem[];
}

// Instructor Stats
export interface InstructorStatsResponse {
  total: number;
  total_earnings: number;
  pending_payout: number;
  paid_out: number;
}

// Top Instructors
export interface TopInstructorItem {
  instructor_id: string;
  name: string;
  avatar: string | null;
  value: number;
  metric: string;
  courses_count: number;
  students_count: number;
}

export interface TopInstructorsResponse {
  data: TopInstructorItem[];
}

// Finance Stats
export interface FinanceStatsResponse {
  platform_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  pending_withdrawals: {
    count: number;
    amount: number;
  };
  refunds: {
    requested: number;
    approved: number;
    rejected: number;
    total_refunded: number;
  };
}

// Activity Stats
export interface ActivityStatsResponse {
  lesson_views: number;
  lesson_completions: number;
  comments: number;
  notes_created: number;
  quiz_attempts: number;
}

// Query Params
export type RevenuePeriod = "day" | "week" | "month" | "year";
export type TopCoursesSortBy = "revenue" | "views" | "enrollments";
export type TopInstructorsSortBy = "revenue" | "students" | "courses";
export type TransactionStatus = "completed" | "pending" | "refunded";

// =====================
// REVENUE DETAIL TYPES
// =====================

// Revenue Compare
export interface RevenuePeriodData {
  from_date: string;
  to_date: string;
  total: number;
  transaction_count: number;
  platform_income: number;
  instructor_payout: number;
}

export interface RevenueCompareResponse {
  current: RevenuePeriodData;
  previous: RevenuePeriodData;
  change_amount: number;
  change_percent: number;
}

// Transactions List
export interface TransactionItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  course_id: string | null;
  course_title: string | null;
  amount: number;
  type: string;
  status: string;
  gateway: string | null;
  created_at: string;
}

export interface TransactionsListResponse {
  items: TransactionItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Revenue by Instructor
export interface InstructorRevenueItem {
  instructor_id: string;
  name: string;
  email: string;
  avatar: string | null;
  revenue: number;
  platform_fee: number;
  net_earning: number;
  transaction_count: number;
  courses_sold: number;
}

export interface RevenueByInstructorResponse {
  total_revenue: number;
  total_platform_fee: number;
  total_instructor_earning: number;
  data: InstructorRevenueItem[];
}

// Revenue by Course
export interface CourseRevenueItem {
  course_id: string;
  title: string;
  instructor_id: string;
  instructor_name: string;
  thumbnail: string | null;
  revenue: number;
  sales_count: number;
  avg_price: number;
  refund_count: number;
}

export interface RevenueByCourseResponse {
  total_revenue: number;
  total_sales: number;
  data: CourseRevenueItem[];
}

// Revenue Trends
export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  growth_rate: number;
  transaction_count: number;
}

export interface RevenueTrendsResponse {
  data: RevenueTrendPoint[];
  avg_monthly_revenue: number;
  avg_growth_rate: number;
  best_month: string | null;
  best_month_revenue: number;
}

// =====================
// INSTRUCTOR DETAIL TYPES
// =====================

// Instructor Growth Chart
export interface InstructorGrowthPoint {
  date: string;
  new_instructors: number;
  total_instructors: number;
}

export interface InstructorGrowthResponse {
  data: InstructorGrowthPoint[];
  total_new_this_period: number;
  growth_rate: number;
}

// Instructor Detail
export interface InstructorDetailResponse {
  instructor_id: string;
  name: string;
  email: string;
  avatar: string | null;
  join_date: string;
  total_revenue: number;
  total_students: number;
  total_courses: number;
  average_rating: number;
  revenue_last_30d: number;
  students_last_30d: number;
  is_active: boolean;
  is_banned: boolean;
  top_courses: TopCourseItem[];
}

// Instructor by Category
export interface InstructorByCategoryItem {
  category_id: string;
  category_name: string;
  instructor_count: number;
  total_courses: number;
  total_revenue: number;
  top_instructors: TopInstructorItem[];
}

export interface InstructorByCategoryResponse {
  data: InstructorByCategoryItem[];
  total_categories: number;
}

// Export Params
export interface ExportInstructorParams {
  sort_by?: "revenue" | "students" | "courses";
  from_date?: string;
  to_date?: string;
}

// =====================
// COMPREHENSIVE REPORT
// =====================

export interface ComprehensiveReportParams {
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  format?: "xlsx" | "json";
}

export interface OverviewStats {
  "Tổng người dùng": number;
  "Tổng khóa học": number;
  "Tổng giảng viên": number;
  "Tổng doanh thu (VND)": number;
  "Doanh thu hôm nay (VND)": number;
  "Yêu cầu rút tiền chờ duyệt": number;
  "Yêu cầu hoàn tiền chờ duyệt": number;
}

export interface ComprehensiveReportResponse {
  overview: OverviewStats;
  revenue_summary: Record<string, number>;
  revenue_monthly: Array<Record<string, string | number>>;
  revenue_by_category: Array<Record<string, string | number>>;
  user_summary: Record<string, number>;
  users_by_role: Array<{ "Vai trò": string; "Số lượng": number }>;
  course_summary: Record<string, number>;
  courses_by_level: Array<{ "Cấp độ": string; "Số lượng": number }>;
  top_courses: Array<Record<string, string | number>>;
  instructor_summary: Record<string, number>;
  top_instructors: Array<Record<string, string | number>>;
  finance_summary: Record<string, number>;
  activity_summary: Record<string, number>;
  metadata: {
    report_date: string;
    from_date: string;
    to_date: string;
  };
}
