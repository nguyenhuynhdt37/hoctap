export interface HoldEarningsItem {
  earnings_id: string;
  status: "holding" | "freeze";
  amount_instructor: number;
  hold_until: string;
  created_at: string;
  course: {
    course_id: string;
    title: string;
    thumbnail: string;
  };
  student: {
    id: string;
    fullname: string;
    avatar: string;
  };
  purchase_item_id: string;
  refund: {
    refund_id: string | null;
    status: string | null;
    reason: string | null;
  } | null;
}

export interface HoldEarningsResponse {
  page: number;
  limit: number;
  total: number;
  items: HoldEarningsItem[];
}

export interface HoldEarningsQuery {
  page: number;
  limit: number;
  search?: string;
  status?: "holding" | "freeze" | "";
  course_id?: string;
  student_id?: string;
  date_from?: string;
  date_to?: string;
  order_by: "created_at" | "hold_until" | "amount_instructor" | "status";
  order_dir: "asc" | "desc";
}

export interface HoldStudent {
  id: string;
  fullname: string;
  avatar: string;
}

export interface HoldCourse {
  id: string;
  title: string;
  thumbnail: string;
}
