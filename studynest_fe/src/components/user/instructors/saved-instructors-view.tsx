"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertCircle, GraduationCap } from "lucide-react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { useSavedInstructors } from "@/hooks/user/use-saved-instructors";
import type { InstructorDirectoryEnvelope, InstructorItem } from "@/types/user/instructor";
import { InstructorCard } from "./instructor-card";

export function SavedInstructorsView() {
  const ownerId = useUserStore((s) => s.user?.id);
  return <SavedInstructorList key={ownerId ?? "guest"} />;
}

function SavedInstructorList() {
  const user = useUserStore((s) => s.user);
  const currentUserIdRef = useRef(user?.id);

  const [extraItems, setExtraItems] = useState<InstructorItem[]>([]);
  const [extraCursor, setExtraCursor] = useState<string | null>(null);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  const loadingMoreKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadMoreGenRef = useRef(0);

  // Owner guard: Khi user đổi tài khoản (hoặc đăng xuất), dọn dẹp state và hủy request cũ ngay lập tức
  useEffect(() => {
    if (currentUserIdRef.current !== user?.id) {
      currentUserIdRef.current = user?.id;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      loadMoreGenRef.current += 1;
      loadingMoreKeyRef.current = null;
      setExtraItems([]);
      setExtraCursor(null);
      setHasLoadedMore(false);
      setLoadingMore(false);
      setMoreError(false);
    }
  }, [user?.id]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // SWR key bắt buộc scope theo user.id để không chia sẻ cache giữa 2 tài khoản
  const swrKey = user?.id ? ["/users/instructors/saved", user.id, "limit=12&include_total=true"] : null;

  const { data, error, isLoading, mutate } = useSWR<InstructorDirectoryEnvelope>(
    swrKey,
    () => api.get<InstructorDirectoryEnvelope>("/users/instructors/saved?limit=12&include_total=true").then((r) => r.data),
    { revalidateOnFocus: false }
  );

  const items = useMemo(() => {
    const first = data?.items ?? [];
    return [...first, ...extraItems];
  }, [data?.items, extraItems]);

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const { isPending, toggleSave, isReady, fetchError, retry } = useSavedInstructors(itemIds);

  const nextCursor = hasLoadedMore ? extraCursor : (data?.next_cursor ?? null);
  const total = data?.total ?? items.length;

  // Khi toggleSave: CHỈ loại bỏ card khi thao tác trả về kết quả false (bỏ lưu thành công).
  // Tuyệt đối không dùng !willBeSaved vì khi rapid toggle bị ignored (trả về null), card không bị xóa nhầm!
  const handleToggleSave = async (id: string) => {
    const ownerId = user?.id;
    const willBeSaved = await toggleSave(id);
    if (useUserStore.getState().user?.id !== ownerId) return;
    if (willBeSaved === false) {
      setExtraItems((prev) => prev.filter((item) => item.id !== id));
      mutate(
        (prevData) => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            items: prevData.items.filter((item) => item.id !== id),
            total: prevData.total !== null ? Math.max(0, prevData.total - 1) : null,
          };
        },
        { revalidate: false }
      );
    }
  };

  const handleLoadMore = async () => {
    const requestOwnerId = user?.id;
    if (!nextCursor || !requestOwnerId || loadingMoreKeyRef.current === requestOwnerId) return;

    const currentGen = ++loadMoreGenRef.current;
    loadingMoreKeyRef.current = requestOwnerId;
    setLoadingMore(true);
    setMoreError(false);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.get<InstructorDirectoryEnvelope>(
        `/users/instructors/saved?limit=12&cursor=${encodeURIComponent(nextCursor)}&include_total=false`,
        { signal: controller.signal }
      );

      // Guard: loại bỏ stale response nếu đổi tài khoản hoặc thế hệ request đã thay đổi
      if (
        currentGen !== loadMoreGenRef.current ||
        requestOwnerId !== currentUserIdRef.current
      ) {
        return;
      }

      const existingIds = new Set(items.map((i) => i.id));
      const uniqueNew = (res.data.items ?? []).filter((i) => !existingIds.has(i.id));

      setExtraItems((prev) => [...prev, ...uniqueNew]);
      setExtraCursor(res.data.next_cursor ?? null);
      setHasLoadedMore(true);
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string })?.name === "CanceledError" ||
        (err as { name?: string })?.name === "AbortError" ||
        (err as { code?: string })?.code === "ERR_CANCELED";

      if (
        !isCanceled &&
        currentGen === loadMoreGenRef.current &&
        requestOwnerId === currentUserIdRef.current
      ) {
        setMoreError(true);
      }
    } finally {
      if (currentGen === loadMoreGenRef.current) {
        loadingMoreKeyRef.current = null;
        setLoadingMore(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Mục yêu thích & Đã lưu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý các khóa học và giáo viên bạn đang theo dõi trên Mây Mây
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="inline-flex items-center rounded-xl border border-border bg-surface p-1 shadow-2xs">
          <Link
            href="/favorites"
            className="px-4 py-2 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Khóa học yêu thích
          </Link>
          <Link
            href="/favorites/instructors"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-light text-primary shadow-2xs"
          >
            Giáo viên đã lưu
          </Link>
        </div>
      </div>

      {/* Cảnh báo lỗi nạp trạng thái đồng bộ nếu có */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning-light/40 p-4 text-xs font-medium text-warning-foreground">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Không thể đồng bộ danh sách đã lưu đầy đủ. Vui lòng thử lại.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => retry()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Body List */}
      <div className="space-y-6">
        {isLoading && items.length === 0 ? (
          <div role="status" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="rounded-[24px] border border-border bg-surface p-5 shadow-xs animate-pulse space-y-4"
              >
                <div className="flex items-center gap-4">
                  <Skeleton variant="circle" className="w-16 h-16" />
                  <div className="space-y-2 flex-1">
                    <Skeleton variant="text" className="h-4 w-3/4" />
                    <Skeleton variant="text" className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton variant="text" className="h-3 w-full" />
                <div className="pt-3 border-t border-border/70 flex justify-between">
                  <Skeleton variant="text" className="h-3 w-16" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <Card className="rounded-[24px] border-destructive-border bg-destructive-bg/30 p-8 text-center">
            <h3 className="text-base font-semibold text-destructive-foreground mb-1">
              Không thể tải danh sách giáo viên đã lưu
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
            </p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              Thử tải lại
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có giáo viên nào được lưu"
            description="Bạn có thể tìm kiếm và bấm biểu tượng trái tim để lưu lại các giáo viên yêu thích, giúp dễ dàng tìm lại hồ sơ và khóa học."
            action={
              <Link
                href="/instructors"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Khám phá đội ngũ giáo viên</span>
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Đang lưu {items.length} giáo viên</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((instructor) => (
                <InstructorCard
                  key={instructor.id}
                  instructor={instructor}
                  isSaved
                  isSaving={isPending(instructor.id)}
                  isReady={isReady}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleLoadMore}
                  isLoading={loadingMore}
                  loadingText="Đang tải thêm..."
                >
                  Xem thêm giáo viên đã lưu
                </Button>
                {moreError && (
                  <div className="flex items-center gap-2 text-xs text-destructive-foreground">
                    <span>Không thể tải thêm giáo viên đã lưu.</span>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="font-semibold underline hover:text-foreground cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
