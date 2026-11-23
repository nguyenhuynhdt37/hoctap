"use client";

import AdminTransactionDetail from "@/components/admin/transactions/detail";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { AdminTransaction, AdminTransactionUser } from "@/types/admin/transaction";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

interface AdminTransactionDetailData {
  transaction: AdminTransaction;
  user: AdminTransactionUser | null;
  wallet: { balance: number; is_locked: boolean; total_in: number; total_out: number } | null;
  recent_transactions: AdminTransaction[];
  course: { id: string; title: string } | null;
  purchase_items: {
    id: string;
    course_snapshot: { title: string } | null;
    original_price: number;
    discount_amount: number;
    discounted_price: number;
  }[];
  discount_history: unknown[];
  instructor_earnings: unknown[];
  platform_wallet_logs: { id: string; type: string; note: string | null; amount: number; created_at: string }[];
}

export default function TransactionDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<AdminTransactionDetailData>(
    `/admin/transactions/${encodeURIComponent(id)}`,
    { shouldRetryOnError: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto px-4 py-8">
        <Alert variant="destructive">Không thể tải chi tiết giao dịch.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto px-4 py-8 space-y-4" role="status" aria-label="Đang tải">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((card) => <Skeleton key={card} className="h-28" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return <AdminTransactionDetail data={data} />;
}
