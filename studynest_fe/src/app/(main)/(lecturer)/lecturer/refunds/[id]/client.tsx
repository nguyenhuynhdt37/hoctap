"use client";

import LecturerRefundDetail from "@/components/lecturer/refunds/detail";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { LecturerRefundDetailData } from "@/types/lecturer/refund";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function RefundDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<LecturerRefundDetailData>(
    `/lecturer/refunds/requests/${encodeURIComponent(id)}`,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Alert variant="destructive">Không thể tải chi tiết yêu cầu hoàn tiền.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-4" role="status" aria-label="Đang tải">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  return <LecturerRefundDetail data={data} onUpdated={mutate} />;
}
