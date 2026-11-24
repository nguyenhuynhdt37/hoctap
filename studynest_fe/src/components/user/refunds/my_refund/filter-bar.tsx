"use client";

import { RotateCcw, Search } from "pulsoicon-react";
import { Button } from "@/components/ui";
import type { RefundRequestsQuery } from "@/types/user/refund";
import { cn } from "@/lib/utils";

interface RefundRequestsFilterBarProps {
  searchValue: string;
  filters: RefundRequestsQuery;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onStatusChange: (value: RefundRequestsQuery["refund_status"]) => void;
  onOrderChange: (
    orderBy: RefundRequestsQuery["order_by"],
    orderDir: RefundRequestsQuery["order_dir"],
  ) => void;
  onResetFilters: () => void;
}

const statusOptions: Array<{
  label: string;
  value: RefundRequestsQuery["refund_status"];
}> = [
  { label: "Tất cả", value: "all" },
  { label: "Đã yêu cầu", value: "requested" },
  { label: "GV đã duyệt", value: "instructor_approved" },
  { label: "Admin duyệt", value: "admin_approved" },
  { label: "Đã hoàn Coin", value: "refunded" },
  { label: "GV từ chối", value: "instructor_rejected" },
  { label: "Admin từ chối", value: "admin_rejected" },
];

const orderOptions: Array<{
  label: string;
  value: {
    orderBy: RefundRequestsQuery["order_by"];
    orderDir: RefundRequestsQuery["order_dir"];
  };
}> = [
  { label: "Mới nhất", value: { orderBy: "created_at", orderDir: "desc" } },
  { label: "Cũ nhất", value: { orderBy: "created_at", orderDir: "asc" } },
  { label: "Coin cao → thấp", value: { orderBy: "refund_amount", orderDir: "desc" } },
  { label: "Coin thấp → cao", value: { orderBy: "refund_amount", orderDir: "asc" } },
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
  const currentOrderValue = `${filters.order_by}:${filters.order_dir}`;

  return (
    <section
      aria-label="Bộ lọc yêu cầu hoàn Coin"
      className="space-y-3 rounded-[24px] border border-border bg-surface/92 p-4 shadow-xs backdrop-blur-md"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex w-full flex-1 flex-col gap-2.5 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              animated={false}
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary"
            />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm theo tên khóa học, lý do hoàn Coin..."
              className="w-full rounded-full border border-border bg-background py-2.5 pr-4 pl-10 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading}
            className="min-h-10 rounded-full px-5 font-bold"
          >
            Tìm kiếm
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Sắp xếp yêu cầu"
            value={currentOrderValue}
            onChange={(event) => {
              const [orderBy, orderDir] = event.target.value.split(":") as [
                RefundRequestsQuery["order_by"],
                RefundRequestsQuery["order_dir"],
              ];
              onOrderChange(orderBy, orderDir);
            }}
            disabled={isLoading}
            className="min-h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {orderOptions.map((opt) => (
              <option
                key={`${opt.value.orderBy}:${opt.value.orderDir}`}
                value={`${opt.value.orderBy}:${opt.value.orderDir}`}
              >
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            disabled={isLoading}
            className="min-h-10 rounded-full px-3.5 text-xs font-bold"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            <span>Đặt lại</span>
          </Button>
        </div>
      </div>

      {/* Dải pill chọn nhanh trạng thái */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
        {statusOptions.map((opt) => {
          const active = filters.refund_status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              disabled={isLoading}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-background text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
