"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

type PaginationProps = {
  page: number;
  totalPages: number;
  visibleRangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
  isBusy: boolean;
};

export const PaginationControls = ({
  page,
  totalPages,
  visibleRangeLabel,
  onPrev,
  onNext,
  onPageChange,
  isBusy,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  // Tính toán danh sách số trang hiển thị (tối đa 5 nút)
  const pageNumbers: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else if (page <= 3) {
    pageNumbers.push(1, 2, 3, 4, 5);
  } else if (page >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(page - 2, page - 1, page, page + 1, page + 2);
  }

  return (
    <nav
      aria-label="Điều hướng phân trang khóa học"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/80"
    >
      <span className="text-xs font-medium text-muted-foreground order-2 sm:order-1">
        {visibleRangeLabel}
      </span>

      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* Nút Trang trước */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page <= 1 || isBusy}
          aria-label="Trang trước"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Trước</span>
        </Button>

        {/* Các số trang */}
        {onPageChange &&
          pageNumbers.map((num) => {
            const isCurrent = page === num;
            return (
              <Button
                key={num}
                variant={isCurrent ? "primary" : "outline"}
                size="sm"
                onClick={() => onPageChange(num)}
                disabled={isBusy}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "min-w-[36px] font-semibold"
                    : "min-w-[36px] text-muted-foreground hover:text-foreground"
                }
              >
                {num}
              </Button>
            );
          })}

        {/* Nút Trang sau */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages || isBusy}
          aria-label="Trang sau"
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Tiếp</span>
        </Button>
      </div>
    </nav>
  );
};
