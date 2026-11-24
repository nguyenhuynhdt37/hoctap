"use client";

import { cn } from "@/lib/utils";

interface RefundRequestsPaginationProps {
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const limitOptions = [10, 20, 50, 100];

export function RefundRequestsPagination({
  page,
  limit,
  total,
  isLoading,
  onPageChange,
  onLimitChange,
}: RefundRequestsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const gotoPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      onPageChange(targetPage);
    }
  };

  const pageRange = () => {
    const range: number[] = [];
    const maxButtons = 5;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxButtons - 1);
    for (let i = start; i <= end; i += 1) range.push(i);
    return range;
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-4 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs font-medium text-muted-foreground tabular-nums">
          Hiển thị{" "}
          <strong className="font-bold text-foreground">
            {total === 0 ? 0 : (page - 1) * limit + 1}–{total === 0 ? 0 : Math.min(page * limit, total)}
          </strong>{" "}
          trên tổng số <strong className="font-bold text-foreground">{total}</strong> hồ sơ
        </div>
        <select
          aria-label="Số hồ sơ mỗi trang"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          disabled={isLoading}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {limitOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}/trang
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => gotoPage(page - 1)}
          disabled={!canGoPrev || isLoading}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          ‹
        </button>

        {pageRange().map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => gotoPage(pageNumber)}
            disabled={isLoading}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer",
              pageNumber === page
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
            )}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          onClick={() => gotoPage(page + 1)}
          disabled={!canGoNext || isLoading}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          ›
        </button>
      </div>
    </div>
  );
}
