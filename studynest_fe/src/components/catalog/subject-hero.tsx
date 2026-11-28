"use client";

import Link from "next/link";
import { Coins, Layers, RotateCcw } from "pulsoicon-react";
import { CloudShape } from "@/components/learning-hub/home/home-ui";
import type { BrowseSubjectOption } from "@/types/catalog";

export interface SubjectHeroProps {
  currentSubject?: BrowseSubjectOption | null;
  totalCourses?: number | null;
  subjectCount?: number;
  gradeCount?: number;
  onClearSubject?: () => void;
}

export function SubjectHero({
  currentSubject,
  totalCourses,
  subjectCount,
  gradeCount,
  onClearSubject,
}: SubjectHeroProps) {
  const stats: Array<{ label: string; value: string }> = [];

  if (typeof totalCourses === "number") {
    stats.push({
      label: currentSubject ? "Khóa phù hợp" : "Khóa học",
      value: totalCourses.toLocaleString("vi-VN"),
    });
  }
  if (typeof subjectCount === "number" && subjectCount > 0) {
    stats.push({
      label: "Môn học",
      value: subjectCount.toLocaleString("vi-VN"),
    });
  }
  if (typeof gradeCount === "number" && gradeCount > 0) {
    stats.push({
      label: "Khối lớp",
      value: gradeCount.toLocaleString("vi-VN"),
    });
  }

  return (
    <section
      aria-labelledby="catalog-heading"
      className="relative overflow-hidden rounded-[28px] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/85 via-surface to-surface-muted/75 px-6 py-7 shadow-[0_18px_40px_-20px_rgba(53,111,167,0.18)] sm:px-8 sm:py-8"
    >
      {/* Lớp mây mờ nhẹ theo tinh thần Cloudy Blue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-8 h-48 w-64 rounded-full bg-white/75 blur-3xl"
      />
      <CloudShape className="pointer-events-none absolute -top-4 right-10 hidden h-24 w-52 text-white/80 sm:block" />
      <CloudShape className="pointer-events-none absolute -right-8 -bottom-5 hidden h-28 w-60 text-primary-pastel/30 md:block" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary-pastel/80 bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-2xs">
              {currentSubject ? "Chuyên đề môn học" : "Thư viện khóa học Mây Mây"}
            </span>
            {currentSubject && onClearSubject && (
              <button
                type="button"
                onClick={onClearSubject}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface/80 hover:text-primary cursor-pointer"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                <span>Xem tất cả môn</span>
              </button>
            )}
          </div>

          <h1
            id="catalog-heading"
            className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.25rem] sm:leading-[1.18]"
          >
            {currentSubject ? `Khóa học ${currentSubject.name}` : "Khám phá khóa học"}
          </h1>

          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {currentSubject
              ? `Chọn lọc các khóa học môn ${currentSubject.name} theo khối lớp, mục tiêu ôn luyện và giảng viên phù hợp với nhịp học của bạn.`
              : "Tìm khóa học theo môn học, khối lớp hoặc mục tiêu ôn thi — mọi lộ trình được sắp xếp gọn gàng để bạn bắt đầu thật nhẹ nhàng."}
          </p>

          <nav
            aria-label="Lối tắt mua khóa học"
            className="mt-5 flex flex-wrap items-center gap-2.5"
          >
            <Link
              href="/combo"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Layers className="size-3.5 text-primary" aria-hidden="true" />
              <span>Xem combo tiết kiệm</span>
            </Link>
            <Link
              href="/wallets"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Coins className="size-3.5 text-primary" aria-hidden="true" />
              <span>Nạp Coin</span>
            </Link>
          </nav>
        </div>

        {stats.length > 0 && (
          <dl
            aria-label="Tổng quan thư viện khóa học"
            className="grid w-full grid-cols-3 divide-x divide-border/80 rounded-2xl border border-white/90 bg-surface/85 px-2 py-3.5 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.16)] backdrop-blur-md sm:w-auto sm:min-w-[20rem]"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="px-3.5 text-center sm:px-5">
                <dt className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-foreground sm:text-2xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
