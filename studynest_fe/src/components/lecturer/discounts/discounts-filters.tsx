"use client";

import { LayoutGrid, List, RotateCcw, Search } from "pulsoicon-react";
import { Button } from "@/components/ui";
import type { DiscountsFiltersProps } from "@/types/lecturer/discount";
import { cn } from "@/lib/utils";

interface ExtendedFiltersProps extends DiscountsFiltersProps {
  viewMode?: "cards" | "table";
  onViewModeChange?: (mode: "cards" | "table") => void;
}

export function DiscountsFilters({
  search,
  onSearchChange,
  discountType,
  onDiscountTypeChange,
  isActive,
  onIsActiveChange,
  validity,
  onValidityChange,
  sortBy,
  onSortByChange,
  orderDir,
  onOrderDirChange,
  onReset,
  viewMode = "cards",
  onViewModeChange,
}: ExtendedFiltersProps) {
  const hasFilters = Boolean(
    search || discountType || isActive !== null || validity || sortBy !== "created_at",
  );

  return (
    <section
      aria-label="Bộ lọc mã giảm giá khóa học"
      className="space-y-3 rounded-[24px] border border-border bg-surface/92 p-4 shadow-xs backdrop-blur-md"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            animated={false}
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên chương trình hoặc mã code…"
            className="h-10 w-full rounded-full border border-border bg-background pr-4 pl-10 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Bộ lọc chọn nhanh & chuyển chế độ xem */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Loại giảm giá"
            value={discountType}
            onChange={(e) => onDiscountTypeChange(e.target.value as "percent" | "fixed" | "")}
            className="h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Mọi hình thức</option>
            <option value="percent">Giảm phần trăm (%)</option>
            <option value="fixed">Giảm cố định (Coin)</option>
          </select>

          <select
            aria-label="Hiệu lực"
            value={validity}
            onChange={(e) =>
              onValidityChange(e.target.value as "expired" | "running" | "upcoming" | "")
            }
            className="h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Mọi thời hạn</option>
            <option value="running">Đang chạy</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="expired">Đã hết hạn</option>
          </select>

          <select
            aria-label="Trạng thái kích hoạt"
            value={isActive === null ? "" : isActive ? "true" : "false"}
            onChange={(e) => {
              const v = e.target.value;
              onIsActiveChange(v === "" ? null : v === "true");
            }}
            className="h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả bật/tắt</option>
            <option value="true">Đang bật</option>
            <option value="false">Đang tắt</option>
          </select>

          <select
            aria-label="Sắp xếp"
            value={`${sortBy}:${orderDir}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(":");
              onSortByChange(sb);
              onOrderDirChange(od as "asc" | "desc");
            }}
            className="h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="created_at:desc">Mới nhất</option>
            <option value="created_at:asc">Cũ nhất</option>
            <option value="usage_count:desc">Dùng nhiều nhất</option>
            <option value="end_at:asc">Sắp hết hạn</option>
          </select>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="min-h-10 rounded-full px-3.5 text-xs font-bold"
            >
              <RotateCcw aria-hidden="true" className="size-3.5" />
              <span>Đặt lại</span>
            </Button>
          )}

          {onViewModeChange && (
            <div
              role="group"
              aria-label="Chế độ hiển thị"
              className="inline-flex items-center rounded-full border border-border bg-background p-1"
            >
              <button
                type="button"
                aria-pressed={viewMode === "cards"}
                onClick={() => onViewModeChange("cards")}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid aria-hidden="true" animated={false} className="size-3.5" />
                <span>Thẻ vé</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "table"}
                onClick={() => onViewModeChange("table")}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <List aria-hidden="true" animated={false} className="size-3.5" />
                <span>Bảng</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
