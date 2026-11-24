"use client";

import { Badge, Button, Card } from "@/components/ui";
import { HoldEarningsQuery } from "@/types/lecturer/hold";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "pulsoicon-react";
import { useState } from "react";
import { CourseSelector } from "./course-selector";
import { StudentSelector } from "./student-selector";

const STATUS_OPTIONS: Array<{ value: "holding" | "freeze" | ""; label: string }> =
  [
    { value: "", label: "Tất cả" },
    { value: "holding", label: "Đang chờ trả" },
    { value: "freeze", label: "Đang đóng băng" },
  ];

const SORT_BY_OPTIONS: Array<{
  value: HoldEarningsQuery["order_by"];
  label: string;
}> = [
  { value: "hold_until", label: "Hạn giải ngân" },
  { value: "created_at", label: "Ngày tạo" },
  { value: "amount_instructor", label: "Số Coin" },
  { value: "status", label: "Trạng thái" },
];

interface HoldEarningsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: "holding" | "freeze" | "";
  onStatusChange: (value: "holding" | "freeze" | "") => void;
  courseId: string;
  onCourseIdChange: (value: string) => void;
  studentId: string;
  onStudentIdChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortBy: HoldEarningsQuery["order_by"];
  onSortByChange: (value: HoldEarningsQuery["order_by"]) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  onReset: () => void;
}

export function HoldEarningsFilters({
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
  viewMode,
  onViewModeChange,
  onReset,
}: HoldEarningsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const advancedCount = [
    courseId !== "",
    studentId !== "",
    dateFrom !== "",
    dateTo !== "",
    sortBy !== "hold_until" || orderDir !== "asc",
  ].filter(Boolean).length;

  const hasActiveFilters =
    search.trim() !== "" || status !== "" || advancedCount > 0;

  return (
    <Card
      variant="surface"
      density="none"
      className="mb-6 overflow-hidden rounded-[22px] border border-border/90 bg-surface/95 shadow-2xs backdrop-blur-xs"
    >
      {/* Tầng 1: Thanh lọc chính */}
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Segmented Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search + Advanced Toggle + View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search
              animated={false}
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Tìm khóa học hoặc học viên..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                aria-label="Xóa từ khóa"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              showAdvanced || advancedCount > 0
                ? "border-primary-pastel bg-primary-light/70 text-primary"
                : "border-border bg-background text-foreground hover:border-primary-pastel hover:text-primary"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Bộ lọc nâng cao</span>
            {advancedCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                {advancedCount}
              </span>
            )}
          </button>

          {/* View Mode Toggle */}
          <div
            className="inline-flex items-center rounded-full border border-border bg-background p-1"
            role="group"
            aria-label="Chế độ hiển thị"
          >
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              aria-label="Xem dạng thẻ"
              aria-pressed={viewMode === "grid"}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-surface text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              aria-label="Xem dạng bảng"
              aria-pressed={viewMode === "table"}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-surface text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tầng 2: Bộ lọc nâng cao mở rộng */}
      {showAdvanced && (
        <div className="border-t border-border bg-background/50 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Khóa học</span>
              </label>
              <CourseSelector value={courseId} onChange={onCourseIdChange} />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Học viên</span>
              </label>
              <StudentSelector value={studentId} onChange={onStudentIdChange} />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-foreground">
                Sắp xếp dữ liệu
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    onSortByChange(
                      e.target.value as HoldEarningsQuery["order_by"],
                    )
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SORT_BY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={orderDir}
                  onChange={(e) =>
                    onOrderDirChange(e.target.value as "asc" | "desc")
                  }
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="asc">Tăng dần ↑</option>
                  <option value="desc">Giảm dần ↓</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Từ ngày</span>
              </label>
              <input
                type="datetime-local"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (dateTo && newValue && newValue > dateTo) return;
                  onDateFromChange(newValue);
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Đến ngày</span>
              </label>
              <input
                type="datetime-local"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (dateFrom && newValue && newValue < dateFrom) return;
                  onDateToChange(newValue);
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dải Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/80 bg-primary-light/20 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" size="sm" dot>
              <span>
                Sắp xếp:{" "}
                <strong>
                  {SORT_BY_OPTIONS.find((opt) => opt.value === sortBy)?.label ||
                    sortBy}
                </strong>
              </span>
              {orderDir === "asc" ? (
                <ArrowUp className="ml-1 h-3 w-3" />
              ) : (
                <ArrowDown className="ml-1 h-3 w-3" />
              )}
            </Badge>

            {search && (
              <Badge variant="info" size="sm" className="gap-1">
                <span>Tìm: &ldquo;{search}&rdquo;</span>
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => onSearchChange("")}
                  className="hover:opacity-75 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {status && (
              <Badge variant="info" size="sm" className="gap-1">
                <span>
                  Trạng thái:{" "}
                  {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                </span>
                <button
                  type="button"
                  aria-label="Xóa lọc trạng thái"
                  onClick={() => onStatusChange("")}
                  className="hover:opacity-75 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs"
            onClick={onReset}
            leftIcon={<X className="h-3.5 w-3.5" />}
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}
    </Card>
  );
}
