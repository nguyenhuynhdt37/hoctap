"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  Eye,
  GraduationCap,
  Heart,
  Star,
  Target,
  Users,
} from "pulsoicon-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { InstructorGrade, InstructorItem } from "@/types/user/instructor";

export interface InstructorCardProps {
  instructor: InstructorItem;
  isSaved?: boolean;
  isSaving?: boolean;
  isReady?: boolean;
  onToggleSave?: (id: string) => Promise<unknown>;
  onQuickView?: (instructor: InstructorItem) => void;
  accentIndex?: number;
  variant?: "directory" | "compact" | "home";
}

const BANNER_TONES = [
  "from-primary-light via-primary-light/60 to-accent/35 border-b border-primary-pastel/60",
  "from-accent/70 via-accent/40 to-secondary/35 border-b border-accent-border/60",
  "from-accent-vanilla/75 via-accent-vanilla/45 to-primary-light/40 border-b border-accent-vanilla-border/70",
  "from-secondary/75 via-secondary/40 to-primary-light/40 border-b border-secondary-pastel/60",
] as const;

export function summarizeGrades(grades?: InstructorGrade[]): string[] {
  if (!grades || grades.length === 0) return [];
  const nums = grades
    .map((g) => g.grade_number)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .sort((a, b) => a - b);

  if (nums.length === 0) {
    return grades.map((g) => g.name).filter(Boolean).slice(0, 3);
  }

  const groups: string[] = [];
  const tieuHoc = nums.filter((n) => n >= 1 && n <= 5);
  const thcs = nums.filter((n) => n >= 6 && n <= 9);
  const thpt = nums.filter((n) => n >= 10 && n <= 12);

  if (tieuHoc.length > 0) {
    groups.push(
      tieuHoc.length === 5
        ? "Tiểu học (1–5)"
        : `Tiểu học (${tieuHoc.join(", ")})`,
    );
  }
  if (thcs.length > 0) {
    groups.push(thcs.length === 4 ? "THCS (6–9)" : `THCS (${thcs.join(", ")})`);
  }
  if (thpt.length > 0) {
    groups.push(thpt.length === 3 ? "THPT (10–12)" : `THPT (${thpt.join(", ")})`);
  }
  return groups;
}

export function formatSinceMonth(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Từ ${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function InstructorCard({
  instructor,
  isSaved = false,
  isSaving = false,
  isReady = true,
  onToggleSave,
  onQuickView,
  accentIndex = 0,
  variant = "directory",
}: InstructorCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasReviews =
    (instructor.rating_count > 0 || instructor.evaluated_count > 0) &&
    instructor.rating_avg > 0;
  const ratingCount = instructor.rating_count || instructor.evaluated_count || 0;
  const courseTotal = instructor.public_course_count ?? instructor.course_count ?? 0;
  const disabledSave = isSaving || !isReady;
  const gradeGroups = useMemo(() => summarizeGrades(instructor.grades), [instructor.grades]);
  const sinceLabel = useMemo(() => formatSinceMonth(instructor.first_public_course_at), [instructor.first_public_course_at]);

  const initials = useMemo(() => {
    const parts = (instructor.name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "GV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [instructor.name]);

  const handleSaveClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSave && !isSaving) {
      try {
        await onToggleSave(instructor.id);
      } catch {
        // Lỗi đã được ghi nhận trong hook
      }
    }
  };

  const bannerTone = BANNER_TONES[accentIndex % BANNER_TONES.length];
  const isCompact = variant === "compact" || variant === "home";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-border/80 bg-surface shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* Dải bìa pastel Cloudy Blue + nút lưu */}
      <div className={cn("relative h-16 bg-gradient-to-r px-5", bannerTone)}>
        {sinceLabel && !isCompact && (
          <span className="absolute bottom-2.5 left-24 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground shadow-2xs">
            <Calendar className="size-3 text-primary" animated={false} aria-hidden="true" />
            {sinceLabel}
          </span>
        )}
        {onToggleSave && (
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={disabledSave}
            aria-label={isSaved ? `Bỏ lưu giảng viên ${instructor.name}` : `Lưu giảng viên ${instructor.name}`}
            aria-pressed={isSaved}
            className={cn(
              "absolute top-3 right-3 z-20 grid size-9 place-items-center rounded-full border transition-all cursor-pointer",
              isSaved
                ? "border-secondary-pastel bg-secondary text-secondary-foreground shadow-2xs"
                : "border-border/80 bg-surface/90 text-muted-foreground hover:border-secondary-pastel hover:bg-secondary/60 hover:text-secondary-foreground",
              disabledSave && "cursor-not-allowed opacity-60",
            )}
          >
            <Heart className="size-4" solid={isSaved} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Thân hồ sơ */}
      <div className="flex min-w-0 flex-1 flex-col px-5 pb-5">
        {/* Avatar nổi cắt ngang bìa + Tên */}
        <div className="-mt-9 mb-3 flex items-end gap-3.5">
          <Link
            href={`/instructors/${instructor.id}`}
            className="relative size-18 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-primary-light shadow-sm ring-1 ring-primary-pastel/70"
          >
            {!instructor.avatar || imgError ? (
              <div className="grid size-full place-items-center bg-primary-light text-base font-extrabold text-primary select-none">
                {initials}
              </div>
            ) : (
              <img
                src={getImageUrl(instructor.avatar)}
                alt={`Giáo viên ${instructor.name}`}
                loading="lazy"
                className="size-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </Link>

          <div className="min-w-0 flex-1 pt-9">
            <h3 className="truncate font-display text-lg font-bold text-foreground transition-colors group-hover:text-primary">
              <Link href={`/instructors/${instructor.id}`}>{instructor.name}</Link>
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              {instructor.subjects && instructor.subjects.length > 0
                ? `Chuyên môn ${instructor.subjects.length} môn học`
                : "Giảng viên Mây Mây"}
            </p>
          </div>
        </div>

        {/* 3 ô thống kê Bento rõ nét */}
        <div className="mb-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/70 bg-background/75 px-2.5 py-2 text-center">
            <p className="inline-flex items-center justify-center gap-1 text-sm font-extrabold text-primary tabular-nums">
              <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
              {courseTotal}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground">Khóa học</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/75 px-2.5 py-2 text-center">
            <p className="inline-flex items-center justify-center gap-1 text-sm font-extrabold text-foreground tabular-nums">
              <Users className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              {instructor.student_count ?? 0}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground">Học viên</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/75 px-2.5 py-2 text-center">
            <p className="inline-flex items-center justify-center gap-1 text-sm font-extrabold text-accent-vanilla-foreground tabular-nums">
              <Star className="size-3.5" animated={false} solid={hasReviews} aria-hidden="true" />
              {hasReviews ? instructor.rating_avg.toFixed(1) : "Mới"}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {hasReviews ? `${ratingCount} đánh giá` : "Đánh giá"}
            </p>
          </div>
        </div>

        {/* Khối lớp gom nhóm thông minh */}
        {gradeGroups.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <GraduationCap className="size-3.5 shrink-0 text-primary" animated={false} aria-hidden="true" />
            {gradeGroups.map((grp) => (
              <span
                key={grp}
                className="rounded-full border border-primary-pastel/70 bg-primary-light/60 px-2.5 py-0.5 text-[11px] font-bold text-primary"
              >
                {grp}
              </span>
            ))}
          </div>
        )}

        {/* Môn học */}
        {instructor.subjects && instructor.subjects.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {instructor.subjects.slice(0, isCompact ? 3 : 4).map((sub) => (
              <Badge key={sub.id} variant="outline" className="bg-surface text-[11px] font-semibold text-foreground">
                {sub.name}
              </Badge>
            ))}
            {instructor.subjects.length > (isCompact ? 3 : 4) && (
              <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                +{instructor.subjects.length - (isCompact ? 3 : 4)} môn
              </span>
            )}
          </div>
        )}

        {/* Kỳ thi & Mục tiêu (nếu có) */}
        {!isCompact && ((instructor.exams?.length ?? 0) > 0 || (instructor.learning_goals?.length ?? 0) > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {instructor.exams?.slice(0, 2).map((ex) => (
              <span
                key={ex.id}
                className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/65 px-2.5 py-0.5 font-bold text-accent-vanilla-foreground"
              >
                <Award className="size-3" animated={false} aria-hidden="true" />
                {ex.name}
              </span>
            ))}
            {instructor.learning_goals?.slice(0, 2).map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary/60 px-2.5 py-0.5 font-bold text-secondary-foreground"
              >
                <Target className="size-3" animated={false} aria-hidden="true" />
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Giới thiệu ngắn */}
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {instructor.short_bio || "Đồng hành cùng học sinh xây dựng nền tảng vững chắc và tư duy học tập chủ động."}
        </p>

        {/* Footer 2 hành động */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/70 pt-3.5">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(instructor)}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
            >
              <Eye className="size-3.5" animated={false} aria-hidden="true" />
              <span>Xem khóa học</span>
            </button>
          )}
          <Link
            href={`/instructors/${instructor.id}`}
            className={cn(
              "inline-flex min-h-9 items-center justify-center gap-1 rounded-full bg-primary px-4 text-xs font-extrabold text-primary-foreground transition-colors hover:bg-primary-hover",
              !onQuickView && "w-full",
            )}
          >
            <span>Hồ sơ</span>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
