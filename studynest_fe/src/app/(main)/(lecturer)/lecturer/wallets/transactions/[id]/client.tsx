"use client";

import LecturerTransactionDetail from "@/components/lecturer/wallets/detail";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { LecturerTransactionDetail as LecturerTransactionDetailData } from "@/types/lecturer/wallet";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function TransactionDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<LecturerTransactionDetailData>(
    `/lecturer/transactions/${encodeURIComponent(id)}`,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Alert variant="destructive">Không thể tải chi tiết giao dịch</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-4" role="status" aria-label="Đang tải">
        <Skeleton className="h-6 w-52" />
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          {[1, 2, 3, 4, 5].map((row) => <Skeleton key={row} className="h-10" />)}
        </div>
      </div>
    );
  }

  return <LecturerTransactionDetail transactionId={id} data={data} />;
}
