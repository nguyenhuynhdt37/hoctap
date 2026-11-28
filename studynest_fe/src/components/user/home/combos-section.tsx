"use client";

import { CourseTicketCard, CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";

import { ArrowRight, ArrowUpRight, BookOpen, Layers, X } from "pulsoicon-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import useSWR from "swr";
import { Button, CoinPrice, Skeleton } from "@/components/ui";
import { formatCoursePriceCoin, formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { cn } from "@/lib/utils";
import type { CatalogCombo, CatalogCombosResponse, ComboLevel } from "@/types/catalog-combos";
import { CloudBlob, GlassCard, IconBubble, Pill, Reveal, SectionHeader, SectionShell } from "./landing-ui";
import { mayPortrait, pathCover, StudyImage } from "./study-image";

const title = "Combo lộ trình học";
const limit = 4;
const levelLabels: Record<ComboLevel, string> = {
  "tieu-hoc": "Tiểu học",
  thcs: "THCS",
  thpt: "THPT",
};
const levels = Object.keys(levelLabels) as ComboLevel[];
const number = new Intl.NumberFormat("vi-VN");
const hours = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const action = cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none", focusRing);
const button = "min-h-11 rounded-full motion-reduce:transition-none motion-reduce:active:translate-y-0";
const gallery = "relative isolate overflow-hidden rounded-[1.35rem] border border-primary-pastel/70 bg-linear-to-br from-primary-light via-background to-accent/60";
const cardLayout = "flex h-full min-w-0 flex-col gap-3 p-3";

async function fetchCombos(url: string): Promise<CatalogCombosResponse> {
  const response = await fetch(url, {
    credentials: "omit",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Không tải được combo.");
  return response.json();
}

function ComboShell({ children, embedded = false }: { children: ReactNode; embedded?: boolean }) {
  if (embedded) {
    return (
      <section aria-label={title} className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold">Combo & ưu đãi</h3>
        {children}
      </section>
    );
  }

  return (
    <SectionShell id="combos-section" tone="blue" label={title} className="scroll-mt-20">
      <CloudBlob className="-top-14 right-[22%] h-60 w-[24rem] bg-accent/40" />
      <SectionHeader
        align="left"
        eyebrow="Tiết kiệm hơn khi học theo lộ trình"
        title={title}
        description="Học theo thứ tự giảng viên sắp xếp để nối kiến thức từ khóa này sang khóa tiếp theo."
      />
      {children}
    </SectionShell>
  );
}

function AllCombos() {
  return (
    <Link href="/combo" className={cn(action, "w-fit border border-primary-pastel bg-surface/90 text-info-foreground hover:bg-primary-light")}>
      Xem tất cả combo <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}

function ComboShelf({ cards }: { cards: ReactNode[] }) {
  return (
    <div className="user-four-column-grid">
      {cards}
    </div>
  );
}

const thumbnailPositions = [
  "left-[26%] top-[26%] z-30 -rotate-6",
  "left-[10%] top-[33%] z-10 -rotate-12",
  "left-[40%] top-[23%] z-20 rotate-6",
  "left-[51%] top-[32%] z-10 rotate-12",
];

function ThumbnailStack({ combo }: { combo: CatalogCombo }) {
  const cover = { id: combo.id, title: combo.title, thumbnail: combo.thumbnail };
  const previews = combo.thumbnail || !combo.courses.length
    ? [cover, ...combo.courses.slice(0, 3)]
    : combo.courses.slice(0, 4);
  const savings = Number(combo.savings_amount);

  return (
    <div className={cn(gallery, "aspect-video")}>
      <CloudBlob className="left-1/3 top-4 h-24 w-40" />
      <div aria-hidden="true" className="absolute left-[17%] top-[8%] aspect-square w-[66%] rounded-full border border-surface/80 bg-surface/30" />
      <div aria-hidden="true" className="absolute -bottom-9 right-[9%] size-28 rounded-full border border-primary-pastel/60" />
      <div aria-hidden="true" className="absolute right-[15%] top-[14%] size-2.5 rounded-full bg-primary-pastel" />
      {previews.map((preview, index) => (
        <div key={preview.id} className={cn("absolute aspect-[8/5] w-[38%] overflow-hidden rounded-lg border-2 border-surface bg-primary-light shadow-xl sm:rounded-xl", thumbnailPositions[index])}>
          <StudyImage src={preview.thumbnail} alt={`Ảnh bìa ${preview.title}`} sizes="(min-width: 1024px) 220px, (min-width: 768px) 15vw, 36vw" fallback={index % 2 ? mayPortrait : pathCover} className="size-full rounded-none" />
        </div>
      ))}
      {savings > 0 && (
        <Pill tone="lavender" className="absolute right-2.5 top-2.5 z-40 shadow-md sm:right-4 sm:top-4">
          {combo.savings_percent > 0
            ? `Tiết kiệm ${number.format(combo.savings_percent)}%`
            : "Tiết kiệm < 1%"}
        </Pill>
      )}
    </div>
  );
}

function ComboCard({ combo }: { combo: CatalogCombo }) {
  const cover = combo.thumbnail || combo.courses.find(({ thumbnail }) => thumbnail)?.thumbnail;
  const savings = Number(combo.savings_amount) > 0;
  const duration = combo.duration_seconds > 0 && combo.duration_seconds < 360
    ? "< 0,1"
    : hours.format(combo.duration_seconds / 3600);

  return (
    <CourseTicketCard
      href={`/combo/${encodeURIComponent(combo.slug)}`}
      title={combo.title}
      thumbnail={cover}
      fallback={pathCover}
      alt={`Ảnh bìa combo ${combo.title}`}
      badge={
        savings
          ? {
              label:
                combo.savings_percent > 0
                  ? `Tiết kiệm ${number.format(combo.savings_percent)}%`
                  : "Tiết kiệm < 1%",
              tone: "lavender",
            }
          : null
      }
      metaParts={[
        combo.instructor.name,
        `${number.format(combo.course_count)} khóa`,
        `${number.format(combo.lesson_count)} bài`,
        combo.duration_seconds > 0 ? `${duration} giờ` : null,
      ]}
      price={{
        priceVnd: combo.price,
        originalPriceVnd: savings ? combo.standalone_total : undefined,
      }}
      srLabel="— xem combo"
    />
  );
}

function ComboSkeleton({ count = limit }: { count?: number }) {
  return (
    <ComboShelf
      cards={Array.from({ length: count }, (_, index) => (
        <CourseTicketCardSkeleton key={index} />
      ))}
    />
  );
}

function FilterPlaceholder() {
  return <Skeleton className="h-11 w-60 max-w-full rounded-full motion-reduce:animate-none" />;
}

function ComboStatus({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <GlassCard tilt={false} className="flex min-h-52 flex-col items-start justify-center gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-start sm:px-8">
      <IconBubble shape="circle">{icon}</IconBubble>
      <div>{children}</div>
    </GlassCard>
  );
}

function updateFilters(level: ComboLevel | null, subject: string | null) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries({ level, subject })) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href !== window.location.href) window.history.pushState(null, "", url);
}

type CurrentCourse = { id: string; title: string } | null;

function CompactCombo({ combo, currentCourse }: { combo: CatalogCombo; currentCourse?: CurrentCourse }) {
  const covers = combo.thumbnail || !combo.courses.length
    ? [{ id: combo.id, title: combo.title, thumbnail: combo.thumbnail }, ...combo.courses.slice(0, 3)]
    : combo.courses.slice(0, 4);
  const containsCurrent = currentCourse && combo.courses.some(({ id }) => id === currentCourse.id);
  const reason = containsCurrent ? `Có khóa bạn đang học · ${currentCourse.title}`
    : combo.subjects.length ? `Học theo nhóm môn ${combo.subjects.map(({ name }) => name).join(", ")}` : undefined;
  const savings = Number(combo.savings_amount) > 0;
  const duration = combo.duration_seconds > 0 && combo.duration_seconds < 360 ? "< 0,1" : hours.format(combo.duration_seconds / 3600);

  return (
    <article className="grid min-h-33 min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2.5 rounded-lg border border-border bg-surface-muted p-2.5">
      <div className="relative aspect-[4/3] rounded-md bg-accent/50">
        {covers.map((cover, index) => (
          <StudyImage key={cover.id} src={cover.thumbnail} alt={`Ảnh bìa ${cover.title}`} fallback={index % 2 ? mayPortrait : pathCover} sizes="66px"
            className={cn("absolute! aspect-video w-16 rounded-sm border border-surface", [
              "top-2 left-1 z-10", "top-4 right-1", "top-6 left-1", "top-7 right-1",
            ][index])} />
        ))}
      </div>
      <div className="min-w-0">
        <h4 className="line-clamp-2 text-sm leading-snug font-semibold wrap-anywhere">{combo.title}</h4>
        {reason && <p className="mt-1 text-xs leading-snug wrap-anywhere text-info-foreground">{reason}</p>}
        <p className="mt-1 text-xs leading-snug wrap-anywhere">{combo.course_count} khóa · {combo.lesson_count} bài · {duration} giờ</p>
        <p className="mt-1 text-xs leading-snug wrap-anywhere">{combo.instructor.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <CoinPrice
            priceVnd={combo.price}
            originalPriceVnd={savings ? combo.standalone_total : undefined}
            size="sm"
          />
          {savings && <span className="font-semibold text-accent-foreground">
            Tiết kiệm {combo.savings_percent > 0 ? `${number.format(combo.savings_percent)}%` : "< 1%"}
          </span>}
          {combo.promotion && <span className="text-warning-foreground">Có ưu đãi khi dùng mã</span>}
        </div>
        <Link href={`/combo/${encodeURIComponent(combo.slug)}`} className={cn(action, "-ml-2 mt-1 min-h-9 px-2 py-1 text-xs text-info-foreground hover:bg-primary-light")}>
          Xem combo<span className="sr-only"> {combo.title}</span><ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function CompactComboSkeleton() {
  return (
    <div role="status" aria-label="Đang tải combo" className="flex gap-2.5 rounded-lg border border-border bg-surface-muted p-2.5 motion-reduce:[&_div]:animate-none">
      <Skeleton className="h-16 w-22 shrink-0" />
      <div className="w-full space-y-2"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-9 w-28" /></div>
    </div>
  );
}

function CombosResults({ embedded, currentCourse }: { embedded: boolean; currentCourse?: CurrentCourse }) {
  const search = useSearchParams();
  const level = embedded ? null : levels.find((option) => option === search.get("level")) ?? null;
  const subjectParam = embedded ? null : search.get("subject");
  const subject = subjectParam && subjectParam.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subjectParam) ? subjectParam : null;
  const query = new URLSearchParams({ limit: String(limit), sort: "recent" });
  if (level) query.set("level", level);
  if (subject) query.set("subject", subject);

  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogCombosResponse>(
    `/api/catalog/combos?${query}`,
    fetchCombos,
    { keepPreviousData: true, dedupingInterval: 30_000, focusThrottleInterval: 60_000, shouldRetryOnError: false },
  );
  const availableLevels = levels.filter((option) => option === level || data?.available_levels.includes(option));
  const pending = isLoading || (!data && !error);
  const items = pending || error ? [] : data?.items ?? [];
  const subjectName = data?.items.flatMap((combo) => combo.subjects).find((option) => option.code === subject)?.name;

  if (embedded) {
    return (
      <ComboShell embedded>
        {pending ? <CompactComboSkeleton /> : error ? (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive-border bg-destructive-bg p-3 text-destructive-foreground">
            <p className="text-sm">Chưa tải được combo. Tải lại để xem giá và ưu đãi đang mở.</p>
            <Button variant="outline" size="sm" isLoading={isValidating} loadingText="Đang thử lại…" onClick={() => void mutate().catch(() => undefined)}>Thử lại</Button>
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg bg-surface-muted p-3 text-xs">Bạn có thể xem danh mục combo khi có lộ trình mới.</p>
        ) : (
          <ul className="relative flex snap-x gap-2 overflow-x-auto p-1">
            {items.map((combo) => <li key={combo.id} className="min-w-0 flex-[0_0_min(92%,24rem)] snap-start"><CompactCombo combo={combo} currentCourse={currentCourse} /></li>)}
          </ul>
        )}
        <Link href="/combo" className={cn(action, "mt-1 min-h-9 px-1 py-1 text-xs text-info-foreground hover:underline")}>
          Tất cả combo <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </ComboShell>
    );
  }

  if (!pending && !error && data?.has_public_combos === false) return null;

  return (
    <ComboShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        {(!data && pending) ? <FilterPlaceholder /> : (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc combo theo cấp học">
            {availableLevels.length > 0 && [null, ...availableLevels].map((option) => (
              <Button
                key={option ?? "all"}
                variant={option === level ? "pastel" : "outline"}
                aria-pressed={option === level}
                className={cn(button, option === level && "border-primary text-info-foreground")}
                onClick={() => updateFilters(option, subject)}
              >
                {option ? levelLabels[option] : "Tất cả"}
              </Button>
            ))}
            {subject && (
              <Button variant="outline" className={button} onClick={() => updateFilters(level, null)} aria-label="Bỏ bộ lọc theo môn" rightIcon={<X className="size-4" />}>
                {subjectName ?? "Lọc theo môn"}
              </Button>
            )}
          </div>
        )}
        <AllCombos />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? "Đang tải combo" : error ? "" : items.length ? `Đang hiển thị ${number.format(items.length)} combo` : "Không có combo phù hợp"}
      </p>
      {pending ? <ComboSkeleton count={data?.items.length || limit} /> : error ? (
        <ComboStatus icon={<Layers className="size-6" aria-hidden="true" />}>
          <p role="alert" className="text-sm font-semibold text-foreground">Chưa tải được combo lộ trình học.</p>
          <Button variant="pastel" className={cn(button, "mt-3")} disabled={isValidating} onClick={() => void mutate().catch(() => undefined)}>
            {isValidating ? "Đang tải lại…" : "Thử lại"}
          </Button>
        </ComboStatus>
      ) : items.length === 0 ? (
        <ComboStatus icon={<BookOpen className="size-6" aria-hidden="true" />}>
          <p className="text-sm font-semibold text-foreground">Chưa có combo phù hợp với bộ lọc này.</p>
          <Button variant="pastel" className={cn(button, "mt-3")} onClick={() => updateFilters(null, null)}>
            Bỏ bộ lọc
          </Button>
        </ComboStatus>
      ) : (
        <ComboShelf cards={items.map((combo, index) => (
          <Reveal key={combo.id} delay={index * 0.08} className="min-w-0">
            <ComboCard combo={combo} />
          </Reveal>
        ))} />
      )}
    </ComboShell>
  );
}

export default function CombosSection({ embedded = false, currentCourse }: { embedded?: boolean; currentCourse?: CurrentCourse }) {
  return (
    <Suspense fallback={embedded ? (
      <ComboShell embedded>
        <CompactComboSkeleton />
      </ComboShell>
    ) : (
      <ComboShell>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-6"><FilterPlaceholder /><AllCombos /></div>
        <p role="status" className="sr-only">Đang tải combo</p>
        <ComboSkeleton />
      </ComboShell>
    )}>
      <CombosResults embedded={embedded} currentCourse={currentCourse} />
    </Suspense>
  );
}
