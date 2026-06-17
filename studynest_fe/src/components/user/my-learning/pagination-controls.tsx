"use client";

import { HiOutlineArrowNarrowLeft, HiOutlineArrowNarrowRight } from "react-icons/hi";

type PaginationProps = {
  page: number;
  totalPages: number;
  visibleRangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  isBusy: boolean;
};

export const PaginationControls = ({ page, totalPages, visibleRangeLabel, onPrev, onNext, isBusy }: PaginationProps) => (
  <footer className="flex flex-col gap-4 border-t border-green-200 pt-4 md:flex-row md:items-center md:justify-between">
    <span className="text-sm font-medium text-gray-600">{visibleRangeLabel}</span>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1 || isBusy}
        className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-600 shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
      >
        <HiOutlineArrowNarrowLeft className="h-4 w-4" />
        Trước
      </button>
      <span className="text-sm font-semibold text-gray-600">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages || isBusy}
        className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-600 shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
      >
        Tiếp
        <HiOutlineArrowNarrowRight className="h-4 w-4" />
      </button>
    </div>
  </footer>
);

