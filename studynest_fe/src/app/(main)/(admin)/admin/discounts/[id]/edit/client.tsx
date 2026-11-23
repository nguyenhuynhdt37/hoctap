"use client";

import EditDiscount from "@/components/admin/discounts/edit";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { DiscountDetail } from "@/types/admin/discount";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function DiscountEditDataLoader({ discountId }: { discountId: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<DiscountDetail>(
    `/admin/discounts/${encodeURIComponent(discountId)}`,
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">Không thể tải thông tin mã giảm giá.</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4" role="status" aria-label="Đang tải">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-11 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return <EditDiscount data={data} discountId={discountId} />;
}
