"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Play, Star } from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui";
import { formatDate, formatDuration } from "@/lib/utils/helpers/date";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { CoursesMeItem, CoursesMeVariant } from "@/types/user/courses-me";

const FALLBACK_THUMBNAIL = "/logo/studynest-logo.svg";

const LEVEL_CONFIG: Record<
  string,
  { label: string; variant: "primary" | "secondary" | "lavender" | "default" }
> = {
  beginner: { label: "Cơ bản", variant: "primary" },
  intermediate: { label: "Trung cấp", variant: "lavender" },
  advanced: { label: "Nâng cao", variant: "secondary" },
};

type CourseCardProps = {
  course: CoursesMeItem;
  variant: CoursesMeVariant;
};

export const CourseCard = ({ course, variant }: CourseCardProps) => {
  const progress = Math.min(100, Math.max(0, Math.round(course.progress_percent || 0)));
  const isCompleted = progress === 100;
  const levelInfo = LEVEL_CONFIG[course.level] || {
    label: "Mọi cấp độ",
    variant: "default",
  };
  const thumbnailSrc = getImageUrl(course.thumbnail_url || FALLBACK_THUMBNAIL);

  return (
    <Link
      href={`/learning/${course.slug}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[20px]"
      aria-label={`Tiếp tục học khóa ${course.title}`}
    >
      <Card
        interactive
        className="flex h-full flex-col overflow-hidden border-border bg-surface shadow-xs transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary-pastel group-hover:shadow-ambient-md rounded-[20px] p-0"
      >
        {/* Thumbnail Area */}
        <div className="relative aspect-video w-full overflow-hidden bg-primary-light/40">
          <img
            src={thumbnailSrc}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Overlay gradient nhẹ khi hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white drop-shadow-sm">
              <Play className="w-3.5 h-3.5 fill-current" />
              {isCompleted ? "Xem lại bài giảng" : progress > 0 ? "Tiếp tục bài học" : "Bắt đầu học ngay"}
            </span>
          </div>

          {/* Level Badge góc trái */}
          <div className="absolute left-3.5 top-3.5">
            <Badge
              variant={levelInfo.variant}
              className="backdrop-blur-md shadow-2xs font-medium text-[11px] px-2.5 py-0.5"
            >
              {levelInfo.label}
            </Badge>
          </div>

          {/* Status Badge góc phải (nếu đã hoàn thành) */}
          {isCompleted && (
            <div className="absolute right-3.5 top-3.5">
              <Badge
                variant="success"
                className="backdrop-blur-md shadow-2xs text-[11px] px-2.5 py-0.5 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Hoàn thành
              </Badge>
            </div>
          )}
        </div>

        {/* Course Info Body */}
        <div className="flex flex-1 flex-col p-5">
          {/* Metadata Row: Rating & Duration */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
              <span className="text-foreground">{course.rating_avg.toFixed(1)}</span>
              <span className="text-subtle-foreground font-normal">
                ({course.review_count || 0})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
              <span>{formatDuration(course.total_length_seconds)}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors mb-4">
            {course.title}
          </h3>

          {/* Progress Section */}
          {variant === "purchased" && (
            <div className="mt-auto pt-3 border-t border-border/70">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">Tiến độ bài học</span>
                <span
                  className={
                    isCompleted
                      ? "text-success-foreground font-semibold"
                      : "text-primary font-semibold"
                  }
                >
                  {progress}%
                </span>
              </div>
              <Progress
                value={progress}
                variant={isCompleted ? "success" : "primary"}
                size="sm"
                className="bg-primary-light/70"
              />
            </div>
          )}

          {/* Footer Metadata */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-subtle-foreground">
            <span>Ngôn ngữ: {course.language?.toUpperCase() || "VI"}</span>
            <span>
              {course.enrolled_at
                ? `Đăng ký: ${formatDate(course.enrolled_at)}`
                : `Ngày tạo: ${formatDate(course.created_at)}`}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};
