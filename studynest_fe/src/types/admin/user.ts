export interface User {
  id: string;
  fullname: string;
  email: string;
  created_at: string;
  updated_at: string;
  roles?: string[]; // Optional vì API không trả về
  is_verified_email: boolean;
  is_active?: boolean; // Optional vì API không trả về
  total_courses: number;
  last_login_at: string;
  is_banned: boolean;
}

export interface DeletedUser {
  id: string;
  fullname: string;
  email: string;
  created_at: string;
  roles: string[];
  is_verified_email: boolean;
  total_courses: number;
  deleted_at: string; // Đổi từ delete_at
  deleted_until?: string | null; // Đổi từ delete_until
  // Thêm các trường có thể có từ backend
  updated_at?: string;
  last_login_at?: string;
  is_active?: boolean;
}

export interface UsersResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  total_user_banned?: number; // Optional vì API có thể không trả về
  total_user_very_email?: number; // Optional vì API có thể không trả về
  total_courses_all_users?: number; // Optional vì API có thể không trả về
  has_next: boolean;
  has_previous: boolean;
  items: User[];
}

export interface DeletedUsersResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  total_courses_all_users: number;
  has_next: boolean;
  has_previous: boolean;
  items: DeletedUser[];
}

export interface UsersQueryParams {
  is_verified_email?: boolean;
  is_banned?: boolean;
  search?: string;
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  size?: number;
}
