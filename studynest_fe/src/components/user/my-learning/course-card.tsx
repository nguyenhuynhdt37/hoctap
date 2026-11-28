"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  FolderPlus,
  Gift,
  Pin,
  PinOff,
  RotateCcw,
} from "pulsoicon-react";
import { CourseTicketCard } from "@/components/user/shared/course-ticket-card";
import { formatDate, formatDuration } from "@/lib/utils/helpers/date";
import { cn } from "@/lib/utils";
import type {
  CoursesMeItem,
  CoursesMeVariant,
  LearningListItem,
} from "@/types/user/courses-me";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

type CourseCardProps = {
  course: CoursesMeItem;
  variant: CoursesMeVariant;
  layout?: "grid" | "list";
  isArchived?: boolean;
  isArchiving?: boolean;
  isPinning?: boolean;
  learningLists?: LearningListItem[];
  onTogglePin?: (course: CoursesMeItem) => void;
  onToggleArchive?: (course: CoursesMeItem) => void;
  onOpenGift?: (course: CoursesMeItem) => void;
  onToggleCourseInList?: (listId: string, courseId: string) => void;
};

export const CourseCard = ({
  course,
  variant,
  isArchived = false,
  isArchiving = false,
  isPinning = false,
  learningLists = [],
  onTogglePin,
  onToggleArchive,
  onOpenGift,
  onToggleCourseInList,
}: CourseCardProps) => {
  const [listMenuOpen, setListMenuOpen] = useState(false);

  const progress = Math.min(100, Math.max(0, Math.round(course.progress_percent || 0)));
  const isCompleted = progress >= 100;
  const isPinned = Boolean(course.is_pinned);
  const levelLabel = LEVEL_LABELS[course.level] || "Mọi cấp độ";
  const courseListIds = new Set(course.list_ids ?? []);

  const badge = isArchived
    ? { label: "Đã lưu trữ", tone: "lavender" as const }
    : isCompleted
      ? { label: "Đã hoàn thành", tone: "success" as const }
      : isPinned
        ? { label: `Đã ghim · ${levelLabel}`, tone: "primary" as const }
        : { label: levelLabel, tone: "lavender" as const };

  const metaParts: Array<string | null | undefined | false> = [
    typeof course.total_lessons === "number" && course.total_lessons > 0
      ? `${course.completed_lessons ?? 0}/${course.total_lessons} bài`
      : null,
    course.total_length_seconds ? formatDuration(course.total_length_seconds) : null,
    course.rating_avg > 0 ? `${course.rating_avg.toFixed(1)}★` : null,
  ];

  const hasActions = Boolean(
    (onTogglePin && !isArchived) ||
      (onToggleCourseInList && learningLists.length > 0 && !isArchived) ||
      (onOpenGift && !isArchived) ||
      onToggleArchive,
  );

  const footerSlot = (
    <div className="space-y-2">
      {course.gifted_by_name && (
        <p className="truncate text-[11px] font-medium text-muted-foreground">
          Tặng bởi{" "}
          {course.gifted_by_id ? (
            <Link
              href={`/members/${course.gifted_by_id}`}
              className="font-bold text-primary hover:underline"
            >
              {course.gifted_by_name}
            </Link>
          ) : (
            <span className="font-bold text-foreground">{course.gifted_by_name}</span>
          )}
        </p>
      )}
      {hasActions && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 pt-2">
          <span className="text-[11px] text-subtle-foreground">
            {course.archived_at
              ? formatDate(course.archived_at)
              : course.enrolled_at
                ? formatDate(course.enrolled_at)
                : formatDate(course.created_at)}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {onTogglePin && !isArchived && (
              <button
                type="button"
                disabled={isPinning}
                onClick={() => onTogglePin(course)}
                title={isPinned ? "Bỏ ghim ưu tiên" : "Ghim lên đầu danh sách"}
                aria-label={isPinned ? "Bỏ ghim ưu tiên" : "Ghim lên đầu danh sách"}
                className={cn(
                  "grid size-7 cursor-pointer place-items-center rounded-full border transition-colors disabled:opacity-50",
                  isPinned
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
                )}
              >
                {isPinned ? (
                  <PinOff className="size-3.5" animated={false} aria-hidden="true" />
                ) : (
                  <Pin className="size-3.5" animated={false} aria-hidden="true" />
                )}
              </button>
            )}

            {onToggleCourseInList && learningLists.length > 0 && !isArchived && (
              <button
                type="button"
                onClick={() => setListMenuOpen((o) => !o)}
                title="Thêm / gỡ khỏi tủ sách cá nhân"
                aria-label="Thêm vào tủ sách cá nhân"
                className={cn(
                  "grid size-7 cursor-pointer place-items-center rounded-full border transition-colors",
                  courseListIds.size > 0
                    ? "border-primary-pastel bg-primary-light text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary",
                )}
              >
                <FolderPlus className="size-3.5" animated={false} aria-hidden="true" />
              </button>
            )}

            {onOpenGift && !isArchived && (
              <button
                type="button"
                onClick={() => onOpenGift(course)}
                title="Tặng khóa học này cho bạn bè"
                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-secondary-pastel bg-secondary/45 px-2 text-[11px] font-bold text-secondary-foreground transition-colors hover:bg-secondary"
              >
                <Gift className="size-3" animated={false} aria-hidden="true" />
                <span>Tặng</span>
              </button>
            )}

            {onToggleArchive && (
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => onToggleArchive(course)}
                title={isArchived ? "Khôi phục về danh sách đang học" : "Chuyển vào Kho lưu trữ"}
                className={
                  isArchived
                    ? "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-primary px-2 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                    : "inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] font-bold text-muted-foreground transition-colors hover:border-accent-border hover:bg-accent/50 hover:text-accent-foreground disabled:opacity-50"
                }
              >
                {isArchived ? (
                  <RotateCcw className="size-3" animated={false} aria-hidden="true" />
                ) : (
                  <Archive className="size-3" animated={false} aria-hidden="true" />
                )}
                <span>{isArchived ? "Khôi phục" : "Lưu trữ"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const outsideSlot =
    listMenuOpen && onToggleCourseInList && learningLists.length > 0 && !isArchived ? (
      <div className="absolute right-4 bottom-12 z-30 w-52 rounded-2xl border border-primary-pastel bg-surface p-2 shadow-xl">
        <div className="mb-1.5 px-2 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
          Lưu vào tủ sách
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {learningLists.map((lst) => {
            const checked = courseListIds.has(lst.id);
            return (
              <button
                key={lst.id}
                type="button"
                onClick={() => {
                  onToggleCourseInList(lst.id, course.id);
                  setListMenuOpen(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-primary-light/60"
              >
                <span className="truncate">{lst.name}</span>
                {checked && (
                  <Check className="size-3.5 shrink-0 text-primary" animated={false} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <CourseTicketCard
      href={`/learning/${course.slug}`}
      title={course.title}
      thumbnail={course.thumbnail_url}
      alt={`Ảnh bìa khóa học ${course.title}`}
      badge={badge}
      metaParts={metaParts}
      progress={
        variant === "purchased"
          ? {
              percent: progress,
              label: isCompleted ? "Đã hoàn thành" : progress > 0 ? "Tiến độ bài học" : "Chưa bắt đầu",
            }
          : null
      }
      footerSlot={footerSlot}
      outsideSlot={outsideSlot}
      highlighted={isPinned && !isArchived}
      srLabel="— tiếp tục học"
    />
  );
};
