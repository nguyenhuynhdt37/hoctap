"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  Crown,
  Eye,
  GraduationCap,
  Heart,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Target,
  Users,
  X,
} from "pulsoicon-react";
import { Badge, Button, Card, CoinPrice, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useSavedInstructors } from "@/hooks/user/use-saved-instructors";
import type {
  BrowseGradeOption,
  InstructorCourseItem,
  InstructorDirectoryEnvelope,
  InstructorFilterOptions,
  InstructorItem,
} from "@/types/user/instructor";
import { formatSinceMonth, InstructorCard, summarizeGrades } from "./instructor-card";
import {
  InstructorFilterSidebar,
  type InstructorFilterValues,
} from "./instructor-filter-sidebar";
import { SubjectPills } from "@/components/catalog/subject-pills";

const SORTS = [
  { value: "rating", label: "Đánh giá khóa học cao nhất" },
  { value: "relevant", label: "Phù hợp nhất" },
  { value: "popular", label: "Nhiều học viên nhất" },
  { value: "courses", label: "Nhiều khóa học nhất" },
  { value: "newest", label: "Mới tham gia" },
  { value: "name", label: "Tên A-Z" },
] as const;

const WHITELIST_PARAMS = [
  "q",
  "level",
  "grade",
  "subject",
  "goal",
  "exam",
  "min_rating",
  "has_courses",
  "sort",
] as const;

const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

function MentorQuickViewModal({
  instructor,
  onClose,
}: {
  instructor: InstructorItem;
  onClose: () => void;
}) {
  const { data: coursesPage, isLoading } = useSWR<{ items: InstructorCourseItem[] }>(
    `/users/instructors/${instructor.id}/courses?limit=6`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const gradeGroups = summarizeGrades(instructor.grades);
  const sinceLabel = formatSinceMonth(instructor.first_public_course_at);
  const courses = coursesPage?.items ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem nhanh hồ sơ ${instructor.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-primary-pastel bg-surface p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-full border-2 border-primary-pastel bg-primary-light">
              {instructor.avatar ? (
                <img
                  src={getImageUrl(instructor.avatar)}
                  alt={instructor.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-base font-extrabold text-primary">
                  {instructor.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold text-foreground">{instructor.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{instructor.public_course_count ?? instructor.course_count} khóa học</span>
                <span>· {instructor.student_count} học viên</span>
                {sinceLabel && <span>· {sinceLabel}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem nhanh"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Thông tin chuyên môn đầy đủ */}
        <div className="mb-6 space-y-3 rounded-2xl border border-primary-pastel/60 bg-primary-light/30 p-4">
          {instructor.short_bio && (
            <p className="text-sm leading-relaxed text-foreground">{instructor.short_bio}</p>
          )}
          {gradeGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-primary">Khối lớp:</span>
              {gradeGroups.map((g) => (
                <span key={g} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground border border-primary-pastel/70">
                  {g}
                </span>
              ))}
            </div>
          )}
          {instructor.subjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-primary">Môn giảng dạy:</span>
              {instructor.subjects.map((sub) => (
                <span key={sub.id} className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-foreground border border-border">
                  {sub.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Danh sách khóa học tiêu biểu */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-foreground">Khóa học tiêu biểu</h3>
            <Link
              href={`/instructors/${instructor.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <span>Xem toàn bộ hồ sơ</span>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((k) => (
                <Skeleton key={k} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Giảng viên hiện chưa có khóa học công khai nào.
            </p>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/course/${course.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background/60 transition-all hover:border-primary-pastel hover:bg-surface hover:shadow-sm"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-primary-light">
                    {course.thumbnail ? (
                      <img
                        src={getImageUrl(course.thumbnail)}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-primary">
                        <BookOpen className="size-8" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <h4 className="line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary">
                      {course.title}
                    </h4>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <CoinPrice priceVnd={Number(course.base_price || 0)} size="sm" showWhiteDiscount={false} />
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-primary">
                        Xem khóa <ArrowUpRight className="size-3" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpotlightStage({
  mentor,
  allMentors,
  rankIndex,
  isSaved,
  isSaving,
  isReady,
  onSelectMentor,
  onToggleSave,
  onQuickView,
}: {
  mentor: InstructorItem;
  allMentors: InstructorItem[];
  rankIndex: number;
  isSaved: boolean;
  isSaving: boolean;
  isReady: boolean;
  onSelectMentor: (id: string) => void;
  onToggleSave: (id: string) => Promise<unknown>;
  onQuickView: (mentor: InstructorItem) => void;
}) {
  const { data: coursesPage, isLoading: coursesLoading } = useSWR<{ items: InstructorCourseItem[] }>(
    `/users/instructors/${mentor.id}/courses?limit=2`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const courses = coursesPage?.items ?? [];
  const gradeGroups = summarizeGrades(mentor.grades);
  const sinceLabel = formatSinceMonth(mentor.first_public_course_at);
  const hasReviews = (mentor.rating_count > 0 || mentor.evaluated_count > 0) && mentor.rating_avg > 0;
  const courseTotal = mentor.public_course_count ?? mentor.course_count ?? 0;

  return (
    <section
      aria-label="Sân khấu tiêu điểm giáo viên"
      className="relative isolate overflow-hidden rounded-[2.25rem] border border-primary-pastel bg-gradient-to-br from-surface via-primary-light/55 to-secondary/30 p-6 shadow-md sm:p-8 lg:p-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-primary-pastel/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 left-1/4 -z-10 size-80 rounded-full bg-accent/55 blur-3xl"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center">
        {/* NGĂN TRÁI: Chân dung & Dossier Đầy Đủ */}
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold tracking-[0.14em] text-primary-foreground uppercase">
                <Crown className="size-3.5" animated={false} aria-hidden="true" />
                Mentor Spotlight · #{String(rankIndex + 1).padStart(2, "0")}
              </span>
              {sinceLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Calendar className="size-3 text-primary" animated={false} aria-hidden="true" />
                  {sinceLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={isSaving || !isReady}
              onClick={() => void onToggleSave(mentor.id).catch(() => undefined)}
              aria-pressed={isSaved}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors cursor-pointer",
                isSaved
                  ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                  : "border-border bg-surface text-foreground hover:border-secondary-pastel hover:bg-secondary/50",
              )}
            >
              <Heart className="size-3.5" solid={isSaved} aria-hidden="true" />
              <span>{isSaved ? "Đã lưu" : "Lưu thầy cô"}</span>
            </button>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar Organic Blob Frame cỡ lớn */}
            <div className="relative size-28 shrink-0 sm:size-32">
              <div
                aria-hidden="true"
                className="absolute -inset-2 rounded-[58%_42%_52%_48%/48%_56%_44%_52%] bg-gradient-to-br from-primary-pastel via-accent to-secondary opacity-85"
              />
              <div className="relative size-full overflow-hidden rounded-[58%_42%_52%_48%/48%_56%_44%_52%] border-4 border-surface bg-primary-light shadow-md">
                {mentor.avatar ? (
                  <img src={getImageUrl(mentor.avatar)} alt={mentor.name} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center font-display text-2xl font-bold text-primary">
                    {mentor.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {mentor.name}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {mentor.short_bio || "Đồng hành cùng học sinh xây dựng nền tảng vững chắc và tư duy học tập chủ động."}
              </p>
            </div>
          </div>

          {/* 3 chỉ số cỡ lớn */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-primary-pastel/70 bg-surface/90 p-3.5 shadow-2xs">
              <p className="text-2xl font-extrabold text-primary tabular-nums">{courseTotal}</p>
              <p className="text-xs font-semibold text-muted-foreground">Khóa học mở</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/90 p-3.5 shadow-2xs">
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{mentor.student_count}</p>
              <p className="text-xs font-semibold text-muted-foreground">Học viên</p>
            </div>
            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-3.5 shadow-2xs">
              <p className="inline-flex items-center gap-1 text-2xl font-extrabold text-accent-vanilla-foreground tabular-nums">
                <Star className="size-5" animated={false} solid={hasReviews} aria-hidden="true" />
                {hasReviews ? mentor.rating_avg.toFixed(1) : "Mới"}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">
                {hasReviews ? `${mentor.rating_count} đánh giá` : "Đánh giá"}
              </p>
            </div>
          </div>

          {/* Khối lớp + Môn học */}
          <div className="space-y-2.5">
            {gradeGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-primary">Giảng dạy:</span>
                {gradeGroups.map((g) => (
                  <span key={g} className="rounded-full border border-primary-pastel bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {mentor.subjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {mentor.subjects.slice(0, 6).map((sub) => (
                  <span key={sub.id} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    {sub.name}
                  </span>
                ))}
                {mentor.subjects.length > 6 && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                    +{mentor.subjects.length - 6} môn khác
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href={`/instructors/${mentor.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
            >
              <span>Xem hồ sơ đầy đủ</span>
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => onQuickView(mentor)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-5 text-sm font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
            >
              <Eye className="size-4" animated={false} aria-hidden="true" />
              <span>Xem tất cả khóa học</span>
            </button>
          </div>
        </div>

        {/* NGĂN PHẢI: Kệ khóa học sống của thầy cô đang đứng trên sân khấu */}
        <div className="space-y-3 rounded-[24px] border border-primary-pastel/80 bg-surface/85 p-5 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary uppercase tracking-wider">
              <BookOpen className="size-4" animated={false} aria-hidden="true" />
              Khóa học tiêu biểu của thầy/cô
            </span>
            <span className="text-xs font-semibold text-muted-foreground">{courseTotal} khóa</span>
          </div>

          {coursesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/70 p-8 text-center text-xs text-muted-foreground">
              Thầy/cô đang chuẩn bị ra mắt khóa học công khai mới.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/course/${course.slug}`}
                  className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/80 bg-background/65 p-3 transition-all hover:border-primary-pastel hover:bg-surface hover:shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-primary-light sm:w-36">
                    {course.thumbnail ? (
                      <img
                        src={getImageUrl(course.thumbnail)}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-primary">
                        <BookOpen className="size-6" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                      {course.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2">
                      <CoinPrice priceVnd={Number(course.base_price || 0)} size="sm" showWhiteDiscount={false} />
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                        Học ngay <ArrowUpRight className="size-3" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DOCK CHUYỂN NGƯỜI TRỰC TIẾP NGAY DƯỚI SÂN KHẤU */}
      {allMentors.length > 1 && (
        <div className="mt-7 border-t border-primary-pastel/60 pt-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <span className="shrink-0 text-[11px] font-extrabold tracking-wider text-primary uppercase">
              Chuyển nhanh:
            </span>
            {allMentors.slice(0, 9).map((m, idx) => {
              const active = m.id === mentor.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMentor(m.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-xs font-bold transition-all cursor-pointer",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light",
                  )}
                >
                  <span className="size-7 overflow-hidden rounded-full bg-primary-light">
                    {m.avatar ? (
                      <img src={getImageUrl(m.avatar)} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-[10px] font-extrabold text-primary">
                        {m.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="max-w-32 truncate">{m.name}</span>
                  <span className={cn("text-[10px]", active ? "text-primary-light" : "text-muted-foreground")}>
                    #{idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

const STRIP_TONES = [
  "border-primary-pastel/70 bg-surface hover:border-primary",
  "border-accent-border/70 bg-gradient-to-r from-accent/25 via-surface to-surface hover:border-accent-border",
  "border-accent-vanilla-border/80 bg-gradient-to-r from-accent-vanilla/30 via-surface to-surface hover:border-accent-vanilla-border",
  "border-secondary-pastel/70 bg-gradient-to-r from-secondary/25 via-surface to-surface hover:border-secondary-pastel",
] as const;

function MentorDossierStrip({
  instructor,
  index,
  isSpotlight,
  isSaved,
  isSaving,
  isReady,
  onToggleSave,
  onSelectSpotlight,
  onQuickView,
}: {
  instructor: InstructorItem;
  index: number;
  isSpotlight: boolean;
  isSaved: boolean;
  isSaving: boolean;
  isReady: boolean;
  onToggleSave: (id: string) => Promise<unknown>;
  onSelectSpotlight: (id: string) => void;
  onQuickView: (instructor: InstructorItem) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const gradeGroups = useMemo(() => summarizeGrades(instructor.grades), [instructor.grades]);
  const sinceLabel = useMemo(() => formatSinceMonth(instructor.first_public_course_at), [instructor.first_public_course_at]);
  const hasReviews = (instructor.rating_count > 0 || instructor.evaluated_count > 0) && instructor.rating_avg > 0;
  const courseTotal = instructor.public_course_count ?? instructor.course_count ?? 0;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[26px] border p-5 shadow-2xs transition-all duration-200 hover:shadow-md sm:p-6",
        STRIP_TONES[index % STRIP_TONES.length],
        isSpotlight && "ring-2 ring-primary/40",
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        {/* Số biên tập + Avatar tròn sắc nét */}
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="hidden w-12 select-none font-display text-4xl font-bold text-primary/25 sm:block"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <Link
            href={`/instructors/${instructor.id}`}
            className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-primary-light shadow-sm ring-1 ring-primary-pastel"
          >
            {!instructor.avatar || imgError ? (
              <div className="grid size-full place-items-center text-lg font-extrabold text-primary">
                {instructor.name.slice(0, 2).toUpperCase()}
              </div>
            ) : (
              <img
                src={getImageUrl(instructor.avatar)}
                alt={instructor.name}
                loading="lazy"
                className="size-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </Link>
        </div>

        {/* Thông tin chuyên môn đầy đủ */}
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary sm:text-2xl">
              <Link href={`/instructors/${instructor.id}`}>{instructor.name}</Link>
            </h3>
            {sinceLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <Calendar className="size-3 text-primary" animated={false} aria-hidden="true" />
                {sinceLabel}
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {instructor.short_bio || "Đồng hành cùng học sinh xây dựng nền tảng vững chắc và tư duy học tập chủ động."}
          </p>

          {/* Khối lớp + Môn học + Kỳ thi */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {gradeGroups.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light/80 px-2.5 py-0.5 text-[11px] font-bold text-primary"
              >
                <GraduationCap className="size-3" animated={false} aria-hidden="true" />
                {g}
              </span>
            ))}
            {instructor.subjects.slice(0, 5).map((sub) => (
              <span
                key={sub.id}
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
              >
                {sub.name}
              </span>
            ))}
            {instructor.subjects.length > 5 && (
              <span className="rounded-full bg-accent/70 px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                +{instructor.subjects.length - 5} môn
              </span>
            )}
            {instructor.exams?.slice(0, 2).map((ex) => (
              <span
                key={ex.id}
                className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-2.5 py-0.5 text-[11px] font-bold text-accent-vanilla-foreground"
              >
                <Award className="size-3" animated={false} aria-hidden="true" />
                {ex.name}
              </span>
            ))}
            {instructor.learning_goals?.slice(0, 2).map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary/65 px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground"
              >
                <Target className="size-3" animated={false} aria-hidden="true" />
                {g.name}
              </span>
            ))}
          </div>
        </div>

        {/* Cột chỉ số & Hành động bên phải */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-4 lg:w-64 lg:flex-col lg:items-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-extrabold text-primary tabular-nums">{courseTotal}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Khóa học</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground tabular-nums">{instructor.student_count}</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Học viên</p>
            </div>
            <div>
              <p className="inline-flex items-center gap-0.5 text-lg font-extrabold text-accent-vanilla-foreground tabular-nums">
                <Star className="size-4" animated={false} solid={hasReviews} aria-hidden="true" />
                {hasReviews ? instructor.rating_avg.toFixed(1) : "Mới"}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground">Đánh giá</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isSaving || !isReady}
              onClick={() => void onToggleSave(instructor.id).catch(() => undefined)}
              aria-label={isSaved ? `Bỏ lưu ${instructor.name}` : `Lưu ${instructor.name}`}
              aria-pressed={isSaved}
              className={cn(
                "grid size-9 place-items-center rounded-full border transition-colors cursor-pointer",
                isSaved
                  ? "border-secondary-pastel bg-secondary text-secondary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-secondary-pastel hover:text-secondary-foreground",
              )}
            >
              <Heart className="size-4" solid={isSaved} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onSelectSpotlight(instructor.id)}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-bold text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
            >
              <Crown className="size-3.5" animated={false} aria-hidden="true" />
              <span>Tiêu điểm</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickView(instructor)}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-3 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              <Eye className="size-3.5" animated={false} aria-hidden="true" />
              <span>Khóa học</span>
            </button>
            <Link
              href={`/instructors/${instructor.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-xs font-extrabold text-primary-foreground hover:bg-primary-hover"
            >
              <span>Hồ sơ</span>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}


export function InstructorDirectory() {
  const router = useRouter();
  const current = useSearchParams();
  const searchInputId = useId();

  // Local state
  const [keyword, setKeyword] = useState(current.get("q") ?? "");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [quickViewMentor, setQuickViewMentor] = useState<InstructorItem | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const spotlightRef = useRef<HTMLDetailsElement>(null);

  // Phân trang tải thêm (load more)
  const [extraState, setExtraState] = useState<{
    queryKey: string;
    items: InstructorItem[];
    cursor: string | null;
    hasLoadedMore: boolean;
  }>({
    queryKey: "",
    items: [],
    cursor: null,
    hasLoadedMore: false,
  });

  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);
  const loadingMoreKeyRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [moreError, setMoreError] = useState(false);

  // Dọn dẹp search timeout khi unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Đồng bộ ô search khi URL param thay đổi (hỗ trợ back/forward)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setKeyword(current.get("q") ?? "");
  }, [current]);

  // Bảo vệ URL: dọn dẹp các params cấm (cursor, limit, include_total...)
  useEffect(() => {
    let hasDirty = false;
    const next = new URLSearchParams();
    for (const [key, value] of current.entries()) {
      if ((WHITELIST_PARAMS as readonly string[]).includes(key)) {
        next.set(key, value);
      } else {
        hasDirty = true;
      }
    }
    if (hasDirty) {
      const query = next.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
  }, [current, router]);

  // Bộ lọc chuẩn hóa (sorted deterministic key)
  const filtersQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const key of WHITELIST_PARAMS) {
      const val = current.get(key);
      if (val !== null && val.trim() !== "") {
        q.set(key, val.trim());
      }
    }
    q.sort();
    return q.toString();
  }, [current]);

  const isLoadingMore = Boolean(loadingMoreKey && loadingMoreKey === filtersQuery);
  const activeFilterKeyRef = useRef(filtersQuery);
  const loadMoreGenRef = useRef(0);

  // Khi filtersQuery thay đổi: abort request cũ, reset generation và extraState
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    activeFilterKeyRef.current = filtersQuery;
    loadMoreGenRef.current += 1;
    loadingMoreKeyRef.current = null;
    setLoadingMoreKey(null);
    setMoreError(false);
    setExtraState({
      queryKey: filtersQuery,
      items: [],
      cursor: null,
      hasLoadedMore: false,
    });
  }, [filtersQuery]);

  // 1. Fetch filter options
  const {
    data: options,
    error: optionError,
    mutate: reloadOptions,
  } = useSWR<InstructorFilterOptions>("/users/instructors/filter-options", fetcher, {
    revalidateOnFocus: false,
  });

  // 2. Fetch danh sách giảng viên (trang đầu limit=12, include_total=true)
  const directoryUrl = `/users/instructors?${filtersQuery ? `${filtersQuery}&` : ""}limit=12&include_total=true`;
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<InstructorDirectoryEnvelope>(directoryUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const totalDisplay = data?.total ?? null;

  // Tổng hợp danh sách giảng viên
  const items = useMemo(() => {
    const firstPageItems = data?.items ?? [];
    const extraItems = extraState.queryKey === filtersQuery ? extraState.items : [];
    return [...firstPageItems, ...extraItems];
  }, [data?.items, extraState.queryKey, extraState.items, filtersQuery]);

  // Quản lý trạng thái đã lưu (batch SWR theo danh sách item ID)
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const { isSaved, isPending, toggleSave, isReady, fetchError: savedError, retry: retrySaved } = useSavedInstructors(itemIds);

  const nextCursor = useMemo(() => {
    if (extraState.queryKey === filtersQuery && extraState.hasLoadedMore) {
      return extraState.cursor;
    }
    return data?.next_cursor ?? null;
  }, [extraState.queryKey, extraState.hasLoadedMore, extraState.cursor, data?.next_cursor, filtersQuery]);

  const activeCount = useMemo(() => {
    return Array.from(current.keys()).filter(
      (key) => (WHITELIST_PARAMS as readonly string[]).includes(key) && key !== "sort"
    ).length;
  }, [current]);

  // Cập nhật nhiều tham số trong 1 router.push hoặc router.replace duy nhất (atomic)
  const setParams = useCallback(
    (patch: Record<string, string>, replace = false) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      loadingMoreKeyRef.current = null;
      setLoadingMoreKey(null);

      const next = new URLSearchParams();
      for (const key of WHITELIST_PARAMS) {
        const val = current.get(key);
        if (val !== null && val.trim() !== "") {
          next.set(key, val.trim());
        }
      }

      for (const [key, value] of Object.entries(patch)) {
        if (value && value.trim() !== "") {
          next.set(key, value.trim());
        } else {
          next.delete(key);
        }
      }

      // Tự động kiểm tra tương thích grade khi subject hoặc level thay đổi
      if (("subject" in patch || "level" in patch) && next.has("grade") && options?.grades) {
        const targetSubject = next.get("subject") ?? "";
        const targetLevel = next.get("level") ?? "";
        const currentGradeNum = next.get("grade");

        let validGrades: BrowseGradeOption[] = options.grades;

        if (targetLevel && options.levels) {
          const lvl = options.levels.find((l) => l.code === targetLevel || l.id === targetLevel);
          if (lvl) {
            validGrades = validGrades.filter((g) => g.education_level_id === lvl.id);
          }
        }

        if (targetSubject && options.subjects && options.grade_subjects) {
          const sub = options.subjects.find((s) => s.slug === targetSubject || s.code === targetSubject);
          if (sub) {
            validGrades = validGrades.filter((grade) =>
              options.grade_subjects.some(
                (link) => link.grade_id === grade.id && link.subject_id === sub.id
              )
            );
          }
        }

        const isCompatible = validGrades.some((g) => String(g.grade_number) === currentGradeNum);
        if (!isCompatible) {
          next.delete("grade");
        }
      }

      const query = next.toString();
      const currentQuery = current.toString();
      if (query === currentQuery) return;

      if (replace) {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      } else {
        router.push(query ? `?${query}` : "?", { scroll: false });
      }
    },
    [current, router, options]
  );

  const setParam = useCallback(
    (name: string, value: string, replace = false) => {
      setParams({ [name]: value }, replace);
    },
    [setParams]
  );

  const resetAllFilters = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    loadingMoreKeyRef.current = null;
    setLoadingMoreKey(null);
    setKeyword("");
    if (!current.toString()) return;
    router.push("?", { scroll: false });
  }, [current, router]);

  // Debounce tìm kiếm 350ms (replace URL để không làm ngập history)
  const handleKeywordChange = (val: string) => {
    setKeyword(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchTimeoutRef.current = setTimeout(() => {
      setParam("q", val.normalize("NFC").trim().replace(/\s+/g, " "), true);
    }, 350);
  };

  // Submit bằng Enter (push URL tạo history entry)
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setParam("q", keyword.normalize("NFC").trim().replace(/\s+/g, " "), false);
  };

  // Tải thêm (Load More) với AbortController và key binding an toàn
  const handleLoadMore = async () => {
    if (!nextCursor || loadingMoreKeyRef.current === filtersQuery) return;

    const requestFilterKey = filtersQuery;
    const currentGen = ++loadMoreGenRef.current;

    loadingMoreKeyRef.current = requestFilterKey;
    setLoadingMoreKey(requestFilterKey);
    setMoreError(false);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const page = await api.get<InstructorDirectoryEnvelope>(
        `/users/instructors?${requestFilterKey ? `${requestFilterKey}&` : ""}limit=12&cursor=${encodeURIComponent(
          nextCursor
        )}&include_total=false`,
        { signal: controller.signal }
      );

      if (
        currentGen !== loadMoreGenRef.current ||
        requestFilterKey !== activeFilterKeyRef.current
      ) {
        return;
      }

      const firstPageItems = data?.items ?? [];
      const newItems = page.data.items ?? [];

      setExtraState((prev) => {
        if (prev.queryKey !== requestFilterKey) {
          return {
            queryKey: requestFilterKey,
            items: newItems,
            cursor: page.data.next_cursor ?? null,
            hasLoadedMore: true,
          };
        }
        const existingIds = new Set([
          ...firstPageItems.map((c) => c.id),
          ...prev.items.map((c) => c.id),
        ]);
        const uniqueNew = newItems.filter((c) => !existingIds.has(c.id));
        return {
          queryKey: requestFilterKey,
          items: [...prev.items, ...uniqueNew],
          cursor: page.data.next_cursor ?? null,
          hasLoadedMore: true,
        };
      });
    } catch (err: unknown) {
      const isCanceled =
        (err as { name?: string })?.name === "CanceledError" ||
        (err as { name?: string })?.name === "AbortError" ||
        (err as { code?: string })?.code === "ERR_CANCELED";

      if (
        !isCanceled &&
        currentGen === loadMoreGenRef.current &&
        requestFilterKey === activeFilterKeyRef.current
      ) {
        setMoreError(true);
      }
    } finally {
      if (currentGen === loadMoreGenRef.current) {
        loadingMoreKeyRef.current = null;
        setLoadingMoreKey(null);
      }
    }
  };

  const filterValues: InstructorFilterValues = useMemo(
    () => ({
      q: current.get("q") ?? "",
      level: current.get("level") ?? "",
      grade: current.get("grade") ?? "",
      subject: current.get("subject") ?? "",
      goal: current.get("goal") ?? "",
      exam: current.get("exam") ?? "",
      min_rating: current.get("min_rating") ?? "",
      has_courses: current.get("has_courses") ?? "",
    }),
    [current]
  );

  const activeKeyword = current.get("q") ?? "";

  // Active Filter Chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];

    if (filterValues.subject && options?.subjects) {
      const sub = options.subjects.find((s) => s.slug === filterValues.subject || s.code === filterValues.subject);
      if (sub) chips.push({ key: "subject", label: `Môn: ${sub.name}` });
    }
    if (filterValues.level && options?.levels) {
      const lvl = options.levels.find((l) => l.code === filterValues.level || l.id === filterValues.level);
      if (lvl) chips.push({ key: "level", label: `Cấp: ${lvl.name}` });
    }
    if (filterValues.grade) {
      chips.push({ key: "grade", label: `Lớp: ${filterValues.grade}` });
    }
    if (filterValues.has_courses) {
      chips.push({ key: "has_courses", label: filterValues.has_courses === "true" ? "Có khóa công khai" : "Chưa có khóa công khai" });
    }
    if (filterValues.min_rating) {
      chips.push({ key: "min_rating", label: `Đánh giá: Từ ${filterValues.min_rating}★` });
    }
    if (filterValues.goal && options?.learning_goals) {
      const g = options.learning_goals.find((item) => item.code === filterValues.goal);
      if (g) chips.push({ key: "goal", label: `Mục tiêu: ${g.name}` });
    }
    if (filterValues.exam && options?.exams) {
      const ex = options.exams.find((item) => item.code === filterValues.exam);
      if (ex) chips.push({ key: "exam", label: `Kỳ thi: ${ex.name}` });
    }
    if (activeKeyword) {
      chips.push({ key: "q", label: `Từ khóa: "${activeKeyword}"` });
    }

    return chips;
  }, [filterValues, options, activeKeyword]);

  const activeSpotlight = useMemo(() => {
    if (items.length === 0) return null;
    if (spotlightId) {
      const found = items.find((i) => i.id === spotlightId);
      if (found) return found;
    }
    return items[0];
  }, [items, spotlightId]);

  const activeSpotlightIndex = activeSpotlight
    ? Math.max(0, items.findIndex((i) => i.id === activeSpotlight.id))
    : 0;

  return (
    <div className="space-y-7 text-foreground">
      {savedError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-foreground">
          <span>Chưa tải được trạng thái giảng viên đã lưu.</span>
          <Button variant="outline" size="sm" onClick={() => retrySaved()}>Thử lại</Button>
        </div>
      )}

      {/* 1. HEADER TỐI GIẢN TẠP CHÍ + THANH TÌM KIẾM */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-primary-light/75 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Đội ngũ giáo viên</h1>
          <p className="text-sm leading-relaxed text-foreground/85">Tìm giáo viên theo môn học và cấp lớp.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/favorites/instructors"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-secondary-pastel bg-secondary/75 px-4 text-xs font-bold text-secondary-foreground hover:bg-secondary"
          >
            <Heart className="size-3.5" solid aria-hidden="true" />
            Giáo viên yêu thích
          </Link>
          <Button
            variant="outline"
            onClick={() => setMobileFilterOpen(true)}
            className="min-h-10 rounded-full border-primary-pastel bg-surface px-4 text-xs font-bold"
            leftIcon={<SlidersHorizontal className="size-4 text-primary" />}
          >
            <span>Bộ lọc</span>
            {activeCount > 0 && (
              <Badge variant="primary" className="ml-1 px-1.5 text-[11px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 3. STICKY FLOATING COMMAND BAR (TÌM KIẾM + LỌC NHANH + SẮP XẾP — BỎ SIDEBAR CỨNG) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-56">
          <label htmlFor={searchInputId} className="relative block min-w-0 flex-1">
            <span className="sr-only">Tìm kiếm giáo viên</span>
            <Search
              aria-hidden="true"
              animated={false}
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-primary"
            />
            <input
              id={searchInputId}
              name="q"
              maxLength={160}
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="Tìm tên thầy cô, môn dạy hoặc giới thiệu…"
              className="h-9 w-full rounded-full bg-background/80 pr-8 pl-10 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = null;
                  }
                  setKeyword("");
                  setParam("q", "", true);
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Xóa từ khóa"
              >
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </form>

        {/* Quick Level Pills */}
        {options?.levels && options.levels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setParam("level", "")}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-bold transition-colors cursor-pointer",
                !filterValues.level
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-primary-light hover:text-primary",
              )}
            >
              Mọi cấp
            </button>
            {options.levels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setParam("level", lvl.code)}
                className={cn(
                  "h-8 rounded-full px-3 text-xs font-bold transition-colors cursor-pointer",
                  filterValues.level === lvl.code
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-primary-light hover:text-primary",
                )}
              >
                {lvl.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <select
            aria-label="Sắp xếp danh sách giáo viên"
            value={current.get("sort") ?? "rating"}
            onChange={(e) => setParam("sort", e.target.value)}
            className="h-8 rounded-full border border-border bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:border-ring cursor-pointer"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shortcut Môn học */}
      {options?.subjects && options.subjects.length > 0 && (
        <SubjectPills
          subjects={options.subjects}
          selectedSubjectSlug={filterValues.subject}
          onSelectSubject={(slug) => setParam("subject", slug)}
        />
      )}

      {optionError && (
        <div className="rounded-[20px] border border-destructive-border bg-destructive-bg/30 p-4 text-center">
          <p className="text-xs font-medium text-destructive-foreground mb-2">
            Không thể tải danh mục bộ lọc giáo viên.
          </p>
          <Button variant="outline" size="sm" onClick={() => reloadOptions()}>
            Thử tải lại
          </Button>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Đang lọc theo:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === "q") {
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                    searchTimeoutRef.current = null;
                  }
                  setKeyword("");
                  setParam("q", "", true);
                } else {
                  setParam(chip.key, "");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3 py-1 text-xs font-semibold text-foreground hover:border-primary cursor-pointer"
            >
              <span>{chip.label}</span>
              <X className="size-3 text-muted-foreground" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={resetAllFilters} leftIcon={<RotateCcw className="size-3" />}>
            Đặt lại tất cả
          </Button>
        </div>
      )}

      {/* Slide-over Filter Drawer (dùng được trên cả Desktop & Mobile) */}
      {mobileFilterOpen && (
        <InstructorFilterSidebar
          options={options}
          values={filterValues}
          onFilterChange={setParam}
          onFiltersChange={setParams}
          onResetFilters={resetAllFilters}
          activeCount={activeCount}
          isMobileDrawer={true}
          onCloseMobileDrawer={() => setMobileFilterOpen(false)}
        />
      )}

      {/* 2. INTERACTIVE MENTOR SPOTLIGHT STAGE (ĐỔI NGƯỜI TRỰC TIẾP + KHÓA HỌC SỐNG) */}
      {activeSpotlight && (
        <details ref={spotlightRef} className="scroll-mt-24 rounded-2xl border border-border bg-surface">
          <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring">Giáo viên tiêu điểm</summary>
          <div className="p-3 pt-0 sm:p-4 sm:pt-0">
            <SpotlightStage
              mentor={activeSpotlight}
              allMentors={items}
              rankIndex={activeSpotlightIndex}
              isSaved={isSaved(activeSpotlight.id)}
              isSaving={isPending(activeSpotlight.id)}
              isReady={isReady}
              onSelectMentor={setSpotlightId}
              onToggleSave={toggleSave}
              onQuickView={setQuickViewMentor}
            />
          </div>
        </details>
      )}

      {/* 4. FULL-WIDTH EDITORIAL DOSSIER STRIPS */}
      <section aria-label="Danh sách hồ sơ giáo viên" aria-busy={isLoading} className="space-y-4">
        {isLoading && items.length === 0 ? (
          <div role="status" className="space-y-4">
            {[1, 2, 3, 4].map((idx) => (
              <Skeleton key={idx} className="h-36 rounded-[26px]" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <Card className="rounded-[24px] border-destructive-border bg-destructive-bg/30 p-8 text-center">
            <h3 className="mb-1 text-base font-semibold text-destructive-foreground">
              Không thể tải danh sách giáo viên
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền.
            </p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              Thử tải lại
            </Button>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title={activeCount > 0 ? "Chưa có giáo viên phù hợp với bộ lọc" : "Chưa có giáo viên công khai"}
            description={
              activeCount > 0
                ? "Hãy thử thay đổi tiêu chí môn học, cấp học hoặc từ khóa tìm kiếm."
                : "Hồ sơ giáo viên có khóa học đủ điều kiện công khai sẽ hiển thị tại đây."
            }
            action={
              activeCount > 0 ? (
                <Button variant="primary" size="md" onClick={resetAllFilters} leftIcon={<RotateCcw className="size-4" />}>
                  Đặt lại bộ lọc
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {items.map((instructor, idx) => (
                <MentorDossierStrip
                  key={instructor.id}
                  instructor={instructor}
                  index={idx}
                  isSpotlight={spotlightId === instructor.id}
                  isSaved={isSaved(instructor.id)}
                  isSaving={isPending(instructor.id)}
                  isReady={isReady}
                  onToggleSave={toggleSave}
                  onSelectSpotlight={(id) => {
                    setSpotlightId(id);
                    const spotlight = spotlightRef.current;
                    if (spotlight) {
                      spotlight.open = true;
                      spotlight.scrollIntoView({ block: "start" });
                    }
                  }}
                  onQuickView={setQuickViewMentor}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                  loadingText="Đang tải thêm..."
                  className="min-w-[200px] rounded-full shadow-xs"
                >
                  Xem thêm giáo viên
                </Button>
                {moreError && (
                  <p role="alert" className="text-xs text-destructive-foreground">
                    Không thể tải thêm danh sách giáo viên. Vui lòng bấm thử lại.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {quickViewMentor && (
        <MentorQuickViewModal
          instructor={quickViewMentor}
          onClose={() => setQuickViewMentor(null)}
        />
      )}
    </div>
  );
}
