"use client";

import { CoinPrice, Skeleton } from "@/components/ui";
import { mayPortrait, pathCover, StudyImage } from "@/components/user/home/study-image";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import api from "@/lib/utils/fetcher/client/axios";
import type { CatalogCombo, CatalogCombosResponse } from "@/types/catalog-combos";
import type { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import useSWR from "swr";
import { HubLoadError } from "../hub-page-state";
import { stretchedLink, TicketCard } from "./home-ui";
import { HomeLink } from "./section";

async function fetchCombos(url: string): Promise<CatalogCombosResponse> {
  const response = await fetch(url, { credentials: "omit", headers: { "ngrok-skip-browser-warning": "1" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Không tải được combo.");
  return response.json();
}

function GridSkeleton({ label, cols = 5 }: { label: string; cols?: 5 }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 [&_.animate-pulse]:motion-reduce:animate-none"
    >
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} className="aspect-[16/12] w-full rounded-3xl" />
      ))}
    </div>
  );
}

function RecommendedTile({ course }: { course: RecommendedItem }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (checking) return;
    setChecking(true);
    try {
      const res = await api.get(`/courses/${course.id}/is_enroll`);
      router.push(res.data.is_enroll ? `/learning/${course.slug}` : `/course/${course.slug}`);
    } catch {
      router.push(`/course/${course.slug}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <li className="relative flex min-w-0 flex-col">
      <TicketCard
        src={course.thumbnail}
        alt={`Ảnh bìa khóa học ${course.title}`}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="flex h-full flex-col border border-border shadow-ambient-sm transition-shadow hover:shadow-ambient-md"
        captionClassName="flex flex-1 flex-col justify-between space-y-2"
      >
        <h3 className="line-clamp-2 text-base leading-snug font-bold text-foreground wrap-anywhere">
          <Link href={`/course/${course.slug}`} onClick={(event) => void open(event)} aria-busy={checking || undefined} className={stretchedLink}>
            {course.title}<span className="sr-only">{checking ? " (đang mở)" : " — xem khóa học"}</span>
          </Link>
        </h3>
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
          {course.instructor && <StudyImage src={course.instructor.avatar} fallback={mayPortrait} sizes="24px" className="size-6 shrink-0 rounded-full border border-surface" />}
          <span className="truncate">{course.instructor?.name}{course.similarity > 0 && ` · ${Math.round(course.similarity * 100)}% phù hợp`}</span>
        </p>
      </TicketCard>
    </li>
  );
}

function ComboTile({ combo }: { combo: CatalogCombo }) {
  const cover = combo.thumbnail || combo.courses.find(({ thumbnail }) => thumbnail)?.thumbnail;
  const savings = Number(combo.savings_amount) > 0;
  return (
    <li className="relative flex min-w-0 flex-col">
      <TicketCard
        src={cover}
        fallback={pathCover}
        alt={`Ảnh bìa combo ${combo.title}`}
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        className="flex h-full flex-col border border-border shadow-ambient-sm transition-shadow hover:shadow-ambient-md"
        captionClassName="flex flex-1 flex-col justify-between space-y-2 py-4"
      >
        <div className="space-y-1.5">
          {savings && <p className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">Tiết kiệm {combo.savings_percent > 0 ? `${combo.savings_percent}%` : "< 1%"}</p>}
          <h3 className="line-clamp-2 text-base leading-snug font-extrabold text-foreground wrap-anywhere sm:text-lg">
            <Link href={`/combo/${encodeURIComponent(combo.slug)}`} className={stretchedLink}>{combo.title}<span className="sr-only"> — xem combo</span></Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{combo.instructor.name} · {combo.course_count} khóa · {combo.lesson_count} bài</p>
        </div>
        <div className="pt-1">
          <CoinPrice
            priceVnd={combo.price}
            originalPriceVnd={savings ? combo.standalone_total : undefined}
            size="md"
          />
        </div>
      </TicketCard>
    </li>
  );
}

function Recommended() {
  const { data, error, isValidating, mutate } = useAuthedSWR<RecommendedResponse>("/courses/feed/recommend", { revalidateOnFocus: false, shouldRetryOnError: false });
  return (
    <section id="discover" tabIndex={-1} aria-labelledby="discover-title" className="scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="discover-title" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Khóa học gợi ý cho bạn</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Tuyển chọn dựa trên môn học và tiến độ của bạn.</p>
        </div>
        <HomeLink href="/courses" endIcon={false} className="bg-surface text-sm">Danh mục khóa học</HomeLink>
      </div>
      {error ? (
        <HubLoadError title="Chưa tải được khóa gợi ý" message="Tải lại để xem khóa hợp sở thích." onRetry={() => void mutate().catch(() => undefined)} isRetrying={isValidating} />
      ) : !data ? <GridSkeleton label="Đang tải khóa học gợi ý" cols={5} /> : data.items.length ? (
        <ul aria-label="Khóa học gợi ý" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.slice(0, 10).map((course) => <RecommendedTile key={course.id} course={course} />)}
        </ul>
      ) : (
        <div className="flex items-center gap-4 rounded-3xl border border-primary-pastel bg-primary-light/60 p-4">
          <StudyImage fallback={mayPortrait} sizes="64px" className="size-16 shrink-0 rounded-full" />
          <p className="text-sm font-medium text-foreground">Chọn một môn trong danh mục để Mây gợi ý khóa hợp sở thích.</p>
        </div>
      )}
    </section>
  );
}

function Combos() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogCombosResponse>("/api/catalog/combos?limit=5&sort=recent", fetchCombos,
    { keepPreviousData: true, dedupingInterval: 30_000, focusThrottleInterval: 60_000, shouldRetryOnError: false });
  const items = data?.items ?? [];
  return (
    <section aria-labelledby="combo-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="combo-title" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Combo lộ trình tiết kiệm</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Học trọn bộ khóa liên quan với chi phí tối ưu hơn.</p>
        </div>
        <HomeLink href="/combo" endIcon={false} className="bg-surface text-sm">Tất cả combo</HomeLink>
      </div>
      {error ? (
        <HubLoadError title="Chưa tải được combo" message="Tải lại để xem giá và ưu đãi đang mở." onRetry={() => void mutate().catch(() => undefined)} isRetrying={isValidating} />
      ) : isLoading || !data ? <GridSkeleton label="Đang tải combo" cols={5} /> : items.length ? (
        <ul aria-label="Combo lộ trình" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((combo) => <ComboTile key={combo.id} combo={combo} />)}
        </ul>
      ) : (
        <div className="flex items-center gap-4 rounded-3xl border border-accent-border bg-accent/60 p-4">
          <StudyImage fallback={pathCover} sizes="96px" className="aspect-video w-28 shrink-0 rounded-2xl" />
          <p className="text-sm font-medium text-foreground">Chưa có combo mới. Bạn có thể xem danh mục combo bất cứ lúc nào.</p>
        </div>
      )}
    </section>
  );
}

export function Discover() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <Recommended />
      <Combos />
    </div>
  );
}
