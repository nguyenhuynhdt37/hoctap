"use client";

import { PageDataScope, pageErrorMessage, PageLoadError, RefundListSkeleton, useProtectedPageSWR } from "@/components/shared/page-load-state";
import MyRefundRequests from "@/components/user/refunds/my_refund";
import type { RefundRequestsQuery, RefundRequestsResponse } from "@/types/user/refund";

const defaultQuery: RefundRequestsQuery = {
  page: 1,
  limit: 10,
  search: "",
  refund_status: "all",
  course_id: "",
  instructor_id: "",
  date_from: "",
  date_to: "",
  order_by: "created_at",
  order_dir: "desc",
};

const queryString = new URLSearchParams({
  page: defaultQuery.page.toString(),
  limit: defaultQuery.limit.toString(),
  order_by: defaultQuery.order_by,
  order_dir: defaultQuery.order_dir,
});

export default function MyRefundRequestsLoader() {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<RefundRequestsResponse>(`/users/refunds/my-requests?${queryString}`);

  if (!data && error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageLoadError
          message={pageErrorMessage(
            error,
            "Không thể tải danh sách yêu cầu hoàn tiền. Vui lòng thử lại.",
            "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.",
          )}
          onRetry={() => void mutate()}
          retrying={isValidating}
        />
      </div>
    );
  }

  if (!data) return <RefundListSkeleton />;

  return (
    <PageDataScope>
      <MyRefundRequests initialData={data} initialQuery={defaultQuery} initialError={null} />
    </PageDataScope>
  );
}
