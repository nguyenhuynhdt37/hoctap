export interface UserProfile {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  birthday: string | null; // Có thể null
  created_at: string;
  updated_at: string;
}

export interface UserStatus {
  is_verified_email: boolean;
  email_verified_at: string | null;
  is_banned: boolean;
  banned_reason: string | null;
  banned_until: string | null;
  last_login_at: string;
  deleted_at: string | null; // Đổi từ delete_at
  deleted_until: string | null; // Lý do xóa
}

export interface UserStatistics {
  total_courses_enrolled: number;
  total_courses_completed: number;
  average_progress: number;
}

export interface UserTransactions {
  total_spent: number;
  currency: string;
  last_payment_at: string | null;
}

export interface UserRecentActivity {
  last_watched_course: string | null;
  last_watched_time: string | null;
}

export interface UserDetailResponse {
  profile: UserProfile;
  status: UserStatus;
  roles: string[];
  statistics: UserStatistics;
  transactions: UserTransactions;
  recent_activity: UserRecentActivity;
}
