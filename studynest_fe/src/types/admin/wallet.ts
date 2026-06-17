export interface PlatformWallet {
  id: string;
  balance: number;
  total_in: number;
  total_out: number;
  holding_amount: number;
  platform_fee_total: number;
  currency: string;
  updated_at: string;
}

export interface PlatformWalletHistory {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  related_transaction_id: string | null;
  created_at: string;
}

export interface PlatformWalletOverview {
  wallet: PlatformWallet;
  recent_history: PlatformWalletHistory[];
}

