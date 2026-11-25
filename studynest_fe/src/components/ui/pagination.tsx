"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "pulsoicon-react";

export interface PaginationProps {
  /** Trang hiện tại (bắt đầu từ 1). */
  page: number;
  /** Tổng số trang (>= 1). */
  totalPages: number;
  /** Tổng số bản ghi. */
  totalItems: number;
  /** Số bản ghi trên mỗi trang. */
  pageSize: number;
  /** Nhãn đối tượng hiển thị, ví dụ "thành viên", "giao dịch". */
  itemLabel?: string;
  /** Các tùy chọn số bản ghi/trang. */
  pageSizeOptions?: number[];
  /** Callback khi đổi trang. */
  onPageChange: (nextPage: number) => void;
  /** Callback khi đổi số bản ghi/trang (nếu truyền sẽ hiển thị dropdown chọn size). */
  onPageSizeChange?: (nextSize: number) => void;
  /** Vô hiệu hóa tương tác khi đang tải dữ liệu. */
  disabled?: boolean;
  /** Tự động cuộn mượt lên đầu trang khi chuyển trang. Mặc định true. */
  scrollToTop?: boolean;
  /** Số trang lân cận hiển thị hai bên trang hiện tại. Mặc định 1. */
  siblingCount?: number;
  className?: string;
}

type PageToken = number | "ellipsis-left" | "ellipsis-right";

function buildPageTokens(
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): PageToken[] {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);
  const totalSlots = siblingCount * 2 + 5;

  if (safeTotal <= totalSlots) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(safeCurrent - siblingCount, 1);
  const rightSibling = Math.min(safeCurrent + siblingCount, safeTotal);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < safeTotal - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis-right", safeTotal];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightCount },
      (_, i) => safeTotal - rightCount + 1 + i,
    );
    return [1, "ellipsis-left", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i,
  );
  return [1, "ellipsis-left", ...middleRange, "ellipsis-right", safeTotal];
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "mục",
  pageSizeOptions = [12, 24, 48, 100],
  onPageChange,
  onPageSizeChange,
  disabled = false,
  scrollToTop = true,
  siblingCount = 1,
  className = "",
}: PaginationProps) {
  const [jumpInput, setJumpInput] = useState("");

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const safePageSize = Math.max(1, pageSize);

  const startItem =
    totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min(safePage * safePageSize, totalItems);

  const normalizedSizeOptions = useMemo(() => {
    const set = new Set<number>(pageSizeOptions);
    set.add(safePageSize);
    return Array.from(set).sort((a, b) => a - b);
  }, [pageSizeOptions, safePageSize]);

  const tokens = useMemo(
    () => buildPageTokens(safePage, safeTotalPages, siblingCount),
    [safePage, safeTotalPages, siblingCount],
  );

  if (totalItems <= 0) return null;

  function goToPage(target: number) {
    if (disabled) return;
    const clamped = Math.min(Math.max(1, Math.trunc(target)), safeTotalPages);
    if (clamped === safePage) return;
    onPageChange(clamped);
    if (scrollToTop && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleJumpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number.parseInt(jumpInput.trim(), 10);
    if (!Number.isFinite(parsed)) return;
    setJumpInput("");
    goToPage(parsed);
  }

  const navBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Phân trang"
      className={`flex flex-col gap-3 rounded-2xl border border-primary-pastel/60 bg-surface/95 px-4 py-3 text-xs shadow-[0_10px_28px_-16px_rgba(53,111,167,0.14)] backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      {/* Left: Range Summary + Page Size Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
        <p className="tabular-nums text-muted-foreground">
          Hiển thị{" "}
          <strong className="font-semibold text-foreground">
            {startItem.toLocaleString("vi-VN")}–{endItem.toLocaleString("vi-VN")}
          </strong>{" "}
          trong tổng số{" "}
          <strong className="font-semibold text-foreground">
            {totalItems.toLocaleString("vi-VN")}
          </strong>{" "}
          {itemLabel}
        </p>

        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="hidden sm:inline">Mỗi trang</span>
            <select
              aria-label="Số mục mỗi trang"
              value={safePageSize}
              disabled={disabled}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                if (Number.isFinite(nextSize) && nextSize > 0) {
                  onPageSizeChange(nextSize);
                }
              }}
              className="h-8 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold tabular-nums text-foreground transition-colors hover:border-primary-pastel focus:border-primary focus:outline-none disabled:opacity-50"
            >
              {normalizedSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Right: Page Controls + Quick Jump */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || safePage <= 1}
            onClick={() => goToPage(1)}
            aria-label="Trang đầu tiên"
            title="Trang đầu tiên"
            className={navBtnClass}
          >
            <ChevronsLeft size={15} animated={false} />
          </button>
          <button
            type="button"
            disabled={disabled || safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
            aria-label="Trang trước"
            title="Trang trước"
            className={navBtnClass}
          >
            <ChevronLeft size={15} animated={false} />
          </button>

          {/* Compact mobile indicator */}
          <span className="inline-flex h-9 items-center rounded-xl border border-border bg-background px-3 text-xs font-semibold tabular-nums text-foreground sm:hidden">
            {safePage} / {safeTotalPages}
          </span>

          {/* Desktop page number buttons */}
          <div className="hidden items-center gap-1 sm:flex">
            {tokens.map((token) => {
              if (token === "ellipsis-left" || token === "ellipsis-right") {
                return (
                  <span
                    key={token}
                    aria-hidden="true"
                    className="flex h-9 w-8 items-center justify-center text-muted-foreground"
                  >
                    <MoreHorizontal size={14} animated={false} />
                  </span>
                );
              }

              const isCurrent = token === safePage;
              return (
                <button
                  key={token}
                  type="button"
                  disabled={disabled}
                  onClick={() => goToPage(token)}
                  aria-label={`Trang ${token}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border px-2.5 text-xs font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 ${
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                      : "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light/70 hover:text-primary"
                  }`}
                >
                  {token}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled || safePage >= safeTotalPages}
            onClick={() => goToPage(safePage + 1)}
            aria-label="Trang sau"
            title="Trang sau"
            className={navBtnClass}
          >
            <ChevronRight size={15} animated={false} />
          </button>
          <button
            type="button"
            disabled={disabled || safePage >= safeTotalPages}
            onClick={() => goToPage(safeTotalPages)}
            aria-label="Trang cuối cùng"
            title="Trang cuối cùng"
            className={navBtnClass}
          >
            <ChevronsRight size={15} animated={false} />
          </button>
        </div>

        {/* Quick Page Jump (when > 5 pages) */}
        {safeTotalPages > 5 && (
          <form
            onSubmit={handleJumpSubmit}
            className="hidden items-center gap-1.5 border-l border-border/80 pl-2.5 md:flex"
          >
            <label
              htmlFor="pagination-jump-input"
              className="text-muted-foreground"
            >
              Đi tới
            </label>
            <input
              id="pagination-jump-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={safeTotalPages}
              value={jumpInput}
              disabled={disabled}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={String(safePage)}
              className="h-8 w-14 rounded-xl border border-border bg-background px-2 text-center text-xs font-semibold tabular-nums text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </form>
        )}
      </div>
    </nav>
  );
}
