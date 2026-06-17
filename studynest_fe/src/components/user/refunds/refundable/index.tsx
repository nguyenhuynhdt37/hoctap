"use client";

import RefundableCourseListItem from "@/components/user/refunds/refundable/course-list-item";
import api from "@/lib/utils/fetcher/client/axios";
import { RefundableCoursesResponse } from "@/types/user/refund";
import Link from "next/link";
import { useState } from "react";
import { HiArrowRight, HiExclamationCircle } from "react-icons/hi";
import useSWR from "swr";

interface RefundableCoursesProps {
  initialData: RefundableCoursesResponse;
  initialError: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function RefundableCourses({
  initialData,
  initialError,
}: RefundableCoursesProps) {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const { data, error, isLoading, mutate } = useSWR<RefundableCoursesResponse>(
    `/users/refunds/my/refundable-courses?page=${page}&limit=${limit}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      fallbackData: initialData,
    }
  );

  const handleRequestRefund = (purchaseItemId: string) => {
    window.location.href = `/refunds/create?purchase_item_id=${purchaseItemId}`;
  };

  const courses = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Khóa học có thể hoàn tiền
              </h1>
              <p className="text-gray-600 mt-2">
                Danh sách khóa học đang trong thời gian hoàn tiền
              </p>
            </div>
            <Link
              href="/refunds/my-requests"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
            >
              <span>Yêu cầu hoàn tiền</span>
              <HiArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {initialError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {initialError}
          </div>
        )}

        {error && !isLoading && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Không thể tải danh sách khóa học. Vui lòng thử lại.
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-green-200 shadow-sm animate-pulse"
              >
                <div className="flex flex-col md:flex-row gap-4 p-6">
                  <div className="w-full md:w-48 h-48 md:h-32 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="h-12 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                      <div className="h-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-10 bg-gray-200 rounded w-32 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && courses.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <HiExclamationCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Không có khóa học nào
            </h3>
            <p className="text-gray-600">
              Hiện tại không có khóa học nào đang trong thời gian hoàn tiền.
            </p>
          </div>
        )}

        {!isLoading && courses.length > 0 && (
          <>
            <div className="space-y-4 mb-8">
              {courses.map((item) => (
                <RefundableCourseListItem
                  key={item.purchase_item_id}
                  item={item}
                  onRequestRefund={handleRequestRefund}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <RefundableCoursesPagination
                page={page}
                limit={limit}
                total={total}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface RefundableCoursesPaginationProps {
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

function RefundableCoursesPagination({
  page,
  limit,
  total,
  isLoading,
  onPageChange,
}: RefundableCoursesPaginationProps) {
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
        <span className="font-semibold text-gray-900">{total}</span> khóa học.
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
  );
}
