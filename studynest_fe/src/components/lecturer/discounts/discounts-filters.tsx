"use client";

import { DiscountsFiltersProps } from "@/types/lecturer/discount";
import { HiSearch, HiX } from "react-icons/hi";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "percent", label: "Phần trăm" },
  { value: "fixed", label: "Giá cố định" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "expired", label: "Hết hạn" },
  { value: "hidden", label: "Ẩn" },
];

const VALIDITY_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "running", label: "Đang diễn ra" },
  { value: "upcoming", label: "Sắp diễn ra" },
];

const SORT_BY_OPTIONS = [
  { value: "name", label: "Tên" },
  { value: "created_at", label: "Ngày tạo" },
  { value: "start_at", label: "Ngày bắt đầu" },
  { value: "end_at", label: "Ngày kết thúc" },
  { value: "usage_count", label: "Số lượt sử dụng" },
];

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
}: DiscountsFiltersProps) {
  const handleStatusChange = (value: string) => {
    if (value === "") {
      onIsActiveChange(null);
    } else if (value === "active") {
      onIsActiveChange(true);
    } else if (value === "expired") {
      onIsActiveChange(false);
    } else if (value === "hidden") {
      onIsActiveChange(false);
    }
  };

  const statusValue =
    isActive === null ? "" : isActive === true ? "active" : "expired";

  const hasActiveFilters =
    search.trim() !== "" ||
    discountType !== "" ||
    isActive !== null ||
    validity !== "" ||
    sortBy !== "created_at" ||
    orderDir !== "desc";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
              🔍 Tìm kiếm mã giảm giá
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Nhập tên hoặc mã giảm giá..."
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
                  onChange={(e) => onSortByChange(e.target.value)}
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
                  <option value="desc">Giảm dần ↓</option>
                  <option value="asc">Tăng dần ↑</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Discount Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                💰 Loại giảm giá
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  onDiscountTypeChange(
                    e.target.value as "percent" | "fixed" | ""
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
              >
                {DISCOUNT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📌 Trạng thái
              </label>
              <select
                value={statusValue}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Validity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                🕒 Thời gian hiệu lực
              </label>
              <select
                value={validity}
                onChange={(e) =>
                  onValidityChange(
                    e.target.value as "expired" | "running" | "upcoming" | ""
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-200"
              >
                {VALIDITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

              {/* Discount Type Status */}
              {discountType && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm text-emerald-700">
                    Loại:{" "}
                    <strong>
                      {
                        DISCOUNT_TYPE_OPTIONS.find(
                          (opt) => opt.value === discountType
                        )?.label
                      }
                    </strong>
                  </span>
                  <button
                    onClick={() => onDiscountTypeChange("")}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors text-sm font-bold"
                    title="Xóa lọc"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Status Filter Status */}
              {isActive !== null && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm text-emerald-700">
                    Trạng thái:{" "}
                    <strong>
                      {
                        STATUS_OPTIONS.find((opt) => opt.value === statusValue)
                          ?.label
                      }
                    </strong>
                  </span>
                  <button
                    onClick={() => onIsActiveChange(null)}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors text-sm font-bold"
                    title="Xóa lọc"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Validity Filter Status */}
              {validity && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-sm text-emerald-700">
                    Thời gian:{" "}
                    <strong>
                      {
                        VALIDITY_OPTIONS.find((opt) => opt.value === validity)
                          ?.label
                      }
                    </strong>
                  </span>
                  <button
                    onClick={() => onValidityChange("")}
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
