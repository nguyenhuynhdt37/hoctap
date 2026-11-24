"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
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

export function TopCoursesCard({ courses, isLoading }: TopCoursesCardProps) {
  const [sortTab, setSortTab] = useState<SortTab>("revenue");

  const { ranked, maxRevenue } = useMemo(() => {
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
    return { ranked: top, maxRevenue: maxRev };
  }, [courses, sortTab]);

  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
    >
      {/* Header + Tabs sắp xếp */}
      <div className="flex flex-col gap-3 border-b border-border bg-secondary-light/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Khóa học nổi bật
          </h2>
          <p className="text-xs text-muted-foreground">
            Xếp hạng hiệu suất và tỷ trọng đóng góp doanh thu
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
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  sortTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light/50"
          >
            <span>Tất cả</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <Skeleton
                key={idx}
                variant="rect"
                className="h-20 w-full rounded-2xl"
              />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Chưa có dữ liệu khóa học
            </p>
            <p className="mx-auto mb-4 mt-1 max-w-sm text-xs text-muted-foreground">
              Hãy tạo và xuất bản khóa học đầu tiên để bắt đầu tiếp cận học viên
              và theo dõi xếp hạng tại đây.
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
          <div className="space-y-3">
            {ranked.map((course, idx) => {
              const revRatio = Math.min(
                100,
                Math.max(4, Math.round(((course.revenue || 0) / maxRevenue) * 100)),
              );
              return (
                <Link
                  key={course.course_id}
                  href={`/lecturer/courses/${course.course_id}/stats`}
                  className="group block rounded-2xl border border-border/80 bg-background/50 p-3.5 transition-all hover:border-primary-pastel hover:bg-surface hover:shadow-2xs"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Thứ hạng */}
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                          idx === 0
                            ? "border border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                            : "border border-border bg-surface text-muted-foreground"
                        }`}
                      >
                        #{idx + 1}
                      </span>

                      <img
                        src={getImageUrl(
                          course.thumbnail || "/logo/studynest-logo.svg",
                        )}
                        alt={course.title}
                        className="h-12 w-18 shrink-0 rounded-xl border border-border object-cover bg-primary-light/50"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {course.title}
                          </h3>
                          <Badge
                            variant={
                              course.status === "published"
                                ? "success"
                                : "default"
                            }
                            size="sm"
                          >
                            {course.status === "published"
                              ? "Đang bán"
                              : "Bản nháp"}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users
                              animated={false}
                              className="h-3.5 w-3.5 text-primary"
                              aria-hidden="true"
                            />
                            <strong className="text-foreground tabular-nums">
                              {course.total_students}
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
                              {(course.average_rating ?? 0).toFixed(1)}
                            </strong>{" "}
                            ({course.reviews_count ?? 0})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pl-10 sm:block sm:pl-0 sm:text-right shrink-0">
                      <p className="inline-flex items-center gap-1 font-display text-base font-bold text-primary tabular-nums">
                        <Coins
                          animated={false}
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        {formatVndAsCoin(course.revenue)}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Tháng này: {formatVndAsCoin(course.this_month_revenue)}
                      </p>
                    </div>
                  </div>

                  {/* Thanh tỷ trọng doanh thu tương đối */}
                  <div className="mt-3 pl-10">
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
      </div>
    </Card>
  );
}
