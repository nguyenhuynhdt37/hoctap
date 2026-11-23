"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, UserRound } from "pulsoicon-react";
import InstructorDetail from "./detail";
import InstructorCourses from "./courses";
import type { InstructorDetailProfile } from "@/types/user/instructor";

interface InstructorTabsProps {
  instructorId: string;
  initialProfile?: InstructorDetailProfile | null;
  initialUnavailable?: boolean;
}

export default function InstructorTabs({
  instructorId,
  initialProfile,
  initialUnavailable,
}: InstructorTabsProps) {
  const courseCount = initialProfile?.public_course_count ?? initialProfile?.course_count ?? 0;

  return (
    <div className="space-y-8">
      {/* Thanh Breadcrumb & Sticky Section Jump Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/instructors" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Đội ngũ giáo viên
          </Link>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="max-w-xs truncate text-foreground">
            {initialProfile?.name ?? "Hồ sơ giáo viên"}
          </span>
        </nav>

        <nav
          aria-label="Điều hướng nhanh hồ sơ"
          className="flex flex-wrap items-center gap-1.5 rounded-full border border-primary-pastel/70 bg-surface p-1 shadow-2xs"
        >
          <a
            href="#tong-quan-giao-vien"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary-light px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <UserRound className="size-3.5" animated={false} aria-hidden="true" />
            <span>Tổng quan</span>
          </a>
          <a
            href="#ban-do-chuyen-mon"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-primary-light hover:text-primary"
          >
            <GraduationCap className="size-3.5" animated={false} aria-hidden="true" />
            <span>Chuyên môn</span>
          </a>
          <a
            href="#khoa-hoc-giao-vien"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-foreground transition-colors hover:bg-primary-light hover:text-primary"
          >
            <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
            <span>Khóa học{courseCount > 0 ? ` (${courseCount})` : ""}</span>
          </a>
        </nav>
      </div>

      {/* Phần 1: Hồ sơ Portfolio & Bản đồ Chuyên môn */}
      <InstructorDetail
        instructorId={instructorId}
        initialProfile={initialProfile}
        initialUnavailable={initialUnavailable}
      />

      {/* Phần 2: Toàn bộ Khóa học của giáo viên hiển thị trực tiếp */}
      <section
        id="khoa-hoc-giao-vien"
        className="scroll-mt-24 space-y-5 rounded-[2rem] border border-primary-pastel/70 bg-surface/85 p-5 shadow-xs sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-primary uppercase">
              Thư viện bài giảng
            </p>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-foreground sm:text-3xl">
              Khóa học của {initialProfile?.name ?? "giáo viên"}
            </h2>
          </div>
          {courseCount > 0 && (
            <span className="rounded-full border border-primary-pastel bg-primary-light px-3.5 py-1 text-xs font-extrabold text-primary">
              {courseCount} khóa học công khai
            </span>
          )}
        </div>

        <InstructorCourses instructorId={instructorId} />
      </section>
    </div>
  );
}
