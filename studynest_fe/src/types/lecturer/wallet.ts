export interface LecturerWallet {
  id: string;
  total_out: number;
  is_locked: boolean;
  created_at: string;
  kyc_verified: boolean;
  balance: number;
  user_id: string;
  total_in: number;
  currency: string;
  last_transaction_at: string | null;
  updated_at: string;
}

export interface LecturerTransaction {
  id: string;
  amount: number;
  type: string;
  direction?: "in" | "out";
  status: string;
  description: string | null;
  method: string | null;
  gateway: string | null;
  transaction_code: string | null;
  order_id: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface LecturerTransactionItem {
  transaction: LecturerTransaction;
  earnings: unknown | null;
  course: unknown | null;
  student: unknown | null;
  purchase_items: unknown[];
  discount_history: unknown[];
  discount: unknown | null;
}

export interface LecturerTransactionsResponse {
  page: number;
  limit: number;
  total: number;
  items: LecturerTransactionItem[];
}

export interface LecturerTransactionDetail {
  id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  gateway: string;
  method: string;
  status: string;
  description: string | null;
  transaction_code: string | null;
  order_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  deposit?: {
    paypal_order_id: string | null;
    paypal_capture_id: string | null;
    from: string;
  };
  purchase?: {
    purchase_item_id: string;
    original_price: number;
    discounted_price: number;
    discount_amount: number;
    status: string;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    instructor_id: string;
  };
  discount?: {
    code: string;
    type: string;
    percent_value: number;
    fixed_value: number;
  };
  refund_request?: {
    refund_id: string;
    status: string;
    amount: number;
  };
  income?: {
    amount_instructor: number;
    amount_platform: number;
    hold_until: string | null;
    available_at: string | null;
    paid_at: string | null;
  };
  refund?: {
    refund_id: string;
    status: string;
    reason: string | null;
    refund_amount: number;
  };
  withdraw?: {
    withdrawal_id: string;
    status: string;
    requested_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    amount: number;
    currency: string;
  };
}

