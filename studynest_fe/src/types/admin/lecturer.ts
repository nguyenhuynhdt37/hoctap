export interface Lecturer {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  citizenship_identity: string | null;
  birthday: string;
  conscious: string | null;
  district: string | null;
  course_count: number;
  student_count: number;
  evaluated_count: number;
  rating_avg: number;
  instructor_description: string;
  wallet_balance: number;
  upgrade_date: string;
  is_verified_email: boolean;
  is_banned: boolean;
  create_at: string;
  update_at: string;
}

export interface LecturersResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  items: Lecturer[];
}

export interface LecturersQueryParams {
  is_verified_email?: boolean;
  is_banned?: boolean;
  search?: string;
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  size?: number;
}
