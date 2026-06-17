"use client";

import { formatDate } from "@/lib/utils/helpers/date";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import type { FavouriteCourseItem } from "@/types/user/favourites";
import Link from "next/link";
import { HiOutlineHeart, HiOutlineStar } from "react-icons/hi";

const FALLBACK_THUMBNAIL = "https://placehold.co/600x400/0fbba7/FFFFFF?text=Study+Course";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

type FavoriteCardProps = {
  course: FavouriteCourseItem;
};

export const FavoriteCard = ({ course }: FavoriteCardProps) => {
  const levelLabel = LEVEL_LABELS[course.level] || "Không xác định";
  const thumbnailSrc = getGoogleDriveImageUrl(course.thumbnail_url || FALLBACK_THUMBNAIL);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-all duration-200 group">
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={thumbnailSrc}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-600 shadow-sm">
            {levelLabel}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <header className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-bold leading-tight text-gray-900">
              {course.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <HiOutlineStar className="h-4 w-4 text-amber-400" />
                {course.avg_rating.toFixed(1)}
                <span className="text-xs text-gray-400">({course.review_count})</span>
              </span>
              {course.category_name && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold uppercase text-green-600">
                    {course.category_name}
                  </span>
                </>
              )}
            </div>
          </header>

          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
            <span className="inline-flex items-center gap-2">
              <HiOutlineHeart className="h-4 w-4" />
              Đã yêu thích vào {formatDate(course.favourited_at)}
            </span>
          </div>

          <footer className="mt-auto flex items-center justify-between text-xs text-gray-500">
            <span>Ngôn ngữ: {course.language?.toUpperCase() || "N/A"}</span>
            <span>Ngày tạo: {formatDate(course.created_at)}</span>
          </footer>
        </div>
      </article>
    </Link>
  );
};


