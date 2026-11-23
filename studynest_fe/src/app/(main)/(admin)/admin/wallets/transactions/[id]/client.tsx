"use client";

import WalletTxnDetail from "@/components/admin/wallets/transactions/detail";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { PlatformWalletHistoryDetail } from "@/types/admin/platform-wallet";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function WalletTxnDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<PlatformWalletHistoryDetail>(
    `/admin/platform-wallet/history/${encodeURIComponent(id)}`,
    { shouldRetryOnError: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">Không thể tải chi tiết giao dịch ví.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="p-6 space-y-4" role="status" aria-label="Đang tải">
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

  return <WalletTxnDetail data={data} />;
}
