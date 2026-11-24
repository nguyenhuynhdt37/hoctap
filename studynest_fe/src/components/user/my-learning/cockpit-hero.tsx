"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  Flame,
  Pin,
  Play,
} from "pulsoicon-react";
import { EmblemIcon, FramedAvatar, TitleBadge } from "@/components/learning-hub/shop/item-art";
import { Progress, Skeleton } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { cn } from "@/lib/utils";
import type { LearningCockpitResponse } from "@/types/user/courses-me";

interface CockpitHeroProps {
  cockpit?: LearningCockpitResponse;
  isLoading?: boolean;
  stats: {
    total: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  };
}

export function CockpitHero({ cockpit, isLoading, stats }: CockpitHeroProps) {
  if (isLoading && !cockpit) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    );
  }

  const cont = cockpit?.continue_learning ?? null;
  const user = cockpit?.user;
  const level = cockpit?.gamification?.level ?? 1;
  const streak = cockpit?.gamification?.current_streak ?? 0;
  const equipment = cockpit?.gamification?.equipment;
  const weekly = cockpit?.weekly_activity ?? [];
  const maxDayCount = Math.max(1, ...weekly.map((d) => d.completed_lessons));

  return (
    <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
      {/* ── TRÁI: THẺ TIÊU ĐIỂM "TIẾP TỤC HÀNH TRÌNH" ── */}
      <div className="relative overflow-hidden rounded-[28px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-secondary/35 p-5 shadow-xs sm:p-6">
        {cont ? (
          <div className="grid h-full grid-cols-1 gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-center">
            {/* Ảnh 16:9 sắc nét */}
            <Link
              href={`/learning/${cont.slug}`}
              className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-primary-pastel/80 bg-surface shadow-sm"
            >
              <img
                src={getImageUrl(cont.thumbnail_url || "/logo/studynest-logo.svg")}
                alt={cont.title}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="grid size-12 place-items-center rounded-full bg-surface/95 text-primary shadow-lg">
                  <Play className="ml-0.5 size-5" solid animated={false} aria-hidden="true" />
                </span>
              </span>
              {cont.is_pinned && (
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-xs">
                  <Pin className="size-3" animated={false} aria-hidden="true" />
                  Đang ghim
                </span>
              )}
            </Link>

            {/* Nội dung tiêu điểm */}
            <div className="flex min-w-0 flex-col justify-between space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-primary-foreground uppercase">
                    <Play className="size-3" solid animated={false} aria-hidden="true" />
                    Tiếp tục hành trình
                  </span>
                  {cont.gifted_by_name && cont.gifted_by_id && (
                    <Link
                      href={`/members/${cont.gifted_by_id}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-surface/90 py-0.5 pr-2.5 pl-0.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-secondary/50"
                    >
                      {cont.gifted_by_avatar ? (
                        <img
                          src={getImageUrl(cont.gifted_by_avatar)}
                          alt={cont.gifted_by_name}
                          className="size-4 rounded-full object-cover"
                        />
                      ) : (
                        <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                          {cont.gifted_by_name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">Tặng bởi {cont.gifted_by_name}</span>
                    </Link>
                  )}
                </div>

                <h2 className="mt-2.5 line-clamp-2 font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
                  {cont.title}
                </h2>

                {cont.next_lesson_title && (
                  <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                    Bài tiếp theo:{" "}
                    <strong className="text-foreground">{cont.next_lesson_title}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground tabular-nums">
                    Đã xong {cont.completed_lessons}/{cont.total_lessons} bài học
                  </span>
                  <span className="text-primary tabular-nums">{cont.progress_percent}%</span>
                </div>
                <Progress
                  value={cont.progress_percent}
                  variant={cont.progress_percent >= 100 ? "success" : "primary"}
                  size="sm"
                  className="bg-surface"
                />
              </div>

              <div className="pt-1">
                <Link
                  href={`/learning/${cont.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover hover:shadow-md"
                >
                  <span>
                    {cont.progress_percent >= 100
                      ? "Ôn tập lại khóa học"
                      : cont.progress_percent > 0
                        ? "Tiếp tục học ngay"
                        : "Bắt đầu bài đầu tiên"}
                  </span>
                  <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3 py-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-primary-foreground uppercase">
              <Compass className="size-3" animated={false} aria-hidden="true" />
              Sẵn sàng cất cánh
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Chào {user?.fullname || "bạn"}, bắt đầu lộ trình học đầu tiên nhé!
            </h2>
            <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
              Khám phá hàng trăm bài giảng trực quan cùng các gói combo lộ trình trên Mây Mây để khởi động chuỗi streak học tập của riêng bạn.
            </p>
            <Link
              href="/courses"
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <BookOpen className="size-4" animated={false} aria-hidden="true" />
              <span>Khám phá kho khóa học</span>
              <ArrowRight className="size-3.5" animated={false} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>

      {/* ── PHẢI: THẺ BẢN SẮC 3D & BIỂU ĐỒ NHỊP HỌC 7 NGÀY ── */}
      <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-border bg-surface p-5 shadow-xs sm:p-6">
        {/* Bản sắc học viên */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <FramedAvatar
              src={user?.avatar ? getImageUrl(user.avatar) : null}
              name={user?.fullname || "Bạn"}
              equipment={equipment}
              className="size-14 text-sm"
            />
            <EmblemIcon
              item={equipment?.emblem}
              decorative
              className="absolute -right-0.5 -bottom-0.5 size-5 rounded-full ring-2 ring-surface"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-display text-base font-bold text-foreground">
                {user?.fullname || "Học viên Mây Mây"}
              </span>
              <TitleBadge item={equipment?.title} className="max-w-36 [&>span]:truncate" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 font-extrabold text-primary">
                <Award className="size-3" animated={false} aria-hidden="true" />
                Cấp {level}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-vanilla px-2.5 py-0.5 font-extrabold text-accent-vanilla-foreground">
                <Flame className="size-3" solid animated={false} aria-hidden="true" />
                {streak} ngày liên tiếp
              </span>
            </div>
          </div>
        </div>

        {/* Biểu đồ cột Nhịp học 7 ngày */}
        <div className="rounded-2xl border border-primary-pastel/60 bg-background/65 p-3.5">
          <div className="mb-2.5 flex items-center justify-between text-[11px]">
            <span className="font-bold text-foreground">Nhịp học 7 ngày gần nhất</span>
            <span className="font-extrabold text-primary tabular-nums">
              {cockpit?.weekly_total_completed ?? 0} bài đã xong
            </span>
          </div>
          <div className="grid h-16 grid-cols-7 items-end gap-2">
            {weekly.map((day) => {
              const heightPct =
                day.completed_lessons > 0
                  ? Math.max(22, Math.round((day.completed_lessons / maxDayCount) * 100))
                  : 12;
              return (
                <div
                  key={day.date}
                  title={`${day.label} (${day.date}): ${day.completed_lessons} bài hoàn thành`}
                  className="flex h-full flex-col items-center justify-end gap-1"
                >
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-[26px] rounded-t-lg transition-all duration-300",
                        day.completed_lessons > 0
                          ? day.is_today
                            ? "bg-primary shadow-2xs"
                            : "bg-primary/65"
                          : day.is_today
                            ? "border border-dashed border-primary/50 bg-primary-light/60"
                            : "bg-primary-pastel/60",
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      day.is_today ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 chỉ số tổng quan gọn */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/80 bg-background/60 px-2 py-2">
            <div className="text-base font-black text-foreground tabular-nums">{stats.total}</div>
            <div className="text-[10px] font-semibold text-muted-foreground">Đang học</div>
          </div>
          <div className="rounded-xl border border-success-border/70 bg-success-bg/35 px-2 py-2">
            <div className="text-base font-black text-success-foreground tabular-nums">
              {stats.completed}
            </div>
            <div className="text-[10px] font-semibold text-success-foreground">Hoàn thành</div>
          </div>
          <div className="rounded-xl border border-primary-pastel/70 bg-primary-light/45 px-2 py-2">
            <div className="text-base font-black text-primary tabular-nums">
              {stats.avgProgress}%
            </div>
            <div className="text-[10px] font-semibold text-primary">Tiến độ TB</div>
          </div>
        </div>
      </div>
    </section>
  );
}
