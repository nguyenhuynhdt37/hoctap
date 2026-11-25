"use client";

import Link from "next/link";
import { ArrowRight, Coins, RotateCcw, ShieldCheck } from "pulsoicon-react";
import useSWR from "swr";
import { Alert, EmptyState, Skeleton } from "@/components/ui";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import api from "@/lib/utils/fetcher/client/axios";
import type { RefundableCoursesResponse } from "@/types/user/refund";
import { cn } from "@/lib/utils";
import RefundableCourseListItem from "@/components/user/refunds/refundable/course-list-item";
import { formatRefundCoinNumber } from "../shared/refund-status";
import { RefundStudioShell } from "../shared/refund-studio-shell";

interface RefundableCoursesProps {
  initialData: RefundableCoursesResponse;
  initialError: string | null;
}

const REFUNDABLE_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 10, min: 1, max: 100 },
} as const;

export default function RefundableCourses({
  initialData,
  initialError,
}: RefundableCoursesProps) {
  const { values, setParam } = useUrlQueryState(REFUNDABLE_QUERY_SCHEMA);
  const { page, limit } = values;

  const { data, error, isLoading } = useSWR<RefundableCoursesResponse>(
    `/users/refunds/my/refundable-courses?page=${page}&limit=${limit}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      fallbackData: page === 1 && limit === 10 ? initialData : undefined,
    },
  );

  const handleRequestRefund = (purchaseItemId: string) => {
    window.location.href = `/refunds/create?purchase_item_id=${purchaseItemId}`;
  };

  const courses = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const activeProtectedCoin = courses.reduce(
    (sum, item) => (item.can_refund ? sum + (item.discounted_price || 0) : sum),
    0,
  );
  const eligibleCount = courses.filter((item) => item.can_refund).length;

  return (
    <RefundStudioShell
      activeTab="refundable"
      eyebrow="Cloud Shield · Bảo vệ khoản đầu tư"
      title="Khóa học đang trong cửa sổ bảo vệ"
      description="Mọi khóa học bạn vừa đầu tư đều được bảo toàn quyền hoàn Coin minh bạch trong thời hạn quy định."
      tone="blue"
      heroRight={
        <div
          aria-hidden="true"
          className="stamp-down hidden items-center gap-1.5 rounded-full border-2 border-dashed border-primary/40 bg-surface/85 px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.14em] text-primary uppercase sm:inline-flex"
        >
          <ShieldCheck animated={false} className="size-3.5" />
          <span>BẢO TOÀN 100% COIN</span>
        </div>
      }
      heroFooter={
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Tổng Coin đang bảo vệ
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-display text-2xl font-bold text-primary tabular-nums">
              <Coins aria-hidden="true" animated={false} className="size-5 text-accent-vanilla-foreground" />
              <span>{formatRefundCoinNumber(activeProtectedCoin)} Coin</span>
            </p>
          </div>

          <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-success-foreground uppercase">
              Khóa học đủ điều kiện
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground tabular-nums">
              {eligibleCount}
              <span className="font-sans text-xs font-semibold text-muted-foreground">
                {" "}
                / {total} khóa học
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/50 p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
              Hoàn trả trực tiếp
            </p>
            <p className="mt-1 text-xs font-bold text-foreground">
              Cộng thẳng vào Kho Coin để tái đầu tư khóa học hoặc đổi quà Mây Mây
            </p>
          </div>
        </div>
      }
    >
      {initialError && <Alert variant="destructive">{initialError}</Alert>}
      {error && !isLoading && (
        <Alert variant="destructive">
          Không thể tải danh sách khóa học. Vui lòng thử lại sau.
        </Alert>
      )}

      {isLoading ? (
        <div role="status" aria-label="Đang tải khóa học có thể hoàn tiền" className="space-y-4">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-48 rounded-[24px] motion-reduce:animate-none" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-[24px] border border-border bg-surface p-8 shadow-xs">
          <EmptyState
            icon={<RotateCcw />}
            title="Chưa có khóa học nào trong thời hạn hoàn Coin"
            description="Khi bạn đăng ký khóa học mới, khóa học đủ điều kiện bảo vệ sẽ tự động hiển thị tại đây."
            action={
              <Link
                href="/refunds/my-requests"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <span>Xem lịch sử yêu cầu hoàn Coin</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="space-y-4">
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
              onPageChange={(nextPage) => setParam("page", nextPage)}
            />
          )}
        </>
      )}
    </RefundStudioShell>
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
    for (let i = start; i <= end; i += 1) range.push(i);
    return range;
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-4 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="text-xs font-medium text-muted-foreground tabular-nums">
        Hiển thị{" "}
        <strong className="font-bold text-foreground">
          {total === 0 ? 0 : (page - 1) * limit + 1}–{total === 0 ? 0 : Math.min(page * limit, total)}
        </strong>{" "}
        trên tổng số <strong className="font-bold text-foreground">{total}</strong> khóa học
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
