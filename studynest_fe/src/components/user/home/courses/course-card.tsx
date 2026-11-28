"use client";

import { CourseTicketCard, CourseTicketCardSkeleton } from "@/components/user/shared/course-ticket-card";
import { cn } from "@/lib/utils";
import type { CatalogCourseCard } from "@/types/catalog";
import type { CoursesMeItem } from "@/types/user/courses-me";
import { mayPortrait, StudyImage } from "../study-image";

export const courseNumber = new Intl.NumberFormat("vi-VN");
const score = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const courseActionClass =
  "min-h-11 rounded-full px-4 motion-reduce:transition-none motion-reduce:active:translate-y-0";
export const courseLinkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const coverClass = "relative aspect-video overflow-hidden rounded-2xl";

export function CourseCover({
  src,
  title,
  sizes,
  className,
  crop = false,
}: {
  src?: string | null;
  title: string;
  sizes: string;
  className?: string;
  crop?: boolean;
}) {
  return (
    <StudyImage
      src={src}
      alt={title ? `Ảnh bìa khóa học ${title}` : ""}
      sizes={sizes}
      className={cn(coverClass, "bg-linear-to-br from-primary-light via-background to-accent/40", className)}
      imageClassName={crop ? undefined : "object-contain"}
    />
  );
}

export function CourseLecturer({ name, avatar }: CatalogCourseCard["lecturer"]) {
  return (
    <div className="mt-3 flex min-w-0 items-center gap-2.5 text-sm text-foreground">
      <StudyImage
        src={avatar}
        fallback={mayPortrait}
        sizes="32px"
        className="size-8 shrink-0 rounded-full border border-primary-pastel"
      />
      <span className="min-w-0 wrap-anywhere">{name}</span>
    </div>
  );
}

type CourseCardProps =
  | { course: CatalogCourseCard; featured?: boolean; enrolled?: false }
  | { course: CoursesMeItem; enrolled: true };

export function CourseCard(props: CourseCardProps) {
  if (props.enrolled) return <EnrolledCourseCard course={props.course} />;

  const { course } = props;
  const price = course.discount_price ?? course.original_price;
  const hasDiscount =
    !course.is_free &&
    course.discount_price !== null &&
    course.original_price !== null &&
    course.original_price > 0 &&
    course.discount_price < course.original_price;
  const discountPercent = hasDiscount
    ? Math.max(1, Math.round((1 - course.discount_price! / course.original_price!) * 100))
    : 0;

  const badge = hasDiscount
    ? { label: `Tiết kiệm ${discountPercent}%`, tone: "lavender" as const }
    : course.is_bestseller
      ? { label: "Bán chạy", tone: "lavender" as const }
      : course.is_new
        ? { label: "Mới", tone: "lavender" as const }
        : course.subject?.name
          ? { label: course.subject.name, tone: "primary" as const }
          : null;

  const metaParts: Array<string | null | undefined | false> = [
    course.lecturer?.name,
    course.lessons_count > 0 ? `${courseNumber.format(course.lessons_count)} bài` : null,
    course.rating_count > 0
      ? `${score.format(course.rating_avg)}★ (${courseNumber.format(course.rating_count)})`
      : course.students_count > 0
        ? `${courseNumber.format(course.students_count)} học viên`
        : null,
  ];

  return (
    <CourseTicketCard
      linkId={`home-course-${course.id}`}
      href={`/course/${course.slug}`}
      title={course.title}
      thumbnail={course.thumbnail}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={badge}
      metaParts={metaParts}
      price={{
        priceVnd: price,
        originalPriceVnd: hasDiscount ? course.original_price : undefined,
        isFree: course.is_free,
      }}
      srLabel="— xem khóa học"
    />
  );
}

export function CourseCardSkeleton({ featured: _featured = false }: { featured?: boolean }) {
  return <CourseTicketCardSkeleton />;
}

function EnrolledCourseCard({ course }: { course: CoursesMeItem }) {
  const progress = Math.round(course.progress_percent ?? 0);
  const completed = progress >= 100;

  return (
    <CourseTicketCard
      href={`/learning/${encodeURIComponent(course.slug)}`}
      title={course.title}
      thumbnail={course.thumbnail_url}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={{
        label: completed ? "Đã hoàn thành" : progress > 0 ? "Đang học" : "Chưa bắt đầu",
        tone: completed ? "success" : "primary",
      }}
      metaParts={[
        typeof course.total_lessons === "number" && course.total_lessons > 0
          ? `${course.completed_lessons ?? 0}/${course.total_lessons} bài`
          : null,
      ]}
      progress={{
        percent: progress,
        label: completed ? "Đã hoàn thành" : progress > 0 ? "Tiến độ học tập" : "Chưa bắt đầu",
      }}
      srLabel={`— ${completed ? "xem lại" : progress > 0 ? "học tiếp" : "bắt đầu học"}`}
    />
  );
}
