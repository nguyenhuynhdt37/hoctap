"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Flame,
  Gift,
  GraduationCap,
  MessageCircle,
  Star,
} from "pulsoicon-react";
import useSWR from "swr";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import { EmblemIcon, FramedAvatar, TitleBadge } from "@/components/learning-hub/shop/item-art";
import type { Equipment } from "@/lib/learning-hub/shop-types";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { QAMarkdownContent } from "../learning_detail/qa/qa-media-content";

interface MemberPublicProfile {
  id: string;
  fullname: string;
  avatar: string | null;
  bio: string | null;
  joined_at: string | null;
  is_lecturer: boolean;
  gamification: {
    level: number;
    current_streak: number;
    equipment?: Equipment;
  };
  stats: {
    enrolled_courses_count: number;
    completed_lessons_count: number;
    gifts_sent_count: number;
    reviews_count: number;
  };
  recent_courses: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
    level: string | null;
    rating_avg: number;
  }>;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

const fetchMemberProfile = async (url: string) => {
  const res = await api.get<MemberPublicProfile>(url);
  return res.data;
};

export function MemberProfileView({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { data: profile, error, isLoading } = useSWR<MemberPublicProfile>(
    memberId ? `/learning/player/members/${memberId}/profile` : null,
    fetchMemberProfile,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-64 rounded-[30px]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((k) => (
            <Skeleton key={k} className="h-28 rounded-[22px]" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-[26px]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Card className="rounded-[28px] border-primary-pastel bg-surface p-10 shadow-xs">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Không tìm thấy hồ sơ thành viên
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hồ sơ này có thể đã thay đổi hoặc không còn tồn tại trên Mây Mây.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.back()} leftIcon={<ArrowLeft className="size-4" />}>
              Quay lại
            </Button>
            <Link
              href="/my-learning"
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Về Khóa học của tôi
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const level = profile.gamification?.level ?? 1;
  const streak = profile.gamification?.current_streak ?? 0;
  const equipment = profile.gamification?.equipment;
  const joinedLabel = profile.joined_at
    ? new Date(profile.joined_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-20 text-foreground">
      {/* Đốm mây Ambient Pastel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/3 -z-10 h-80 w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-light/80 via-secondary/35 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-48 -right-24 -z-10 h-80 w-80 rounded-full bg-accent/30 blur-3xl"
      />

      <div className="mx-auto max-w-5xl space-y-7 px-4 pt-7 sm:px-6 lg:px-8">
        {/* Thanh quay lại */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
          >
            <ArrowLeft className="size-3.5" animated={false} aria-hidden="true" />
            <span>Quay lại</span>
          </button>

          {profile.is_lecturer && (
            <Link
              href={`/instructors/${profile.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
            >
              <GraduationCap className="size-4" animated={false} aria-hidden="true" />
              <span>Xem Hồ sơ Giảng viên</span>
              <ArrowUpRight className="size-3.5" animated={false} aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* ── HERO IDENTITY STAGE (TRANG BỊ 3D + DANH HIỆU + STREAK + NHÀ HẢO TÂM) ── */}
        <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-secondary/45 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
            {/* Avatar 3D lớn kèm Huy hiệu */}
            <div className="relative shrink-0">
              <FramedAvatar
                src={profile.avatar ? getImageUrl(profile.avatar) : null}
                name={profile.fullname}
                equipment={equipment}
                className="size-24 text-2xl sm:size-28"
              />
              <EmblemIcon
                item={equipment?.emblem}
                decorative
                className="absolute -right-1 -bottom-1 size-8 rounded-full ring-4 ring-surface"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge variant="info" className="px-3 py-0.5 text-[11px] font-extrabold">
                  Thành viên Mây Mây
                </Badge>
                {profile.is_lecturer && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla px-2.5 py-0.5 text-[11px] font-extrabold text-accent-vanilla-foreground">
                    <GraduationCap className="size-3.5" animated={false} aria-hidden="true" />
                    Giảng viên
                  </span>
                )}
                {profile.stats.gifts_sent_count > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-secondary-pastel bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold text-secondary-foreground">
                    <Gift className="size-3.5" animated={false} aria-hidden="true" />
                    Nhà hảo tâm · Đã tặng {profile.stats.gifts_sent_count} khóa
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {profile.fullname}
                </h1>
                <TitleBadge item={equipment?.title} />
              </div>

              {/* Dải Gamification: Cấp độ + Streak + Ngày tham gia */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 py-1 font-extrabold text-primary shadow-2xs">
                  <Award className="size-3.5" animated={false} aria-hidden="true" />
                  Cấp {level}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/70 px-3 py-1 font-extrabold text-accent-vanilla-foreground shadow-2xs">
                  <Flame className="size-3.5" solid animated={false} aria-hidden="true" />
                  Chuỗi {streak} ngày
                </span>

                {joinedLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 font-semibold text-muted-foreground">
                    <Calendar className="size-3.5 text-primary" animated={false} aria-hidden="true" />
                    Tham gia từ {joinedLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO 4 Ô THÀNH TÍCH ── */}
        <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-[22px] border border-primary-pastel/70 bg-surface p-4 shadow-2xs sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <BookOpen className="size-4 text-primary" animated={false} aria-hidden="true" />
              Khóa đang theo học
            </div>
            <div className="mt-2 text-2xl font-black text-foreground tabular-nums">
              {profile.stats.enrolled_courses_count}
            </div>
          </div>

          <div className="rounded-[22px] border border-success-border/80 bg-success-bg/35 p-4 shadow-2xs sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-success-foreground">
              <CheckCircle2 className="size-4" animated={false} aria-hidden="true" />
              Bài đã chinh phục
            </div>
            <div className="mt-2 text-2xl font-black text-success-foreground tabular-nums">
              {profile.stats.completed_lessons_count}
            </div>
          </div>

          <div className="rounded-[22px] border border-secondary-pastel bg-secondary/40 p-4 shadow-2xs sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-secondary-foreground">
              <Gift className="size-4" animated={false} aria-hidden="true" />
              Khóa đã tặng bạn bè
            </div>
            <div className="mt-2 text-2xl font-black text-secondary-foreground tabular-nums">
              {profile.stats.gifts_sent_count}
            </div>
          </div>

          <div className="rounded-[22px] border border-accent-vanilla-border bg-accent-vanilla/45 p-4 shadow-2xs sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-vanilla-foreground">
              <MessageCircle className="size-4" animated={false} aria-hidden="true" />
              Đánh giá đóng góp
            </div>
            <div className="mt-2 text-2xl font-black text-accent-vanilla-foreground tabular-nums">
              {profile.stats.reviews_count}
            </div>
          </div>
        </section>

        {/* ── TIỂU SỬ CÁ NHÂN ── */}
        <section className="rounded-[26px] border border-border/80 bg-surface p-5 shadow-2xs sm:p-6">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">
            Giới thiệu bản thân
          </h2>
          {profile.bio?.trim() ? (
            <QAMarkdownContent content={profile.bio} />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {profile.fullname} là một thành viên tích cực trên Học viện trên mây Mây Mây.
            </p>
          )}
        </section>

        {/* ── KỆ KHÓA HỌC ĐỒNG HÀNH (16:9 ASPECT-VIDEO) ── */}
        {profile.recent_courses.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">
                Khóa học {profile.fullname} đang theo đuổi
              </h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {profile.recent_courses.length} khóa nổi bật
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {profile.recent_courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group overflow-hidden rounded-[22px] border border-border bg-surface shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-md"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-primary-light/40">
                    <img
                      src={getImageUrl(course.thumbnail_url || "/logo/studynest-logo.svg")}
                      alt={course.title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {course.level && (
                      <span className="absolute top-3 left-3 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[10px] font-bold text-primary backdrop-blur-xs">
                        {LEVEL_LABELS[course.level.toLowerCase()] ?? course.level}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-display text-base font-bold text-foreground transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star
                          className="size-3.5 text-accent-vanilla-foreground"
                          solid
                          animated={false}
                          aria-hidden="true"
                        />
                        {course.rating_avg.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        Xem khóa học
                        <ArrowUpRight className="size-3.5" animated={false} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
