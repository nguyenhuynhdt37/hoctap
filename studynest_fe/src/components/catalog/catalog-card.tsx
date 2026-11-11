"use client";

import Link from "next/link";
import { BookOpen, Star, User } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { handleImageError } from "@/lib/utils/helpers/image";
import type { CatalogCourse } from "@/types/catalog";

export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "VND",
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(amount);
}

export interface CatalogCardProps {
  course: CatalogCourse;
  viewMode?: "grid" | "list";
}

export function CatalogCard({ course, viewMode = "grid" }: CatalogCardProps) {
  const gradeLabel = course.grades?.map((g) => g.name).join(", ") || null;
  const isFree = course.base_price === 0;

  if (viewMode === "list") {
    return (
      <Card
        interactive
        className="group overflow-hidden rounded-[20px] border-border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-md"
      >
        <Link
          href={`/course/${course.slug}`}
          className="flex flex-col sm:flex-row h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* Thumbnail bên trái */}
          <div className="relative aspect-video sm:aspect-square sm:w-56 shrink-0 overflow-hidden bg-primary-light/40">
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
                <Badge variant="primary" className="text-[11px] shadow-2xs font-medium">
                  {course.subject.name}
                </Badge>
              )}
              {gradeLabel && (
                <Badge variant="outline" className="bg-surface/90 backdrop-blur-xs text-[11px] shadow-2xs">
                  {gradeLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Nội dung bên phải */}
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                {course.provider && (
                  <span className="font-medium text-primary hover:underline">
                    {course.provider.name}
                  </span>
                )}
                {course.provider && course.delivery_type && <span aria-hidden="true">•</span>}
                {course.delivery_type && <span>Video bài giảng</span>}
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                {course.title}
              </h3>

              {/* Giảng viên */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                {course.instructor.avatar ? (
                  <img
                    src={course.instructor.avatar}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary-light text-primary flex items-center justify-center text-[10px]">
                    <User className="h-3 w-3" />
                  </div>
                )}
                <span className="font-medium text-foreground">{course.instructor.fullname}</span>
              </div>
            </div>

            {/* Footer row: Rating & Price */}
            <div className="flex items-center justify-between pt-3 border-t border-border/70 mt-2">
              <div className="flex items-center gap-2 text-xs">
                {course.rating_count > 0 ? (
                  <div className="flex items-center gap-1 font-medium">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({course.rating_count})
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Chưa có đánh giá</span>
                )}
              </div>

              <div className="text-right">
                <span
                  className={
                    isFree
                      ? "text-sm sm:text-base font-bold text-success-foreground"
                      : "text-base sm:text-lg font-bold text-primary"
                  }
                >
                  {formatPrice(course.base_price, course.currency)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  // Chế độ Grid View (mặc định)
  return (
    <Card
      interactive
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border-border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-ambient-md"
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

          {/* Badges trên thumbnail */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {course.subject?.name && (
              <Badge variant="primary" className="text-[11px] shadow-2xs font-medium backdrop-blur-xs">
                {course.subject.name}
              </Badge>
            )}
            {gradeLabel && (
              <Badge variant="outline" className="bg-surface/90 backdrop-blur-xs text-[11px] shadow-2xs font-medium">
                {gradeLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Course Info */}
        <div className="flex flex-1 flex-col p-5">
          {/* Provider / Delivery Type */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            {course.provider && (
              <span className="font-medium text-primary hover:underline line-clamp-1">
                {course.provider.name}
              </span>
            )}
            {!course.provider && <span>Video bài giảng</span>}
          </div>

          {/* Course Title */}
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-3">
            {course.title}
          </h3>

          {/* Instructor Row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            {course.instructor.avatar ? (
              <img
                src={course.instructor.avatar}
                alt=""
                className="h-5 w-5 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary-light text-primary flex items-center justify-center text-[10px]">
                <User className="h-3 w-3" />
              </div>
            )}
            <span className="font-medium text-foreground line-clamp-1">{course.instructor.fullname}</span>
          </div>

          {/* Price & Rating Footer */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/70">
            <div>
              {course.rating_count > 0 ? (
                <div className="flex items-center gap-1 text-xs font-medium">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
                  <span className="text-muted-foreground font-normal">
                    ({course.rating_count})
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Chưa có đánh giá</span>
              )}
            </div>

            <div className="text-right">
              <span
                className={
                  isFree
                    ? "text-sm font-bold text-success-foreground"
                    : "text-base font-bold text-primary"
                }
              >
                {formatPrice(course.base_price, course.currency)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
