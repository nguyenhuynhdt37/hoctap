"use client";

import AdminWithdrawDetailComponent from "@/components/admin/withdraws/detail";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { AdminWithdrawDetail } from "@/types/admin/withdraw";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function WithdrawDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<AdminWithdrawDetail>(
    `/admin/withdraw/${encodeURIComponent(id)}`,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Alert variant="destructive">Không thể tải chi tiết yêu cầu rút tiền.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4" role="status" aria-label="Đang tải">
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

  return <AdminWithdrawDetailComponent data={data} onUpdated={mutate} />;
}
