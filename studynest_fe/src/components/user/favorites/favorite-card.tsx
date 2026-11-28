"use client";

import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import { formatDate } from "@/lib/utils/helpers/date";
import type { FavouriteCourseItem } from "@/types/user/favourites";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

type FavoriteCardProps = {
  course: FavouriteCourseItem;
};

export const FavoriteCard = ({ course }: FavoriteCardProps) => {
  const levelLabel = LEVEL_LABELS[course.level] || "Mọi cấp độ";
  const badgeLabel = course.category_name || levelLabel;

  const metaParts: Array<string | null | undefined | false> = [
    course.review_count > 0
      ? `${course.avg_rating.toFixed(1)}★ (${course.review_count})`
      : null,
    levelLabel !== badgeLabel ? levelLabel : null,
    course.favourited_at ? `Đã lưu ${formatDate(course.favourited_at)}` : null,
  ];

  return (
    <CourseTicketCard
      href={`/course/${course.slug}`}
      title={course.title}
      thumbnail={course.thumbnail_url}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={{ label: badgeLabel, tone: "lavender" }}
      metaParts={metaParts}
      footerSlot={
        <span className="inline-flex items-center rounded-full bg-secondary-light px-2.5 py-1 text-xs font-bold text-secondary-foreground">
          Đã yêu thích
        </span>
      }
      srLabel="— xem khóa học"
    />
  );
};
