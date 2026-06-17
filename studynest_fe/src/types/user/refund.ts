export interface RefundableCourseItem {
  purchase_item_id: string;
  purchase_date: string;
  deadline: string;
  can_refund: boolean;
  original_price: number;
  discounted_price: number;
  course: {
    course_id: string;
    title: string;
    thumbnail: string;
  };
  instructor: {
    id: string;
    fullname: string;
    avatar: string;
  };
  earnings: {
    status: string;
    hold_until: string;
  };
}

export interface RefundableCoursesResponse {
  page: number;
  limit: number;
  total: number;
  items: RefundableCourseItem[];
}

export interface RefundRequestItem {
  refund_id: string;
  refund_status: string;
  refund_amount: number;
  refund_reason: string;
  requested_at: string;
  instructor_reviewed_at: string | null;
  admin_reviewed_at: string | null;
  purchase: {
    purchase_item_id: string;
    original_price: number;
    discounted_price: number;
    status: string;
    created_at: string;
  };
  course: {
    course_id: string;
    title: string;
    thumbnail: string;
  };
  instructor: {
    id: string;
    fullname: string;
    avatar: string;
  };
}

export interface RefundRequestsResponse {
  page: number;
  limit: number;
  total: number;
  items: RefundRequestItem[];
}

export interface RefundRequestsQuery {
  page: number;
  limit: number;
  search: string;
  refund_status: string;
  course_id: string;
  instructor_id: string;
  date_from: string;
  date_to: string;
  order_by: "created_at" | "refund_amount" | "refund_status";
  order_dir: "asc" | "desc";
}

export interface RefundDetailRefund {
  id: string;
  status: string;
  amount: number;
  reason: string;
  created_at: string;
  instructor_reviewed_at: string | null;
  admin_reviewed_at: string | null;
  resolved_at: string | null;
  instructor_comment: string | null;
  admin_comment: string | null;
}

export interface RefundDetailPurchase {
  purchase_item_id: string;
  original_price: number;
  discounted_price: number;
  status: string;
  created_at: string;
  discount_id: string | null;
}

export interface RefundDetailCourse {
  course_id: string;
  title: string;
  thumbnail: string;
}

export interface RefundDetailInstructor {
  id: string;
  fullname: string;
  avatar: string;
}

export interface RefundDetailEarnings {
  status: string | null;
  amount_instructor: number | null;
  amount_platform: number | null;
  hold_until: string | null;
  refund_amount_real: number | null;
}

export interface RefundDetailData {
  refund: RefundDetailRefund;
  purchase: RefundDetailPurchase;
  course: RefundDetailCourse;
  instructor: RefundDetailInstructor;
  earnings: RefundDetailEarnings;
}

