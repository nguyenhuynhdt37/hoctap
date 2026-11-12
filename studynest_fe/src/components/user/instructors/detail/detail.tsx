"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, ExternalLink, Facebook, GraduationCap, Heart, Star, Users } from "lucide-react";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useSavedInstructors } from "@/hooks/user/use-saved-instructors";
import type { InstructorDetailProfile } from "@/types/user/instructor";
import useSWR from "swr";

const fetcher = <T,>(url: string) => api.get<T>(url).then((res) => res.data);

interface InstructorDetailProps {
  instructorId: string;
  initialProfile?: InstructorDetailProfile | null;
  initialUnavailable?: boolean;
}

export default function InstructorDetail({
  instructorId,
  initialProfile,
}: InstructorDetailProps) {
  const [imgError, setImgError] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<InstructorDetailProfile>(
    `/users/instructors/${encodeURIComponent(instructorId)}`,
    fetcher,
    {
      fallbackData: initialProfile ?? undefined,
      revalidateOnFocus: false,
    }
  );

  const { isSaved, isPending, toggleSave, isReady, fetchError: savedError, retry: retrySaved } = useSavedInstructors(data?.id ? [data.id] : []);

  const initials = useMemo(() => {
    const parts = (data?.name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "GV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [data?.name]);

  if (isLoading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-[28px] border border-border bg-surface p-6 sm:p-8">
          <Skeleton variant="circle" className="w-28 h-28 sm:w-32 sm:h-32" />
          <div className="space-y-3 flex-1 text-center sm:text-left w-full">
            <Skeleton variant="text" className="h-6 w-1/3 mx-auto sm:mx-0" />
            <Skeleton variant="text" className="h-4 w-1/2 mx-auto sm:mx-0" />
            <div className="flex justify-center sm:justify-start gap-4 pt-2">
              <Skeleton variant="text" className="h-8 w-24" />
              <Skeleton variant="text" className="h-8 w-24" />
            </div>
          </div>
        </div>
        <div className="h-48 rounded-[24px] bg-surface border border-border" />
      </div>
    );
  }

  // Phân biệt rõ lỗi 404/422 (không tìm thấy) với lỗi mạng/5xx (không thể kết nối)
  if (error || !data) {
    const isNotFound =
      (error as { response?: { status?: number } })?.response?.status === 404 ||
      (error as { response?: { status?: number } })?.response?.status === 422;

    if (isNotFound) {
      return (
        <Card className="rounded-[28px] border-destructive-border bg-destructive-bg/30 p-10 text-center">
          <h3 className="text-lg font-semibold text-destructive-foreground mb-2">
            Không tìm thấy thông tin giáo viên
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Hồ sơ giáo viên này không tồn tại hoặc hiện không đủ điều kiện công khai.
          </p>
          <Link
            href="/instructors"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-surface px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary-pastel shadow-2xs transition-colors"
          >
            Xem danh sách giáo viên
          </Link>
        </Card>
      );
    }

    // Lỗi mạng hoặc máy chủ không khả dụng (5xx, timeout)
    return (
      <Card className="rounded-[28px] border-destructive-border bg-destructive-bg/30 p-10 text-center space-y-4">
        <h3 className="text-lg font-semibold text-destructive-foreground">
          Không thể kết nối đến máy chủ
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Đã xảy ra lỗi khi tải hồ sơ giáo viên. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="md" onClick={() => mutate()}>
            Thử lại
          </Button>
          <Link
            href="/instructors"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-surface px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-hover hover:border-primary-pastel shadow-2xs transition-colors"
          >
            Quay lại danh sách
          </Link>
        </div>
      </Card>
    );
  }

  const hasReviews = (data.rating_count > 0 || data.evaluated_count > 0) && data.rating_avg > 0;
  const ratingCount = data.rating_count || data.evaluated_count || 0;
  const saved = isSaved(data.id);
  const saving = isPending(data.id);

  // An toàn với Facebook URL
  const isSafeFacebookUrl = (() => {
    if (!data.facebook_url) return false;
    try {
      const url = new URL(data.facebook_url);
      return ["http:", "https:"].includes(url.protocol)
        && ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com"].includes(url.hostname)
        && !url.username && !url.password && !url.port;
    } catch {
      return false;
    }
  })();

  return (
    <div className="space-y-8">
      {savedError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-foreground"><span>Chưa tải được trạng thái giảng viên đã lưu.</span><Button variant="outline" size="sm" onClick={() => retrySaved()}>Thử lại</Button></div>}
      {/* 1. Header Card Hồ Sơ Giảng Viên */}
      <div className="relative overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-surface/90 p-6 sm:p-8 shadow-xs backdrop-blur-xl">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-light/50 blur-3xl -z-10"
          aria-hidden="true"
        />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 border-primary-light bg-primary-light/50 p-1 shadow-sm">
              {!data.avatar || imgError ? (
                <div className="h-full w-full flex items-center justify-center rounded-full bg-primary-light text-primary font-bold text-2xl sm:text-3xl select-none">
                  {initials}
                </div>
              ) : (
                <img
                  src={getImageUrl(data.avatar)}
                  alt={`Giáo viên ${data.name}`}
                  className="h-full w-full rounded-full object-cover"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          </div>

          {/* Thông tin chính & Stats */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {data.name}
                </h1>
                {data.short_bio && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {data.short_bio}
                  </p>
                )}
              </div>

              {/* Nút lưu giảng viên */}
              <div className="shrink-0 self-center sm:self-start">
                <Button
                  variant={saved ? "pastel" : "outline"}
                  size="sm"
                  onClick={() => { void toggleSave(data.id).catch(() => { /* Hook displays the error. */ }); }}
                  disabled={saving || !isReady}
                  leftIcon={
                    <Heart
                      className={`w-4 h-4 transition-transform ${saved ? "fill-secondary-foreground text-secondary-foreground" : "text-muted-foreground"}`}
                    />
                  }
                  className={saved ? "border-secondary-pastel text-secondary-foreground bg-secondary-light/80" : ""}
                >
                  {saved ? "Đang theo dõi" : "Lưu giáo viên"}
                </Button>
              </div>
            </div>

            {/* Badges môn học & đơn vị */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
              {data.subjects?.map((sub) => (
                <Badge key={sub.id} variant="primary" className="text-xs font-medium px-2.5 py-1">
                  Môn {sub.name}
                </Badge>
              ))}

              {data.providers?.map((p) => (
                <Link key={p.id} href={`/providers/${encodeURIComponent(p.slug)}`} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Badge variant="vanilla" className="text-xs font-medium px-2.5 py-1 hover:underline">
                    {p.name}
                  </Badge>
                </Link>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 pt-3 border-t border-border/70 text-xs sm:text-sm">
              {/* Đánh giá khóa học */}
              <div className="flex items-center gap-1.5">
                {hasReviews ? (
                  <>
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-bold text-foreground">{data.rating_avg.toFixed(1)}</span>
                    <span className="text-muted-foreground">({ratingCount} đánh giá khóa học)</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Chưa có đánh giá</span>
                )}
              </div>

              {/* Học viên */}
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{data.student_count.toLocaleString("vi-VN")}</span>
                <span className="text-muted-foreground">học viên</span>
              </div>

              {/* Khóa học */}
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">
                  {data.public_course_count ?? data.course_count ?? 0}
                </span>
                <span className="text-muted-foreground">khóa học</span>
              </div>

              {/* Link Facebook an toàn */}
              {isSafeFacebookUrl && (
                <a
                  href={data.facebook_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium ml-auto"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Khối Thông Tin Chuyên Môn & Giới Thiệu An Toàn */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Cột trái: Khối lớp & Kỳ thi */}
        <div className="space-y-6 md:col-span-1">
          <Card className="rounded-[24px] border-border/80 bg-surface p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-foreground border-b border-border/70 pb-2.5">
              Phạm vi giảng dạy
            </h3>

            {/* Khối lớp */}
            {data.grades && data.grades.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Khối lớp
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.grades.map((g) => (
                    <Badge key={g.id} variant="outline" className="text-xs">
                      {g.grade_number ? `Lớp ${g.grade_number}` : g.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Kỳ thi */}
            {data.exams && data.exams.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kỳ thi ôn luyện
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.exams.map((ex) => (
                    <Badge key={ex.id} variant="secondary" className="text-xs">
                      {ex.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Mục tiêu học tập */}
            {data.learning_goals && data.learning_goals.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mục tiêu đào tạo
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.learning_goals.map((g) => (
                    <Badge key={g.id} variant="vanilla" className="text-xs">
                      {g.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Cột phải: Tiểu Sử & Giới Thiệu (Safe Plain Escaped Text) */}
        <div className="space-y-6 md:col-span-2">
          <Card className="rounded-[24px] border-border/80 bg-surface p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground border-b border-border/70 pb-3">
              Giới thiệu giáo viên
            </h2>

            {data.instructor_description ? (
              <div className="text-sm sm:text-base leading-relaxed text-foreground/85 whitespace-pre-line">
                {data.instructor_description}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Thông tin giới thiệu chi tiết của giáo viên đang được cập nhật.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
