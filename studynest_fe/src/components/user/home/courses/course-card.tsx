"use client";

import { Progress, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CoursesMeItem } from "@/types/user/courses-me";
import type { CatalogCourseCard } from "@/types/catalog";
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, Star, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CloudBlob, GlassCard, Pill } from "../landing-ui";
import { mayPortrait, StudyImage } from "../study-image";

export const courseNumber = new Intl.NumberFormat("vi-VN");
const score = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export const courseActionClass =
  "min-h-11 rounded-full px-4 motion-reduce:transition-none motion-reduce:active:translate-y-0";
export const courseLinkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const coverClass = "relative aspect-video overflow-hidden rounded-2xl";
const skeletonClass = "bg-primary-light motion-reduce:animate-none";

function CourseFrame({
  featured,
  cover,
  children,
  skeleton = false,
}: {
  featured: boolean;
  cover: ReactNode;
  children: ReactNode;
  skeleton?: boolean;
}) {
  return (
    <GlassCard
      tilt={!skeleton}
      className={cn(
        "group relative isolate flex h-full min-w-0 flex-col p-3 motion-reduce:hover:translate-y-0",
        featured && "gap-1 md:grid md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] md:items-center md:gap-5 md:p-5 lg:gap-8 lg:p-6",
      )}
    >
      {featured && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
          <CloudBlob className="-left-20 -top-16 h-52 w-96 bg-primary-pastel/75" />
          <div className="absolute -right-10 -top-24 size-64 rounded-full border border-primary-pastel/65" />
          <div className="absolute -right-3 -top-17 size-50 rounded-full border border-primary-pastel/60 bg-primary-light/45" />
        </div>
      )}
      {cover}
      <div className={cn("flex min-w-0 flex-1 flex-col px-1.5 pb-1.5 pt-5", featured && "md:px-3 md:py-2")}>
        {children}
      </div>
    </GlassCard>
  );
}

export function CourseCover({ src, title, sizes, className, crop = false }: {
  src?: string | null;
  title: string;
  sizes: string;
  className?: string;
  crop?: boolean;
}) {
  return (
    <StudyImage src={src} alt={title ? `Ảnh bìa khóa học ${title}` : ""} sizes={sizes}
      className={cn(coverClass, "bg-linear-to-br from-primary-light via-background to-accent/40", className)}
      imageClassName={crop ? undefined : "object-contain"}
    />
  );
}

export function CourseLecturer({ name, avatar }: CatalogCourseCard["lecturer"]) {
  return (
    <div className="mt-3 flex min-w-0 items-center gap-2.5 text-sm text-foreground">
      <StudyImage src={avatar} fallback={mayPortrait} sizes="32px" className="size-8 shrink-0 rounded-full border border-primary-pastel" />
      <span className="min-w-0 wrap-anywhere">{name}</span>
    </div>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${courseNumber.format(minutes)} phút`;
  return remainder ? `${courseNumber.format(hours)} giờ ${courseNumber.format(remainder)} phút` : `${courseNumber.format(hours)} giờ`;
}

function CourseMetrics({ course }: { course: CatalogCourseCard }) {
  return (
    <ul className="mt-4 flex min-h-12 flex-wrap content-start gap-x-4 gap-y-2 text-xs font-medium leading-5 text-foreground">
      <li className="inline-flex items-center gap-1.5">
        <Star aria-hidden="true" className="size-4 shrink-0 text-accent-foreground" />
        {course.rating_count ? (
          <span>
            <span className="font-semibold">{score.format(course.rating_avg)}</span>
            {" "}<span aria-hidden="true">({courseNumber.format(course.rating_count)})</span>
            <span className="sr-only"> trên 5, {courseNumber.format(course.rating_count)} lượt đánh giá</span>
          </span>
        ) : "Chưa có đánh giá"}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <UsersRound aria-hidden="true" className="size-4 shrink-0 text-primary" />
        {courseNumber.format(course.students_count)} học viên
      </li>
      <li className="inline-flex items-center gap-1.5">
        <BookOpen aria-hidden="true" className="size-4 shrink-0 text-primary" />
        {courseNumber.format(course.lessons_count)} bài
      </li>
      {course.duration_seconds > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {formatDuration(course.duration_seconds)}
        </li>
      )}
    </ul>
  );
}

function CoursePrice({ course }: { course: CatalogCourseCard }) {
  const { original_price: originalPrice, discount_price: discountPrice, is_free: isFree } = course;
  const price = discountPrice ?? originalPrice;
  return (
    <div className="min-w-0">
      <p className="wrap-anywhere text-base font-semibold tabular-nums text-info-foreground sm:text-lg">
        {isFree ? "Miễn phí" : price === null ? "Chưa có giá" : money.format(price)}
      </p>
      {discountPrice !== null && originalPrice !== null && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium text-foreground">
          <del><span className="sr-only">Giá niêm yết </span>{money.format(originalPrice)}</del>
          <span className="text-accent-foreground">Khi áp mã</span>
        </p>
      )}
    </div>
  );
}

function courseLevels(grades: CatalogCourseCard["grades"]) {
  return [...new Set(grades.map(({ grade_number: grade }) => grade <= 5 ? "Tiểu học" : grade <= 9 ? "THCS" : "THPT"))];
}

type CourseCardProps =
  | { course: CatalogCourseCard; featured?: boolean; enrolled?: false }
  | { course: CoursesMeItem; enrolled: true };

export function CourseCard(props: CourseCardProps) {
  if (props.enrolled) return <EnrolledCourseCard course={props.course} />;

  const { course, featured = false } = props;
  const lecturer = course.lecturer;
  const levels = courseLevels(course.grades);
  const badges = (
    <div className="absolute -bottom-2.5 left-2 right-2 flex flex-wrap items-center gap-1.5 sm:left-4">
      {featured && <Pill className="-rotate-2 shadow-ambient-md">Nổi bật</Pill>}
      {course.is_new && <Pill className="rotate-1 shadow-ambient-sm" tone="lavender">Mới</Pill>}
      {course.is_bestseller && <Pill className="rotate-1 shadow-ambient-sm" tone="lavender">Bán chạy</Pill>}
    </div>
  );

  return (
    <CourseFrame
      featured={featured}
      cover={<div className="relative min-w-0">
        <CourseCover src={course.thumbnail} title={course.title} sizes={featured ? "(min-width: 1280px) 580px, (min-width: 768px) 50vw, 90vw" : "(min-width: 1280px) 380px, (min-width: 768px) 33vw, 85vw"} />
        {badges}
      </div>}
    >
      <div className="flex min-h-6 min-w-0 flex-wrap items-center gap-1.5">
        {levels.map((level) => <Pill key={level}>{level}</Pill>)}
        {course.subject?.name && <Pill tone="lavender" className="max-w-full wrap-anywhere">{course.subject.name}</Pill>}
      </div>
      <h3 className={cn(
        "mt-2 line-clamp-2 min-h-[2.75em] min-w-0 wrap-anywhere text-base font-semibold leading-snug text-foreground group-hover:text-primary",
        featured && "min-h-0 text-xl md:text-2xl lg:text-3xl",
      )} title={course.title}>
        {course.title}
      </h3>
      <CourseLecturer name={lecturer.name} avatar={lecturer.avatar} />
      <CourseMetrics course={course} />
      <div className="mt-auto pt-4">
        <div className="flex min-h-15 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-primary-pastel/55 pt-3">
          <CoursePrice course={course} />
          <Link
            id={`home-course-${course.id}`}
            href={`/course/${course.slug}`}
            className={cn(
              courseActionClass,
              courseLinkFocusClass,
              "inline-flex min-w-11 shrink-0 items-center gap-2 text-sm font-semibold after:absolute after:inset-0 after:rounded-3xl",
              featured
                ? "bg-primary text-primary-foreground group-hover:bg-primary-hover"
                : "bg-primary-light px-3 text-info-foreground group-hover:bg-primary-pastel",
            )}
          >
            {featured ? "Xem khóa học" : "Chi tiết"}
            <span className="sr-only"> {course.title}</span>
            {featured ? <ArrowRight aria-hidden="true" className="size-4" /> : <ArrowUpRight aria-hidden="true" className="size-4" />}
          </Link>
        </div>
      </div>
    </CourseFrame>
  );
}

export function CourseCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <CourseFrame featured={featured} skeleton cover={<Skeleton className={cn(coverClass, skeletonClass)} />}>
      <div className="flex gap-2">
        <Skeleton className={cn("h-6 w-16 rounded-full", skeletonClass)} />
        <Skeleton className={cn("h-6 w-24 rounded-full", skeletonClass)} />
      </div>
      <div className={cn("mt-2 min-h-11", featured && "min-h-0")}>
        <Skeleton className={cn("h-6 w-4/5", skeletonClass, featured && "md:h-8")} />
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <Skeleton className={cn("size-8 rounded-full", skeletonClass)} />
        <Skeleton className={cn("h-4 w-2/5", skeletonClass)} />
      </div>
      <div className="mt-4 flex min-h-12 flex-wrap content-start gap-x-4 gap-y-2">
        {[20, 24, 18, 16].map((width) => (
          <Skeleton key={width} className={cn("h-5", skeletonClass)} style={{ width: width * 4 }} />
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="flex min-h-15 items-center justify-between gap-3 border-t border-primary-pastel/55 pt-3">
          <Skeleton className={cn("h-6 w-20", skeletonClass)} />
          <Skeleton className={cn("h-11 w-21 rounded-full", skeletonClass, featured && "w-36")} />
        </div>
      </div>
    </CourseFrame>
  );
}

function EnrolledCourseCard({ course }: { course: CoursesMeItem }) {
  const progress = Math.round(course.progress_percent ?? 0);
  const completed = progress >= 100;
  return (
    <CourseFrame
      featured={false}
      cover={<CourseCover src={course.thumbnail_url} title={course.title} sizes="(min-width: 1280px) 380px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw" />}
    >
      <Pill className="self-start" tone={completed ? "success" : "blue"}>
        {completed ? "Đã hoàn thành" : progress > 0 ? "Đang học" : "Chưa bắt đầu"}
      </Pill>
      <h3 className="mt-2 mb-4 text-base font-semibold wrap-anywhere">{course.title}</h3>
      <div className="mt-auto space-y-3">
        <Progress
          label="Tiến độ khóa học"
          value={progress}
          showValue
          size="sm"
          variant={completed ? "success" : "primary"}
          className="[&_[role=progressbar]>div]:motion-reduce:transition-none [&>div>span]:text-foreground"
        />
        <Link
          href={`/learning/${encodeURIComponent(course.slug)}`}
          aria-label={`Vào học ${course.title}`}
          className={cn(courseActionClass, courseLinkFocusClass, "inline-flex items-center gap-2 bg-primary-light text-sm font-semibold text-info-foreground hover:bg-primary-pastel")}
        >
          {completed ? "Xem lại" : progress > 0 ? "Học tiếp" : "Bắt đầu học"} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </CourseFrame>
  );
}
