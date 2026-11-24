"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  CheckCircle2,
  Clock,
  FolderPlus,
  Gift,
  Pin,
  PinOff,
  Play,
  RotateCcw,
  Star,
} from "pulsoicon-react";
import { Badge, Card, Progress } from "@/components/ui";
import { formatDate, formatDuration } from "@/lib/utils/helpers/date";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { cn } from "@/lib/utils";
import type {
  CoursesMeItem,
  CoursesMeVariant,
  LearningListItem,
} from "@/types/user/courses-me";

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
  layout = "grid",
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
  const isCompleted = progress === 100;
  const isPinned = Boolean(course.is_pinned);
  const levelInfo = LEVEL_CONFIG[course.level] || {
    label: "Mọi cấp độ",
    variant: "default",
  };
  const thumbnailSrc = getImageUrl(course.thumbnail_url || FALLBACK_THUMBNAIL);
  const courseListIds = new Set(course.list_ids ?? []);

  const isListView = layout === "list";

  return (
    <Card
      interactive
      className={cn(
        "group relative flex h-full overflow-visible rounded-[22px] border bg-surface p-0 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-ambient-md",
        isPinned ? "border-primary-pastel ring-1 ring-primary/20" : "border-border",
        isListView ? "flex-col md:flex-row" : "flex-col",
      )}
    >
      {/* Thumbnail Area (Giữ chuẩn 16:9 aspect-video ở cả 2 chế độ) */}
      <Link
        href={`/learning/${course.slug}`}
        aria-label={`Tiếp tục học khóa ${course.title}`}
        className={cn(
          "relative block aspect-video shrink-0 overflow-hidden bg-primary-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isListView
            ? "w-full rounded-t-[22px] md:w-72 md:rounded-l-[22px] md:rounded-tr-none"
            : "w-full rounded-t-[22px]",
        )}
      >
        <img
          src={thumbnailSrc}
          alt={course.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/45 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white drop-shadow-sm">
            <Play className="size-3.5" solid animated={false} aria-hidden="true" />
            {isCompleted
              ? "Xem lại bài giảng"
              : progress > 0
                ? "Tiếp tục bài học"
                : "Bắt đầu học ngay"}
          </span>
        </div>

        {/* Badge góc trái */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge
            variant={levelInfo.variant}
            className="px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs backdrop-blur-md"
          >
            {levelInfo.label}
          </Badge>
          {isPinned && !isArchived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-2xs">
              <Pin className="size-2.5" animated={false} aria-hidden="true" />
              Ghim
            </span>
          )}
        </div>

        {/* Status Badge góc phải */}
        {isArchived ? (
          <div className="absolute top-3 right-3">
            <Badge
              variant="lavender"
              className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] shadow-2xs backdrop-blur-md"
            >
              <Archive className="size-3" animated={false} aria-hidden="true" />
              Đã lưu trữ
            </Badge>
          </div>
        ) : isCompleted ? (
          <div className="absolute top-3 right-3">
            <Badge
              variant="success"
              className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] shadow-2xs backdrop-blur-md"
            >
              <CheckCircle2 className="size-3" animated={false} aria-hidden="true" />
              Hoàn thành
            </Badge>
          </div>
        ) : null}
      </Link>

      {/* Course Info Body */}
      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 font-semibold">
            <Star
              className="size-3.5 text-accent-vanilla-foreground"
              solid
              animated={false}
              aria-hidden="true"
            />
            <span className="text-foreground tabular-nums">{course.rating_avg.toFixed(1)}</span>
            <span className="font-normal text-subtle-foreground">
              ({course.review_count || 0})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {typeof course.total_lessons === "number" && course.total_lessons > 0 && (
              <span className="font-semibold text-primary tabular-nums">
                {course.completed_lessons ?? 0}/{course.total_lessons} bài
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-subtle-foreground" animated={false} aria-hidden="true" />
              <span>{formatDuration(course.total_length_seconds)}</span>
            </span>
          </div>
        </div>

        {/* Title */}
        <Link
          href={`/learning/${course.slug}`}
          className="focus-visible:outline-none focus-visible:underline"
        >
          <h3
            className={cn(
              "line-clamp-2 font-display text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary",
              course.gifted_by_name ? "mb-2" : "mb-3.5",
            )}
          >
            {course.title}
          </h3>
        </Link>

        {/* Chip người tặng bấm sang /members/[id] */}
        {course.gifted_by_name && (
          <div className="mb-3">
            {course.gifted_by_id ? (
              <Link
                href={`/members/${course.gifted_by_id}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-secondary-pastel/80 bg-secondary/40 py-1 pr-3 pl-1 text-xs transition-colors hover:border-primary-pastel hover:bg-primary-light/60"
              >
                {course.gifted_by_avatar ? (
                  <img
                    src={getImageUrl(course.gifted_by_avatar)}
                    alt={course.gifted_by_name}
                    className="size-5 shrink-0 rounded-full object-cover ring-1 ring-surface"
                  />
                ) : (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                    {course.gifted_by_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-muted-foreground">
                  Tặng bởi{" "}
                  <span className="font-bold text-foreground">{course.gifted_by_name}</span>
                </span>
              </Link>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-primary">
                <Gift className="size-3.5 shrink-0" animated={false} aria-hidden="true" />
                <span className="truncate">
                  Tặng bởi{" "}
                  <span className="font-semibold text-foreground">{course.gifted_by_name}</span>
                </span>
              </p>
            )}
          </div>
        )}

        {/* Progress Section */}
        {variant === "purchased" && (
          <div className="mt-auto border-t border-border/70 pt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Tiến độ bài học</span>
              <span
                className={
                  isCompleted ? "text-success-foreground tabular-nums" : "text-primary tabular-nums"
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

        {/* Quick Actions Strip: Ghim · Tủ sách · Tặng · Lưu trữ/Khôi phục */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="text-[11px] text-subtle-foreground">
            {course.archived_at
              ? `Lưu trữ: ${formatDate(course.archived_at)}`
              : course.enrolled_at
                ? `Đăng ký: ${formatDate(course.enrolled_at)}`
                : `Ngày tạo: ${formatDate(course.created_at)}`}
          </span>

          <div className="relative flex flex-wrap items-center gap-1">
            {/* Nút Ghim ưu tiên */}
            {onTogglePin && !isArchived && (
              <button
                type="button"
                disabled={isPinning}
                onClick={() => onTogglePin(course)}
                title={isPinned ? "Bỏ ghim ưu tiên" : "Ghim lên đầu danh sách"}
                aria-label={isPinned ? "Bỏ ghim ưu tiên" : "Ghim lên đầu danh sách"}
                className={cn(
                  "grid size-7 place-items-center rounded-full border transition-colors disabled:opacity-50 cursor-pointer",
                  isPinned
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary",
                )}
              >
                <span className="inline-flex">
                  {isPinned ? (
                    <PinOff className="size-3.5" animated={false} aria-hidden="true" />
                  ) : (
                    <Pin className="size-3.5" animated={false} aria-hidden="true" />
                  )}
                </span>
              </button>
            )}

            {/* Nút Lưu vào Tủ sách */}
            {onToggleCourseInList && learningLists.length > 0 && !isArchived && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setListMenuOpen((o) => !o)}
                  title="Thêm / gỡ khỏi tủ sách cá nhân"
                  aria-label="Thêm vào tủ sách cá nhân"
                  className={cn(
                    "grid size-7 place-items-center rounded-full border transition-colors cursor-pointer",
                    courseListIds.size > 0
                      ? "border-primary-pastel bg-primary-light text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary-pastel hover:text-primary",
                  )}
                >
                  <FolderPlus className="size-3.5" animated={false} aria-hidden="true" />
                </button>

                {listMenuOpen && (
                  <div className="absolute right-0 bottom-full z-30 mb-2 w-52 rounded-2xl border border-primary-pastel bg-surface p-2 shadow-xl">
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
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-primary-light/60 cursor-pointer"
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
                )}
              </div>
            )}

            {/* Nút Tặng */}
            {onOpenGift && !isArchived && (
              <button
                type="button"
                onClick={() => onOpenGift(course)}
                title="Tặng khóa học này cho bạn bè"
                className="inline-flex h-7 items-center gap-1 rounded-full border border-secondary-pastel bg-secondary/45 px-2.5 text-[11px] font-bold text-secondary-foreground transition-colors hover:bg-secondary cursor-pointer"
              >
                <Gift className="size-3" animated={false} aria-hidden="true" />
                <span>Tặng</span>
              </button>
            )}

            {/* Nút Lưu trữ / Khôi phục */}
            {onToggleArchive && (
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => onToggleArchive(course)}
                title={isArchived ? "Khôi phục về danh sách đang học" : "Chuyển vào Kho lưu trữ"}
                className={
                  isArchived
                    ? "inline-flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                    : "inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-accent-border hover:bg-accent/50 hover:text-accent-foreground disabled:opacity-50 cursor-pointer"
                }
              >
                <span className="inline-flex shrink-0">
                  {isArchived ? (
                    <RotateCcw className="size-3" animated={false} aria-hidden="true" />
                  ) : (
                    <Archive className="size-3" animated={false} aria-hidden="true" />
                  )}
                </span>
                <span>{isArchived ? "Khôi phục" : "Lưu trữ"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
