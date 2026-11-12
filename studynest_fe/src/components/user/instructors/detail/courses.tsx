"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { BookOpen, RotateCcw, Search, Star } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { handleImageError } from "@/lib/utils/helpers/image";
import { useUserStore } from "@/stores/user";
import type {
  InstructorCourseItem,
  InstructorCoursesResponse,
  InstructorFilterOptions,
} from "@/types/user/instructor";

const fetcher = <T,>(url: string) => api.get<T>(url).then((res) => res.data);

function formatPrice(amount: number, currency?: string | null): string {
  if (amount === 0) return "Miễn phí";
  const validCurrency = currency || "VND";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: validCurrency === "USD" ? "USD" : "VND",
    maximumFractionDigits: validCurrency === "USD" ? 2 : 0,
  }).format(amount);
}

interface InstructorCoursesProps {
  instructorId: string;
}

export default function InstructorCourses({ instructorId }: InstructorCoursesProps) {
  const user = useUserStore((s) => s.user);
  const viewerScope = user?.id || "guest";

  const searchInputId = useId();
  const subjectSelectId = useId();
  const gradeSelectId = useId();
  const sortSelectId = useId();

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState("rating_desc");

  // Nạp danh mục taxonomy từ filter-options thay vì API /categories/all legacy
  const { data: options } = useSWR<InstructorFilterOptions>(
    "/users/instructors/filter-options",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Debounce tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams({ limit: "12", sort });
    if (debouncedKeyword) p.set("keyword", debouncedKeyword);
    if (subject) p.set("subject", subject);
    if (grade) p.set("grade", grade);
    return p.toString();
  }, [sort, debouncedKeyword, subject, grade]);

  // Scope SWR key bao gồm user.id hoặc guest để bảo vệ trạng thái viewer (is_purchased / is_favorite)
  const swrKey = [
    "/users/instructors",
    instructorId,
    "courses",
    viewerScope,
    queryParams,
  ];

  const httpUrl = `/users/instructors/${encodeURIComponent(instructorId)}/courses?${queryParams}`;

  const { data, isLoading, error, mutate } = useSWR<InstructorCoursesResponse>(
    swrKey,
    () => api.get<InstructorCoursesResponse>(httpUrl).then((res) => res.data),
    { revalidateOnFocus: false }
  );

  // Quản lý phân trang keyset an toàn, chống stale / race condition
  const activeQueryKey = `${queryParams}::${viewerScope}::${instructorId}`;
  const activeQueryKeyRef = useRef(activeQueryKey);
  const loadingMoreKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadMoreGenRef = useRef(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  const [extraState, setExtraState] = useState<{
    queryKey: string;
    items: InstructorCourseItem[];
    cursor: string | null;
    hasLoadedMore: boolean;
  }>({
    queryKey: activeQueryKey,
    items: [],
    cursor: null,
    hasLoadedMore: false,
  });

  // Khi queryParams, viewerScope hoặc instructorId thay đổi: abort request cũ, reset generation và extraState
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    activeQueryKeyRef.current = activeQueryKey;
    loadMoreGenRef.current += 1;
    loadingMoreKeyRef.current = null;
    setIsLoadingMore(false);
    setMoreError(false);
    setExtraState({
      queryKey: activeQueryKey,
      items: [],
      cursor: null,
      hasLoadedMore: false,
    });
  }, [activeQueryKey]);

  // Dọn dẹp controller khi unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const items = useMemo(() => {
    const first = data?.items ?? [];
    const extra = extraState.queryKey === activeQueryKey ? extraState.items : [];
    return [...first, ...extra];
  }, [data?.items, extraState.queryKey, extraState.items, activeQueryKey]);

  const nextCursor = useMemo(() => {
    if (extraState.queryKey === activeQueryKey && extraState.hasLoadedMore) {
      return extraState.cursor;
    }
    return data?.next_cursor ?? null;
  }, [extraState.queryKey, extraState.hasLoadedMore, extraState.cursor, data?.next_cursor, activeQueryKey]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMoreKeyRef.current === activeQueryKey) return;

    const requestKey = activeQueryKey;
    const currentGen = ++loadMoreGenRef.current;

    loadingMoreKeyRef.current = requestKey;
    setIsLoadingMore(true);
    setMoreError(false);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.get<InstructorCoursesResponse>(
        `/users/instructors/${encodeURIComponent(instructorId)}/courses?${queryParams}&cursor=${encodeURIComponent(
          nextCursor
        )}`,
        { signal: controller.signal }
      );

      // Bỏ qua nếu generation hoặc query key đã thay đổi
      if (
        currentGen !== loadMoreGenRef.current ||
        requestKey !== activeQueryKeyRef.current
      ) {
        return;
      }

      const firstPageItems = data?.items ?? [];
      const newItems = res.data.items ?? [];

      setExtraState((prev) => {
        if (prev.queryKey !== requestKey) {
          return {
            queryKey: requestKey,
            items: newItems,
            cursor: res.data.next_cursor ?? null,
            hasLoadedMore: true,
          };
        }
        const existingIds = new Set([
          ...firstPageItems.map((c) => c.id),
          ...prev.items.map((c) => c.id),
        ]);
        const uniqueNew = newItems.filter((c) => !existingIds.has(c.id));
        return {
          queryKey: requestKey,
          items: [...prev.items, ...uniqueNew],
          cursor: res.data.next_cursor ?? null,
          hasLoadedMore: true,
        };
      });
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string })?.name === "CanceledError" ||
        (err as { name?: string })?.name === "AbortError" ||
        (err as { code?: string })?.code === "ERR_CANCELED";

      if (
        !isCanceled &&
        currentGen === loadMoreGenRef.current &&
        requestKey === activeQueryKeyRef.current
      ) {
        setMoreError(true);
      }
    } finally {
      if (currentGen === loadMoreGenRef.current) {
        loadingMoreKeyRef.current = null;
        setIsLoadingMore(false);
      }
    }
  };

  const hasFilter = Boolean(keyword || subject || grade || sort !== "rating_desc");
  const handleResetFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setSubject("");
    setGrade("");
    setSort("rating_desc");
  };

  const selectStyle =
    "w-full h-10 px-3 rounded-xl border border-input bg-surface text-xs font-medium text-foreground transition-colors hover:border-primary-pastel focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 cursor-pointer";

  return (
    <div className="space-y-6">
      {/* Thanh lọc & tìm kiếm khóa học */}
      <Card className="rounded-[24px] border border-border/80 bg-surface p-5 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Ô tìm kiếm */}
          <div>
            <label htmlFor={searchInputId} className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Tìm khóa học
            </label>
            <Input
              id={searchInputId}
              name="keyword"
              maxLength={160}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên khóa học..."
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>

          {/* Môn học */}
          <div>
            <label htmlFor={subjectSelectId} className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Môn học
            </label>
            <select
              id={subjectSelectId}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={selectStyle}
            >
              <option value="">Tất cả môn học</option>
              {options?.subjects?.map((sub) => (
                <option key={sub.id} value={sub.slug ?? sub.code}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Khối lớp */}
          <div>
            <label htmlFor={gradeSelectId} className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Khối lớp
            </label>
            <select
              id={gradeSelectId}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={selectStyle}
            >
              <option value="">Tất cả khối lớp</option>
              {options?.grades?.map((g) => (
                <option key={g.id} value={String(g.grade_number ?? g.name)}>
                  {g.grade_number ? `Lớp ${g.grade_number}` : g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sắp xếp */}
          <div>
            <label htmlFor={sortSelectId} className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Sắp xếp
            </label>
            <select
              id={sortSelectId}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={selectStyle}
            >
              <option value="created_at_desc">Mới nhất</option>
              <option value="created_at_asc">Cũ nhất</option>
              <option value="rating_desc">Đánh giá cao</option>
              <option value="enrolls_desc">Nhiều học viên</option>
              <option value="views_desc">Nhiều lượt xem</option>
            </select>
          </div>
        </div>

        {hasFilter && (
          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </Card>

      {/* Danh sách hiển thị khóa học */}
      {isLoading && items.length === 0 ? (
        <div role="status" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[20px] border border-border bg-surface p-0 overflow-hidden shadow-xs animate-pulse"
            >
              <Skeleton variant="rect" className="aspect-video w-full rounded-none" />
              <div className="p-5 space-y-3">
                <Skeleton variant="text" className="h-4 w-3/4" />
                <Skeleton variant="text" className="h-4 w-1/2" />
                <div className="pt-3 border-t border-border/70 flex justify-between">
                  <Skeleton variant="text" className="h-3 w-16" />
                  <Skeleton variant="text" className="h-4 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <Card className="rounded-[24px] border-destructive-border bg-destructive-bg/30 p-8 text-center">
          <h3 className="text-base font-semibold text-destructive-foreground mb-1">
            Không thể tải danh sách khóa học
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.
          </p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Thử tải lại
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có khóa học nào phù hợp"
          description="Giáo viên hiện chưa có khóa học công khai phù hợp với điều kiện tìm kiếm của bạn."
          action={
            hasFilter ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Đặt lại bộ lọc
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((course) => {
              const isFree = course.base_price === 0;
              const hasReviews = course.rating_count > 0 && course.rating_avg > 0;

              return (
                <Card
                  key={course.id}
                  interactive
                  className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-ambient-md"
                >
                  <Link
                    href={`/course/${course.slug}`}
                    className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-primary-light/40">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          loading="lazy"
                          onError={handleImageError}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary-light text-primary">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}

                      {course.category?.name && (
                        <div className="absolute left-3 top-3">
                          <Badge variant="primary" className="text-[11px] shadow-2xs font-medium backdrop-blur-xs">
                            {course.category.name}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className="flex flex-1 flex-col p-5">
                      <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-3">
                        {course.title}
                      </h4>

                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/70 text-xs">
                        <div>
                          {hasReviews ? (
                            <div className="flex items-center gap-1 font-medium">
                              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                              <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
                              <span className="text-muted-foreground font-normal">
                                ({course.rating_count})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Chưa có đánh giá</span>
                          )}
                        </div>

                        <div className="text-right">
                          <span
                            className={
                              isFree
                                ? "text-sm font-bold text-success-foreground"
                                : "text-base font-bold text-primary"
                            }
                          >
                            {formatPrice(course.base_price, course.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>

          {nextCursor && (
            <div className="mt-8 flex flex-col items-center justify-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                loadingText="Đang tải thêm..."
                className="min-w-[160px] shadow-xs"
              >
                Xem thêm khóa học
              </Button>
              {moreError && (
                <div className="flex items-center gap-2 text-xs text-destructive-foreground">
                  <span>Không thể tải thêm khóa học.</span>
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
  );
}
