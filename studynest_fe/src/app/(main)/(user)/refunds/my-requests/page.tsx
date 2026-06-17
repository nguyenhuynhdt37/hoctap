import MyRefundRequests from "@/components/user/refunds/my_refund";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import {
  RefundRequestsQuery,
  RefundRequestsResponse,
} from "@/types/user/refund";
import { cookies } from "next/headers";

const defaultResponse: RefundRequestsResponse = {
  page: 1,
  limit: 10,
  total: 0,
  items: [],
};

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

export default async function MyRefundRequestsPage() {
  const store = await cookies();

  let initialData: RefundRequestsResponse = defaultResponse;
  let initialError: string | null = null;

  try {
    const queryString = new URLSearchParams({
      page: defaultQuery.page.toString(),
      limit: defaultQuery.limit.toString(),
      order_by: defaultQuery.order_by,
      order_dir: defaultQuery.order_dir,
    }).toString();

    const response = await fetcher(
      `/users/refunds/my-requests?${queryString}`,
      store
    );

    if (response.ok) {
      initialData = await response.json();
    } else {
      const errorData = await response.json().catch(() => ({}));
      initialError =
        errorData?.detail ||
        errorData?.message ||
        "Không thể tải danh sách yêu cầu hoàn tiền. Vui lòng thử lại.";
    }
  } catch (error) {
    console.error("My refund requests page error:", error);
    initialError =
      "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.";
  }

  return (
    <MyRefundRequests
      initialData={initialData}
      initialQuery={defaultQuery}
      initialError={initialError}
    />
  );
}

