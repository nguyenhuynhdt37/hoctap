"use client";

import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import { pathCover } from "@/components/user/home/study-image";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Flame,
  Gift,
  Heart,
  Layers,
  Search,
  SlidersHorizontal,
  Ticket,
  UserRound,
  X,
} from "pulsoicon-react";
import { Button, CoinPrice, EmptyState, Select } from "@/components/ui";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import type { Bundle, PageResult } from "@/types/learning-paths";
import { fetchLearning, LoadError, Loading } from "./shared";

const PAGE_SIZE = 12;

const LEVEL_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "tieu-hoc", label: "Tiểu học" },
  { value: "thcs", label: "THCS" },
  { value: "thpt", label: "THPT" },
] as const;

const PRICE_FILTERS = [
  { value: "all", label: "Mọi giá" },
  { value: "free", label: "Miễn phí" },
  { value: "paid", label: "Có phí" },
] as const;

const LEVEL_LABELS: Record<string, string> = {
  "tieu-hoc": "Tiểu học",
  thcs: "THCS",
  thpt: "THPT",
};

type PriceFilter = (typeof PRICE_FILTERS)[number]["value"];
type LevelFilter = (typeof LEVEL_FILTERS)[number]["value"];

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}g ${m}p` : `${h} giờ`;
  }
  return `${mins} phút`;
}

function cleanTitle(title: string): string {
  return title.replace(/^\[QA\]\s*/i, "").trim();
}

function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}

/* ------------------------------------------------------------------ */
/* 3D FANNED CARD STACK — Quạt thẻ nghiêng 3D chuẩn Cloudy Blue        */
/* ------------------------------------------------------------------ */
function FannedComboDeck({ items }: { items: Bundle[] }) {
  const top3 = items.slice(0, 3);
  if (top3.length === 0) return null;

  const layouts = [
    "-rotate-6 -translate-x-5 translate-y-3 z-10 hover:-rotate-8 hover:-translate-x-8 hover:-translate-y-1",
    "rotate-0 translate-y-0 z-30 hover:-translate-y-3",
    "rotate-6 translate-x-5 translate-y-4 z-20 hover:rotate-8 hover:translate-x-8 hover:-translate-y-1",
  ];

  const arranged =
    top3.length === 3
      ? [
          { item: top3[1], layout: layouts[0], rank: 2 },
          { item: top3[0], layout: layouts[1], rank: 1 },
          { item: top3[2], layout: layouts[2], rank: 3 },
        ]
      : top3.map((item, idx) => ({ item, layout: layouts[idx] ?? layouts[1], rank: idx + 1 }));

  return (
    <div className="relative mx-auto flex h-[15rem] w-full max-w-md items-center justify-center sm:h-[17rem] lg:max-w-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-10 bottom-6 rounded-full bg-gradient-to-tr from-primary-pastel/60 via-secondary/60 to-accent/60 blur-3xl"
      />
      {arranged.map(({ item, layout, rank }) => {
        const isCenter = rank === 1;
        return (
          <Link
            key={item.bundle_id}
            href={`/combo/${encodeURIComponent(item.slug)}`}
            className={cn(
              "group absolute w-52 overflow-hidden rounded-[24px] border p-3 transition-all duration-500 ease-out sm:w-56 motion-reduce:transition-none motion-reduce:transform-none",
              isCenter
                ? "border-primary-pastel bg-gradient-to-br from-[#285C90] via-[#356FA7] to-[#4A85BF] text-white shadow-[0_24px_50px_-14px_rgba(40,92,144,0.45)]"
                : "border-primary-pastel/70 bg-surface/95 text-foreground shadow-lg backdrop-blur-md",
              layout,
            )}
          >
            <div className="relative mb-2.5 aspect-[4/3] overflow-hidden rounded-2xl bg-primary-light">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
              ) : (
                <div className="grid size-full place-items-center text-primary">
                  <Layers className="size-9" aria-hidden="true" />
                </div>
              )}
              {(item.savings_percent ?? 0) > 0 && (
                <span className="absolute top-2 left-2 rounded-full border border-secondary-pastel bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground shadow-2xs">
                  -{item.savings_percent}%
                </span>
              )}
              {isCenter && (
                <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2 py-0.5 text-[10px] font-extrabold text-accent-vanilla-foreground">
                  <Crown className="size-3" animated={false} aria-hidden="true" />
                  Nổi bật
                </span>
              )}
            </div>
            <p className={cn("line-clamp-2 text-xs font-extrabold leading-snug", isCenter ? "text-white" : "text-foreground")}>
              {cleanTitle(item.title)}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <CoinPrice
                priceVnd={Number(item.price)}
                surface={isCenter ? "dark" : "light"}
                size="sm"
                showWhiteDiscount={false}
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  isCenter ? "text-primary-light" : "text-muted-foreground",
                )}
              >
                {item.course_count ?? 0} khóa
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BOARDING-PASS TICKET HERO CARD (#01 — Pastel Cloudy Blue 2 ngăn)    */
/* ------------------------------------------------------------------ */
function BoardingPassComboCard({
  item,
  index,
  bookmarked,
  compared,
  copiedCode,
  onToggleBookmark,
  onToggleCompare,
  onCopyCoupon,
}: {
  item: Bundle;
  index: number;
  bookmarked: boolean;
  compared: boolean;
  copiedCode: string | null;
  onToggleBookmark: (bundleId: string) => void;
  onToggleCompare: (item: Bundle) => void;
  onCopyCoupon: (code: string) => void;
}) {
  const [failedImage, setFailedImage] = useState(false);
  const href = `/combo/${encodeURIComponent(item.slug)}`;
  const summary = item.subtitle || item.description;
  const savings = item.savings_percent ?? 0;
  const durationLabel = formatDuration(item.duration_seconds);

  return (
    <article
      className={cn(
        "group relative isolate overflow-hidden rounded-[2rem] border border-primary-pastel bg-surface text-foreground shadow-lg transition-all duration-300 hover:shadow-xl lg:col-span-12",
        compared && "ring-2 ring-primary ring-offset-4 ring-offset-background",
      )}
    >
      {/* Rãnh khuyết kiểu vé máy bay ở ranh giới 2 ngăn (desktop) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-[64%] z-20 hidden size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-pastel bg-background lg:block"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-[64%] z-20 hidden size-7 -translate-x-1/2 translate-y-1/2 rounded-full border border-primary-pastel bg-background lg:block"
      />

      <div className="grid lg:grid-cols-[64%_36%]">
        {/* NGĂN TRÁI: Soft Cloudy Editorial Poster — Ảnh 16:9 rộng nguyên vẹn */}
        <div className="relative flex flex-col justify-between gap-5 bg-gradient-to-br from-primary-light/80 via-surface to-secondary/25 p-6 sm:p-8 lg:border-r lg:border-dashed lg:border-primary-pastel">
          <div className="relative aspect-video w-full overflow-hidden rounded-[22px] border border-primary-pastel/70 bg-primary-light shadow-sm">
            {item.thumbnail_url && !failedImage ? (
              <img
                src={item.thumbnail_url}
                alt=""
                className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                onError={() => setFailedImage(true)}
              />
            ) : (
              <div className="grid size-full place-items-center text-primary">
                <Layers className="size-14" aria-hidden="true" />
              </div>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-2.5 left-4 font-display text-6xl font-bold leading-none text-white drop-shadow-[0_4px_12px_rgba(40,92,144,0.55)]"
            >
              {padIndex(index)}
            </span>
            {savings > 0 && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground shadow-sm">
                <Flame className="size-3.5" animated={false} aria-hidden="true" />
                Tiết kiệm {savings}%
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2.5 py-0.5 text-accent-vanilla-foreground">
                <Crown className="size-3" animated={false} aria-hidden="true" />
                Chuyến bay nổi bật
              </span>
              {item.levels?.map((lv) => (
                <span
                  key={lv}
                  className="rounded-full border border-primary-pastel bg-primary-light px-2.5 py-0.5 text-primary"
                >
                  {LEVEL_LABELS[lv] ?? lv}
                </span>
              ))}
              <span className="text-muted-foreground">{item.course_count ?? 0} khóa</span>
              {Boolean(item.lesson_count) && <span className="text-muted-foreground">· {item.lesson_count} bài</span>}
              {durationLabel && <span className="text-muted-foreground">· {durationLabel}</span>}
            </div>

            <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              <Link href={href} className="hover:text-primary transition-colors">
                {cleanTitle(item.title)}
              </Link>
            </h3>

            {summary && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>}

            {item.courses_preview && item.courses_preview.length > 0 && (
              <ul className="grid gap-1.5 pt-1 sm:grid-cols-2">
                {item.courses_preview.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-xs font-medium text-foreground/90">
                    <Check className="size-3.5 shrink-0 text-primary" animated={false} aria-hidden="true" />
                    <span className="truncate">{c.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* NGĂN PHẢI: Cuống vé thanh toán (Pastel Vanilla Stub) */}
        <div className="flex flex-col justify-between gap-5 bg-gradient-to-b from-accent-vanilla/45 via-surface to-primary-light/30 p-6 sm:p-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
                VÉ COMBO · #{padIndex(index)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(item.bundle_id)}
                  aria-label={bookmarked ? "Bỏ lưu combo" : "Lưu combo yêu thích"}
                  aria-pressed={bookmarked}
                  className={cn(
                    "grid size-9 place-items-center rounded-full border transition-colors cursor-pointer",
                    bookmarked
                      ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                      : "border-border bg-surface text-foreground hover:border-secondary-pastel hover:bg-secondary/50",
                  )}
                >
                  <Heart className="size-4" solid={bookmarked} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCompare(item)}
                  aria-label={compared ? "Bỏ khỏi bảng so sánh" : "Thêm vào bảng so sánh"}
                  aria-pressed={compared}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[11px] font-bold transition-colors cursor-pointer",
                    compared
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light",
                  )}
                >
                  <SlidersHorizontal className="size-3.5" animated={false} aria-hidden="true" />
                  <span>{compared ? "Đã chọn" : "So sánh"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-pastel/70 bg-surface p-4 shadow-2xs">
              <CoinPrice
                priceVnd={Number(item.price)}
                originalPriceVnd={
                  item.standalone_total && item.standalone_total > Number(item.price)
                    ? item.standalone_total
                    : undefined
                }
                surface="light"
                size="lg"
              />
              <p className="mt-1.5 text-[11px] font-semibold text-primary">
                Hoàn ngay +20% Coin trắng sau khi sở hữu
              </p>
            </div>

            {item.active_coupon && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-accent-vanilla-border bg-accent-vanilla/70 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-accent-vanilla-foreground">{item.active_coupon.label}</p>
                  <code className="font-mono text-xs font-bold text-foreground">{item.active_coupon.code}</code>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyCoupon(item.active_coupon!.code)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[11px] font-extrabold text-primary shadow-2xs ring-1 ring-primary-pastel hover:bg-primary hover:text-primary-foreground cursor-pointer"
                >
                  {copiedCode === item.active_coupon.code ? (
                    <>
                      <Check className="size-3" animated={false} aria-hidden="true" />
                      Đã chép
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" animated={false} aria-hidden="true" />
                      Chép mã
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <Link
            href={href}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
          >
            <span>Lên chuyến bay combo này</span>
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* ASYMMETRIC BENTO COMBO CARD — 4 sắc thái chuẩn Cloudy Blue          */
/* ------------------------------------------------------------------ */
type CardVariant = "wide-blue" | "deep-sky" | "vanilla-atelier" | "wide-lavender";

function BentoComboCard({
  item,
  bookmarked,
  compared,
  onToggleBookmark,
  onToggleCompare,
}: {
  item: Bundle;
  index: number;
  variant: CardVariant;
  bookmarked: boolean;
  compared: boolean;
  copiedCode: string | null;
  onToggleBookmark: (bundleId: string) => void;
  onToggleCompare: (item: Bundle) => void;
  onCopyCoupon: (code: string) => void;
}) {
  const href = `/combo/${encodeURIComponent(item.slug)}`;
  const savings = item.savings_percent ?? 0;
  const durationLabel = formatDuration(item.duration_seconds);

  const badge =
    savings > 0
      ? { label: `Tiết kiệm ${savings}%`, tone: "lavender" as const }
      : item.levels?.[0]
        ? {
            label: LEVEL_LABELS[item.levels[0]] ?? item.levels[0],
            tone: "primary" as const,
          }
        : null;

  const metaParts: Array<string | null | undefined | false> = [
    item.instructor?.name,
    `${item.course_count ?? 0} khóa`,
    item.lesson_count ? `${item.lesson_count} bài` : null,
    durationLabel || null,
  ];

  return (
    <CourseTicketCard
      href={href}
      title={cleanTitle(item.title)}
      thumbnail={item.thumbnail_url}
      fallback={pathCover}
      alt={`Ảnh bìa combo ${cleanTitle(item.title)}`}
      badge={badge}
      metaParts={metaParts}
      price={{
        priceVnd: Number(item.price),
        originalPriceVnd:
          item.standalone_total && item.standalone_total > Number(item.price)
            ? item.standalone_total
            : undefined,
      }}
      highlighted={compared}
      topRightAction={
        <>
          <button
            type="button"
            onClick={() => onToggleBookmark(item.bundle_id)}
            aria-label={bookmarked ? "Bỏ lưu combo" : "Lưu combo yêu thích"}
            aria-pressed={bookmarked}
            className={cn(
              "grid size-8 cursor-pointer place-items-center rounded-full border shadow-sm backdrop-blur-md transition-colors",
              bookmarked
                ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                : "border-primary-pastel/80 bg-surface/90 text-foreground hover:bg-primary-light hover:text-primary",
            )}
          >
            <Heart className="size-3.5" solid={bookmarked} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(item)}
            aria-label={compared ? "Bỏ khỏi bảng so sánh" : "Thêm vào bảng so sánh"}
            aria-pressed={compared}
            className={cn(
              "grid size-8 cursor-pointer place-items-center rounded-full border shadow-sm backdrop-blur-md transition-colors",
              compared
                ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                : "border-primary-pastel/80 bg-surface/90 text-foreground hover:bg-primary-light hover:text-primary",
            )}
          >
            <SlidersHorizontal className="size-3.5" animated={false} aria-hidden="true" />
          </button>
        </>
      }
      srLabel="— xem combo"
    />
  );
}

/* ------------------------------------------------------------------ */
/* COMPARE MODAL — Chuẩn Cloudy Blue                                   */
/* ------------------------------------------------------------------ */
function CompareModal({
  items,
  onClose,
  onRemove,
}: {
  items: Bundle[];
  onClose: () => void;
  onRemove: (bundleId: string) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="So sánh các combo học tập"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-primary-pastel bg-surface p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">So sánh Combo học tập</h2>
            <p className="text-xs text-muted-foreground">
              Đối chiếu trực diện giá Coin, % tiết kiệm, số khóa học, bài giảng và mã ưu đãi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng so sánh"
            className="grid size-10 place-items-center rounded-full border border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="user-four-column-grid">
          {items.map((item) => (
            <div key={item.bundle_id} className="flex flex-col rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-sm font-extrabold leading-snug text-foreground">{cleanTitle(item.title)}</h3>
                <button
                  type="button"
                  onClick={() => onRemove(item.bundle_id)}
                  aria-label={`Gỡ ${cleanTitle(item.title)}`}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Giá gói</dt>
                  <dd>
                    <CoinPrice
                      priceVnd={Number(item.price)}
                      originalPriceVnd={
                        item.standalone_total && item.standalone_total > Number(item.price)
                          ? item.standalone_total
                          : undefined
                      }
                      size="sm"
                      showWhiteDiscount={false}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Tiết kiệm</dt>
                  <dd className="font-extrabold text-secondary-foreground">
                    {item.savings_percent ? `-${item.savings_percent}%` : "Giá chuẩn"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Số khóa học</dt>
                  <dd className="font-bold text-foreground">{item.course_count ?? 0} khóa</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Tổng bài giảng</dt>
                  <dd className="font-bold text-foreground">{item.lesson_count ?? 0} bài</dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Thời lượng</dt>
                  <dd className="font-bold text-foreground">
                    {formatDuration(item.duration_seconds) || "Đang cập nhật"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Cấp học</dt>
                  <dd className="font-semibold text-foreground">
                    {item.levels?.length
                      ? item.levels.map((lv) => LEVEL_LABELS[lv] ?? lv).join(", ")
                      : "Mọi cấp"}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <dt className="text-muted-foreground">Mã ưu đãi</dt>
                  <dd className="font-bold text-accent-vanilla-foreground">
                    {item.active_coupon ? `${item.active_coupon.code} (${item.active_coupon.label})` : "Không có"}
                  </dd>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <dt className="text-muted-foreground">Giảng viên</dt>
                  <dd className="truncate font-semibold text-foreground">{item.instructor?.name ?? "Mây Mây"}</dd>
                </div>
              </dl>

              <Link
                href={`/combo/${encodeURIComponent(item.slug)}`}
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-bold text-primary-foreground hover:bg-primary-hover"
              >
                <span>Xem &amp; Sở hữu</span>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
const BUNDLE_SORT_VALUES = [
  "savings_desc",
  "recent",
  "price_asc",
  "price_desc",
  "title",
] as const;

type BundleSort = (typeof BUNDLE_SORT_VALUES)[number];

const LEARNING_LIBRARY_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  search: { type: "string", default: "" as string, trim: true },
  level: {
    type: "string",
    default: "" as LevelFilter,
    allowed: ["", "tieu-hoc", "thcs", "thpt"] as const,
  },
  price_filter: {
    type: "string",
    default: "all" as PriceFilter,
    allowed: ["all", "free", "paid"] as const,
  },
  has_coupon: { type: "boolean", default: false },
  saved_only: { type: "boolean", default: false },
  sort: {
    type: "string",
    default: "savings_desc" as BundleSort,
    allowed: BUNDLE_SORT_VALUES,
  },
} as const;

export default function LearningLibrary() {
  const user = useUserStore((s) => s.user);
  const results = useRef<HTMLElement>(null);

  const { values, setParam, resetParams } = useUrlQueryState(
    LEARNING_LIBRARY_QUERY_SCHEMA,
  );
  const {
    page,
    search: keyword,
    level,
    price_filter: priceFilter,
    has_coupon: hasCoupon,
    saved_only: savedOnly,
    sort,
  } = values;

  const {
    inputValue: input,
    setInputValue: setInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(keyword, (val) => setParam("search", val));

  const [compareItems, setCompareItems] = useState<Bundle[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null);
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({});

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    keyword,
    price_filter: priceFilter,
    sort,
    ...(level ? { level } : {}),
    ...(hasCoupon ? { has_coupon: "true" } : {}),
    ...(savedOnly ? { saved_only: "true" } : {}),
  });

  const { data, error, mutate } = useSWR<PageResult<Bundle>>(`/bundles?${query}`, fetchLearning);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasFilters =
    Boolean(keyword || input.trim()) ||
    priceFilter !== "all" ||
    Boolean(level) ||
    hasCoupon ||
    savedOnly;

  const isBookmarked = (item: Bundle) =>
    localBookmarks[item.bundle_id] !== undefined
      ? localBookmarks[item.bundle_id]
      : Boolean(item.is_bookmarked);

  async function handleToggleBookmark(bundleId: string) {
    if (!user) {
      setBookmarkNotice("Hãy đăng nhập để lưu combo yêu thích vào tài khoản của bạn nhé.");
      window.setTimeout(() => setBookmarkNotice(null), 3500);
      return;
    }
    const target = data?.items.find((i) => i.bundle_id === bundleId);
    const prev = target ? isBookmarked(target) : false;
    setLocalBookmarks((m) => ({ ...m, [bundleId]: !prev }));
    try {
      const res = await api.post<{ bookmarked: boolean }>(`/bundles/${bundleId}/bookmark`);
      setLocalBookmarks((m) => ({ ...m, [bundleId]: res.data.bookmarked }));
      void mutate();
    } catch {
      setLocalBookmarks((m) => ({ ...m, [bundleId]: prev }));
    }
  }

  function handleToggleCompare(item: Bundle) {
    setCompareItems((prev) => {
      if (prev.some((x) => x.bundle_id === item.bundle_id)) {
        return prev.filter((x) => x.bundle_id !== item.bundle_id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), item];
      }
      return [...prev, item];
    });
  }

  function handleCopyCoupon(code: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code).catch(() => undefined);
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode((cur) => (cur === code ? null : cur)), 2000);
  }

  function clearFilters() {
    setInput("");
    resetParams();
  }

  function changePage(nextPage: number) {
    setParam("page", nextPage);
    results.current?.scrollIntoView({ block: "start" });
  }

  const liveCoupons = useMemo(() => {
    const seen = new Set<string>();
    const list: { code: string; label: string; title: string }[] = [];
    for (const item of data?.items ?? []) {
      if (item.active_coupon && !seen.has(item.active_coupon.code)) {
        seen.add(item.active_coupon.code);
        list.push({
          code: item.active_coupon.code,
          label: item.active_coupon.label,
          title: cleanTitle(item.title),
        });
      }
    }
    return list;
  }, [data?.items]);

  const variantCycle: CardVariant[] = ["wide-blue", "deep-sky", "vanilla-atelier", "wide-lavender"];

  return (
    <main className="user-container pb-28 pt-5 text-foreground">
      {/* ── TOP UTILITY STRIP ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Điều hướng danh mục" className="flex items-center gap-2 text-xs font-semibold">
          <Link href="/" className="text-muted-foreground hover:text-primary hover:underline">
            Trang chủ
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span aria-current="page" className="text-foreground">
            Combo học tập
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/vouchers"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-xs font-bold text-foreground hover:border-primary-pastel hover:bg-primary-light"
          >
            <Gift className="size-3.5 text-primary" aria-hidden="true" />
            Kho mã giảm giá
          </Link>
          <Link
            href="/my-learning"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <Ticket className="size-3.5" aria-hidden="true" />
            Combo đã mua
          </Link>
        </div>
      </div>

      {/* ── SPLIT MAGAZINE POSTER HERO + 3D FANNED CARD STACK (CLOUDY BLUE) ── */}
      <header className="relative isolate overflow-hidden rounded-3xl border border-primary-pastel/80 bg-gradient-to-br from-surface via-primary-light/55 to-secondary/35 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-primary-pastel/55 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-80 rounded-full bg-accent/60 blur-3xl"
        />

        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3.5 py-1 text-[11px] font-extrabold tracking-[0.14em] text-primary uppercase">
                <Crown className="size-3.5" animated={false} aria-hidden="true" />
                Mây Mây · Combo Edition
              </span>
              {(data?.summary?.max_savings_percent ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
                  <Flame className="size-3.5" animated={false} aria-hidden="true" />
                  Tiết kiệm tới {data?.summary?.max_savings_percent}%
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-3 py-1 text-xs font-bold text-accent-vanilla-foreground">
                Hoàn +20% Coin trắng
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Học trọn lộ trình,{" "}
              <span className="relative inline-block italic text-primary">
                nhẹ ví hơn hẳn
                <span
                  aria-hidden="true"
                  className="absolute right-0 -bottom-1 left-0 -z-10 h-3 rounded-full bg-accent-vanilla"
                />
              </span>
              .
            </h1>

            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Mỗi combo là một chuyến bay trọn gói do giảng viên tuyển chọn: gộp nhiều khóa học liên kết, tự trừ giá lẻ, áp mã ưu đãi và so sánh trực tiếp ngay tại chỗ.
            </p>

            <form
              role="search"
              className="flex max-w-lg items-center gap-2 rounded-full border border-primary-pastel bg-surface p-1.5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                commitSearchNow(input.trim());
                results.current?.scrollIntoView({ block: "start" });
              }}
            >
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">Tìm tên combo</span>
                <Search
                  aria-hidden="true"
                  animated={false}
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary"
                />
                <input
                  type="search"
                  maxLength={160}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tìm combo Toán, Hóa, Web, Python…"
                  className="h-10 w-full rounded-full bg-transparent pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>
              <Button type="submit" className="h-10 shrink-0 rounded-full px-5 text-xs font-extrabold">
                Khám phá
              </Button>
            </form>
          </div>

          <FannedComboDeck items={data?.items ?? []} />
        </div>
      </header>

      {/* ── LIVE DEAL TICKER STRIP (Cloudy Pastel Ribbon) ── */}
      {liveCoupons.length > 0 && (
        <section
          aria-label="Mã giảm giá combo đang hoạt động"
          className="mt-4 flex items-center gap-3 overflow-x-auto rounded-2xl border border-primary-pastel/80 bg-gradient-to-r from-primary-light via-accent/45 to-secondary/45 px-4 py-2.5 text-foreground shadow-2xs"
        >
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold text-primary-foreground">
            <Ticket className="size-3.5" animated={false} aria-hidden="true" />
            MÃ ƯU ĐÃI
          </span>
          <div className="flex items-center gap-2.5">
            {liveCoupons.map((cp) => (
              <button
                key={cp.code}
                type="button"
                onClick={() => handleCopyCoupon(cp.code)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
              >
                <span className="font-bold text-accent-vanilla-foreground">{cp.label}</span>
                <code className="font-mono text-[11px] font-bold text-foreground">{cp.code}</code>
                <span className="text-[10px] font-extrabold text-primary">
                  {copiedCode === cp.code ? "✓ Đã chép" : "Chép"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {bookmarkNotice && (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-primary-pastel bg-primary-light px-4 py-3 text-sm font-semibold text-primary"
        >
          {bookmarkNotice}
        </div>
      )}

      {/* ── FLOATING COMMAND BAR (Cloudy Blue Pill) ── */}
      <section ref={results} aria-labelledby="combo-results" className="mt-7 scroll-mt-24 space-y-6">
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-2.5 rounded-full border border-primary-pastel/70 bg-surface/92 px-3.5 py-2.5 shadow-sm backdrop-blur-md max-lg:rounded-3xl">
          <div className="flex flex-wrap items-center gap-1.5">
            {LEVEL_FILTERS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => {
                  setParam("level", opt.value);
                }}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                  level === opt.value
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-foreground hover:bg-primary-light hover:text-primary",
                )}
              >
                {opt.label}
              </button>
            ))}

            <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />

            {PRICE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setParam("price_filter", value);
                }}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-semibold transition-colors cursor-pointer",
                  priceFilter === value
                    ? "bg-primary-light font-bold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              aria-pressed={hasCoupon}
              onClick={() => {
                setParam("has_coupon", !hasCoupon);
              }}
              className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer",
                hasCoupon
                  ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                  : "border-border bg-background text-foreground hover:border-accent-vanilla-border",
              )}
            >
              <Ticket className="size-3.5" animated={false} aria-hidden="true" />
              Có mã
            </button>

            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => {
                if (!user && !savedOnly) {
                  setBookmarkNotice("Hãy đăng nhập để xem các combo bạn đã lưu.");
                  window.setTimeout(() => setBookmarkNotice(null), 3500);
                  return;
                }
                setParam("saved_only", !savedOnly);
              }}
              className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer",
                savedOnly
                  ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                  : "border-border bg-background text-foreground hover:border-secondary-pastel",
              )}
            >
              <Heart className="size-3.5" animated={false} solid={savedOnly} aria-hidden="true" />
              Đã lưu ({data?.summary?.bookmarked_count ?? 0})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <h2 id="combo-results" className="hidden text-xs font-semibold text-muted-foreground xl:inline">
              {data && !error ? `${data.total} combo` : ""}
            </h2>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Xóa lọc
              </button>
            )}
            <Select
              aria-label="Sắp xếp combo"
              containerClassName="w-auto"
              className="h-8 rounded-full border-border bg-background py-0.5 text-xs font-bold"
              value={sort}
              onChange={(e) => {
                setParam("sort", e.target.value as BundleSort);
              }}
            >
              <option value="savings_desc">Tiết kiệm nhiều nhất</option>
              <option value="recent">Mới cập nhật</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="title">Tên A–Z</option>
            </Select>
          </div>
        </div>

        {/* ── ASYMMETRIC EDITORIAL BENTO SHOWCASE (12 CỘT PHÁ CÁCH) ── */}
        {error ? (
          <LoadError error={error} retry={() => mutate()} />
        ) : !data ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<Layers />}
            title={hasFilters ? "Không tìm thấy combo phù hợp" : "Chưa có combo nào được mở"}
            description={
              hasFilters
                ? "Thử bỏ bớt bộ lọc cấp học, mã giảm giá hoặc từ khóa tìm kiếm."
                : "Các combo mới từ giảng viên sẽ xuất hiện tại đây."
            }
            action={
              hasFilters ? (
                <Button variant="pastel" onClick={clearFilters}>
                  Xem tất cả combo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="user-four-column-grid">
              {data.items.map((item, idx) => {
                const displayNumber = (page - 1) * PAGE_SIZE + idx + 1;
                const variant = variantCycle[idx % variantCycle.length];
                return (
                  <BentoComboCard
                    key={item.id}
                    item={item}
                    index={displayNumber}
                    variant={variant}
                    bookmarked={isBookmarked(item)}
                    compared={compareItems.some((c) => c.bundle_id === item.bundle_id)}
                    copiedCode={copiedCode}
                    onToggleBookmark={handleToggleBookmark}
                    onToggleCompare={handleToggleCompare}
                    onCopyCoupon={handleCopyCoupon}
                  />
                );
              })}
            </div>

            {pageCount > 1 && (
              <nav
                aria-label="Phân trang combo"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
              >
                <p className="text-sm text-muted-foreground">
                  Trang {page} / {pageCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => changePage(page - 1)}
                    leftIcon={<ChevronLeft className="size-4" />}
                  >
                    Trang trước
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount}
                    onClick={() => changePage(page + 1)}
                    rightIcon={<ChevronRight className="size-4" />}
                  >
                    Trang sau
                  </Button>
                </div>
              </nav>
            )}
          </div>
        )}
      </section>

      {/* ── FLOATING COMPARE DOCK (Cloudy Blue) ── */}
      {compareItems.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-pastel bg-surface/95 px-4 py-3 text-foreground shadow-lg backdrop-blur-md">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary">
              <SlidersHorizontal aria-hidden="true" animated={false} className="size-4" />
              So sánh ({compareItems.length}/3):
            </span>
            {compareItems.map((item) => (
              <span
                key={item.bundle_id}
                className="inline-flex max-w-44 items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <span className="truncate">{cleanTitle(item.title)}</span>
                <button
                  type="button"
                  onClick={() => handleToggleCompare(item)}
                  aria-label={`Gỡ ${cleanTitle(item.title)}`}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompareItems([])}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Xóa hết
            </button>
            <Button
              size="sm"
              disabled={compareItems.length < 2}
              onClick={() => setCompareOpen(true)}
              className="rounded-full px-4 font-extrabold disabled:opacity-50"
            >
              So sánh ngay
            </Button>
          </div>
        </div>
      )}

      {/* ── COMPARE MODAL ── */}
      {compareOpen && compareItems.length >= 2 && (
        <CompareModal
          items={compareItems}
          onClose={() => setCompareOpen(false)}
          onRemove={(bundleId) => {
            setCompareItems((prev) => {
              const next = prev.filter((x) => x.bundle_id !== bundleId);
              if (next.length < 2) setCompareOpen(false);
              return next;
            });
          }}
        />
      )}
    </main>
  );
}
