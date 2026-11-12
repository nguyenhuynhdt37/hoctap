"use client";

import { Badge, Button, Card } from "@/components/ui";
import { LecturerRefundRequestsQuery } from "@/types/lecturer/refund";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Search,
  SlidersHorizontal,
  Tag,
  User,
  X,
} from "lucide-react";
import { CourseSelector } from "../hold/course-selector";
import { StudentSelector } from "../hold/student-selector";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "requested", label: "Đã yêu cầu" },
  { value: "instructor_approved", label: "GV đã duyệt" },
  { value: "instructor_rejected", label: "GV đã từ chối" },
  { value: "admin_approved", label: "Admin đã duyệt" },
  { value: "admin_rejected", label: "Admin đã từ chối" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

const SORT_BY_OPTIONS: Array<{
  value: LecturerRefundRequestsQuery["order_by"];
  label: string;
}> = [
  { value: "created_at", label: "Ngày tạo" },
  { value: "refund_amount", label: "Số tiền" },
  { value: "status", label: "Trạng thái" },
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
}: RefundRequestsFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "" ||
    courseId !== "" ||
    studentId !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sortBy !== "created_at" ||
    orderDir !== "desc";

  return (
    <Card variant="surface" className="overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-primary-light/50 border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span>Tìm kiếm &amp; Sắp xếp</span>
        </h3>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span>Tìm kiếm</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo lý do, tên khóa học hoặc học viên..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          {/* Sort Section */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2.5">
              Sắp xếp dữ liệu
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Sort Field */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Trường sắp xếp
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    onSortByChange(
                      e.target.value as LecturerRefundRequestsQuery["order_by"]
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                >
                  {SORT_BY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Thứ tự
                </label>
                <select
                  value={orderDir}
                  onChange={(e) =>
                    onOrderDirChange(e.target.value as "asc" | "desc")
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                >
                  <option value="desc">Giảm dần ↓</option>
                  <option value="asc">Tăng dần ↑</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span>Trạng thái</span>
              </label>
              <select
                value={status}
                onChange={(e) =>
                  onStatusChange(
                    e.target.value as LecturerRefundRequestsQuery["refund_status"]
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Course ID Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span>Khóa học</span>
              </label>
              <CourseSelector value={courseId} onChange={onCourseIdChange} />
            </div>

            {/* Student ID Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Học viên</span>
              </label>
              <StudentSelector value={studentId} onChange={onStudentIdChange} />
            </div>

            {/* Date From */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Từ ngày</span>
              </label>
              <input
                type="datetime-local"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (dateTo && newValue && newValue > dateTo) {
                    return;
                  }
                  onDateFromChange(newValue);
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              {dateFrom && dateTo && dateFrom > dateTo && (
                <p className="mt-1 text-xs text-destructive-foreground">
                  Ngày bắt đầu phải nhỏ hơn ngày kết thúc
                </p>
              )}
            </div>

            {/* Date To */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Đến ngày</span>
              </label>
              <input
                type="datetime-local"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (dateFrom && newValue && newValue < dateFrom) {
                    return;
                  }
                  onDateToChange(newValue);
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
              {dateFrom && dateTo && dateTo < dateFrom && (
                <p className="mt-1 text-xs text-destructive-foreground">
                  Ngày kết thúc phải lớn hơn ngày bắt đầu
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Status Indicators */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Status */}
              <Badge variant="default" size="md" dot className="px-3 py-1.5">
                <span>
                  Sắp xếp:{" "}
                  <strong>
                    {SORT_BY_OPTIONS.find((opt) => opt.value === sortBy)
                      ?.label || sortBy}
                  </strong>
                </span>
                {orderDir === "asc" ? (
                  <ArrowUp className="w-3.5 h-3.5 ml-1" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 ml-1" />
                )}
              </Badge>

              {/* Search Status */}
              {search && (
                <Badge variant="info" size="md" className="px-3 py-1.5 gap-1.5">
                  <span>
                    Tìm: <strong>&ldquo;{search}&rdquo;</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="hover:opacity-75 transition-opacity"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              )}

              {/* Status Filter Status */}
              {status && (
                <Badge variant="info" size="md" className="px-3 py-1.5 gap-1.5">
                  <span>
                    Trạng thái:{" "}
                    <strong>
                      {STATUS_OPTIONS.find((opt) => opt.value === status)
                        ?.label}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onStatusChange("")}
                    className="hover:opacity-75 transition-opacity"
                    title="Xóa lọc"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              )}
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                leftIcon={<X className="w-4 h-4" />}
              >
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

