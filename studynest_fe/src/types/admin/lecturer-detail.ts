export interface LecturerWallet {
  balance: number;
  total_in: number;
  total_out: number;
  last_transaction_at: string;
}

export interface LecturerUpgradePayment {
  amount: number;
  paid_time: string;
  payment_status: string;
  verified_by: string | null;
  note: string;
}

export interface LecturerTransaction {
  id: string;
  amount: number;
  type: string;
  method: string;
  status: string;
  transaction_code: string;
  description: string;
  created_at: string;
  confirmed_at: string;
}

export interface LecturerDetailResponse {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  is_verified_email: boolean;
  is_banned: boolean;
  banned_reason?: string | null;
  banned_until?: string | null;
  wallet: LecturerWallet;
  upgrade_payment: LecturerUpgradePayment;
  transactions: LecturerTransaction[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface LecturerCourse {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  price: number;
  rating_avg: number;
  rating_count: number;
  total_reviews: number;
  total_enrolls: number;
  views: number;
  language: string;
  level: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  sections: any[];
}

export interface LecturerCoursesResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  sort_by: string;
  order: string;
  has_next: boolean;
  has_previous: boolean;
  items: LecturerCourse[];
}
