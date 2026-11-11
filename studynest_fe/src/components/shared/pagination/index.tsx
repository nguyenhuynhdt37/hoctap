"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { cn } from "@/lib/utils";

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
    <nav
      aria-label="Phân trang dữ liệu"
      className={cn(
        "px-6 py-4 border-t border-border bg-background/60",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Hiển thị{" "}
            <span className="font-medium text-foreground">{startItem}</span> đến{" "}
            <span className="font-medium text-foreground">{endItem}</span> trong
            tổng số{" "}
            <span className="font-medium text-foreground">{totalItems}</span> mục
          </div>

          {showPageSizeSelector && onPageSizeChange && (
            <div className="flex items-center space-x-2">
              <label
                htmlFor="pagination-page-size"
                className="text-sm text-muted-foreground"
              >
                Hiển thị:
              </label>
              <select
                id="pagination-page-size"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-9 px-3 py-1.5 text-sm bg-surface text-foreground border border-input rounded-xl hover:border-primary-pastel focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all duration-150 cursor-pointer"
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
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || totalPages <= 1}
            aria-label="Trang trước"
            className="inline-flex h-9 items-center space-x-1 px-3 text-sm font-medium text-foreground bg-surface border border-border rounded-xl hover:bg-background hover:border-primary-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <HiChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Trước</span>
          </button>

          <div className="flex items-center space-x-1">
            {totalPages > 1 ? (
              getVisiblePages().map((page, index) => {
                if (page === "...") {
                  return (
                    <span
                      key={`dots-${index}`}
                      aria-hidden="true"
                      className="px-3 py-2 text-sm text-subtle-foreground"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrent = page === currentPage;

                return (
                  <button
                    key={page}
                    type="button"
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={`Trang ${page}`}
                    onClick={() => onPageChange(page as number)}
                    className={cn(
                      "inline-flex h-9 min-w-9 items-center justify-center px-3 text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-foreground bg-surface border border-border hover:bg-background hover:border-primary-pastel"
                    )}
                  >
                    {page}
                  </button>
                );
              })
            ) : (
              <div className="inline-flex h-9 items-center px-3.5 text-sm font-medium text-muted-foreground bg-surface border border-border rounded-xl">
                Trang 1
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages <= 1}
            aria-label="Trang sau"
            className="inline-flex h-9 items-center space-x-1 px-3 text-sm font-medium text-foreground bg-surface border border-border rounded-xl hover:bg-background hover:border-primary-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            <span>Sau</span>
            <HiChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
