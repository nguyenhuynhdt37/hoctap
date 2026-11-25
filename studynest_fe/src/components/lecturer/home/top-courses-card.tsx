"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Coins,
  Plus,
  Star,
  Users,
} from "pulsoicon-react";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { CoursePerformanceItem } from "@/types/lecturer/statistics";

type SortTab = "revenue" | "students" | "rating";

interface TopCoursesCardProps {
  courses?: CoursePerformanceItem[];
  isLoading: boolean;
}

const tabBadgeLabel: Record<SortTab, string> = {
  revenue: "Quán quân doanh thu",
  students: "Thu hút nhiều học viên nhất",
  rating: "Đánh giá cao nhất",
};

export function TopCoursesCard({ courses, isLoading }: TopCoursesCardProps) {
  const [sortTab, setSortTab] = useState<SortTab>("revenue");

  const { spotlight, others, maxRevenue } = useMemo(() => {
    const list = Array.isArray(courses) ? [...courses] : [];
    list.sort((a, b) => {
      if (sortTab === "students") {
        return (b.total_students || 0) - (a.total_students || 0);
      }
      if (sortTab === "rating") {
        return (b.average_rating || 0) - (a.average_rating || 0);
      }
      return (b.revenue || 0) - (a.revenue || 0);
    });
    const top = list.slice(0, 5);
    const maxRev = Math.max(1, ...top.map((c) => c.revenue || 0));
    return {
      spotlight: top[0] ?? null,
      others: top.slice(1),
      maxRevenue: maxRev,
    };
  }, [courses, sortTab]);

  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[28px] border border-border shadow-xs"
    >
      {/* Header + Tabs sắp xếp */}
      <div className="flex flex-col gap-3 border-b border-border bg-gradient-to-r from-secondary-light/45 via-surface to-primary-light/35 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Bảng vàng khóa học nổi bật
          </h2>
          <p className="text-xs text-muted-foreground">
            Tôn vinh khóa học dẫn đầu và theo dõi tỷ trọng đóng góp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center rounded-full border border-border bg-surface p-1"
            role="group"
            aria-label="Sắp xếp khóa học"
          >
            {[
              { key: "revenue" as const, label: "Doanh thu" },
              { key: "students" as const, label: "Học viên" },
              { key: "rating" as const, label: "Đánh giá" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSortTab(tab.key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  sortTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light/60"
          >
            <span>Tất cả</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton variant="rect" className="h-36 w-full rounded-2xl" />
            <Skeleton variant="rect" className="h-20 w-full rounded-2xl" />
            <Skeleton variant="rect" className="h-20 w-full rounded-2xl" />
          </div>
        ) : !spotlight ? (
          <div className="rounded-2xl border border-dashed border-primary-pastel bg-primary-light/20 px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Chưa có dữ liệu khóa học
            </p>
            <p className="mx-auto mb-4 mt-1 max-w-sm text-xs text-muted-foreground">
              Tạo và xuất bản khóa học đầu tiên để thấy bảng vàng xếp hạng tỏa
              sáng tại đây.
            </p>
            <Link href="/lecturer/courses/create">
              <Button
                variant="primary"
                size="sm"
                className="rounded-full"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Tạo khóa học ngay
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Spotlight #1 Banner nổi bật */}
            <Link
              href={`/lecturer/courses/${spotlight.course_id}/stats`}
              className="group relative block overflow-hidden rounded-[22px] border border-primary-pastel bg-gradient-to-br from-primary-light/80 via-surface to-accent-vanilla/70 p-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl border border-surface bg-primary-light sm:h-24 sm:w-40">
                  <img
                    src={getImageUrl(
                      spotlight.thumbnail || "/logo/studynest-logo.svg",
                    )}
                    alt={spotlight.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/95 px-2.5 py-0.5 text-[11px] font-bold text-accent-vanilla-foreground shadow-2xs">
                    <Award animated={false} className="h-3 w-3" />
                    #1
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {tabBadgeLabel[sortTab]}
                    </span>
                    <Badge
                      variant={
                        spotlight.status === "published" ||
                        spotlight.status === "approved"
                          ? "success"
                          : spotlight.status === "pending"
                            ? "warning"
                            : "default"
                      }
                      size="sm"
                    >
                      {spotlight.status === "published"
                        ? "Đang bán"
                        : spotlight.status === "approved"
                          ? "Đã duyệt"
                          : spotlight.status === "pending"
                            ? "Chờ duyệt"
                            : "Bản nháp"}
                    </Badge>
                  </div>

                  <h3 className="font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-1">
                    {spotlight.title}
                  </h3>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users
                          animated={false}
                          className="h-3.5 w-3.5 text-primary"
                          aria-hidden="true"
                        />
                        <strong className="text-foreground tabular-nums">
                          {spotlight.total_students}
                        </strong>{" "}
                        học viên
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star
                          animated={false}
                          className="h-3.5 w-3.5 fill-current text-accent-vanilla-foreground"
                          aria-hidden="true"
                        />
                        <strong className="text-foreground tabular-nums">
                          {(spotlight.average_rating ?? 0).toFixed(1)}
                        </strong>{" "}
                        ({spotlight.reviews_count ?? 0})
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border/80 bg-accent-vanilla/70 px-3 py-1 font-display text-base font-bold text-warning-foreground tabular-nums shadow-2xs">
                      <Coins
                        animated={false}
                        className="h-4 w-4 text-[#C98A2C]"
                        aria-hidden="true"
                      />
                      {formatVndAsCoin(spotlight.revenue)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Các khóa #2..#5 */}
            {others.length > 0 && (
              <div className="space-y-2.5">
                {others.map((course, idx) => {
                  const rank = idx + 2;
                  const revRatio = Math.min(
                    100,
                    Math.max(
                      6,
                      Math.round(((course.revenue || 0) / maxRevenue) * 100),
                    ),
                  );
                  return (
                    <Link
                      key={course.course_id}
                      href={`/lecturer/courses/${course.course_id}/stats`}
                      className="group block rounded-2xl border border-border/80 bg-background/55 p-3.5 transition-all hover:border-primary-pastel hover:bg-surface hover:shadow-2xs"
                    >
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-pastel/70 bg-primary-light/60 text-xs font-bold tabular-nums text-primary">
                            #{rank}
                          </span>
                          <img
                            src={getImageUrl(
                              course.thumbnail || "/logo/studynest-logo.svg",
                            )}
                            alt={course.title}
                            className="h-11 w-16 shrink-0 rounded-xl border border-border object-cover bg-primary-light/50"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                              {course.title}
                            </h3>
                            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Users
                                  animated={false}
                                  className="h-3 w-3 text-primary"
                                  aria-hidden="true"
                                />
                                {course.total_students} HV
                              </span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Star
                                  animated={false}
                                  className="h-3 w-3 fill-current text-accent-vanilla-foreground"
                                  aria-hidden="true"
                                />
                                {(course.average_rating ?? 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pl-10 text-left sm:pl-0 sm:text-right shrink-0">
                          <p className="inline-flex items-center gap-1 font-display text-sm font-bold text-warning-foreground tabular-nums">
                            <Coins
                              animated={false}
                              className="h-3.5 w-3.5 text-[#C98A2C]"
                              aria-hidden="true"
                            />
                            {formatVndAsCoin(course.revenue)}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            Tháng này: {formatVndAsCoin(course.this_month_revenue)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 pl-10">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light/70">
                          <div
                            className="h-full rounded-full bg-primary/80 transition-all duration-300 group-hover:bg-primary"
                            style={{ width: `${revRatio}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
