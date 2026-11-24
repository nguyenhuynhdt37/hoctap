"use client";

import { cn } from "@/lib/utils";
import { RefreshCw, Search, X } from "pulsoicon-react";

interface NotificationsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  typeFilter?: string;
  onTypeFilterChange?: (value: string) => void;
  readFilter: string;
  onReadFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

const lecturerTypes = [
  { value: "", label: "Tất cả kênh" },
  { value: "learning", label: "Học tập" },
  { value: "course", label: "Khóa học" },
  { value: "wallet", label: "Ví & Coin" },
  { value: "refund", label: "Hoàn tiền" },
  { value: "security", label: "Bảo mật" },
  { value: "system", label: "Hệ thống" },
];

const readTabs = [
  { value: "", label: "Tất cả" },
  { value: "false", label: "Chưa đọc" },
  { value: "true", label: "Đã đọc" },
];

const sortPresets = [
  { label: "Mới nhất trước", sortBy: "created_at", orderDir: "desc" },
  { label: "Cũ nhất trước", sortBy: "created_at", orderDir: "asc" },
  { label: "Ưu tiên chưa đọc", sortBy: "is_read", orderDir: "asc" },
  { label: "Theo kênh thông báo", sortBy: "type", orderDir: "asc" },
];

export function NotificationsToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  readFilter,
  onReadFilterChange,
  sortBy,
  onSortByChange,
  orderDir,
  onOrderDirChange,
  hasActiveFilters = false,
  onResetFilters,
}: NotificationsToolbarProps) {
  const currentSortValue = `${sortBy}:${orderDir}`;

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-surface/95 p-4 shadow-xs backdrop-blur-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search aria-hidden="true" animated={false} className="size-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung thông báo..."
            className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-9 text-xs text-foreground placeholder:text-subtle-foreground outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Xóa nội dung tìm kiếm"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-primary-light hover:text-primary cursor-pointer"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Segmented tabs trạng thái đọc */}
        <div className="inline-flex w-fit items-center rounded-2xl border border-border bg-background p-1">
          {readTabs.map((tab) => {
            const active = readFilter === tab.value;
            return (
              <button
                key={tab.value || "all"}
                type="button"
                onClick={() => onReadFilterChange(tab.value)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                  active
                    ? "bg-surface text-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hàng dưới: Sắp xếp + Đặt lại */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {onTypeFilterChange && (
            <select
              value={typeFilter ?? ""}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              aria-label="Lọc theo kênh thông báo"
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {lecturerTypes.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            Sắp xếp:
          </span>
          <select
            value={currentSortValue}
            onChange={(e) => {
              const [nextSort, nextDir] = e.target.value.split(":");
              onSortByChange(nextSort);
              onOrderDirChange(nextDir as "asc" | "desc");
            }}
            aria-label="Sắp xếp thông báo"
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {sortPresets.map((preset) => (
              <option
                key={`${preset.sortBy}:${preset.orderDir}`}
                value={`${preset.sortBy}:${preset.orderDir}`}
              >
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
          >
            <span className="inline-flex items-center">
              <RefreshCw
                aria-hidden="true"
                animated={false}
                className="size-3.5"
              />
            </span>
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}
