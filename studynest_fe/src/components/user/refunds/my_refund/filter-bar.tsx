import { RefundRequestsQuery } from "@/types/user/refund";

interface RefundRequestsFilterBarProps {
  searchValue: string;
  filters: RefundRequestsQuery;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onStatusChange: (value: RefundRequestsQuery["refund_status"]) => void;
  onOrderChange: (
    orderBy: RefundRequestsQuery["order_by"],
    orderDir: RefundRequestsQuery["order_dir"]
  ) => void;
  onResetFilters: () => void;
}

const statusOptions: Array<{
  label: string;
  value: RefundRequestsQuery["refund_status"];
}> = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Đã yêu cầu", value: "requested" },
  { label: "GV đã duyệt", value: "instructor_approved" },
  { label: "GV đã từ chối", value: "instructor_rejected" },
  { label: "Admin đã duyệt", value: "admin_approved" },
  { label: "Admin đã từ chối", value: "admin_rejected" },
  { label: "Đã hoàn tiền", value: "refunded" },
];

const orderOptions: Array<{
  label: string;
  value: {
    orderBy: RefundRequestsQuery["order_by"];
    orderDir: RefundRequestsQuery["order_dir"];
  };
}> = [
  {
    label: "Mới nhất",
    value: { orderBy: "created_at", orderDir: "desc" },
  },
  {
    label: "Cũ nhất",
    value: { orderBy: "created_at", orderDir: "asc" },
  },
  {
    label: "Số tiền cao → thấp",
    value: { orderBy: "refund_amount", orderDir: "desc" },
  },
  {
    label: "Số tiền thấp → cao",
    value: { orderBy: "refund_amount", orderDir: "asc" },
  },
];

export function RefundRequestsFilterBar({
  searchValue,
  filters,
  isLoading,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onOrderChange,
  onResetFilters,
}: RefundRequestsFilterBarProps) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="m20 20-2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm theo tên khóa học, lý do hoàn tiền..."
              className="w-full rounded-lg border-2 border-green-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
          <select
            value={filters.refund_status}
            onChange={(event) =>
              onStatusChange(
                event.target.value as RefundRequestsQuery["refund_status"]
              )
            }
            className="rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={`${filters.order_by}-${filters.order_dir}`}
            onChange={(event) => {
              const [orderBy, orderDir] = event.target.value.split("-");
              onOrderChange(
                orderBy as RefundRequestsQuery["order_by"],
                orderDir as RefundRequestsQuery["order_dir"]
              );
            }}
            className="rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500"
          >
            {orderOptions.map((option) => (
              <option
                key={`${option.value.orderBy}-${option.value.orderDir}`}
                value={`${option.value.orderBy}-${option.value.orderDir}`}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-600 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}

