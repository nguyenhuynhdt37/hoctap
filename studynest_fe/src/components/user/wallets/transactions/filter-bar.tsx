import { Button } from "@/components/ui";
import { WalletTransactionsQuery } from "@/types/user/wallet";
import { HiRefresh, HiSearch } from "react-icons/hi";

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
    <div className="rounded-[24px] border border-border bg-surface/90 p-5 shadow-xs backdrop-blur-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Form tìm kiếm */}
        <form
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <HiSearch className="h-4 w-4" />
            </span>
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo mô tả, mã giao dịch, order ID..."
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-subtle-foreground outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="rounded-2xl font-semibold shadow-2xs"
          >
            <span>Tìm kiếm</span>
          </Button>
        </form>

        {/* Các bộ lọc dropdown */}
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
          <select
            value={filters.status}
            onChange={(e) =>
              onStatusChange(e.target.value as WalletTransactionsQuery["status"])
            }
            aria-label="Lọc theo trạng thái"
            className="rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
            aria-label="Lọc theo phương thức"
            className="rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
            aria-label="Sắp xếp theo thứ tự"
            className="rounded-2xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onResetFilters}
            disabled={isLoading}
            className="rounded-2xl text-xs font-semibold"
          >
            <HiRefresh className="h-3.5 w-3.5" />
            <span>Đặt lại</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
