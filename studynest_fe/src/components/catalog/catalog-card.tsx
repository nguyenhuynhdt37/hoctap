"use client";

import Link from "next/link";
import { ArrowUpRight } from "pulsoicon-react";
import { CoinPrice } from "@/components/ui";
import { CourseThumb, stretchedLink } from "@/components/learning-hub/home/home-ui";
import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import { formatCoursePriceCoin } from "@/lib/learning-hub/coin-logic";
import type { CatalogCourse } from "@/types/catalog";

export function formatPrice(amount: number, _currency?: string): string {
  return formatCoursePriceCoin(amount);
}

export interface CatalogCardProps {
  course: CatalogCourse;
  viewMode?: "grid" | "list";
}

export function CatalogCard({ course, viewMode = "grid" }: CatalogCardProps) {
  const gradeLabel = course.grades?.map((g) => g.name).join(", ") || null;
  const badgeLabel = course.subject?.name || gradeLabel || null;

  const metaParts: Array<string | null | undefined | false> = [
    course.instructor?.fullname,
    course.rating_count > 0
      ? `${course.rating_avg.toFixed(1)}★ (${course.rating_count})`
      : null,
    course.total_enrolls > 0
      ? `${course.total_enrolls.toLocaleString("vi-VN")} học viên`
      : null,
  ];

  if (viewMode === "list") {
    const cleanMeta = metaParts
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" · ");

    return (
      <article className="group relative flex flex-col overflow-hidden rounded-[22px] border border-border bg-surface text-foreground shadow-[0_8px_24px_-12px_rgba(53,111,167,0.12)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-[0_14px_30px_-14px_rgba(53,111,167,0.2)] sm:flex-row motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <div className="shrink-0 sm:w-60 md:w-64">
          <CourseThumb
            src={course.thumbnail}
            alt={`Ảnh bìa khóa học ${course.title}`}
            sizes="(min-width: 768px) 256px, (min-width: 640px) 240px, 100vw"
            className="h-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {course.subject?.name && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  {course.subject.name}
                </span>
              )}
              {gradeLabel && (
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {gradeLabel}
                </span>
              )}
            </div>

            <h3
              className="line-clamp-2 text-base font-bold leading-snug text-foreground wrap-anywhere transition-colors group-hover:text-primary"
              title={course.title}
            >
              <Link href={`/course/${course.slug}`} className={stretchedLink}>
                {course.title}
                <span className="sr-only"> — xem khóa học</span>
              </Link>
            </h3>

            {cleanMeta && (
              <p
                className="truncate text-xs font-medium text-muted-foreground sm:text-sm"
                title={cleanMeta}
              >
                {cleanMeta}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <CoinPrice
              priceVnd={course.base_price === 0 ? 0 : course.base_price}
              size="md"
            />
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              <span>Xem khóa học</span>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <CourseTicketCard
      href={`/course/${course.slug}`}
      title={course.title}
      thumbnail={course.thumbnail}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={badgeLabel ? { label: badgeLabel, tone: "lavender" } : null}
      metaParts={metaParts}
      price={{
        priceVnd: course.base_price,
        isFree: course.base_price === 0,
      }}
      srLabel="— xem khóa học"
    />
  );
}
