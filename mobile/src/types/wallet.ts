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
  direction?: 'in' | 'out';
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

export interface WalletDepositResponse {
  approve_url: string;
  order_id: string;
  status: string;
}
