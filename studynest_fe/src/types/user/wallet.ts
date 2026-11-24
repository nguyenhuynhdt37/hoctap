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

export type WalletDatePreset = "all" | "7d" | "30d" | "month" | "90d";

export interface WalletTransactionsQuery {
  page: number;
  limit: number;
  search: string;
  status: "all" | "pending" | "completed" | "canceled" | "refunded" | "failed";
  type: "all" | string;
  method: "all" | string;
  direction?: "all" | "in" | "out";
  orderBy: WalletTransactionOrderBy;
  orderDir: "asc" | "desc";
  datePreset?: WalletDatePreset;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface MonthlyCashflowPoint {
  key: string;
  label: string;
  full_label: string;
  in_vnd: number;
  out_vnd: number;
  count: number;
}

export interface CategoryBreakdownItem {
  type: string;
  direction: "in" | "out";
  count: number;
  amount_vnd: number;
}

export interface PendingOrderHighlight {
  id: string;
  order_id: string;
  amount: number;
  method: string | null;
  gateway: string | null;
  description: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface WalletTransactionSummary {
  total_in_vnd: number;
  total_out_vnd: number;
  net_vnd: number;
  counts: {
    all: number;
    completed: number;
    pending: number;
    canceled: number;
    refunded: number;
    failed: number;
  };
  by_type: CategoryBreakdownItem[];
  monthly_cashflow: MonthlyCashflowPoint[];
  pending_orders: PendingOrderHighlight[];
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
