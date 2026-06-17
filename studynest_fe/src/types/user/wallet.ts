export interface WalletSummary {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  total_in: number;
  total_out: number;
  is_locked: boolean;
  last_transaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  method: string;
  gateway: string;
  amount: number;
  direction?: "in" | "out";
  currency: string;
  status: string;
  description: string;
  created_at: string;
  confirmed_at: string | null;
  transaction_code: string | null;
  order_id: string | null;
}

export interface WalletTransactionsResponse {
  page: number;
  limit: number;
  total: number;
  transactions: WalletTransaction[];
}

export type WalletTransactionOrderBy = "created_at" | "amount" | "status";

export interface WalletTransactionsQuery {
  page: number;
  limit: number;
  search: string;
  status: "all" | "pending" | "completed" | "canceled";
  type: "all" | string;
  method: "all" | string;
  orderBy: WalletTransactionOrderBy;
  orderDir: "asc" | "desc";
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface TransactionDetailPurchase {
  purchase_item_id: string;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  status: string;
  created_at: string;
}

export interface TransactionDetailCourse {
  course_id: string;
  slug: string;
  title: string;
  thumbnail: string;
  instructor_id: string;
}

export interface TransactionDetailInstructor {
  name: string;
  avatar: string;
  id: string;
}

export interface TransactionDetailDiscount {
  discount_id: string;
  code: string;
  type: string;
  percent_value: number;
  fixed_value: number;
}

export interface TransactionDetailEarnings {
  amount_instructor: number;
  amount_platform: number;
  status: string;
  hold_until: string | null;
  available_at: string | null;
  paid_at: string | null;
}

export interface TransactionDetailRefundRequest {
  refund_id: string;
  status: string;
  reason: string | null;
  instructor_comment: string | null;
  admin_comment: string | null;
  refund_amount: number;
  created_at: string;
  instructor_reviewed_at: string | null;
  admin_reviewed_at: string | null;
  resolved_at: string | null;
}

export interface TransactionDetailData {
  id: string;
  type: string;
  method: string;
  gateway: string;
  amount: number;
  direction?: "in" | "out";
  currency: string;
  status: string;
  description: string | null;
  order_id: string | null;
  transaction_code: string | null;
  created_at: string;
  confirmed_at: string | null;
  purchase?: TransactionDetailPurchase;
  course?: TransactionDetailCourse;
  instructor?: TransactionDetailInstructor;
  discount?: TransactionDetailDiscount;
  earnings?: TransactionDetailEarnings;
  refund_request?: TransactionDetailRefundRequest;
}
