"use client";

import { CourseTicketCard, CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";
import { mayPortrait, pathCover, StudyImage } from "@/components/user/home/study-image";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import api from "@/lib/utils/fetcher/client/axios";
import type { CatalogCombo, CatalogCombosResponse } from "@/types/catalog-combos";
import type { RecommendedItem, RecommendedResponse } from "@/types/user/course";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import useSWR from "swr";
import { HubLoadError } from "../hub-page-state";
import { HomeLink } from "./section";

async function fetchCombos(url: string): Promise<CatalogCombosResponse> {
  const response = await fetch(url, { credentials: "omit", headers: { "ngrok-skip-browser-warning": "1" }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Không tải được combo.");
  return response.json();
}

function GridSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="user-four-column-grid">
      {Array.from({ length: 4 }, (_, i) => (
        <CourseTicketCardSkeleton key={i} />
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
    <li className="flex min-w-0 flex-col">
      <CourseTicketCard
        href={`/course/${course.slug}`}
        onClick={(event) => void open(event)}
        ariaBusy={checking}
        title={course.title}
        thumbnail={course.thumbnail}
        alt={`Ảnh bìa khóa học ${course.title}`}
        badge={
          course.similarity > 0
            ? { label: `${Math.round(course.similarity * 100)}% phù hợp`, tone: "lavender" }
            : { label: "Gợi ý cho bạn", tone: "primary" }
        }
        metaParts={[course.instructor?.name]}
        srLabel={checking ? "(đang mở)" : "— xem khóa học"}
      />
    </li>
  );
}

function ComboTile({ combo }: { combo: CatalogCombo }) {
  const cover = combo.thumbnail || combo.courses.find(({ thumbnail }) => thumbnail)?.thumbnail;
  const savings = Number(combo.savings_amount) > 0;
  return (
    <li className="flex min-w-0 flex-col">
      <CourseTicketCard
        href={`/combo/${encodeURIComponent(combo.slug)}`}
        title={combo.title}
        thumbnail={cover}
        fallback={pathCover}
        alt={`Ảnh bìa combo ${combo.title}`}
        badge={
          savings
            ? {
                label: `Tiết kiệm ${combo.savings_percent > 0 ? `${combo.savings_percent}%` : "< 1%"}`,
                tone: "lavender",
              }
            : null
        }
        metaParts={[
          combo.instructor.name,
          `${combo.course_count} khóa`,
          `${combo.lesson_count} bài`,
        ]}
        price={{
          priceVnd: combo.price,
          originalPriceVnd: savings ? combo.standalone_total : undefined,
        }}
        srLabel="— xem combo"
      />
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
      ) : !data ? <GridSkeleton label="Đang tải khóa học gợi ý" /> : data.items.length ? (
        <ul aria-label="Khóa học gợi ý" className="user-four-column-grid">
          {data.items.slice(0, 8).map((course) => <RecommendedTile key={course.id} course={course} />)}
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
  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogCombosResponse>("/api/catalog/combos?limit=4&sort=recent", fetchCombos,
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
      ) : isLoading || !data ? <GridSkeleton label="Đang tải combo" /> : items.length ? (
        <ul aria-label="Combo lộ trình" className="user-four-column-grid">
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
    <>
      <Recommended />
      <Combos />
    </>
  );
}
