import RefundableCourses from "@/components/user/refunds/refundable";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { RefundableCoursesResponse } from "@/types/user/refund";
import { cookies } from "next/headers";

const defaultResponse: RefundableCoursesResponse = {
  page: 1,
  limit: 10,
  total: 0,
  items: [],
};

export default async function RefundableCoursesPage() {
  const store = await cookies();

  let initialData: RefundableCoursesResponse = defaultResponse;
  let initialError: string | null = null;

  try {
    const queryString = new URLSearchParams({
      page: "1",
      limit: "10",
    }).toString();

    const response = await fetcher(
      `/users/refunds/my/refundable-courses?${queryString}`,
      store
    );

    if (response.ok) {
      initialData = await response.json();
    } else {
      const errorData = await response.json().catch(() => ({}));
      initialError =
        errorData?.detail ||
        errorData?.message ||
        "Không thể tải danh sách khóa học. Vui lòng thử lại.";
    }
  } catch (error) {
    console.error("Refundable courses page error:", error);
    initialError =
      "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.";
  }

  return (
    <RefundableCourses initialData={initialData} initialError={initialError} />
  );
}
