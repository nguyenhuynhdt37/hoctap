"use client";

import { DiscountsFiltersProps } from "@/types/admin/discount";
import { HiSearch, HiX } from "react-icons/hi";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "percent", label: "Phần trăm" },
  { value: "fixed", label: "Giá cố định" },
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
  const hasActiveFilters =
    search.trim() !== "" ||
    discountType !== "" ||
    isActive !== null ||
    validity !== "" ||
    sortBy !== "created_at" ||
    orderDir !== "desc";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Nhập tên hoặc mã giảm giá..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              />
            </div>
          </div>

          {/* Sort Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sắp xếp
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Discount Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loại giảm giá
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  onDiscountTypeChange(
                    e.target.value as "percent" | "fixed" | ""
                  )
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                value={isActive === null ? "" : isActive ? "active" : "inactive"}
                onChange={(e) => {
                  if (e.target.value === "") {
                    onIsActiveChange(null);
                  } else {
                    onIsActiveChange(e.target.value === "active");
                  }
                }}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tất cả</option>
                <option value="active">Đã bật</option>
                <option value="inactive">Đã tắt</option>
              </select>
            </div>

            {/* Validity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Thời gian hiệu lực
              </label>
              <select
                value={validity}
                onChange={(e) =>
                  onValidityChange(
                    e.target.value as "expired" | "running" | "upcoming" | ""
                  )
                }
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HiX className="w-4 h-4" />
              <span>Xóa tất cả bộ lọc</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

