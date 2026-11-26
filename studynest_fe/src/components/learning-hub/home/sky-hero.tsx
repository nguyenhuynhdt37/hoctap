"use client";

import { Skeleton } from "@/components/ui";
import { academyCover, mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import type { useCurrentLesson } from "@/lib/learning-hub/home-api";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";
import {
  BookOpen,
  Brain,
  Compass,
  Flame,
  MessageCircle,
  Target,
  Trophy,
  Wallet,
} from "pulsoicon-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { EquippedMarks, FramedAvatar } from "../shop/item-art";
import { CloudShape, ProgressRing, TicketCard } from "./home-ui";
import type { getJourneyState } from "./journey-state";
import { homeWidth, number, vietnamTimeZone } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

const hourFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: vietnamTimeZone });

export type Phase = "morning" | "noon" | "afternoon" | "evening" | "night";
type DailyLearningState = ReturnType<typeof useDailyLearningState>;

/** Lấy giờ hiện tại theo múi giờ Việt Nam (0–23), tránh lỗi locale vi-VN trả về chuỗi "22 giờ". */
export function getVietnamHour(timestamp: number): number {
  const hourPart = hourFormat.formatToParts(timestamp).find((part) => part.type === "hour")?.value;
  const parsed = hourPart !== undefined ? Number.parseInt(hourPart, 10) : Number.NaN;
  if (Number.isFinite(parsed)) return ((parsed % 24) + 24) % 24;
  return new Date(timestamp).getHours();
}

export function phaseOf(hour: number): Phase {
  const normalized = Number.isFinite(hour) ? ((Math.floor(hour) % 24) + 24) % 24 : 9;
  if (normalized >= 5 && normalized < 11) return "morning";
  if (normalized >= 11 && normalized < 14) return "noon";
  if (normalized >= 14 && normalized < 18) return "afternoon";
  if (normalized >= 18 && normalized < 22) return "evening";
  return "night";
}

// Bầu trời đổi sắc nhẹ theo 5 khung giờ nhưng luôn giữ 100% nền pastel sáng Cloudy Blue (WCAG AA).
export const sky: Record<Phase, {
  background: string;
  dark: boolean;
  greeting: string;
  mayLine: string;
  cloudOpacity: string;
}> = {
  morning: {
    background: "linear-gradient(135deg, var(--sn-blue-100) 0%, var(--sn-background) 52%, var(--sn-vanilla-50) 100%)",
    dark: false,
    greeting: "Chào buổi sáng",
    mayLine: "Sáng trong lành, học một bài nhé.",
    cloudOpacity: "opacity-90",
  },
  noon: {
    background: "linear-gradient(135deg, var(--sn-blue-100) 0%, var(--sn-blue-50) 56%, var(--sn-white) 100%)",
    dark: false,
    greeting: "Chào buổi trưa",
    mayLine: "Trưa rồi, học nhẹ rồi nghỉ nhé.",
    cloudOpacity: "opacity-95",
  },
  afternoon: {
    background: "linear-gradient(135deg, var(--sn-lavender-50) 0%, var(--sn-pink-50) 54%, var(--sn-vanilla-50) 100%)",
    dark: false,
    greeting: "Chào buổi chiều",
    mayLine: "Chiều dịu rồi, tiến thêm chút nhé.",
    cloudOpacity: "opacity-85",
  },
  evening: {
    background: "linear-gradient(135deg, var(--sn-blue-100) 0%, var(--sn-lavender-100) 55%, var(--sn-pink-50) 100%)",
    dark: false,
    greeting: "Chào buổi tối",
    mayLine: "Tối nay mình học cùng bạn nhé.",
    cloudOpacity: "opacity-80",
  },
  night: {
    background: "linear-gradient(135deg, var(--sn-blue-100) 0%, var(--sn-background) 55%, var(--sn-lavender-100) 100%)",
    dark: false,
    greeting: "Chào buổi tối muộn",
    mayLine: "Xong bài này nhớ ngủ sớm nhé.",
    cloudOpacity: "opacity-75",
  },
};

const QUICK_LINKS = [
  { href: "/my-learning", label: "Khóa học của tôi", icon: BookOpen, tone: "bg-primary-light text-primary border-primary-pastel" },
  { href: "/learning-paths/my", label: "Lộ trình 1–12", icon: Compass, tone: "bg-accent text-accent-foreground border-accent-border" },
  { href: "/missions", label: "Nhiệm vụ Coin", icon: Target, tone: "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border" },
  { href: "/review", label: "Ôn tập hôm nay", icon: Brain, tone: "bg-secondary-light text-secondary-foreground border-secondary-pastel" },
  { href: "/wallets", label: "Ví & Coin", icon: Wallet, tone: "bg-success-bg text-success-foreground border-success-border" },
] as const;

const eveningStars: [number, number, number][] = [
  [12, 16, 2], [28, 12, 3], [44, 20, 2], [62, 10, 3], [74, 24, 2], [86, 14, 2], [93, 28, 3],
];
const nightStars: [number, number, number][] = [
  [6, 14, 3], [14, 38, 2], [21, 10, 2], [31, 28, 3], [38, 14, 2], [48, 38, 2],
  [55, 22, 2], [63, 12, 3], [71, 34, 2], [79, 8, 3], [86, 26, 2], [94, 14, 3],
  [18, 24, 2], [42, 8, 3], [67, 20, 2], [90, 36, 2],
];
const shootingStars = [
  { left: "78%", top: "14%", duration: "11s", delay: "1.5s" },
  { left: "36%", top: "10%", duration: "15s", delay: "6.5s" },
];
const clouds = [
  { className: "top-[16%] -left-[6%] w-56 text-surface/80 lg:w-80", drift: "110s" },
  { className: "top-[48%] right-[2%] w-40 text-surface/70 lg:w-64", drift: "80s" },
  { className: "top-[6%] left-[40%] w-32 text-surface/60 lg:w-44", drift: "130s" },
];

function CrescentMoon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <path
        d="M42.5 8.5A24 24 0 1 0 55.5 44.5A20 20 0 0 1 42.5 8.5Z"
        fill="var(--sn-vanilla-100)"
      />
    </svg>
  );
}

function SkyScene({ phase }: { phase: Phase }) {
  const isEvening = phase === "evening";
  const isNight = phase === "night";
  const starsToRender = isNight ? nightStars : isEvening ? eveningStars : [];
  const sunBody: Partial<Record<Phase, { className: string; glow: string }>> = {
    morning: {
      className: "left-[7%] top-[34%] size-24 text-accent-vanilla bg-accent-vanilla",
      glow: "0 0 0 1.3rem color-mix(in srgb, currentColor 32%, transparent), 0 0 6.5rem 1.8rem color-mix(in srgb, currentColor 45%, transparent)",
    },
    noon: {
      className: "left-[46%] top-[5%] size-20 text-accent-vanilla bg-accent-vanilla",
      glow: "0 0 0 1.6rem color-mix(in srgb, currentColor 38%, transparent), 0 0 8rem 2.5rem color-mix(in srgb, currentColor 52%, transparent)",
    },
    afternoon: {
      className: "right-[12%] top-[34%] size-32 text-secondary-pastel bg-secondary-pastel",
      glow: "0 0 0 1.5rem color-mix(in srgb, currentColor 30%, transparent), 0 0 7.5rem 2.2rem color-mix(in srgb, currentColor 45%, transparent)",
    },
  };
  const sun = sunBody[phase];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {sun && (
        <span className={cn("absolute rounded-full", sun.className)} style={{ boxShadow: sun.glow }} />
      )}
      {isEvening && (
        <CrescentMoon className="absolute top-[10%] right-[15%] size-14 drop-shadow-[0_0_18px_color-mix(in_srgb,var(--sn-vanilla-100)_45%,transparent)]" />
      )}
      {isNight && (
        <span
          className="absolute top-[7%] left-[46%] size-16 rounded-full bg-accent-vanilla text-accent-vanilla"
          style={{ boxShadow: "0 0 0 0.9rem color-mix(in srgb, currentColor 16%, transparent), 0 0 4.5rem 1rem color-mix(in srgb, currentColor 28%, transparent)" }}
        />
      )}
      {starsToRender.map(([left, top, size], index) => (
        <span key={index} className={cn("absolute rounded-full bg-surface", index % 2 === 0 && "sky-twinkle")}
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${index * 0.35}s` }} />
      ))}
      {isNight && shootingStars.map((star) => (
        <span
          key={star.left}
          className="sky-shoot absolute h-0.5 w-20 rounded-full bg-gradient-to-l from-transparent via-surface/70 to-surface opacity-0 motion-reduce:hidden"
          style={{ left: star.left, top: star.top, animationDelay: star.delay, "--shoot-duration": star.duration } as CSSProperties}
        />
      ))}
      {clouds.map(({ className, drift }) => (
        <span key={className} className={cn("sky-drift absolute block", sky[phase].cloudOpacity, className)} style={{ "--drift": drift } as CSSProperties}>
          <CloudShape className="w-full" />
        </span>
      ))}
    </div>
  );
}

/** Dải mây phía dưới hero nối vào nền trang. */
function CloudBank() {
  const bumps = [[0, 40], [110, 58], [250, 46], [390, 66], [540, 44], [680, 60], [820, 48], [960, 68], [1100, 46], [1240, 60], [1380, 50]];
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 w-full lg:h-24">
      <g className="fill-surface/60">{bumps.map(([x, r], i) => <circle key={i} cx={x + 40} cy={122 - r * 0.2} r={r + 14} />)}</g>
      <g className="fill-background">{bumps.map(([x, r], i) => <circle key={i} cx={x} cy={128 - r * 0.3} r={r} />)}<rect x="0" y="96" width="1440" height="24" /></g>
    </svg>
  );
}

function HeroTicket({ current, isNew }: { current: ReturnType<typeof useCurrentLesson>; isNew: boolean }) {
  const { course, lesson, section } = current;
  const percent = Math.min(100, Math.max(0, Math.round(course?.progress_percent ?? 0)));

  if (current.error) {
    return <HubLoadError error={current.error} title="Chưa tải được bài đang học" message="Tải lại để tìm bài gần nhất và mở đúng gia sư của bài." onRetry={current.retry} isRetrying={current.isValidating} />;
  }
  if (current.isLoading && !isNew) {
    return <Skeleton role="status" aria-label="Đang tải khóa đang học" className="aspect-[16/12] w-full rounded-[1.5rem] bg-surface/70 motion-reduce:animate-none" />;
  }
  return (
    <TicketCard src={course?.thumbnail_url} alt={course ? `Ảnh bìa khóa học ${course.title}` : ""} priority fallback={academyCover}
      sizes="(min-width: 1280px) 520px, (min-width: 1024px) 40vw, 88vw" className="drop-shadow-lg" captionClassName="flex min-h-24 items-center gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        {course ? (
          <>
            <p title={course.title} className="line-clamp-1 text-base font-bold">{course.title}</p>
            <p title={lesson?.title} className="line-clamp-2 text-sm">{[section?.title, lesson?.title].filter(Boolean).join(" · ") || "Chọn bài để học tiếp"}</p>
          </>
        ) : (
          <>
            <p className="text-base font-bold">{isNew ? "Khóa đầu tiên của bạn" : "Bạn đã học hết các khóa"}</p>
            <p className="text-sm">{isNew ? "Chọn cấp lớp, chọn khóa rồi học thử cùng Mây." : "Chọn khóa mới ở phần Gợi ý bên dưới."}</p>
          </>
        )}
      </div>
      {course && (
        <ProgressRing value={percent} label="Tiến độ khóa học" size={56} stroke={6} className="shrink-0">
          <span className="text-xs font-bold tabular-nums">{percent}%</span>
        </ProgressRing>
      )}
    </TicketCard>
  );
}

function LearningStats({ daily }: { daily: DailyLearningState }) {
  const { xp, source, streak, board: { overview } } = daily;
  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface/90 px-3.5 text-sm font-semibold text-foreground shadow-ambient-sm";
  return (
    <>
      {streak.error && !streak.data ? (
        <HubLoadError error={streak.error} title="Chưa tải được chuỗi ngày học" message="Tải lại để lấy chuỗi ngày mới nhất." onRetry={() => void streak.mutate().catch(() => undefined)} isRetrying={streak.isValidating} />
      ) : streak.data ? (
        <span className={chip} title={`Kỷ lục ${number.format(streak.data.best_streak)} ngày`}>
          <Flame aria-hidden="true" className="size-4 text-warning-foreground" /> {number.format(streak.data.current_streak)} ngày liên tiếp
          <span className="sr-only">. Kỷ lục {number.format(streak.data.best_streak)} ngày.</span>
        </span>
      ) : <Skeleton role="status" aria-label="Đang tải chuỗi ngày học" className="h-10 w-36 rounded-full bg-surface/70 motion-reduce:animate-none" />}
      {overview.error ? (
        <HubLoadError error={overview.error} title="Chưa tải được XP" message="Tải lại để xem cấp học tập và XP." onRetry={() => void overview.mutate().catch(() => undefined)} isRetrying={overview.isValidating} />
      ) : xp ? (
        <Link href="/levels" className={cn(chip, "min-h-11 hover:underline")}>
          <Trophy aria-hidden="true" className="size-4 text-accent-foreground" /> Cấp {number.format(xp.level)} · {number.format(xp.total_xp)} XP tích lũy
          <MockDataChip source={source} />
        </Link>
      ) : <Skeleton role="status" aria-label="Đang tải XP" className="h-10 w-32 rounded-full bg-surface/70 motion-reduce:animate-none" />}
    </>
  );
}

export function SkyHero({ daily, journey, action, actionDetail, current, chapterReview, children }: {
  daily: DailyLearningState;
  journey: ReturnType<typeof getJourneyState>;
  action?: ReactNode;
  actionDetail?: string;
  current: ReturnType<typeof useCurrentLesson>;
  chapterReview?: { title: string; sample: boolean };
  children: ReactNode;
}) {
  const name = useUserStore((state) => state.user?.fullname?.trim());
  const avatar = useUserStore((state) => state.user?.avatar);
  const equipment = useLearnerEquipment();
  const hour = getVietnamHour(daily.now);
  const phase = phaseOf(hour);
  const { greeting, mayLine: phaseMayLine } = sky[phase];
  const { active, isNew, complete, hasError, loading, remaining, returning } = journey;

  let status: string;
  if (complete) status = isNew ? "Bạn đã mở bài học thử đầu tiên." : "Bạn đã xong hành trình hôm nay!";
  else if (hasError) status = active ? "Bạn có thể tiếp tục với các chặng đã tải được." : "Có chặng chưa tải được. Thử lại để cập nhật hành trình.";
  else if (isNew) status = remaining === 3 ? "Ba bước để học thử khóa đầu tiên." : `Còn ${remaining} bước để bắt đầu học thử.`;
  else if (loading) status = "Đang cập nhật hành trình hôm nay…";
  else status = `Còn ${remaining} bước nữa là xong hôm nay.`;

  const headline = complete ? (isNew ? "Bài học thử đã mở" : "Hôm nay bạn xong rồi")
    : isNew ? "Bắt đầu với khóa đầu tiên"
      : returning ? "Mây vui vì bạn quay lại"
        : active === "study" ? "Bài tiếp theo đang chờ bạn"
          : active === "review" ? "Ôn nhanh vài câu nhé"
            : active === "missions" ? "Còn vài nhiệm vụ hôm nay"
              : active === "reward" ? "Có phần thưởng đang chờ"
                : "Hành trình hôm nay";
  const mayLine = returning ? "Bắt đầu nhẹ nhàng, 5 phút thôi." : isNew ? "Mình sẽ dẫn bạn chọn khóa nhé." : complete ? "Nghỉ ngơi một chút nhé." : phaseMayLine;

  return (
    <section aria-labelledby="learning-home-title" className="relative">
      <div data-sky-phase={phase} className="relative isolate overflow-hidden border-b border-border/70 pt-6 pb-20 text-foreground sm:pt-8 lg:pb-24" style={{ background: sky[phase].background }}>
        <SkyScene phase={phase} />
        <div className={cn(homeWidth, "grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-10")}>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <FramedAvatar src={avatar} name={name} equipment={equipment} className="size-12 text-sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary sm:text-base wrap-anywhere">{greeting}, {name || "bạn"}</p>
                <EquippedMarks equipment={equipment} className="mt-1" />
              </div>
            </div>
            <h1 id="learning-home-title" className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.12] font-bold tracking-tight text-foreground text-balance">{headline}</h1>
            <p id="journey-status" tabIndex={-1} role="status" className="mt-2.5 w-fit rounded-sm text-base leading-relaxed text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">{status}</p>
            {action && (
              <div data-journey-action className="mt-5 flex flex-wrap items-center gap-3">
                <div className="[&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">{action}</div>
                {actionDetail && <p id="journey-action-detail" title={actionDetail} className="max-w-[28rem] truncate text-sm font-medium text-muted-foreground">{actionDetail}</p>}
              </div>
            )}
            {(chapterReview || (active === "study" && current.tutorHref)) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-foreground">
                {chapterReview && <span className="inline-flex flex-wrap items-center gap-2">{chapterReview.title} cần ôn {chapterReview.sample && <MockDataChip source="mock" />}</span>}
                {active === "study" && current.tutorHref && (
                  <Link href={current.tutorHref} className="inline-flex min-h-10 items-center gap-1.5 rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <MessageCircle aria-hidden="true" className="size-4" /> Hỏi Mây về bài này
                  </Link>
                )}
              </div>
            )}
            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2.5"><LearningStats daily={daily} /></div>

            {/* Thanh lối tắt học nhanh 1 chạm */}
            <nav aria-label="Lối tắt học nhanh" className="mt-5 flex flex-wrap items-center gap-2">
              {QUICK_LINKS.map(({ href, label, icon: Icon, tone }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:bg-primary-light/70 hover:text-primary sm:text-sm"
                >
                  <span className={cn("flex size-6 items-center justify-center rounded-full border", tone)}>
                    <Icon size={13} animated={false} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="relative mx-auto w-full max-w-[26rem] sm:max-w-[30rem] lg:max-w-none">
            <div className="mb-3 flex items-center justify-end gap-2.5">
              <p className="rounded-2xl rounded-br-sm border border-primary-pastel/70 bg-surface/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-ambient-sm sm:text-sm">{mayLine}</p>
              <StudyImage src={mayPortrait} sizes="56px" priority
                className="size-12 shrink-0 rounded-full border-2 border-surface bg-primary-light shadow-ambient-sm sm:size-14" />
            </div>
            <HeroTicket current={current} isNew={isNew} />
          </div>
        </div>
        <CloudBank />
      </div>
      <div className={cn(homeWidth, "relative z-10 -mt-12 lg:-mt-16")}>{children}</div>
    </section>
  );
}

export function LearnerHomeSkeleton() {
  return (
    <section role="status" aria-label="Đang tải trang chủ" className="[&_.animate-pulse]:motion-reduce:animate-none">
      <div className="overflow-hidden pt-10 pb-24" style={{ background: sky.noon.background }}>
        <div className={cn(homeWidth, "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]")}>
          <div className="space-y-4">
            <Skeleton className="h-5 w-44 bg-surface/70" />
            <Skeleton className="h-16 w-full max-w-lg bg-surface/70" />
            <Skeleton className="h-5 w-56 bg-surface/70" />
            <Skeleton className="h-14 w-48 rounded-full bg-surface/70" />
          </div>
          <Skeleton className="aspect-[5/4.4] w-full rounded-[2rem] bg-surface/70" />
        </div>
      </div>
      <div className={cn(homeWidth, "-mt-10")}>
        <Skeleton className="h-36 w-full rounded-[2rem]" />
      </div>
    </section>
  );
}
