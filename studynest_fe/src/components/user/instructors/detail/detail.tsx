"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Crown,
  ExternalLink,
  Facebook,
  GraduationCap,
  Heart,
  Layers,
  Share2,
  Star,
  Target,
  Users,
} from "pulsoicon-react";
import { Button, Card, Skeleton } from "@/components/ui";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useSavedInstructors } from "@/hooks/user/use-saved-instructors";
import type { InstructorDetailProfile } from "@/types/user/instructor";

const fetcher = <T,>(url: string) => api.get<T>(url).then((res) => res.data);

interface InstructorDetailProps {
  instructorId: string;
  initialProfile?: InstructorDetailProfile | null;
  initialUnavailable?: boolean;
}

const GRADE_TIERS = [
  { label: "Tiểu học", grades: [1, 2, 3, 4, 5], tone: "bg-primary-light text-primary border-primary-pastel" },
  { label: "THCS", grades: [6, 7, 8, 9], tone: "bg-accent/70 text-accent-foreground border-accent-border" },
  { label: "THPT", grades: [10, 11, 12], tone: "bg-accent-vanilla/80 text-accent-vanilla-foreground border-accent-vanilla-border" },
] as const;

export default function InstructorDetail({
  instructorId,
  initialProfile,
}: InstructorDetailProps) {
  const [imgError, setImgError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<InstructorDetailProfile>(
    `/users/instructors/${encodeURIComponent(instructorId)}`,
    fetcher,
    {
      fallbackData: initialProfile ?? undefined,
      revalidateOnFocus: false,
    },
  );

  const {
    isSaved,
    isPending,
    toggleSave,
    isReady,
    fetchError: savedError,
    retry: retrySaved,
  } = useSavedInstructors(data?.id ? [data.id] : []);

  const initials = useMemo(() => {
    const parts = (data?.name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "GV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [data?.name]);

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-72 rounded-[2rem]" />
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-52 rounded-[26px] lg:col-span-7" />
          <Skeleton className="h-52 rounded-[26px] lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isNotFound =
      (error as { response?: { status?: number } })?.response?.status === 404 ||
      (error as { response?: { status?: number } })?.response?.status === 422;

    if (isNotFound) {
      return (
        <Card className="rounded-[28px] border-destructive-border bg-destructive-bg/30 p-10 text-center">
          <h3 className="mb-2 text-lg font-semibold text-destructive-foreground">
            Không tìm thấy thông tin giáo viên
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Hồ sơ giáo viên này không tồn tại hoặc hiện không đủ điều kiện công khai.
          </p>
          <Link
            href="/instructors"
            className="inline-flex items-center justify-center rounded-full border border-input bg-surface px-5 py-2.5 text-xs font-bold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light"
          >
            Xem danh sách giáo viên
          </Link>
        </Card>
      );
    }

    return (
      <Card className="space-y-4 rounded-[28px] border-destructive-border bg-destructive-bg/30 p-10 text-center">
        <h3 className="text-lg font-semibold text-destructive-foreground">
          Không thể kết nối đến máy chủ
        </h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Đã xảy ra lỗi khi tải hồ sơ giáo viên. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="md" onClick={() => mutate()}>
            Thử lại
          </Button>
          <Link
            href="/instructors"
            className="inline-flex items-center justify-center rounded-full border border-input bg-surface px-5 py-2.5 text-xs font-bold text-foreground hover:border-primary-pastel"
          >
            Quay lại danh sách
          </Link>
        </div>
      </Card>
    );
  }

  const hasReviews = (data.rating_count > 0 || data.evaluated_count > 0) && data.rating_avg > 0;
  const ratingCount = data.rating_count || data.evaluated_count || 0;
  const courseTotal = data.public_course_count ?? data.course_count ?? 0;
  const saved = isSaved(data.id);
  const saving = isPending(data.id);

  const joinedLabel = (() => {
    const raw = data.first_public_course_at || data.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return `Tháng ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  const isSafeFacebookUrl = (() => {
    if (!data.facebook_url) return false;
    try {
      const parsed = new URL(data.facebook_url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  })();

  const taughtGradeSet = new Set(
    (data.grades ?? [])
      .map((g) => g.grade_number)
      .filter((n): n is number => typeof n === "number" && n > 0),
  );

  function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).catch(() => undefined);
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div id="tong-quan-giao-vien" className="scroll-mt-24 space-y-6">
      {savedError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-xs font-semibold text-warning-foreground"
        >
          <span>Chưa tải được trạng thái yêu thích.</span>
          <Button variant="outline" size="sm" onClick={() => retrySaved()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* ── HERO PORTFOLIO POSTER 2 NGĂN (CLOUDY BLUE PASTEL) ── */}
      <header className="relative isolate overflow-hidden rounded-[2.25rem] border border-primary-pastel/80 bg-gradient-to-br from-surface via-primary-light/60 to-secondary/30 p-6 shadow-md sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-primary-pastel/55 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-80 rounded-full bg-accent/55 blur-3xl"
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:items-center">
          {/* Ngăn trái: Chân dung Organic Blob + Thông tin định danh */}
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative size-28 shrink-0 sm:size-36">
              <div
                aria-hidden="true"
                className="absolute -inset-2.5 rounded-[58%_42%_52%_48%/48%_56%_44%_52%] bg-gradient-to-br from-primary-pastel via-accent to-secondary opacity-90"
              />
              <div className="relative size-full overflow-hidden rounded-[58%_42%_52%_48%/48%_56%_44%_52%] border-4 border-surface bg-primary-light shadow-md">
                {!data.avatar || imgError ? (
                  <div className="grid size-full place-items-center font-display text-3xl font-bold text-primary select-none">
                    {initials}
                  </div>
                ) : (
                  <img
                    src={getImageUrl(data.avatar)}
                    alt={`Giáo viên ${data.name}`}
                    className="size-full object-cover"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold tracking-[0.14em] text-primary-foreground uppercase">
                  <Crown className="size-3.5" animated={false} aria-hidden="true" />
                  Giáo viên Mây Mây
                </span>
                {joinedLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <Calendar className="size-3 text-primary" animated={false} aria-hidden="true" />
                    Đồng hành từ {joinedLabel}
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {data.name}
              </h1>

              {data.short_bio && (
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {data.short_bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving || !isReady}
                  onClick={() => void toggleSave(data.id).catch(() => undefined)}
                  aria-pressed={saved}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition-all cursor-pointer",
                    saved
                      ? "border-secondary-pastel bg-secondary text-secondary-foreground shadow-2xs"
                      : "border-primary-pastel bg-surface text-foreground hover:border-secondary-pastel hover:bg-secondary/60",
                    (saving || !isReady) && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Heart className="size-4" solid={saved} aria-hidden="true" />
                  <span>{saved ? "Đã lưu yêu thích" : "Lưu giáo viên"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-4 text-success-foreground" animated={false} aria-hidden="true" />
                      <span>Đã chép liên kết</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="size-4" animated={false} aria-hidden="true" />
                      <span>Chia sẻ hồ sơ</span>
                    </>
                  )}
                </button>

                {isSafeFacebookUrl && data.facebook_url && (
                  <a
                    href={data.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-4 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Facebook className="size-4" animated={false} aria-hidden="true" />
                    <span>Facebook</span>
                    <ExternalLink className="size-3.5" animated={false} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Ngăn phải: Bento 4 Chỉ Số Sống */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-primary-pastel bg-primary-light/70 p-4 shadow-2xs">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
                Khóa học
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-primary tabular-nums">{courseTotal}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Đang mở công khai</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface/95 p-4 shadow-2xs">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                <Users className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                Học viên
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-foreground tabular-nums">
                {data.student_count ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Đã tham gia học</p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/65 p-4 shadow-2xs">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
                <Star className="size-3.5" animated={false} solid={hasReviews} aria-hidden="true" />
                Đánh giá
              </p>
              <p className="mt-1.5 font-display text-3xl font-bold text-accent-vanilla-foreground tabular-nums">
                {hasReviews ? data.rating_avg.toFixed(1) : "Mới"}
              </p>
              <p className="mt-0.5 text-[11px] text-accent-vanilla-foreground/80">
                {hasReviews ? `${ratingCount} lượt nhận xét` : "Chưa có đánh giá"}
              </p>
            </div>

            <div className="rounded-2xl border border-accent-border bg-accent/60 p-4 shadow-2xs">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-accent-foreground uppercase">
                <GraduationCap className="size-3.5" animated={false} aria-hidden="true" />
                Phạm vi
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold text-accent-foreground tabular-nums">
                {data.subjects?.length ?? 0} môn · {data.grades?.length ?? 0} lớp
              </p>
              <p className="mt-0.5 text-[11px] text-accent-foreground/80">Chương trình phổ thông</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── BẢN ĐỒ CHUYÊN MÔN & GIỚI THIỆU (ASYMMETRIC BENTO) ── */}
      <section id="ban-do-chuyen-mon" className="scroll-mt-24 grid gap-5 lg:grid-cols-12">
        {/* Cột 7: Giới thiệu chi tiết & Phương pháp */}
        <article className="flex flex-col justify-between space-y-4 rounded-[28px] border border-border bg-surface p-6 shadow-2xs lg:col-span-7">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-0.5 text-[11px] font-extrabold text-primary uppercase tracking-wider">
              <Layers className="size-3.5" animated={false} aria-hidden="true" />
              Giới thiệu &amp; Phong cách giảng dạy
            </span>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Về {data.name}
            </h2>
            <div className="text-sm leading-relaxed text-muted-foreground">
              {data.instructor_description ? (
                <MarkdownRenderer
                  content={data.instructor_description}
                  isHtml={false}
                  className="prose prose-sm max-w-none text-foreground/90 break-words"
                />
              ) : data.short_bio ? (
                <MarkdownRenderer
                  content={data.short_bio}
                  isHtml={false}
                  className="prose prose-sm max-w-none text-foreground/90 break-words"
                />
              ) : (
                <p>
                  Giáo viên đang xây dựng lộ trình bài giảng trực quan, dễ hiểu và sát chương trình học phổ thông cho học sinh Mây Mây.
                </p>
              )}
            </div>
          </div>

          {/* Kỳ thi & Mục tiêu nếu có */}
          {((data.exams?.length ?? 0) > 0 || (data.learning_goals?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {data.exams?.map((ex) => (
                <span
                  key={ex.id}
                  className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-3 py-1 text-xs font-bold text-accent-vanilla-foreground"
                >
                  <Award className="size-3.5" animated={false} aria-hidden="true" />
                  {ex.name}
                </span>
              ))}
              {data.learning_goals?.map((g) => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary/70 px-3 py-1 text-xs font-bold text-secondary-foreground"
                >
                  <Target className="size-3.5" animated={false} aria-hidden="true" />
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Cột 5: Ma trận Khối lớp 1–12 trực quan */}
        <article className="space-y-4 rounded-[28px] border border-primary-pastel/70 bg-gradient-to-br from-primary-light/40 via-surface to-accent/25 p-6 shadow-2xs lg:col-span-5">
          <div>
            <span className="text-[11px] font-extrabold tracking-[0.16em] text-primary uppercase">
              Bản đồ lớp giảng dạy
            </span>
            <h2 className="mt-0.5 font-display text-xl font-bold text-foreground">
              Khối lớp 1 – 12
            </h2>
          </div>

          <div className="space-y-3">
            {GRADE_TIERS.map((tier) => (
              <div key={tier.label} className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground">{tier.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tier.grades.map((gNum) => {
                    const active = taughtGradeSet.has(gNum);
                    return (
                      <span
                        key={gNum}
                        className={cn(
                          "inline-flex h-8 min-w-14 items-center justify-center rounded-xl border px-2.5 text-xs font-extrabold tabular-nums transition-colors",
                          active
                            ? tier.tone
                            : "border-dashed border-border bg-background/50 text-muted-foreground/45",
                        )}
                      >
                        Lớp {gNum}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Toàn chiều ngang: Ma trận Môn học giảng dạy */}
        {data.subjects && data.subjects.length > 0 && (
          <article className="space-y-3 rounded-[28px] border border-border bg-surface p-6 shadow-2xs lg:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">
                Môn học phụ trách ({data.subjects.length})
              </h2>
              <a
                href="#khoa-hoc-giao-vien"
                className="text-xs font-bold text-primary hover:underline"
              >
                Lọc khóa học theo môn bên dưới ↓
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.subjects.map((sub, idx) => (
                <a
                  key={sub.id}
                  href="#khoa-hoc-giao-vien"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all hover:-translate-y-0.5",
                    idx % 4 === 0
                      ? "border-primary-pastel bg-primary-light/70 text-primary"
                      : idx % 4 === 1
                        ? "border-accent-border bg-accent/60 text-accent-foreground"
                        : idx % 4 === 2
                          ? "border-accent-vanilla-border bg-accent-vanilla/70 text-accent-vanilla-foreground"
                          : "border-secondary-pastel bg-secondary/70 text-secondary-foreground",
                  )}
                >
                  <BookOpen className="size-3.5" animated={false} aria-hidden="true" />
                  <span>{sub.name}</span>
                </a>
              ))}
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
