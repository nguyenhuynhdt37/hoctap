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

export interface WalletTypeBreakdownItem {
  type: string;
  count: number;
  total_amount: number;
}

export interface WalletDailyCashflowItem {
  date: string;
  in_amount: number;
  out_amount: number;
  fee_amount: number;
  net: number;
  tx_count: number;
}

export interface WalletEscrowStatusSummary {
  count: number;
  instructor_amount: number;
  platform_amount: number;
}

export interface WalletHoldingItem {
  id: string;
  transaction_id: string | null;
  instructor_id: string;
  instructor_name: string;
  instructor_email: string | null;
  amount_instructor: number;
  amount_platform: number;
  hold_until: string | null;
  created_at: string | null;
}

export interface WalletReconciliation {
  expected_balance: number;
  delta: number;
  available_balance: number;
  is_balanced: boolean;
  total_logs: number;
}

export interface PlatformWalletOverview {
  wallet: PlatformWallet;
  recent_history: PlatformWalletHistory[];
  type_breakdown?: WalletTypeBreakdownItem[];
  daily_cashflow?: WalletDailyCashflowItem[];
  escrow_summary?: {
    by_status: Record<string, WalletEscrowStatusSummary>;
    holding_items: WalletHoldingItem[];
  };
  reconciliation?: WalletReconciliation;
}
