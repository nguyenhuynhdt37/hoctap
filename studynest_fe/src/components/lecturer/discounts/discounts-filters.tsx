"use client";

import { Badge, Button, Card } from "@/components/ui";
import { DiscountsFiltersProps } from "@/types/lecturer/discount";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  Clock,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

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
              <span>Tìm kiếm mã giảm giá</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Nhập tên hoặc mã giảm giá..."
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
                  onChange={(e) => onSortByChange(e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Discount Type Filter */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <BadgePercent className="w-4 h-4 text-muted-foreground" />
                <span>Loại giảm giá</span>
              </label>
              <select
                value={discountType}
                onChange={(e) =>
                  onDiscountTypeChange(
                    e.target.value as "percent" | "fixed" | ""
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span>Trạng thái</span>
              </label>
              <select
                value={statusValue}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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
              <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Thời gian hiệu lực</span>
              </label>
              <select
                value={validity}
                onChange={(e) =>
                  onValidityChange(
                    e.target.value as "expired" | "running" | "upcoming" | ""
                  )
                }
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
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

              {/* Discount Type Status */}
              {discountType && (
                <Badge variant="info" size="md" className="px-3 py-1.5 gap-1.5">
                  <span>
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
                    type="button"
                    onClick={() => onDiscountTypeChange("")}
                    className="hover:opacity-75 transition-opacity"
                    title="Xóa lọc"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              )}

              {/* Status Filter Status */}
              {isActive !== null && (
                <Badge variant="info" size="md" className="px-3 py-1.5 gap-1.5">
                  <span>
                    Trạng thái:{" "}
                    <strong>
                      {
                        STATUS_OPTIONS.find((opt) => opt.value === statusValue)
                          ?.label
                      }
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onIsActiveChange(null)}
                    className="hover:opacity-75 transition-opacity"
                    title="Xóa lọc"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              )}

              {/* Validity Filter Status */}
              {validity && (
                <Badge variant="info" size="md" className="px-3 py-1.5 gap-1.5">
                  <span>
                    Thời gian:{" "}
                    <strong>
                      {
                        VALIDITY_OPTIONS.find((opt) => opt.value === validity)
                          ?.label
                      }
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onValidityChange("")}
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
