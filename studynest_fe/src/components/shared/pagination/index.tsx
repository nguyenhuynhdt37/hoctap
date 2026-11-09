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
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
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

  return (
    <div
      className={`px-6 py-4 border-t border-[#E7EEF7] bg-[#F6FAFF]/60 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm text-[#6F7C8C]">
            Hiển thị <span className="font-medium text-[#3D4A5A]">{startItem}</span> đến{" "}
            <span className="font-medium text-[#3D4A5A]">{endItem}</span> trong tổng số{" "}
            <span className="font-medium text-[#3D4A5A]">{totalItems}</span> mục
          </div>

          {showPageSizeSelector && onPageSizeChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-[#6F7C8C]">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-white text-[#3D4A5A] border border-[#E7EEF7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#356FA7]/25 focus:border-[#356FA7] transition-all duration-200"
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

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#3D4A5A] bg-white border border-[#E7EEF7] rounded-xl hover:bg-[#F6FAFF] hover:border-[#BFD7ED] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
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
                      className="px-3 py-2 text-sm text-[#8190A3]"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page as number)}
                    className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${
                      page === currentPage
                        ? "bg-[#356FA7] text-white shadow-2xs"
                        : "text-[#3D4A5A] bg-white border border-[#E7EEF7] hover:bg-[#F6FAFF] hover:border-[#BFD7ED]"
                    }`}
                  >
                    {page}
                  </button>
                );
              })
            ) : (
              <div className="px-3.5 py-2 text-sm font-medium text-[#6F7C8C] bg-white border border-[#E7EEF7] rounded-xl">
                Trang 1
              </div>
            )}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages <= 1}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#3D4A5A] bg-white border border-[#E7EEF7] rounded-xl hover:bg-[#F6FAFF] hover:border-[#BFD7ED] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
          >
            <span>Sau</span>
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
