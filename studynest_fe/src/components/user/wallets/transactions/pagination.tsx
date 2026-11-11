import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

interface TransactionsPaginationProps {
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const limitOptions = [10, 20, 50];

export function TransactionsPagination({
  page,
  limit,
  total,
  isLoading,
  onPageChange,
  onLimitChange,
}: TransactionsPaginationProps) {
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

    for (let i = start; i <= end; i += 1) {
      range.push(i);
    }

    return range;
  };

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-border bg-surface/90 p-4 shadow-xs backdrop-blur-md md:flex-row md:items-center md:justify-between">
      <div className="text-xs text-muted-foreground">
        Hiển thị{" "}
        <span className="font-semibold text-foreground">
          {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
          {total === 0 ? 0 : Math.min(page * limit, total)}
        </span>{" "}
        trong tổng số{" "}
        <span className="font-semibold text-primary">{total}</span> giao dịch
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:gap-4">
        {/* Số bản ghi mỗi trang */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mỗi trang</span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={isLoading}
            aria-label="Số bản ghi mỗi trang"
            className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Nút phân trang */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => gotoPage(page - 1)}
            disabled={!canGoPrev || isLoading}
            aria-label="Trang trước"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <HiChevronLeft className="h-4 w-4" />
          </button>

          {pageRange().map((pageNumber) => {
            const isCurrent = pageNumber === page;
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => gotoPage(pageNumber)}
                disabled={isLoading}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isCurrent
                    ? "border border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => gotoPage(page + 1)}
            disabled={!canGoNext || isLoading}
            aria-label="Trang tiếp theo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <HiChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
