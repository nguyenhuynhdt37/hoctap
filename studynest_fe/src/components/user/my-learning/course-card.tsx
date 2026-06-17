"use client";

import { formatDate, formatDuration } from "@/lib/utils/helpers/date";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import type { CoursesMeItem, CoursesMeVariant } from "@/types/user/courses-me";
import Link from "next/link";
import { HiOutlineStar } from "react-icons/hi";

const FALLBACK_THUMBNAIL = "https://placehold.co/600x400/0fbba7/FFFFFF?text=Study+Course";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

type CourseCardProps = {
  course: CoursesMeItem;
  variant: CoursesMeVariant;
};

export const CourseCard = ({ course, variant }: CourseCardProps) => {
  const progress = Math.round(course.progress_percent || 0);
  const levelLabel = LEVEL_LABELS[course.level] || "Không xác định";
  const thumbnailSrc = getGoogleDriveImageUrl(course.thumbnail_url || FALLBACK_THUMBNAIL);

  return (
    <Link
      href={`/learning/${course.slug}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={thumbnailSrc}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-600 shadow-sm">
            {levelLabel}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <header className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-gray-900">
              {course.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <HiOutlineStar className="h-4 w-4 text-amber-400" />
                {course.rating_avg.toFixed(1)}
                <span className="text-xs text-gray-400">({course.review_count})</span>
              </span>
              <span aria-hidden="true">•</span>
              <span>{formatDuration(course.total_length_seconds)}</span>
            </div>
          </header>

          {variant === "purchased" && (
            <div className="flex items-center justify-between rounded-xl bg-green-50 p-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase text-green-600">Tiến độ</p>
                <p className="text-sm font-semibold text-gray-700">{progress}%</p>
              </div>
              <div className="relative ml-3 h-2 flex-1 rounded-full bg-green-100">
                <span
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <footer className="mt-auto flex items-center justify-between text-xs text-gray-500">
            <span>Ngôn ngữ: {course.language?.toUpperCase() || "N/A"}</span>
            <span>
              {variant === "purchased" ? "Đăng ký" : "Đã lưu"}: {formatDate(course.created_at)}
            </span>
          </footer>
        </div>
      </article>
    </Link>
  );
};
