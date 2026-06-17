"use client";

import { HoldEarningsQuery } from "@/types/lecturer/hold";
import { HiSearch, HiX } from "react-icons/hi";
import { CourseSelector } from "./course-selector";
import { StudentSelector } from "./student-selector";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "holding", label: "Đang chờ trả" },
  { value: "freeze", label: "Đang đóng băng" },
];

const SORT_BY_OPTIONS: Array<{
  value: HoldEarningsQuery["order_by"];
  label: string;
}> = [
  { value: "created_at", label: "Ngày tạo" },
  { value: "hold_until", label: "Hạn hold" },
  { value: "amount_instructor", label: "Số tiền" },
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
  onReset,
}: HoldEarningsFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "" ||
    courseId !== "" ||
    studentId !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    sortBy !== "hold_until" ||
    orderDir !== "asc";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <HiSearch className="w-5 h-5" />
          <span>Tìm kiếm & Sắp xếp</span>
        </h3>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🔍 Tìm kiếm
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm theo tên khóa học hoặc học viên..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Sort Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📊 Sắp xếp dữ liệu
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Sort Field */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Trường sắp xếp
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    onSortByChange(
                      e.target.value as HoldEarningsQuery["order_by"]
                    )
                  }
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
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
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Thứ tự
                </label>
                <select
                  value={orderDir}
                  onChange={(e) =>
                    onOrderDirChange(e.target.value as "asc" | "desc")
                  }
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
                >
                  <option value="asc">Tăng dần ↑</option>
                  <option value="desc">Giảm dần ↓</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📌 Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) =>
                  onStatusChange(e.target.value as "holding" | "freeze" | "")
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🎓 Khóa học
              </label>
              <CourseSelector value={courseId} onChange={onCourseIdChange} />
            </div>

            {/* Student ID Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                👤 Học viên
              </label>
              <StudentSelector value={studentId} onChange={onStudentIdChange} />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📅 Từ ngày
              </label>
              <input
                type="datetime-local"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Nếu dateTo đã có và newValue > dateTo, không cho phép
                  if (dateTo && newValue && newValue > dateTo) {
                    return;
                  }
                  onDateFromChange(newValue);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
              />
              {dateFrom && dateTo && dateFrom > dateTo && (
                <p className="mt-1 text-xs text-red-600">
                  Ngày bắt đầu phải nhỏ hơn ngày kết thúc
                </p>
              )}
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📅 Đến ngày
              </label>
              <input
                type="datetime-local"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Nếu dateFrom đã có và newValue < dateFrom, không cho phép
                  if (dateFrom && newValue && newValue < dateFrom) {
                    return;
                  }
                  onDateToChange(newValue);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
              />
              {dateFrom && dateTo && dateTo < dateFrom && (
                <p className="mt-1 text-xs text-red-600">
                  Ngày kết thúc phải lớn hơn ngày bắt đầu
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Status Indicators */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Status */}
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">
                  Sắp xếp:{" "}
                  <strong>
                    {SORT_BY_OPTIONS.find((opt) => opt.value === sortBy)
                      ?.label || sortBy}
                  </strong>
                  <span className="ml-1 text-green-600 font-bold">
                    {orderDir === "asc" ? "↑" : "↓"}
                  </span>
                </span>
              </div>

              {/* Search Status */}
              {search && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm text-emerald-700">
                    Tìm: <strong>"{search}"</strong>
                  </span>
                  <button
                    onClick={() => onSearchChange("")}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors text-sm font-bold"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Status Filter Status */}
              {status && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm text-emerald-700">
                    Trạng thái:{" "}
                    <strong>
                      {
                        STATUS_OPTIONS.find((opt) => opt.value === status)
                          ?.label
                      }
                    </strong>
                  </span>
                  <button
                    onClick={() => onStatusChange("")}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors text-sm font-bold"
                    title="Xóa lọc"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                <HiX className="w-4 h-4" />
                <span>Xóa tất cả bộ lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
