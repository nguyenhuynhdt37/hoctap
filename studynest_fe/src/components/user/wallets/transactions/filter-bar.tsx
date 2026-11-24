"use client";

import { Button } from "@/components/ui";
import type {
  WalletDatePreset,
  WalletTransactionsQuery,
} from "@/types/user/wallet";
import {
  ArrowDownLeft,
  ArrowUpRight,
  LayoutList,
  RefreshCw,
  Search,
  Table2,
  X,
} from "pulsoicon-react";

export type TransactionsViewMode = "timeline" | "table";

interface Props {
  searchValue: string;
  filters: WalletTransactionsQuery;
  viewMode: TransactionsViewMode;
  isLoading: boolean;
  onViewModeChange: (mode: TransactionsViewMode) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onStatusChange: (value: WalletTransactionsQuery["status"]) => void;
  onMethodChange: (value: WalletTransactionsQuery["method"]) => void;
  onDirectionChange: (value: "all" | "in" | "out") => void;
  onDatePresetChange: (preset: WalletDatePreset) => void;
  onOrderChange: (
    orderBy: WalletTransactionsQuery["orderBy"],
    orderDir: WalletTransactionsQuery["orderDir"],
  ) => void;
  onTypeChange: (value: WalletTransactionsQuery["type"]) => void;
  onResetFilters: () => void;
}

const typeChips = [
  { label: "Tất cả", value: "all" },
  { label: "Nạp Coin", value: "deposit" },
  { label: "Mua khóa học", value: "purchase" },
  { label: "Hoàn tiền", value: "refund" },
  { label: "Thu nhập", value: "income" },
  { label: "Rút tiền", value: "withdraw" },
  { label: "Phí nền tảng", value: "fee" },
];

const datePresetChips: Array<{ label: string; value: WalletDatePreset }> = [
  { label: "Toàn thời gian", value: "all" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Tháng này", value: "month" },
  { label: "90 ngày", value: "90d" },
];

const statusOptions = [
  { label: "Mọi trạng thái", value: "all" },
  { label: "Thành công", value: "completed" },
  { label: "Chờ xử lý", value: "pending" },
  { label: "Đã hoàn tiền", value: "refunded" },
  { label: "Đã hủy", value: "canceled" },
  { label: "Thất bại", value: "failed" },
];

const methodOptions = [
  { label: "Mọi phương thức", value: "all" },
  { label: "PayPal", value: "paypal" },
  { label: "Ví nội bộ", value: "wallet" },
  { label: "Hệ thống Mây Mây", value: "internal" },
];

const orderOptions = [
  { label: "Mới nhất", orderBy: "created_at", orderDir: "desc" },
  { label: "Cũ nhất", orderBy: "created_at", orderDir: "asc" },
  { label: "Số Coin cao → thấp", orderBy: "amount", orderDir: "desc" },
  { label: "Số Coin thấp → cao", orderBy: "amount", orderDir: "asc" },
];

export function TransactionsFilterBar({
  searchValue,
  filters,
  viewMode,
  isLoading,
  onViewModeChange,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onMethodChange,
  onDirectionChange,
  onDatePresetChange,
  onOrderChange,
  onTypeChange,
  onResetFilters,
}: Props) {
  const activeDatePreset = filters.datePreset ?? "all";
  const activeDirection = filters.direction ?? "all";

  const hasActiveFilter =
    Boolean(filters.search.trim()) ||
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.method !== "all" ||
    activeDirection !== "all" ||
    activeDatePreset !== "all";

  return (
    <div className="space-y-4 rounded-[26px] border border-border bg-surface/95 p-4 shadow-xs backdrop-blur-md sm:p-5">
      {/* Hàng 1: Chip Loại giao dịch + Chuyển chế độ xem */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Lọc theo loại giao dịch"
        >
          {typeChips.map((chip) => {
            const active = filters.type === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTypeChange(chip.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-background text-muted-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                }`}
              >
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bộ chuyển đổi Chế độ xem: Dòng thời gian ↔ Bảng */}
        <div className="inline-flex w-fit items-center rounded-full border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("timeline")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === "timeline"
                ? "bg-surface text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="inline-flex items-center">
              <LayoutList aria-hidden="true" animated={false} className="size-3.5" />
            </span>
            <span>Dòng thời gian</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              viewMode === "table"
                ? "bg-surface text-primary shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="inline-flex items-center">
              <Table2 aria-hidden="true" animated={false} className="size-3.5" />
            </span>
            <span>Bảng sổ cái</span>
          </button>
        </div>
      </div>

      {/* Hàng 2: Tìm kiếm + Bộ lọc nhanh Chiều dòng tiền & Khoảng ngày */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form
          className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center xl:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search aria-hidden="true" animated={false} className="size-4" />
            </span>
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm nội dung, mã giao dịch, mã đơn..."
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-9 text-xs text-foreground placeholder:text-subtle-foreground outline-none transition-all duration-200 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 sm:text-sm"
            />
            {searchValue && (
              <button
                type="button"
                aria-label="Xóa từ khóa"
                onClick={() => {
                  onSearchChange("");
                  if (filters.search) {
                    onResetFilters();
                  }
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-primary-light hover:text-primary cursor-pointer"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="rounded-2xl text-xs font-semibold shadow-2xs"
          >
            <span>Tìm kiếm</span>
          </Button>
        </form>

        {/* Chip chiều dòng tiền + khoảng thời gian */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-2xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => onDirectionChange("all")}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                activeDirection === "all"
                  ? "bg-surface text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Tất cả chiều</span>
            </button>
            <button
              type="button"
              onClick={() => onDirectionChange("in")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                activeDirection === "in"
                  ? "bg-primary-light text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="inline-flex items-center">
                <ArrowDownLeft aria-hidden="true" animated={false} className="size-3.5" />
              </span>
              <span>Tiền vào</span>
            </button>
            <button
              type="button"
              onClick={() => onDirectionChange("out")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                activeDirection === "out"
                  ? "bg-secondary-light text-secondary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-secondary-foreground"
              }`}
            >
              <span className="inline-flex items-center">
                <ArrowUpRight aria-hidden="true" animated={false} className="size-3.5" />
              </span>
              <span>Tiền ra</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {datePresetChips.map((preset) => {
              const active = activeDatePreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onDatePresetChange(preset.value)}
                  className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                    active
                      ? "border-primary-pastel bg-primary-light text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-foreground"
                  }`}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hàng 3: Dropdown Trạng thái, Phương thức, Sắp xếp & Đặt lại */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.status}
            onChange={(e) =>
              onStatusChange(e.target.value as WalletTransactionsQuery["status"])
            }
            aria-label="Lọc theo trạng thái"
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
                orderDir as WalletTransactionsQuery["orderDir"],
              );
            }}
            aria-label="Sắp xếp theo thứ tự"
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
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
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:opacity-50 cursor-pointer"
          >
            <span className="inline-flex items-center">
              <RefreshCw aria-hidden="true" animated={false} className="size-3.5" />
            </span>
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}
