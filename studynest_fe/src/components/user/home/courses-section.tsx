"use client";

import { Alert, Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import type { CatalogCourseCardResult } from "@/types/catalog";
import { ArrowDown, ArrowRight, BookOpen, Clock3, GraduationCap, Gift, Star, TrendingUp, X } from "pulsoicon-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import useSWRInfinite from "swr/infinite";
import {
  CourseCard,
  CourseCardSkeleton,
  courseActionClass,
  courseLinkFocusClass,
  courseNumber,
} from "./courses/course-card";
import { CloudBlob, GlassCard, Pill, Reveal, SectionHeader, SectionShell } from "./landing-ui";

const views = [
  { id: "newest", label: "Mới nhất", icon: Clock3 },
  { id: "popular", label: "Phổ biến", icon: TrendingUp },
  { id: "rating", label: "Đánh giá cao", icon: Star },
  { id: "free", label: "Miễn phí", icon: Gift },
] as const;
const levels = [
  { id: "", label: "Tất cả" },
  { id: "tieu-hoc", label: "Tiểu học" },
  { id: "thcs", label: "THCS" },
  { id: "thpt", label: "THPT" },
] as const;
const firstPageSize = 4;
const nextPageSize = 6;

type View = (typeof views)[number]["id"];
type PageKey = readonly [url: string, filterKey: string];
type CoursePage = { filterKey: string; result: CatalogCourseCardResult };

async function fetchPage([url, filterKey]: PageKey): Promise<CoursePage> {
  const response = await api.get<CatalogCourseCardResult>(url);
  return { filterKey, result: response.data };
}

function CourseFilters({
  view,
  level,
  subject,
  onView,
  onLevel,
  onClearSubject,
}: {
  view: View;
  level: string;
  subject: string;
  onView?: (value: View) => void;
  onLevel?: (value: string) => void;
  onClearSubject?: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between">
      <fieldset className="grid min-w-0 grid-cols-2 gap-1.5 rounded-3xl border border-primary-pastel/70 bg-surface/90 p-1.5 sm:flex sm:w-fit sm:flex-wrap sm:rounded-full">
        <legend className="sr-only">Sắp xếp và lọc theo giá</legend>
        {views.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={id === view ? "primary" : "ghost"}
            className={cn(courseActionClass, "gap-1.5 px-2.5 text-xs sm:px-4 sm:text-sm")}
            aria-pressed={view === id}
            onClick={onView ? () => onView(id) : undefined}
            disabled={!onView}
            leftIcon={<Icon aria-hidden="true" className="size-4" />}
          >
            {label}
          </Button>
        ))}
      </fieldset>
      <fieldset className="flex min-w-0 flex-wrap items-center gap-1.5">
        <legend className="sr-only">Lọc theo cấp học</legend>
        {levels.map(({ id, label }) => (
          <Button
            key={id}
            variant={id === level ? "pastel" : "outline"}
            className={cn(courseActionClass, "px-3 text-xs sm:text-sm", id === level && "border-primary text-info-foreground")}
            aria-pressed={level === id}
            aria-label={id ? undefined : "Tất cả cấp học"}
            onClick={onLevel ? () => onLevel(id) : undefined}
            disabled={!onLevel}
          >
            {label}
          </Button>
        ))}
        {subject && (
          <Button
            variant="outline"
            className={cn(courseActionClass, "px-3 text-xs sm:text-sm")}
            onClick={onClearSubject}
            rightIcon={<X aria-hidden="true" className="size-4" />}
          >
            Bỏ lọc môn học
          </Button>
        )}
      </fieldset>
    </div>
  );
}

function CourseShelf({ cards }: { cards: ReactNode[] }) {
  const [featured, ...more] = cards;
  return (
    <div className="grid min-w-0 gap-5 lg:gap-7">
      {featured}
      {more.length > 0 && (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-5 lg:gap-y-7 lg:pb-3 lg:[&>*:nth-child(3n+2)]:translate-y-3">
          {more}
        </div>
      )}
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <div aria-hidden="true">
      <CourseShelf cards={Array.from({ length: firstPageSize }, (_, index) => (
        <CourseCardSkeleton key={index} featured={index === 0} />
      ))} />
    </div>
  );
}

function chooseSubjects() {
  document.getElementById("subjects-section")?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

function CourseBrowser() {
  const search = useSearchParams();
  const maxPrice = search.get("max_price");
  const sort = search.get("sort");
  const view: View = maxPrice === "0" ? "free" : sort === "popular" || sort === "rating" ? sort : "newest";
  const level = levels.find(({ id }) => id === search.get("level"))?.id ?? "";
  const subject = search.get("subject")?.trim().slice(0, 100) ?? "";
  const filters = new URLSearchParams({ sort: view === "free" ? "newest" : view });
  if (view === "free") {
    filters.set("min_price", "0");
    filters.set("max_price", "0");
  }
  if (level) filters.set("level", level);
  if (subject) filters.set("subject", subject);
  const filterKey = filters.toString();

  const { data: pages, error, isValidating, size, setSize, mutate } = useSWRInfinite<CoursePage>(
    (index: number, previous: CoursePage | null): PageKey | null => {
      const url = `/catalog/courses?${filterKey}`;
      if (index === 0) return [`${url}&limit=${firstPageSize}`, filterKey];
      const cursor = previous?.result.next_cursor;
      if (!cursor || !previous.result.has_more) return null;
      return [`${url}&limit=${nextPageSize}&include_total=false&cursor=${encodeURIComponent(cursor)}`, filterKey];
    },
    fetchPage,
    {
      keepPreviousData: true,
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  const isPrevious = Boolean(pages?.[0] && pages[0].filterKey !== filterKey);
  const isUpdating = isPrevious && !error;
  const items = useMemo(() => Array.from(new Map(pages?.flatMap(({ result }) => (
    result.items.map((course) => [course.id, course] as const)
  ))).values()), [pages]);
  const total = pages?.[0]?.result.total;
  const lastResult = pages?.at(-1)?.result;
  const hasMore = Boolean(lastResult?.has_more && lastResult.next_cursor);
  const hasFilters = view !== "newest" || Boolean(level || subject);
  const loadButton = useRef<HTMLButtonElement>(null);
  const pendingLoad = useRef<{ filterKey: string; index: number } | null>(null);

  useEffect(() => {
    const pending = pendingLoad.current;
    if (!pending) return;
    if (pending.filterKey !== filterKey) {
      pendingLoad.current = null;
      return;
    }
    if (isValidating || isPrevious || error) return;
    const firstNew = items[pending.index];
    if (firstNew && document.activeElement === loadButton.current) {
      document.getElementById(`home-course-${firstNew.id}`)?.focus();
    }
    pendingLoad.current = null;
  }, [error, filterKey, isPrevious, isValidating, items]);

  function changeFilters(values: Record<string, string>) {
    const url = new URL(window.location.href);
    for (const [name, value] of Object.entries(values)) {
      if (value) url.searchParams.set(name, value);
      else url.searchParams.delete(name);
    }
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
    }
  }

  function loadMore() {
    if (isValidating || isPrevious || !hasMore || (error && !loadMoreError)) return;
    pendingLoad.current = { filterKey, index: items.length };
    void (error ? mutate() : setSize(size + 1)).catch(() => undefined);
  }

  const isInitialLoading = !pages && !error;
  const isNextPagePending = !isPrevious && Boolean(pages) && size > (pages?.length ?? 0) && hasMore;
  const isLoadingMore = isValidating && isNextPagePending;
  const loadMoreError = Boolean(error && isNextPagePending);
  let status = "";
  if (isInitialLoading) status = "Đang tải khóa học…";
  else if (isUpdating) status = "Đang cập nhật kết quả…";
  else if (isLoadingMore) status = "Đang tải thêm khóa học…";
  else if (isPrevious && error) status = "Đang hiển thị kết quả trước đó";
  else if (total != null) status = `${courseNumber.format(total)} khóa học công khai`;
  else if (items.length) status = `${courseNumber.format(items.length)} khóa học`;

  return (
    <>
      <CourseFilters
        view={view}
        level={level}
        subject={subject}
        onView={(value) => changeFilters({ sort: value === "newest" || value === "free" ? "" : value, max_price: value === "free" ? "0" : "" })}
        onLevel={(value) => changeFilters({ level: value })}
        onClearSubject={() => changeFilters({ subject: "" })}
      />
      <div className="mb-3 mt-4 flex min-h-8 items-center md:mb-5 md:mt-5">
        <div role="status" aria-live="polite" aria-atomic="true">
          {status && (
            <Pill className="bg-surface text-info-foreground">
              <GraduationCap aria-hidden="true" className="size-4" />
              {status}
              {pages && !isPrevious && !isLoadingMore && items.length > 0 && (
                <span className="sr-only">. Đang hiển thị {courseNumber.format(items.length)} khóa học.</span>
              )}
            </Pill>
          )}
        </div>
      </div>

      {error && !loadMoreError && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Alert variant="info" className="min-w-0 flex-1">Chưa tải được kết quả khóa học.</Alert>
          <Button variant="outline" className={courseActionClass} onClick={() => void mutate().catch(() => undefined)}>
            Thử lại
          </Button>
        </div>
      )}
      <div aria-busy={isValidating}>
        {isInitialLoading ? <ShelfSkeleton /> : items.length > 0 ? (
          <div className={cn("transition-opacity motion-reduce:transition-none", isUpdating && "opacity-85")}>
            <CourseShelf cards={items.map((course, index) => (
              // Keep already-revealed positions visible when a filter swaps their contents.
              <Reveal key={index} as="article" delay={(index === 0 ? 0 : (index - 1) % 3 + 1) * 0.08} className="min-w-0">
                <CourseCard key={course.id} course={course} featured={index === 0} />
              </Reveal>
            ))} />
          </div>
        ) : !error ? (
          <Reveal className="mx-auto max-w-2xl">
            <GlassCard tilt={false}>
              <EmptyState
                icon={<BookOpen aria-hidden="true" className="size-6" />}
                title={hasFilters ? "Chưa có khóa học phù hợp" : "Khóa học đang được chuẩn bị"}
                description={hasFilters ? "Bạn có thể thay đổi bộ lọc để xem thêm khóa học." : "Bạn có thể khám phá các môn học để chọn hướng học phù hợp."}
                className="border-0 bg-transparent px-4 py-8 shadow-none md:py-12 [&_p]:text-foreground/85"
                action={(
                  <Button
                    variant="outline"
                    className={courseActionClass}
                    onClick={hasFilters ? () => changeFilters({ sort: "", max_price: "", level: "", subject: "" }) : chooseSubjects}
                  >
                    {hasFilters ? "Xóa bộ lọc" : "Xem môn học"}
                  </Button>
                )}
              />
            </GlassCard>
          </Reveal>
        ) : null}
      </div>
      {items.length > 0 && (hasMore || (pages?.length ?? 0) > 1) && (
        <div className="mt-6 flex flex-col items-center gap-3 md:mt-8">
          {loadMoreError && <Alert variant="info">Chưa tải được thêm khóa học.</Alert>}
          <Button
            ref={loadButton}
            variant="pastel"
            className={cn(courseActionClass, "aria-disabled:cursor-default")}
            aria-disabled={isValidating || isPrevious || !hasMore || Boolean(error && !loadMoreError)}
            onClick={loadMore}
            rightIcon={hasMore && !loadMoreError ? <ArrowDown aria-hidden="true" className="size-4" /> : undefined}
          >
            {isLoadingMore ? "Đang tải thêm…" : !hasMore ? "Đã tải hết khóa học" : loadMoreError ? "Thử lại" : "Tải thêm"}
          </Button>
        </div>
      )}
    </>
  );
}

export default function CoursesSection() {
  return (
    <SectionShell id="courses-section" tone="blue" label="Khóa học chính thức">
      <div className="mb-8 flex flex-col items-start gap-5 md:mb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <SectionHeader
          align="left"
          title={<>Khóa học <span className="text-info-foreground">chính thức</span></>}
          description="Khám phá các khóa học theo môn học và cấp lớp."
          className="mb-0! [&_p]:text-foreground/85"
        />
        <Reveal delay={0.08} className="shrink-0">
          <Link
            href="/courses"
            className={cn(
              courseActionClass,
              courseLinkFocusClass,
              "inline-flex items-center gap-2.5 border border-primary-pastel bg-surface/95 text-sm font-semibold text-info-foreground shadow-ambient-md hover:bg-primary-light",
            )}
          >
            Xem tất cả khóa học
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        </Reveal>
      </div>
      <GlassCard tilt={false} className="relative isolate p-2.5 sm:p-5 md:p-7 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-linear-to-br from-primary-light/65 via-surface/45 to-accent/20">
          <CloudBlob className="-bottom-16 -left-16 h-64 w-96 bg-primary-pastel/50" />
          <CloudBlob className="-right-20 top-12 h-60 w-80 bg-surface/80" />
          <div className="absolute -right-12 -top-36 size-96 rounded-full border border-primary-pastel/60" />
          <div className="absolute -right-4 -top-28 size-80 rounded-full border border-primary-pastel/60" />
        </div>
        <Suspense fallback={(
          <>
            <CourseFilters view="newest" level="" subject="" />
            <p role="status" className="mb-3 mt-4 flex min-h-8 items-center text-sm text-foreground md:mb-5 md:mt-5">Đang tải khóa học…</p>
            <ShelfSkeleton />
          </>
        )}>
          <CourseBrowser />
        </Suspense>
      </GlassCard>
    </SectionShell>
  );
}
