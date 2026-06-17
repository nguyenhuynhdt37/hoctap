export interface AdminTransaction {
  id: string;
  ref_id: string | null;
  direction: "in" | "out";
  confirmed_at: string | null;
  user_id: string | null;
  method: "wallet" | "paypal" | "momo" | "vnpay" | "bank_transfer" | string;
  updated_at: string;
  gateway: "internal_wallet" | "paypal" | "momo" | "stripe" | string;
  return_pathname: string | null;
  order_id: string | null;
  return_origin: string | null;
  type:
    | "topup"
    | "purchase"
    | "withdraw"
    | "refund"
    | "upgrade"
    | "payout"
    | string;
  status: "pending" | "completed" | "failed" | "refunded" | "canceled" | string;
  amount: number;
  course_id: string | null;
  transaction_code: string | null;
  description: string | null;
  currency: string;
  created_at: string;
}

export interface AdminTransactionUser {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
}

export interface AdminTransactionItem {
  transaction: AdminTransaction;
  user: AdminTransactionUser | null;
  course: { id: string; title: string } | null;
}

export interface AdminTransactionsSummary {
  total_amount: string;
  total_in: string;
  total_out: string;
}

export interface AdminTransactionsResponse {
  total: number;
  page: number;
  limit: number;
  summary: AdminTransactionsSummary;
  items: AdminTransactionItem[];
}

export interface AdminTransactionsQuery {
  page: number;
  limit: number;
  search?: string;
  type?: string;
  status?: string;
  direction?: string;
  method?: string;
  gateway?: string;
  user_id?: string;
  course_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  order_dir?: "asc" | "desc";
}


