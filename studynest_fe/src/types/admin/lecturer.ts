export type MasterContractStatus =
  | "countersigned"
  | "signed"
  | "pending_otp"
  | "draft"
  | "revoked"
  | "none";

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
  paid_coins?: number;
  bonus_coins?: number;
  upgrade_date: string;
  is_verified_email: boolean;
  is_banned: boolean;
  master_contract_status?: MasterContractStatus;
  master_contract_id?: string | null;
  master_contract_number?: string | null;
  master_contract_signed_at?: string | null;
  create_at: string;
  update_at: string;
}

export interface LecturersSummary {
  total_lecturers: number;
  active_lecturers: number;
  banned_lecturers: number;
  verified_emails: number;
  countersigned_contracts: number;
  pending_countersign_contracts: number;
  unsigned_contracts: number;
  total_courses: number;
  total_students: number;
  total_paid_coins: number;
  total_bonus_coins: number;
}

export interface LecturersResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  summary?: LecturersSummary;
  items: Lecturer[];
}

export interface LecturersQueryParams {
  is_verified_email?: boolean;
  is_banned?: boolean;
  contract_status?: "countersigned" | "signed" | "unsigned";
  search?: string;
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  size?: number;
}
