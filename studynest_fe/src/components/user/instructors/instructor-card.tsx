"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Heart, Star, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { InstructorItem } from "@/types/user/instructor";

export interface InstructorCardProps {
  instructor: InstructorItem;
  isSaved?: boolean;
  isSaving?: boolean;
  isReady?: boolean;
  onToggleSave?: (id: string) => Promise<unknown>;
  variant?: "directory" | "compact" | "home";
}

export function InstructorCard({
  instructor,
  isSaved = false,
  isSaving = false,
  isReady = true,
  onToggleSave,
  variant = "directory",
}: InstructorCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasReviews = (instructor.rating_count > 0 || instructor.evaluated_count > 0) && instructor.rating_avg > 0;
  const ratingCount = instructor.rating_count || instructor.evaluated_count || 0;
  const disabledSave = isSaving || !isReady;

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

  const gradeNames = instructor.grades
    ?.map((g) => (g.grade_number ? `Lớp ${g.grade_number}` : g.name))
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-border/80 bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-ambient-md"
    >
      {/* Nút lưu giảng viên (Saved / Bookmark) */}
      {onToggleSave && (
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={disabledSave}
          aria-label={isSaved ? `Bỏ lưu giảng viên ${instructor.name}` : `Lưu giảng viên ${instructor.name}`}
          aria-pressed={isSaved}
          className={`absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border transition-all cursor-pointer ${
            isSaved
              ? "border-secondary-pastel bg-secondary-light text-secondary-foreground shadow-2xs"
              : "border-border/80 bg-surface/90 text-muted-foreground hover:border-secondary-pastel hover:bg-secondary-light/60 hover:text-secondary-foreground"
          } ${disabledSave ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <Heart className={`h-4 w-4 transition-transform ${isSaved ? "fill-current scale-105" : ""}`} />
        </button>
      )}

      {/* Liên kết đến trang chi tiết giảng viên */}
      <Link
        href={`/instructors/${instructor.id}`}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[20px]"
      >
        {/* Phần Avatar & Tên Giảng Viên */}
        <div className="flex items-start gap-4 mb-3.5">
          <div className="relative shrink-0">
            <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full overflow-hidden border-2 border-primary-light bg-primary-light/50 p-0.5 group-hover:border-primary-pastel transition-colors">
              {!instructor.avatar || imgError ? (
                <div className="h-full w-full flex items-center justify-center rounded-full bg-primary-light text-primary font-bold text-sm sm:text-base select-none">
                  {initials}
                </div>
              ) : (
                <img
                  src={getImageUrl(instructor.avatar)}
                  alt={`Giáo viên ${instructor.name}`}
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <h3 className="font-sans text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {instructor.name}
            </h3>

            {/* Môn học & Đơn vị trực thuộc */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {instructor.subjects && instructor.subjects.length > 0 ? (
                instructor.subjects.slice(0, 2).map((sub) => (
                  <Badge key={sub.id} variant="primary" className="text-[11px] font-medium px-2 py-0.5">
                    {sub.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Giảng viên chuyên môn</span>
              )}

              {instructor.subjects && instructor.subjects.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.2">
                  +{instructor.subjects.length - 2}
                </Badge>
              )}
            </div>

            {instructor.providers && instructor.providers.length > 0 && (
              <p className="mt-1 text-xs text-primary font-medium line-clamp-1">
                {instructor.providers[0].name}
              </p>
            )}
          </div>
        </div>

        {/* Khối lớp giảng dạy */}
        {gradeNames && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2.5">
            <span className="font-medium text-foreground">Giảng dạy:</span> {gradeNames}
          </p>
        )}

        {/* Giới thiệu ngắn (short_bio plain text) */}
        {instructor.short_bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
            {instructor.short_bio}
          </p>
        )}

        {/* Footer: Thống kê số lượng học viên, số khóa học, đánh giá khóa học */}
        <div className="mt-auto pt-3.5 border-t border-border/70 flex items-center justify-between gap-2 text-xs">
          {/* Đánh giá khóa học thực tế */}
          <div>
            {hasReviews ? (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-semibold text-foreground">{instructor.rating_avg.toFixed(1)}</span>
                <span className="text-muted-foreground text-[11px]">({ratingCount})</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">Chưa có đánh giá</span>
            )}
          </div>

          {/* Học viên & Khóa học */}
          <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
            <div className="flex items-center gap-1" title="Số học viên đã tham gia">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">{instructor.student_count.toLocaleString("vi-VN")}</span>
            </div>

            <div className="flex items-center gap-1" title="Số khóa học công khai">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {instructor.public_course_count ?? instructor.course_count ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
