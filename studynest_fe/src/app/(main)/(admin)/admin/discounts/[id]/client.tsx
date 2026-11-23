"use client";

import DiscountDetails from "@/components/admin/discounts/details";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { DiscountDetail } from "@/types/admin/discount";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function DiscountDataLoader({ discountId }: { discountId: string }) {
  const { data, error, isValidating, mutate } = useAuthedSWR<DiscountDetail>(
    `/admin/discounts/${encodeURIComponent(discountId)}`,
    { shouldRetryOnError: false },
  );
  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (error) {
    return (
      <div className="mx-auto px-4 py-8">
        <Alert variant="destructive">Không thể tải thông tin mã giảm giá.</Alert>
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
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((card) => <Skeleton key={card} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return <DiscountDetails data={data} />;
}
