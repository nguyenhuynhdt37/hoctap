"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 20, 50],
  className = "",
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Luôn hiển thị pagination, ngay cả khi chỉ có 1 trang

  return (
    <div
      className={`px-6 py-4 border-t border-gray-200 bg-gray-50/50 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Hiển thị {startItem} đến {endItem} trong tổng số {totalItems} mục
          </div>

          {showPageSizeSelector && onPageSizeChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} mục/trang
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            <HiChevronLeft className="w-4 h-4" />
            <span>Trước</span>
          </button>

          <div className="flex items-center space-x-1">
            {totalPages > 1 ? (
              getVisiblePages().map((page, index) => {
                if (page === "...") {
                  return (
                    <span
                      key={`dots-${index}`}
                      className="px-3 py-2 text-sm text-gray-500"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page as number)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                      page === currentPage
                        ? "bg-teal-600 text-white"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                Trang 1
              </div>
            )}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages <= 1}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
          >
            <span>Sau</span>
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
