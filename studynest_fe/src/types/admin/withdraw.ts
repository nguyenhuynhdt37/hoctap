export interface AdminWithdrawItem {
  id: string;
  lecturer_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  rejected_at: string | null;
  reason: string | null;
}

export interface AdminWithdrawResponse {
  page: number;
  limit: number;
  total: number;
  items: AdminWithdrawItem[];
}

export interface AdminLecturerOption {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
}

export interface AdminWithdrawDetail {
  id: string;
  lecturer_id: string;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  paypal_batch_id: string | null;
  reason: string | null;
  lecturer: {
    id: string;
    fullname: string;
    email: string;
    avatar: string | null;
  };
  wallets: {
    id: string;
    balance: number;
    total_in: number;
    total_out: number;
    currency: string;
    is_locked: boolean;
    kyc_verified: boolean;
    created_at: string;
    updated_at: string;
    last_transaction_at: string | null;
  };
}
