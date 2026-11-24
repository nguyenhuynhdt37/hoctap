"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  Eye,
  Globe,
  GraduationCap,
  Star,
  Target,
  Users,
} from "pulsoicon-react";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { InstructorResponse } from "@/types/user/instructor";
import { LearningCourseData } from "@/types/user/learning";
import { QAImageLightbox, QAMarkdownContent, type LightboxImage } from "../qa/qa-media-content";

interface OverviewTabProps {
  title: string;
  course?: LearningCourseData | null;
  instructor?: InstructorResponse;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
  all: "Mọi trình độ",
};

const LANGUAGE_LABELS: Record<string, string> = {
  vi: "Tiếng Việt",
  vietnamese: "Tiếng Việt",
  en: "Tiếng Anh",
  english: "Tiếng Anh",
};

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "GV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function OverviewTab({
  title,
  course,
  instructor,
}: OverviewTabProps) {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  const levelText = course?.level
    ? LEVEL_LABELS[course.level.toLowerCase()] ?? course.level
    : "Cơ bản";
  const languageText = course?.language
    ? LANGUAGE_LABELS[course.language.toLowerCase()] ?? course.language
    : "Tiếng Việt";
  const updatedText = course?.updated_at
    ? new Date(course.updated_at).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Mới cập nhật";

  const instructorAvatar = instructor?.avatar ? getImageUrl(instructor.avatar) : null;

  return (
    <div className="space-y-7">
      {/* ── HERO DOSSIER & BENTO STATS ── */}
      <section className="rounded-[24px] border border-primary-pastel/70 bg-gradient-to-br from-primary-light/70 via-surface to-secondary/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold tracking-wide text-primary-foreground uppercase">
            <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
            Hồ sơ khóa học
          </span>
          {course?.level && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {levelText}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {title}
        </h1>

        {/* Bento 5 ô chỉ số */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-primary-pastel/70 bg-surface/90 p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Award className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              Trình độ
            </div>
            <div className="mt-1.5 text-base font-extrabold text-foreground">
              {levelText}
            </div>
          </div>

          <div className="rounded-2xl border border-primary-pastel/70 bg-surface/90 p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Globe className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              Ngôn ngữ
            </div>
            <div className="mt-1.5 text-base font-extrabold text-foreground">
              {languageText}
            </div>
          </div>

          <div className="rounded-2xl border border-primary-pastel bg-primary-light/75 p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Eye className="size-3.5" animated={false} aria-hidden="true" />
              Lượt học
            </div>
            <div className="mt-1 text-xl font-black text-primary tabular-nums sm:text-2xl">
              {(course?.views ?? 0).toLocaleString("vi-VN")}
            </div>
          </div>

          <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/55 p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-vanilla-foreground">
              <Star className="size-3.5" solid animated={false} aria-hidden="true" />
              Đánh giá
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-accent-vanilla-foreground tabular-nums sm:text-2xl">
                {(course?.rating_avg ?? 0).toFixed(1)}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                ({(course?.rating_count ?? 0).toLocaleString("vi-VN")})
              </span>
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-primary-pastel/70 bg-surface/90 p-3.5 shadow-2xs sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Calendar className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              Cập nhật
            </div>
            <div className="mt-1.5 text-sm font-extrabold text-foreground">
              {updatedText}
            </div>
          </div>
        </div>
      </section>

      {/* ── BỐ CỤC 2 CỘT: NỘI DUNG KHÓA HỌC & MENTOR SPOTLIGHT ── */}
      <div
        className={
          instructor
            ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start"
            : "space-y-6"
        }
      >
        {/* Cột chính */}
        <div className="min-w-0 space-y-6">
          {/* Mô tả khóa học */}
          <div className="rounded-[24px] border border-border/80 bg-background/55 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-primary">
                <Compass className="size-4" animated={false} aria-hidden="true" />
              </span>
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                Mô tả khóa học
              </h2>
            </div>
            {course?.description ? (
              <QAMarkdownContent
                content={course.description}
                onOpenImage={setLightboxImage}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Mô tả chi tiết của khóa học đang được giảng viên cập nhật.
              </p>
            )}
          </div>

          {/* Bạn sẽ học được */}
          {course?.outcomes && course.outcomes.length > 0 && (
            <div className="rounded-[24px] border border-primary-pastel/70 bg-primary-light/30 p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-surface text-primary shadow-2xs">
                  <Target className="size-4" animated={false} aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Bạn sẽ đạt được gì sau khóa học?
                </h3>
              </div>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {course.outcomes.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-2xl border border-primary-pastel/60 bg-surface p-3 text-sm text-foreground shadow-2xs"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      animated={false}
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Yêu cầu & Đối tượng phù hợp */}
          {((course?.requirements && course.requirements.length > 0) ||
            (course?.target_audience && course.target_audience.length > 0)) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {course?.requirements && course.requirements.length > 0 && (
                <div className="rounded-[24px] border border-border/80 bg-surface p-5">
                  <h3 className="font-display text-base font-bold text-foreground">
                    Yêu cầu đầu vào
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                    {course.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {course?.target_audience && course.target_audience.length > 0 && (
                <div className="rounded-[24px] border border-secondary-pastel/80 bg-secondary/25 p-5">
                  <h3 className="font-display text-base font-bold text-foreground">
                    Khóa học phù hợp với
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {course.target_audience.map((aud, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full border border-secondary-pastel bg-surface px-3 py-1 text-xs font-semibold text-foreground shadow-2xs"
                      >
                        {aud}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cột phụ: Thẻ Giảng viên (Mentor Spotlight) */}
        {instructor && (
          <aside className="space-y-4 xl:sticky xl:top-20">
            <div className="overflow-hidden rounded-[26px] border border-primary-pastel bg-gradient-to-b from-primary-light/65 via-surface to-surface p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary-pastel/70">
                  <GraduationCap className="size-3.5" animated={false} aria-hidden="true" />
                  Giảng viên đồng hành
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3.5">
                {instructorAvatar ? (
                  <img
                    src={instructorAvatar}
                    alt={instructor.fullname}
                    className="size-16 shrink-0 rounded-2xl border-2 border-surface object-cover shadow-sm"
                  />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-surface bg-primary-pastel text-lg font-black text-primary shadow-sm">
                    {getInitials(instructor.fullname)}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-bold text-foreground">
                    {instructor.fullname}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {(instructor.course_count ?? 0).toLocaleString("vi-VN")} khóa học ·{" "}
                    {(instructor.student_count ?? 0).toLocaleString("vi-VN")} học viên
                  </p>
                </div>
              </div>

              {/* 3 chỉ số nhanh của giảng viên */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border/80 bg-background/80 p-2.5">
                  <div className="flex items-center justify-center gap-1 text-sm font-black text-foreground tabular-nums">
                    <Star className="size-3.5 text-accent-vanilla-foreground" solid animated={false} aria-hidden="true" />
                    {Number(instructor.rating_avg ?? 0).toFixed(1)}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    Điểm TB
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-2.5">
                  <div className="text-sm font-black text-foreground tabular-nums">
                    {(instructor.evaluated_count ?? 0).toLocaleString("vi-VN")}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    Đánh giá
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-2.5">
                  <div className="flex items-center justify-center gap-1 text-sm font-black text-foreground tabular-nums">
                    <Users className="size-3 text-primary" animated={false} aria-hidden="true" />
                    {(instructor.student_count ?? 0).toLocaleString("vi-VN")}
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    Học viên
                  </div>
                </div>
              </div>

              {/* CTA tới trang Hồ sơ Mentor Studio */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/instructors/${instructor.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Xem hồ sơ giảng viên
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
                {instructor.facebook_url && (
                  <a
                    href={instructor.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-primary-pastel bg-surface px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary-light"
                  >
                    Facebook
                  </a>
                )}
              </div>

              {/* Tiểu sử giảng viên */}
              {instructor.instructor_description && (
                <div className="mt-4 border-t border-border/70 pt-4">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Về giảng viên
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-1 text-xs leading-relaxed text-foreground/90">
                    <QAMarkdownContent
                      content={instructor.instructor_description}
                      onOpenImage={setLightboxImage}
                      className="[&_.markdown-content]:text-xs!"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <QAImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
