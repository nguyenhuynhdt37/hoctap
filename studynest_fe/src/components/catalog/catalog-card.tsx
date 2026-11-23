"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Star, User, UsersRound } from "pulsoicon-react";
import { Badge, Card, CoinPrice } from "@/components/ui";
import { formatCoursePriceCoin } from "@/lib/learning-hub/coin-logic";
import { handleImageError } from "@/lib/utils/helpers/image";
import type { CatalogCourse } from "@/types/catalog";

export function formatPrice(amount: number, _currency?: string): string {
  return formatCoursePriceCoin(amount);
}

export interface CatalogCardProps {
  course: CatalogCourse;
  viewMode?: "grid" | "list";
  featured?: boolean;
}

export function CatalogCard({ course, viewMode = "grid", featured = false }: CatalogCardProps) {
  const gradeLabel = course.grades?.map((g) => g.name).join(", ") || null;
  const isFree = course.base_price === 0;

  // Featured Spotlight Card (bất đối xứng Bento — chiếm 2 cột trên desktop trong Grid mode)
  if (featured && viewMode === "grid") {
    return (
      <Card
        interactive
        className="group relative overflow-hidden rounded-[26px] border border-primary-pastel/85 bg-gradient-to-br from-surface via-surface to-primary-light/40 p-0 shadow-ambient-sm transition-all duration-250 hover:-translate-y-1 hover:border-primary hover:shadow-ambient-md sm:col-span-2"
      >
        <Link
          href={`/course/${course.slug}`}
          className="grid h-full sm:grid-cols-[1.15fr_1fr] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="relative aspect-video sm:aspect-auto sm:min-h-[250px] overflow-hidden bg-primary-light/40">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                loading="lazy"
                onError={handleImageError}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary-light text-primary">
                <BookOpen className="h-12 w-12" />
              </div>
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#13263A]/55 via-transparent to-transparent"
            />
            <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[#F5C542]/70 bg-[#13263A]/85 px-2.5 py-0.5 text-[11px] font-bold text-[#FFE89E] backdrop-blur-md">
                Nổi bật
              </span>
              {course.subject?.name && (
                <Badge variant="primary" className="text-[11px] font-medium shadow-2xs">
                  {course.subject.name}
                </Badge>
              )}
              {gradeLabel && (
                <Badge variant="outline" className="bg-surface/90 text-[11px] font-medium backdrop-blur-xs shadow-2xs">
                  {gradeLabel}
                </Badge>
              )}
            </div>
            {course.total_enrolls > 0 && (
              <span className="absolute bottom-3 left-3.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                <UsersRound aria-hidden="true" animated={false} className="size-3" />
                <span>{course.total_enrolls.toLocaleString("vi-VN")} học viên</span>
              </span>
            )}
          </div>

          <div className="flex flex-col justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {course.delivery_type ? "Video bài giảng" : "Khóa học trực tuyến"}
              </p>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2 sm:text-2xl">
                {course.title}
              </h3>

              <div className="mt-4 flex items-center gap-2.5 text-xs text-muted-foreground">
                {course.instructor.avatar ? (
                  <img
                    src={course.instructor.avatar}
                    alt=""
                    className="size-7 rounded-full border border-primary-pastel object-cover"
                  />
                ) : (
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary-light text-primary">
                    <User className="size-3.5" />
                  </div>
                )}
                <span className="font-semibold text-foreground">{course.instructor.fullname}</span>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-3 border-t border-border/70 pt-4">
              <div className="space-y-1">
                {course.rating_count > 0 ? (
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    <Star aria-hidden="true" animated={false} className="size-3.5 fill-warning text-warning" />
                    <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
                    <span className="font-normal text-muted-foreground">({course.rating_count})</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Mới mở đăng ký</span>
                )}
                <CoinPrice priceVnd={course.base_price} size="lg" />
              </div>

              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowUpRight aria-hidden="true" className="size-4.5" />
              </span>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  if (viewMode === "list") {
    return (
      <Card
        interactive
        className="group overflow-hidden rounded-[24px] border-border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-md"
      >
        <Link
          href={`/course/${course.slug}`}
          className="flex h-full flex-col sm:flex-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* Thumbnail bên trái */}
          <div className="relative aspect-video shrink-0 overflow-hidden bg-primary-light/40 sm:w-60">
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
                <BookOpen className="h-8 w-8" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {course.subject?.name && (
                <Badge variant="primary" className="text-[11px] font-medium shadow-2xs">
                  {course.subject.name}
                </Badge>
              )}
              {gradeLabel && (
                <Badge variant="outline" className="bg-surface/90 text-[11px] backdrop-blur-xs shadow-2xs">
                  {gradeLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Nội dung bên phải */}
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{course.delivery_type ? "Video bài giảng" : "Khóa học trực tuyến"}</span>
                {course.total_enrolls > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <UsersRound aria-hidden="true" animated={false} className="size-3.5" />
                    <span>{course.total_enrolls.toLocaleString("vi-VN")}</span>
                  </span>
                )}
              </div>

              <h3 className="mb-2.5 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2 sm:text-lg">
                {course.title}
              </h3>

              {/* Giảng viên */}
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                {course.instructor.avatar ? (
                  <img
                    src={course.instructor.avatar}
                    alt=""
                    className="size-5 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded-full bg-primary-light text-[10px] text-primary">
                    <User className="size-3" />
                  </div>
                )}
                <span className="font-medium text-foreground">{course.instructor.fullname}</span>
              </div>
            </div>

            {/* Footer row: Rating & Price */}
            <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-3">
              <div className="flex items-center gap-2 text-xs">
                {course.rating_count > 0 ? (
                  <div className="flex items-center gap-1 font-medium">
                    <Star aria-hidden="true" animated={false} className="size-3.5 fill-warning text-warning" />
                    <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
                    <span className="font-normal text-muted-foreground">
                      ({course.rating_count})
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Chưa có đánh giá</span>
                )}
              </div>

              <div className="text-right">
                <CoinPrice priceVnd={course.base_price} size="md" />
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  // Chế độ Grid View (Boutique Card)
  return (
    <Card
      interactive
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border-border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-ambient-md"
    >
      <Link
        href={`/course/${course.slug}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Thumbnail Area */}
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

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent"
          />

          {/* Badges trên thumbnail */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {course.subject?.name && (
              <Badge variant="primary" className="text-[11px] font-medium backdrop-blur-xs shadow-2xs">
                {course.subject.name}
              </Badge>
            )}
            {gradeLabel && (
              <Badge variant="outline" className="bg-surface/90 text-[11px] font-medium backdrop-blur-xs shadow-2xs">
                {gradeLabel}
              </Badge>
            )}
          </div>

          {isFree ? (
            <span className="absolute bottom-2.5 right-3 rounded-full bg-success-bg/95 px-2.5 py-0.5 text-[11px] font-bold text-success-foreground shadow-2xs">
              Miễn phí
            </span>
          ) : course.total_enrolls > 0 ? (
            <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-xs">
              <UsersRound aria-hidden="true" animated={false} className="size-3" />
              <span>{course.total_enrolls.toLocaleString("vi-VN")}</span>
            </span>
          ) : null}
        </div>

        {/* Course Info */}
        <div className="flex flex-1 flex-col p-5">
          {course.delivery_type && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Video bài giảng
            </p>
          )}

          {/* Course Title */}
          <h3 className="mb-3 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
            {course.title}
          </h3>

          {/* Instructor Row */}
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            {course.instructor.avatar ? (
              <img
                src={course.instructor.avatar}
                alt=""
                className="size-5 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-full bg-primary-light text-[10px] text-primary">
                <User className="size-3" />
              </div>
            )}
            <span className="truncate font-medium text-foreground">{course.instructor.fullname}</span>
          </div>

          {/* Footer Row */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
            <div className="flex items-center gap-1 text-xs">
              {course.rating_count > 0 ? (
                <>
                  <Star aria-hidden="true" animated={false} className="size-3.5 fill-warning text-warning" />
                  <span className="font-semibold text-foreground">{course.rating_avg.toFixed(1)}</span>
                  <span className="text-[11px] text-muted-foreground">({course.rating_count})</span>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">Mới mở</span>
              )}
            </div>

            <div className="text-right">
              <CoinPrice priceVnd={course.base_price} size="md" />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
