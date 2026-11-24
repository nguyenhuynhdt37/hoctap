"use client";

import { useState } from "react";
import {
  Calendar,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import type { LecturerRefundRequestsQuery } from "@/types/lecturer/refund";
import { cn } from "@/lib/utils";
import { CourseSelector } from "../hold/course-selector";
import { StudentSelector } from "../hold/student-selector";

const STATUS_OPTIONS: Array<{
  value: LecturerRefundRequestsQuery["refund_status"];
  label: string;
}> = [
  { value: "", label: "Tất cả" },
  { value: "requested", label: "Chờ phản hồi" },
  { value: "instructor_approved", label: "GV đã duyệt" },
  { value: "admin_approved", label: "Admin duyệt" },
  { value: "refunded", label: "Đã hoàn Coin" },
  { value: "instructor_rejected", label: "GV từ chối" },
  { value: "admin_rejected", label: "Admin từ chối" },
];

interface RefundRequestsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: LecturerRefundRequestsQuery["refund_status"];
  onStatusChange: (value: LecturerRefundRequestsQuery["refund_status"]) => void;
  courseId: string;
  onCourseIdChange: (value: string) => void;
  studentId: string;
  onStudentIdChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortBy: LecturerRefundRequestsQuery["order_by"];
  onSortByChange: (value: LecturerRefundRequestsQuery["order_by"]) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
  onReset: () => void;
  viewMode?: "cards" | "table";
  onViewModeChange?: (mode: "cards" | "table") => void;
}

export function RefundRequestsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  courseId,
  onCourseIdChange,
  studentId,
  onStudentIdChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortByChange,
  orderDir,
  onOrderDirChange,
  onReset,
  viewMode = "cards",
  onViewModeChange,
}: RefundRequestsFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const advancedCount = [courseId, studentId, dateFrom, dateTo].filter(Boolean).length;
  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "" ||
    advancedCount > 0 ||
    sortBy !== "created_at" ||
    orderDir !== "desc";

  return (
    <section
      aria-label="Bộ lọc yêu cầu hoàn Coin"
      className="space-y-3 rounded-[24px] border border-border bg-surface/92 p-4 shadow-xs backdrop-blur-md"
    >
      {/* Tầng 1: Tìm kiếm + Sắp xếp + Bộ lọc nâng cao + Chế độ xem */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
            placeholder="Tìm theo lý do, tên khóa học hoặc tên học viên…"
            className="h-10 w-full rounded-full border border-border bg-background pr-4 pl-10 text-xs font-medium text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Sắp xếp hồ sơ"
            value={`${sortBy}:${orderDir}`}
            onChange={(e) => {
              const [sb, od] = e.target.value.split(":");
              onSortByChange(sb as LecturerRefundRequestsQuery["order_by"]);
              onOrderDirChange(od as "asc" | "desc");
            }}
            className="h-10 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="created_at:desc">Mới nhất</option>
            <option value="created_at:asc">Cũ nhất</option>
            <option value="refund_amount:desc">Coin cao → thấp</option>
            <option value="refund_amount:asc">Coin thấp → cao</option>
            <option value="status:asc">Theo trạng thái</option>
          </select>

          <button
            type="button"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors cursor-pointer",
              advancedOpen || advancedCount > 0
                ? "border-primary bg-primary-light text-primary"
                : "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light/50",
            )}
          >
            <SlidersHorizontal aria-hidden="true" animated={false} className="size-3.5" />
            <span>Lọc nâng cao</span>
            {advancedCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground tabular-nums">
                {advancedCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
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
              aria-label="Chế độ hiển thị hồ sơ"
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
                <span>Thẻ hồ sơ</span>
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

      {/* Dải pill lọc nhanh trạng thái */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          return (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "border border-border bg-background text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Tầng 2: Bộ lọc nâng cao (Khóa học, Học viên, Khoảng ngày) */}
      {advancedOpen && (
        <div className="grid gap-4 border-t border-border/70 pt-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Lọc theo khóa học
            </label>
            <CourseSelector value={courseId} onChange={onCourseIdChange} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Lọc theo học viên
            </label>
            <StudentSelector value={studentId} onChange={onStudentIdChange} />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              <Calendar aria-hidden="true" animated={false} className="size-3 text-primary" />
              <span>Từ ngày</span>
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              <Calendar aria-hidden="true" animated={false} className="size-3 text-primary" />
              <span>Đến ngày</span>
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}
    </section>
  );
}
