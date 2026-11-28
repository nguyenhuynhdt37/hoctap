"use client";

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

export function CatalogCard({ course }: CatalogCardProps) {
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
