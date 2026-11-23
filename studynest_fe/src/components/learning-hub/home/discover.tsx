"use client";

import { CoinPrice, Skeleton } from "@/components/ui";
import { mayPortrait, pathCover, StudyImage } from "@/components/user/home/study-image";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import api from "@/lib/utils/fetcher/client/axios";
import { cn } from "@/lib/utils";
import type { CatalogCombo, CatalogCombosResponse } from "@/types/catalog-combos";
import type { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import useSWR from "swr";
import { HubLoadError } from "../hub-page-state";
import { stretchedLink, TicketCard } from "./home-ui";
import { formatCoursePriceCoin, formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { HomeLink } from "./section";

const widths = ["w-[17.5rem] sm:w-[20rem]", "w-[15rem] sm:w-[17rem]", "w-[16.5rem] sm:w-[18.5rem]"];
const tilts = ["rotate-1", "-rotate-1", "rotate-[0.5deg]"];

async function fetchCombos(url: string): Promise<CatalogCombosResponse> {
  const response = await fetch(url, { credentials: "omit", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Không tải được combo.");
  return response.json();
}

function RailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex items-start gap-5 overflow-hidden py-4 [&_.animate-pulse]:motion-reduce:animate-none">
      {[0, 1, 2].map((i) => <Skeleton key={i} className={cn("aspect-[16/12] shrink-0 rounded-[1.5rem]", widths[i])} />)}
    </div>
  );
}

function RecommendedTile({ course, index }: { course: RecommendedItem; index: number }) {
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
    <li className={cn("relative shrink-0 snap-start", widths[index % 3], tilts[index % 3])}>
      <TicketCard src={course.thumbnail} alt={`Ảnh bìa khóa học ${course.title}`} sizes="(min-width: 640px) 320px, 280px" captionClassName="space-y-1.5">
        <h3 className="line-clamp-2 text-base leading-snug font-bold wrap-anywhere">
          <Link href={`/course/${course.slug}`} onClick={(event) => void open(event)} aria-busy={checking || undefined} className={stretchedLink}>
            {course.title}<span className="sr-only">{checking ? " (đang mở)" : " — xem khóa học"}</span>
          </Link>
        </h3>
        <p className="flex min-w-0 items-center gap-2 text-sm">
          {course.instructor && <StudyImage src={course.instructor.avatar} fallback={mayPortrait} sizes="24px" className="size-6 shrink-0 rounded-full border border-surface" />}
          <span className="truncate">{course.instructor?.name}{course.similarity > 0 && ` · ${Math.round(course.similarity * 100)}% phù hợp`}</span>
        </p>
      </TicketCard>
    </li>
  );
}

function ComboTile({ combo, index }: { combo: CatalogCombo; index: number }) {
  const cover = combo.thumbnail || combo.courses.find(({ thumbnail }) => thumbnail)?.thumbnail;
  const savings = Number(combo.savings_amount) > 0;
  return (
    <li className={cn("relative w-[88%] shrink-0 snap-start sm:w-[24rem] lg:w-auto lg:min-w-0 lg:flex-1", index % 2 ? "-rotate-1 lg:mt-8" : "rotate-1")}>
      <TicketCard src={cover} fallback={pathCover} alt={`Ảnh bìa combo ${combo.title}`} sizes="(min-width: 1024px) 400px, 88vw" captionClassName="space-y-1.5 py-4">
        {savings && <p className="w-fit rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">Tiết kiệm {combo.savings_percent > 0 ? `${combo.savings_percent}%` : "< 1%"}</p>}
        <h3 className="line-clamp-2 text-lg leading-snug font-extrabold wrap-anywhere">
          <Link href={`/combo/${encodeURIComponent(combo.slug)}`} className={stretchedLink}>{combo.title}<span className="sr-only"> — xem combo</span></Link>
        </h3>
        <p className="truncate text-sm">{combo.instructor.name} · {combo.course_count} khóa · {combo.lesson_count} bài</p>
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
      <div className="mb-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id="discover-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Khóa học gợi ý cho bạn</h2>
        <HomeLink href="/courses" endIcon={false} className="bg-surface text-sm">Danh mục khóa học</HomeLink>
      </div>
      {error ? (
        <div className="mt-3"><HubLoadError title="Chưa tải được khóa gợi ý" message="Tải lại để xem khóa hợp sở thích." onRetry={() => void mutate().catch(() => undefined)} isRetrying={isValidating} /></div>
      ) : !data ? <RailSkeleton label="Đang tải khóa học gợi ý" /> : data.items.length ? (
        <ul aria-label="Khóa học gợi ý" className="relative -mx-5 flex snap-x items-start gap-5 overflow-x-auto px-5 py-5 sm:-mx-8 sm:px-8">
          {data.items.map((course, index) => <RecommendedTile key={course.id} course={course} index={index} />)}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-4 rounded-[1.75rem] bg-primary-light p-3">
          <StudyImage fallback={mayPortrait} sizes="80px" className="size-20 shrink-0 rounded-full" />
          <p className="text-sm font-medium">Chọn một môn trong danh mục để Mây gợi ý khóa hợp sở thích.</p>
        </div>
      )}
    </section>
  );
}

function Combos() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogCombosResponse>("/api/catalog/combos?limit=3&sort=recent", fetchCombos,
    { keepPreviousData: true, dedupingInterval: 30_000, focusThrottleInterval: 60_000, shouldRetryOnError: false });
  const items = data?.items ?? [];
  return (
    <section aria-labelledby="combo-title">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 id="combo-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Combo lộ trình</h2>
        <HomeLink href="/combo" endIcon={false} className="bg-surface text-sm">Tất cả combo</HomeLink>
      </div>
      {error ? (
        <div className="mt-3"><HubLoadError title="Chưa tải được combo" message="Tải lại để xem giá và ưu đãi đang mở." onRetry={() => void mutate().catch(() => undefined)} isRetrying={isValidating} /></div>
      ) : isLoading || !data ? <RailSkeleton label="Đang tải combo" /> : items.length ? (
        <ul aria-label="Combo lộ trình" className="relative -mx-5 flex snap-x items-start gap-6 overflow-x-auto px-5 py-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-2">
          {items.map((combo, index) => <ComboTile key={combo.id} combo={combo} index={index} />)}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-4 rounded-[1.75rem] bg-accent p-3">
          <StudyImage fallback={pathCover} sizes="96px" className="aspect-video w-28 shrink-0 rounded-2xl" />
          <p className="text-sm font-medium">Chưa có combo mới. Bạn có thể xem danh mục combo bất cứ lúc nào.</p>
        </div>
      )}
    </section>
  );
}

export function Discover() {
  return (
    <div className="space-y-12 lg:space-y-14">
      <Recommended />
      <Combos />
    </div>
  );
}
