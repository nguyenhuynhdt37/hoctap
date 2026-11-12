"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Star, Users } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import useSWR from "swr";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

interface TopInstructorItem {
  id: string;
  name: string;
  avatar: string | null;
  student_count: number;
  course_count: number;
  rating_avg: number;
  evaluated_count: number;
}

function TopInstructorCard({ instructor }: { instructor: TopInstructorItem }) {
  const [imgError, setImgError] = useState(false);
  const hasReviews = instructor.rating_avg > 0 && instructor.evaluated_count > 0;

  const initials = useMemo(() => {
    const parts = (instructor.name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "GV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [instructor.name]);

  return (
    <Card
      className="group flex flex-col justify-between overflow-hidden rounded-[24px] border border-border/80 bg-surface p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-primary-pastel hover:shadow-ambient-md"
    >
      <Link
        href={`/instructors/${instructor.id}`}
        className="flex h-full flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]"
      >
        <div>
          {/* Avatar không dùng blanket checkmark, fallback Initials 100% local nội bộ */}
          <div className="relative mb-4 inline-block">
            <div className="w-20 h-20 rounded-full ring-4 ring-primary-light group-hover:ring-primary-pastel transition-all duration-200 overflow-hidden bg-primary-light/50 p-0.5">
              {!instructor.avatar || imgError ? (
                <div className="h-full w-full flex items-center justify-center rounded-full bg-primary-light text-primary font-bold text-lg select-none">
                  {initials}
                </div>
              ) : (
                <img
                  src={getImageUrl(instructor.avatar)}
                  alt={`Giáo viên ${instructor.name}`}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          </div>

          <h3 className="font-sans text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {instructor.name}
          </h3>

          {/* Đánh giá thật */}
          <div className="mb-4 flex items-center justify-center">
            {hasReviews ? (
              <div className="inline-flex items-center gap-1 text-xs font-medium" title="Đánh giá khóa học">
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                <span className="font-semibold text-foreground">
                  {instructor.rating_avg.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  ({instructor.evaluated_count})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">Chưa có đánh giá</span>
            )}
          </div>

          {/* Số lượng học viên & khóa học */}
          <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
            <div className="flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {instructor.student_count.toLocaleString("vi-VN")}
              </span>
              <span>học viên</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {instructor.course_count}
              </span>
              <span>khóa học</span>
            </div>
          </div>
        </div>

        {/* Action visual footer (không lồng button) */}
        <div className="pt-3 border-t border-border/70 mt-2">
          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary group-hover:text-primary-hover">
            <span>Xem hồ sơ</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </Card>
  );
}

export default function InstructorsSection() {
  const { data, isLoading } = useSWR<TopInstructorItem[]>(
    "/users/instructors/top",
    fetcher,
    { revalidateOnFocus: false }
  );

  const instructors = data?.slice(0, 4) || [];

  if (!isLoading && instructors.length === 0) return null;

  return (
    <section className="py-16 bg-background relative overflow-hidden border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header với link Xem tất cả /instructors */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
              Đội ngũ giáo viên nổi bật
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Khám phá giảng viên và các khóa học đang được công khai trên Mây Mây
            </p>
          </div>

          <Link
            href="/instructors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors shrink-0"
          >
            <span>Xem tất cả giáo viên</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="text-center rounded-[24px] p-6 space-y-4">
                <Skeleton variant="circle" className="w-20 h-20 mx-auto" />
                <Skeleton variant="text" className="w-3/4 mx-auto" />
                <Skeleton variant="text" className="h-3 w-1/2 mx-auto" />
                <div className="pt-2 flex justify-center gap-4">
                  <Skeleton variant="text" className="h-4 w-16" />
                  <Skeleton variant="text" className="h-4 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {instructors.map((instructor) => (
              <TopInstructorCard key={instructor.id} instructor={instructor} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
