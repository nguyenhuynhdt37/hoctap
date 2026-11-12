"use client";

import { Badge } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { CategoryItem, Course } from "@/types/user/course_detail";
import Link from "next/link";
import {
  HiAcademicCap,
  HiBookOpen,
  HiClock,
  HiGlobe,
  HiPlay,
  HiCloud,
  HiStar,
  HiUserGroup,
} from "react-icons/hi";

interface CourseHeaderProps {
  course: Course;
  categoryChain: CategoryItem[];
  totalDurationSeconds?: number;
  formatDate: (dateString: string) => string;
  formatSecondsToHms?: (seconds: number) => string;
  onPreview?: (courseId: string, lessonId?: string) => void;
  isFireActive?: boolean;
}

export default function CourseHeader({
  course,
  categoryChain,
  totalDurationSeconds = 0,
  formatDate,
  formatSecondsToHms,
  onPreview,
}: CourseHeaderProps) {
  const totalLessons = (course.sections || []).reduce(
    (sum, s) => sum + (s.lessons?.length || 0),
    0,
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-light/85 via-background to-secondary-light/45 border-b border-border">
      {/* Subtle Pastel Cloud Aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-pastel/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-secondary-pastel/35 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-6"
        >
          <Link
            href="/"
            className="hover:text-primary font-semibold transition-colors"
          >
            Mây Mây
          </Link>
          {categoryChain.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <span className="text-subtle-foreground">/</span>
              <Link
                href={`/categories/${category.slug}`}
                className="hover:text-primary font-medium transition-colors"
              >
                {category.name}
              </Link>
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Course Overview */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="default"
                size="md"
                dot
                className="bg-surface/90 border-primary-pastel text-primary font-semibold"
              >
                Khóa học Mây Mây
              </Badge>

              {categoryChain.length > 0 && (
                <Badge variant="secondary" size="md">
                  {categoryChain[categoryChain.length - 1].name}
                </Badge>
              )}

              <Badge variant="vanilla" size="md">
                <HiCloud className="w-3.5 h-3.5 mr-1 inline" />
                Học trực quan
              </Badge>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-[40px] font-bold text-foreground leading-[1.18] tracking-tight">
              {course.title}
            </h1>

            {/* Rating, Enrollments, Lessons Pill Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border shadow-2xs">
                {course.rating_count > 0 && course.rating > 0 ? (
                  <>
                    <HiStar className="h-4 w-4 text-warning-foreground" />
                    <span className="font-bold text-sm text-foreground">
                      {course.rating.toFixed(1)}
                    </span>
                    <a
                      href="#reviews"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      ({course.rating_count.toLocaleString("vi-VN")} đánh giá)
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa có đánh giá</span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border shadow-2xs text-xs sm:text-sm text-foreground font-medium">
                <HiUserGroup className="h-4 w-4 text-primary" />
                <span>
                  {course.total_enrolls.toLocaleString("vi-VN")} học viên
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border shadow-2xs text-xs sm:text-sm text-foreground font-medium">
                <HiBookOpen className="h-4 w-4 text-primary" />
                <span>
                  {course.sections?.length || 0} chương • {totalLessons} bài học
                </span>
              </div>

              {formatSecondsToHms && totalDurationSeconds > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-border shadow-2xs text-xs sm:text-sm text-foreground font-medium">
                  <HiClock className="h-4 w-4 text-primary" />
                  <span>{formatSecondsToHms(totalDurationSeconds)}</span>
                </div>
              )}
            </div>

            {/* Instructor & Meta Info */}
            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs sm:text-sm text-muted-foreground">
              {course.instructor && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-light border border-primary-pastel overflow-hidden flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {course.instructor.avatar ? (
                      <img
                        src={getImageUrl(course.instructor.avatar)}
                        alt={course.instructor.fullname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      course.instructor.fullname?.charAt(0) || "M"
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giảng viên: </span>
                    <Link
                      href={`/instructors/${course.instructor.id}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {course.instructor.fullname}
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <HiClock className="h-4 w-4 text-primary" />
                <span>Cập nhật: {formatDate(course.last_updated)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <HiGlobe className="h-4 w-4 text-primary" />
                <span>
                  {course.language?.toLowerCase() === "vi" ||
                  course.language?.toLowerCase() === "vietnamese"
                    ? "Tiếng Việt"
                    : course.language || "Tiếng Việt"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Media Preview Card */}
          <div className="lg:col-span-4">
            <div className="group relative rounded-[24px] overflow-hidden bg-surface border-2 border-white/90 shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="relative aspect-video bg-primary-light overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={getImageUrl(course.thumbnail_url)}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-light via-surface to-secondary-light p-6 text-center">
                    <HiAcademicCap className="w-12 h-12 text-primary mb-2" />
                    <span className="text-xs font-semibold text-primary">
                      Học viện trên mây Mây Mây
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/15 to-transparent" />

                {onPreview && (
                  <button
                    type="button"
                    onClick={() => onPreview(course.id)}
                    aria-label="Xem trước khóa học"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-10 cursor-pointer group/btn"
                  >
                    <span className="w-14 h-14 rounded-full bg-surface/92 backdrop-blur-md text-primary flex items-center justify-center shadow-lg ring-4 ring-white/40 transition-all duration-200 group-hover/btn:scale-110 group-hover/btn:bg-primary group-hover/btn:text-primary-foreground">
                      <HiPlay className="h-6 w-6 translate-x-0.5" />
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-bold text-foreground shadow-xs">
                      Xem giới thiệu bài giảng
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
