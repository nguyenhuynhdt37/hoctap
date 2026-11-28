"use client";

import { CoinPrice, Skeleton } from "@/components/ui";
import { CourseThumb, stretchedLink, ThinBar, ticketMask } from "@/components/learning-hub/home/home-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

export type CourseTicketBadgeTone =
  | "lavender"
  | "primary"
  | "success"
  | "vanilla"
  | "secondary";

const BADGE_TONE_CLASSES: Record<CourseTicketBadgeTone, string> = {
  lavender: "bg-accent text-accent-foreground",
  primary: "bg-primary-light text-info-foreground",
  success: "bg-success-bg text-success-foreground",
  vanilla: "bg-accent-vanilla text-accent-vanilla-foreground",
  secondary: "bg-secondary-light text-secondary-foreground",
};

export interface CourseTicketPrice {
  priceVnd: number | string | null | undefined;
  originalPriceVnd?: number | string | null | undefined;
  isFree?: boolean;
}

export interface CourseTicketProgress {
  percent: number;
  label?: string;
}

export interface CourseTicketCardProps {
  href: string;
  title: string;
  thumbnail?: string | null;
  fallback?: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  linkId?: string;
  srLabel?: string;
  ariaBusy?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  badge?: {
    label: string;
    tone?: CourseTicketBadgeTone;
  } | null;
  metaParts?: Array<string | null | undefined | false>;
  price?: CourseTicketPrice | null;
  progress?: CourseTicketProgress | null;
  footerSlot?: ReactNode;
  /** Vùng nút thao tác nổi (ví dụ Ghim / Lưu trữ / Lưu combo) đặt trên thẻ, tách khỏi stretchedLink */
  topRightAction?: ReactNode;
  /** Dropdown hoặc lớp nổi nằm ngoài overflow-hidden của thẻ vé */
  outsideSlot?: ReactNode;
  highlighted?: boolean;
  className?: string;
}

const DEFAULT_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function CourseTicketCard({
  href,
  title,
  thumbnail,
  fallback,
  alt,
  sizes = DEFAULT_SIZES,
  priority = false,
  linkId,
  srLabel,
  ariaBusy,
  onClick,
  onMouseEnter,
  onMouseLeave,
  badge,
  metaParts,
  price,
  progress,
  footerSlot,
  topRightAction,
  outsideSlot,
  highlighted = false,
  className,
}: CourseTicketCardProps) {
  const cleanMeta = (metaParts ?? [])
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" · ");

  const safePercent = progress
    ? Math.min(100, Math.max(0, Math.round(progress.percent || 0)))
    : 0;
  const progressLabel =
    progress?.label ??
    (safePercent >= 100
      ? "Đã hoàn thành"
      : safePercent > 0
        ? `Đã học ${safePercent}%`
        : "Chưa bắt đầu");

  const hasPriceValue =
    price !== null &&
    price !== undefined &&
    (price.isFree || (price.priceVnd !== null && price.priceVnd !== undefined));

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group relative flex h-full min-w-0 flex-col drop-shadow-[0_10px_28px_rgba(53,111,167,0.12)] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:drop-shadow-[0_16px_34px_rgba(53,111,167,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <article
        style={ticketMask("calc(100% - 2.25rem)", 9)}
        className={cn(
          "relative flex flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-surface text-foreground",
          highlighted && "ring-2 ring-primary/50",
        )}
      >
        <CourseThumb
          src={thumbnail}
          fallback={fallback}
          alt={alt ?? `Ảnh bìa ${title}`}
          sizes={sizes}
          priority={priority}
          className="shrink-0"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 border-t-2 border-dashed border-primary-pastel px-5 py-4">
          <div className="space-y-1.5">
            {badge?.label && (
              <p
                className={cn(
                  "w-fit max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-bold",
                  BADGE_TONE_CLASSES[badge.tone ?? "lavender"],
                )}
              >
                {badge.label}
              </p>
            )}

            <h3
              className="line-clamp-2 min-h-[2.6em] text-base leading-snug font-extrabold text-foreground wrap-anywhere transition-colors group-hover:text-primary"
              title={title}
            >
              <Link
                id={linkId}
                href={href}
                onClick={onClick}
                aria-busy={ariaBusy || undefined}
                className={stretchedLink}
              >
                {title}
                {srLabel ? <span className="sr-only"> {srLabel}</span> : null}
              </Link>
            </h3>

            {cleanMeta && (
              <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm" title={cleanMeta}>
                {cleanMeta}
              </p>
            )}
          </div>

          <div className="mt-auto pt-1">
            {progress ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="truncate">{progressLabel}</span>
                  <span className="shrink-0 tabular-nums text-foreground">{safePercent}%</span>
                </div>
                <ThinBar value={safePercent} label={`Tiến độ ${title}`} />
                {footerSlot ? <div className="relative z-20 pt-2">{footerSlot}</div> : null}
              </div>
            ) : hasPriceValue ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CoinPrice
                  priceVnd={price!.isFree ? 0 : price!.priceVnd}
                  originalPriceVnd={price!.isFree ? undefined : price!.originalPriceVnd}
                  size="md"
                />
                {footerSlot ? <div className="relative z-20">{footerSlot}</div> : null}
              </div>
            ) : footerSlot ? (
              <div className="relative z-20">{footerSlot}</div>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">Xem chi tiết</p>
            )}
          </div>
        </div>
      </article>

      {topRightAction ? (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {topRightAction}
        </div>
      ) : null}

      {outsideSlot}
    </div>
  );
}

export function CourseTicketCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-w-0 flex-col drop-shadow-[0_10px_24px_rgba(53,111,167,0.08)]",
        className,
      )}
    >
      <div
        style={ticketMask("calc(100% - 2.25rem)", 9)}
        className="flex flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-surface"
      >
        <Skeleton className="aspect-video w-full rounded-none bg-primary-light motion-reduce:animate-none" />
        <div className="flex flex-1 flex-col justify-between gap-3 border-t-2 border-dashed border-primary-pastel px-5 py-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24 rounded-full bg-primary-light motion-reduce:animate-none" />
            <Skeleton className="h-5 w-11/12 rounded-md bg-primary-light motion-reduce:animate-none" />
            <Skeleton className="h-5 w-3/4 rounded-md bg-primary-light motion-reduce:animate-none" />
            <Skeleton className="h-4 w-2/3 rounded-md bg-primary-light motion-reduce:animate-none" />
          </div>
          <div className="mt-auto pt-1">
            <Skeleton className="h-7 w-28 rounded-full bg-primary-light motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
