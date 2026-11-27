"use client";

import { PageDataScope, pageErrorMessage, PageLoadError, RefundListSkeleton, useProtectedPageSWR } from "@/components/shared/page-load-state";
import RefundableCourses from "@/components/user/refunds/refundable";
import type { RefundableCoursesResponse } from "@/types/user/refund";

export default function RefundableCoursesLoader() {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<RefundableCoursesResponse>("/users/refunds/my/refundable-courses?page=1&limit=10");

  if (!data && error) {
    return (
      <div className="user-container py-8">
        <PageLoadError
          message={pageErrorMessage(
            error,
            "Không thể tải danh sách khóa học. Vui lòng thử lại.",
            "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.",
          )}
          onRetry={() => void mutate()}
          retrying={isValidating}
        />
      </div>
    );
  }

  if (!data) return <RefundListSkeleton courses />;

  return (
    <PageDataScope>
      <RefundableCourses initialData={data} initialError={null} />
    </PageDataScope>
  );
}
