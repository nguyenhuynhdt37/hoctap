"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Play,
} from "pulsoicon-react";
import { Badge, Progress, Skeleton } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { cn } from "@/lib/utils";
import type { OwnedBundleItem } from "@/types/user/courses-me";

interface OwnedBundlesPanelProps {
  bundles: OwnedBundleItem[];
  isLoading?: boolean;
}

export function OwnedBundlesPanel({ bundles, isLoading }: OwnedBundlesPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  if (isLoading && bundles.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2].map((k) => (
          <Skeleton key={k} className="h-52 rounded-[26px]" />
        ))}
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-primary-pastel bg-surface/85 p-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
          <Layers className="size-7" animated={false} aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Bạn chưa sở hữu gói Combo lộ trình nào
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
          Mua theo Combo giúp bạn tiết kiệm hơn và học theo đúng lộ trình bài bản từ nền tảng đến nâng cao. Khi mua Combo, cả nhóm khóa học sẽ tự động gom gọn tại đây!
        </p>
        <Link
          href="/combo"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
        >
          <span>Khám phá Combo lộ trình</span>
          <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {bundles.map((bundle, idx) => {
        // Mặc định mở lộ trình khóa học cho Combo đầu tiên (hoặc khi chỉ có <= 2 Combo)
        const isExpanded =
          expandedIds[bundle.order_id] ?? (idx === 0 || bundles.length <= 2);
        const isCompleted = bundle.progress_percent >= 100 && bundle.course_count > 0;
        const purchasedText = bundle.purchased_at
          ? new Date(bundle.purchased_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : null;

        return (
          <article
            key={bundle.order_id}
            className="overflow-hidden rounded-[26px] border border-primary-pastel/80 bg-surface shadow-xs transition-all hover:border-primary"
          >
            {/* Header Nhóm Combo */}
            <div className="grid grid-cols-1 gap-5 bg-gradient-to-r from-primary-light/65 via-surface to-accent/25 p-5 md:grid-cols-[260px_minmax(0,1fr)] md:items-center sm:p-6">
              {/* Ảnh bìa Combo chuẩn 16:9 */}
              <Link
                href={`/combo/${bundle.slug}`}
                className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-primary-pastel/80 bg-surface shadow-2xs"
              >
                <img
                  src={getImageUrl(bundle.thumbnail_url || "/logo/studynest-logo.svg")}
                  alt={bundle.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-2xs">
                  <Layers className="size-3" animated={false} aria-hidden="true" />
                  Combo {bundle.course_count} khóa
                </span>
                {isCompleted && (
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[10px] font-extrabold text-success-foreground">
                    <CheckCircle2 className="size-3" animated={false} aria-hidden="true" />
                    Hoàn thành
                  </span>
                )}
              </Link>

              {/* Thông tin & Tiến độ tổng Combo */}
              <div className="flex min-w-0 flex-col justify-between space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary" className="text-[10px] font-extrabold">
                      Lộ trình Combo đã sở hữu
                    </Badge>
                    {purchasedText && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                        <Calendar className="size-3 text-primary" animated={false} aria-hidden="true" />
                        Mua ngày {purchasedText}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
                    {bundle.title}
                  </h3>

                  {bundle.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {bundle.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground tabular-nums">
                      Hoàn thành {bundle.completed_courses}/{bundle.course_count} khóa học trong Combo
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        isCompleted ? "text-success-foreground" : "text-primary",
                      )}
                    >
                      {bundle.progress_percent}%
                    </span>
                  </div>
                  <Progress
                    value={bundle.progress_percent}
                    variant={isCompleted ? "success" : "primary"}
                    size="sm"
                    className="bg-surface"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((prev) => ({
                        ...prev,
                        [bundle.order_id]: !isExpanded,
                      }))
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
                  >
                    <span className="inline-flex shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" animated={false} aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-3.5" animated={false} aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      {isExpanded
                        ? "Thu gọn danh sách khóa"
                        : `Xem ${bundle.course_count} khóa trong Combo`}
                    </span>
                  </button>

                  <Link
                    href={`/combo/${bundle.slug}`}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-primary-pastel bg-surface px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-light"
                  >
                    <span>Trang Combo</span>
                    <ArrowUpRight className="size-3.5" animated={false} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Danh sách lộ trình các khóa học con bên trong Combo */}
            {isExpanded && (
              <div className="border-t border-primary-pastel/60 bg-background/45 p-4 sm:p-5">
                <div className="space-y-2.5">
                  {bundle.courses.map((course, cIdx) => {
                    const done = course.progress_percent >= 100;
                    return (
                      <div
                        key={course.id}
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-surface p-3 transition-colors hover:border-primary-pastel sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full text-xs font-black tabular-nums",
                              done
                                ? "bg-success-bg text-success-foreground"
                                : "bg-primary-light text-primary",
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="size-4" animated={false} aria-hidden="true" />
                            ) : (
                              String(cIdx + 1).padStart(2, "0")
                            )}
                          </span>

                          <Link
                            href={`/learning/${course.slug}`}
                            className="relative hidden aspect-video w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/40 sm:block"
                          >
                            <img
                              src={getImageUrl(course.thumbnail_url || "/logo/studynest-logo.svg")}
                              alt={course.title}
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/learning/${course.slug}`}
                              className="line-clamp-1 font-display text-sm font-bold text-foreground transition-colors hover:text-primary"
                            >
                              {course.title}
                            </Link>
                            <div className="mt-1.5 flex items-center gap-2.5">
                              <div className="h-1.5 flex-1 max-w-[180px] overflow-hidden rounded-full bg-primary-light">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    done ? "bg-success-foreground" : "bg-primary",
                                  )}
                                  style={{ width: `${course.progress_percent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                {course.completed_lessons}/{course.total_lessons} bài ·{" "}
                                <strong className={done ? "text-success-foreground" : "text-primary"}>
                                  {course.progress_percent}%
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/learning/${course.slug}`}
                          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          <Play className="size-3" solid animated={false} aria-hidden="true" />
                          <span>
                            {done ? "Ôn lại" : course.progress_percent > 0 ? "Học tiếp" : "Bắt đầu"}
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
