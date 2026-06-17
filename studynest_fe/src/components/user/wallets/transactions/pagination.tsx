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
    <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-gray-600">
        Hiển thị{" "}
        <span className="font-semibold text-gray-900">
          {total === 0 ? 0 : (page - 1) * limit + 1}-
          {total === 0 ? 0 : Math.min(page * limit, total)}
        </span>{" "}
        trên tổng số{" "}
        <span className="font-semibold text-gray-900">{total}</span> giao dịch.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Mỗi trang</span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={isLoading}
            className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-600 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => gotoPage(page - 1)}
            disabled={!canGoPrev || isLoading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-white text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>

          {pageRange().map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => gotoPage(pageNumber)}
              disabled={isLoading}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                pageNumber === page
                  ? "bg-green-600 text-white"
                  : "border border-green-200 bg-white text-gray-700 hover:border-green-500 hover:text-green-600"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => gotoPage(page + 1)}
            disabled={!canGoNext || isLoading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-white text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

