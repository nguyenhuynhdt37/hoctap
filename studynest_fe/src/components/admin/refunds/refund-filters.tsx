"use client";

import { AdminRefundRequestsQuery } from "@/types/admin/refund";
import { HiSearch, HiX } from "react-icons/hi";
import { CourseSelector } from "../../lecturer/hold/course-selector";
import { StudentSelector } from "../../lecturer/hold/student-selector";
import { InstructorSelector } from "./instructor-selector";

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
  value: AdminRefundRequestsQuery["order_by"];
  label: string;
}> = [
  { value: "created_at", label: "Ngày tạo" },
  { value: "refund_amount", label: "Số tiền" },
  { value: "status", label: "Trạng thái" },
];

interface RefundRequestsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: AdminRefundRequestsQuery["refund_status"];
  onStatusChange: (value: AdminRefundRequestsQuery["refund_status"]) => void;
  courseId: string;
  onCourseIdChange: (value: string) => void;
  studentId: string;
  onStudentIdChange: (value: string) => void;
  instructorId: string;
  onInstructorIdChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortBy: AdminRefundRequestsQuery["order_by"];
  onSortByChange: (value: AdminRefundRequestsQuery["order_by"]) => void;
  orderDir: "asc" | "desc";
  onOrderDirChange: (value: "asc" | "desc") => void;
  onReset: () => void;
  isValidating?: boolean;
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
  instructorId,
  onInstructorIdChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortByChange,
  orderDir,
  onOrderDirChange,
  onReset,
  isValidating = false,
}: RefundRequestsFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "" ||
    courseId !== "" ||
    studentId !== "" ||
    instructorId !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sortBy !== "created_at" ||
    orderDir !== "desc";

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo lý do, tên khóa học..."
              disabled={isValidating}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sắp xếp theo
          </label>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                onSortByChange(
                  e.target.value as AdminRefundRequestsQuery["order_by"]
                )
              }
              disabled={isValidating}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {SORT_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                onOrderDirChange(orderDir === "asc" ? "desc" : "asc")
              }
              disabled={isValidating}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {orderDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Trạng thái
          </label>
          <select
            value={status}
            onChange={(e) =>
              onStatusChange(
                e.target.value as AdminRefundRequestsQuery["refund_status"]
              )
            }
            disabled={isValidating}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {/* Course ID Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Khóa học
          </label>
          <CourseSelector value={courseId} onChange={onCourseIdChange} />
        </div>

        {/* Student ID Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Học viên
          </label>
          <StudentSelector value={studentId} onChange={onStudentIdChange} />
        </div>

        {/* Instructor ID Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Giảng viên
          </label>
          <InstructorSelector
            value={instructorId}
            onChange={onInstructorIdChange}
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Từ ngày
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
            disabled={isValidating}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Đến ngày
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
            disabled={isValidating}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
        </div>
      </div>
    </div>
  );
}

