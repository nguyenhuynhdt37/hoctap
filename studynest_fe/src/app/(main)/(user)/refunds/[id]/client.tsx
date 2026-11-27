"use client";

import { pageErrorMessage, PageLoadError, useProtectedPageSWR } from "@/components/shared/page-load-state";
import { Skeleton } from "@/components/ui";
import RefundRequestDetail from "@/components/user/refunds/detail";
import type { RefundDetailData } from "@/types/user/refund";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function RefundDataLoader({ id }: { id: string }) {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<RefundDetailData>(`/users/refunds/requests/${encodeURIComponent(id)}`);

  if (isAxiosError(error) && error.response?.status === 404) notFound();

  if (!data && error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <PageLoadError
          message={pageErrorMessage(
            error,
            "Không thể tải chi tiết yêu cầu hoàn tiền. Vui lòng thử lại.",
            "Không thể kết nối đến server. Vui lòng thử lại sau.",
          )}
          onRetry={() => void mutate()}
          retrying={isValidating}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" aria-label="Đang tải chi tiết yêu cầu hoàn tiền" className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <RefundRequestDetail data={data} />;
}
