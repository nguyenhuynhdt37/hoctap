import type { PlatformWallet } from "./wallet";

export type PlatformWalletLog = {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  note: string | null;
  related_transaction_id: string | null;
  created_at: string;
};

export type PlatformWalletTransaction = {
  id: string;
  user_id: string;
  course_id: string | null;
  amount: number;
  type: string;
  currency: string;
  direction: string;
  method: string;
  gateway: string;
  order_id: string | null;
  status: string;
  transaction_code: string | null;
  description: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type PlatformWalletUserSummary = {
  id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  created_at: string;
};

export type PlatformWalletCourseSummary = {
  id: string;
  title: string;
  base_price: number;
  thumbnail_url: string | null;
  instructor_id: string;
};

export type PlatformWalletPurchaseItem = {
  id: string;
  course_id: string;
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  discount_id: string | null;
  status: string;
  created_at: string;
};

export type PlatformWalletInstructorEarning = {
  id: string;
  instructor_id: string;
  amount_instructor: number;
  amount_platform: number;
  status: string;
  hold_until: string | null;
  created_at: string;
};

export type PlatformWalletDiscountHistoryItem = {
  id: string;
  user_id: string;
  discount_id: string;
  purchase_item_id: string;
  discounted_amount: number;
  created_at: string;
};

export type PlatformWalletDiscount = {
  id: string;
  name: string;
  discount_code: string;
  applies_to: string;
  discount_type: "percent" | "fixed" | string;
  percent_value: number;
  fixed_value: number;
  usage_limit: number | null;
  usage_count: number;
  start_at: string;
  end_at: string;
};

export type PlatformWalletHistoryDetail = {
  log: PlatformWalletLog;
  wallet: PlatformWallet;
  transaction: PlatformWalletTransaction;
  user: PlatformWalletUserSummary;
  courses: PlatformWalletCourseSummary[];
  purchase_items: PlatformWalletPurchaseItem[];
  instructor_earnings: PlatformWalletInstructorEarning[];
  discount_history?: PlatformWalletDiscountHistoryItem[];
  discount?: PlatformWalletDiscount | null;
};
