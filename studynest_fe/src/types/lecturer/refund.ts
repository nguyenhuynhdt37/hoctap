export interface LecturerRefundRequestItem {
  refund_id: string;
  status:
    | "requested"
    | "instructor_approved"
    | "instructor_rejected"
    | "admin_approved"
    | "admin_rejected"
    | "refunded";
  reason: string;
  refund_amount: number;
  created_at: string;
  student: {
    id: string;
    fullname: string;
    avatar: string;
  };
  course: {
    id: string;
    title: string;
    thumbnail: string;
  };
  instructor: {
    id: string;
    fullname: string;
    avatar: string;
  };
  earnings: {
    status: string | null;
    hold_until: string | null;
    amount_instructor: number | null;
  } | null;
}

export interface LecturerRefundRequestsResponse {
  page: number;
  limit: number;
  total: number;
  items: LecturerRefundRequestItem[];
}

export interface LecturerRefundRequestsQuery {
  page: number;
  limit: number;
  search?: string;
  refund_status?:
    | "requested"
    | "instructor_approved"
    | "instructor_rejected"
    | "admin_approved"
    | "admin_rejected"
    | "refunded"
    | "";
  course_id?: string;
  student_id?: string;
  date_from?: string;
  date_to?: string;
  order_by: "created_at" | "refund_amount" | "status";
  order_dir: "asc" | "desc";
}

export interface LecturerRefundDetailRefund {
  id: string;
  status:
    | "requested"
    | "instructor_approved"
    | "instructor_rejected"
    | "admin_approved"
    | "admin_rejected"
    | "refunded";
  amount: number;
  reason: string;
  created_at: string;
  instructor_reviewed_at: string | null;
  admin_reviewed_at: string | null;
  resolved_at: string | null;
  instructor_comment: string | null;
  admin_comment: string | null;
}

export interface LecturerRefundDetailPurchase {
  purchase_item_id: string;
  original_price: number;
  discounted_price: number;
  status: string;
  created_at: string;
  discount_id: string | null;
}

export interface LecturerRefundDetailCourse {
  course_id: string;
  title: string;
  thumbnail: string;
}

export interface LecturerRefundDetailInstructor {
  id: string;
  fullname: string;
  avatar: string;
}

export interface LecturerRefundDetailEarnings {
  status: string | null;
  amount_instructor: number | null;
  amount_platform: number | null;
  hold_until: string | null;
  refund_amount_real: number | null;
}

export interface LecturerRefundDetailData {
  refund: LecturerRefundDetailRefund;
  purchase: LecturerRefundDetailPurchase;
  course: LecturerRefundDetailCourse;
  instructor: LecturerRefundDetailInstructor;
  earnings: LecturerRefundDetailEarnings;
}

