import { WalletTransactionsQuery } from "@/types/user/wallet";

interface Props {
  searchValue: string;
  filters: WalletTransactionsQuery;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onStatusChange: (value: WalletTransactionsQuery["status"]) => void;
  onMethodChange: (value: WalletTransactionsQuery["method"]) => void;
  onOrderChange: (
    orderBy: WalletTransactionsQuery["orderBy"],
    orderDir: WalletTransactionsQuery["orderDir"]
  ) => void;
  onTypeChange: (value: WalletTransactionsQuery["type"]) => void;
  onResetFilters: () => void;
}

const statusOptions = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Đang xử lý", value: "pending" },
  { label: "Thành công", value: "completed" },
  { label: "Đã hủy", value: "canceled" },
];

const methodOptions = [
  { label: "Tất cả phương thức", value: "all" },
  { label: "PayPal", value: "paypal" },
  { label: "Ví nội bộ", value: "wallet" },
  { label: "Nội bộ", value: "internal" },
];

const orderOptions = [
  { label: "Mới nhất", orderBy: "created_at", orderDir: "desc" },
  { label: "Cũ nhất", orderBy: "created_at", orderDir: "asc" },
  { label: "Số tiền cao → thấp", orderBy: "amount", orderDir: "desc" },
  { label: "Số tiền thấp → cao", orderBy: "amount", orderDir: "asc" },
];

export function TransactionsFilterBar({
  searchValue,
  filters,
  isLoading,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onMethodChange,
  onOrderChange,
  onTypeChange,
  onResetFilters,
}: Props) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0 0m0 0 2.5-2.5m-2.5 2.5L20 20"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo mô tả, mã giao dịch, order ID..."
              className="w-full rounded-lg border-2 border-green-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
          <select
            value={filters.status}
            onChange={(e) =>
              onStatusChange(e.target.value as WalletTransactionsQuery["status"])
            }
            className="rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={filters.method}
            onChange={(e) =>
              onMethodChange(e.target.value as WalletTransactionsQuery["method"])
            }
            className="rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
          >
            {methodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={`${filters.orderBy}-${filters.orderDir}`}
            onChange={(e) => {
              const [orderBy, orderDir] = e.target.value.split("-");
              onOrderChange(
                orderBy as WalletTransactionsQuery["orderBy"],
                orderDir as WalletTransactionsQuery["orderDir"]
              );
            }}
            className="rounded-lg border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-600 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500"
          >
            {orderOptions.map((opt) => (
              <option
                key={`${opt.orderBy}-${opt.orderDir}`}
                value={`${opt.orderBy}-${opt.orderDir}`}
              >
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-600 hover:bg-yellow-100 disabled:opacity-60"
          >
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}
