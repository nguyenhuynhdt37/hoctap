"use client";

import { Skeleton } from "@/components/ui";
import { academyCover, mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { useLearnerEquipment } from "@/lib/learning-hub/shop-hooks";
import type { useCurrentLesson } from "@/lib/learning-hub/home-api";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";
import { Flame, MessageCircle, Trophy } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { EquippedMarks, FramedAvatar } from "../shop/item-art";
import { CloudShape, ProgressRing, TicketCard } from "./home-ui";
import type { getJourneyState } from "./journey-state";
import { homeWidth, number, vietnamTimeZone } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

const hourFormat = new Intl.DateTimeFormat("vi-VN", { hour: "numeric", hourCycle: "h23", timeZone: vietnamTimeZone });

type Phase = "dawn" | "day" | "dusk" | "night";
type DailyLearningState = ReturnType<typeof useDailyLearningState>;

const phaseOf = (hour: number): Phase => hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 16 ? "day" : hour >= 16 && hour < 19 ? "dusk" : "night";

// Bầu trời đổi tông theo giờ nhưng chỉ dùng màu pastel của Cloudy Blue. Ban đêm dùng xanh đậm để chữ trắng đạt AA.
const sky: Record<Phase, { background: string; dark: boolean }> = {
  dawn: { background: "linear-gradient(180deg, var(--sn-lavender-100) 0%, var(--sn-pink-200) 58%, var(--sn-vanilla-100) 100%)", dark: false },
  day: { background: "linear-gradient(180deg, var(--sn-blue-200) 0%, var(--sn-blue-100) 60%, var(--sn-blue-50) 100%)", dark: false },
  dusk: { background: "linear-gradient(180deg, var(--sn-lavender-200) 0%, var(--sn-pink-200) 62%, var(--sn-vanilla-100) 100%)", dark: false },
  night: { background: "linear-gradient(180deg, var(--sn-blue-900) 0%, var(--sn-blue-800) 58%, var(--sn-lavender-700) 100%)", dark: true },
};

const stars: [number, number, number][] = [[6, 14, 3], [14, 38, 2], [23, 10, 2], [31, 30, 3], [42, 8, 2], [55, 24, 2], [63, 12, 3], [72, 34, 2], [80, 8, 2], [90, 26, 3], [95, 12, 2], [48, 40, 2]];
const clouds = [
  { className: "top-[16%] -left-[6%] w-56 text-surface/80 lg:w-80", drift: "110s" },
  { className: "top-[48%] right-[2%] w-40 text-surface/70 lg:w-64", drift: "80s" },
  { className: "top-[6%] left-[40%] w-32 text-surface/60 lg:w-44", drift: "130s" },
];

function SkyScene({ phase }: { phase: Phase }) {
  const night = phase === "night";
  const body = {
    dawn: "left-[6%] top-[42%] size-24 text-accent-vanilla bg-accent-vanilla",
    day: "left-[46%] top-[6%] size-20 text-accent-vanilla bg-accent-vanilla",
    dusk: "right-[14%] top-[38%] size-36 text-secondary-pastel bg-secondary-pastel",
    night: "left-[46%] top-[6%] size-16 text-surface bg-surface shadow-[inset_-14px_-6px_0_0_var(--sn-blue-100)]",
  }[phase];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className={cn("absolute rounded-full", body)} style={night ? undefined : { boxShadow: "0 0 0 1.4rem color-mix(in srgb, currentColor 30%, transparent), 0 0 7rem 2rem color-mix(in srgb, currentColor 45%, transparent)" }} />
      {night && stars.map(([left, top, size], index) => (
        <span key={index} className={cn("absolute rounded-full bg-surface", index % 3 === 0 && "sky-twinkle")}
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${index * 0.4}s` }} />
      ))}
      {clouds.map(({ className, drift }) => (
        <span key={className} className={cn("sky-drift absolute block", night ? "opacity-20" : "opacity-100", className)} style={{ "--drift": drift } as CSSProperties}>
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
      sizes="(min-width: 1280px) 520px, (min-width: 1024px) 40vw, 88vw" className="rotate-1 drop-shadow-xl lg:rotate-2" captionClassName="flex min-h-24 items-center gap-3 py-3.5">
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
  const { streak } = daily;
  const hour = Number(hourFormat.format(daily.now));
  const phase = phaseOf(hour);
  const { dark } = sky[phase];
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
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
  const mayLine = returning ? "Bắt đầu nhẹ nhàng, 5 phút thôi." : isNew ? "Mình sẽ dẫn bạn chọn khóa nhé." : complete ? "Nghỉ ngơi một chút nhé." : "Mình đi cùng bạn.";
  const days = streak.data?.current_streak ?? 0;

  return (
    <section aria-labelledby="learning-home-title" className="relative">
      <div className={cn("relative isolate overflow-hidden pt-8 pb-28 sm:pt-12 lg:pb-36", dark ? "text-primary-foreground" : "text-foreground")} style={{ background: sky[phase].background }}>
        <SkyScene phase={phase} />
        {days > 0 && (
          <span aria-hidden="true" className="pointer-events-none absolute -top-2 right-0 -z-10 text-[clamp(7rem,16vw,14rem)] leading-none font-extrabold tracking-tighter text-transparent select-none [-webkit-text-stroke:2px_var(--color-surface)] opacity-60 lg:right-[3%]">
            {days}
          </span>
        )}
        <div className={cn(homeWidth, "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-10")}>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <FramedAvatar src={avatar} name={name} equipment={equipment} className="size-12 text-sm" />
              <div className="min-w-0">
                <p className="text-base font-semibold wrap-anywhere">{greeting}, {name || "bạn"}</p>
                <EquippedMarks equipment={equipment} className="mt-1" />
              </div>
            </div>
            <h1 id="learning-home-title" className="mt-3 font-display text-[clamp(2.4rem,6.4vw,5rem)] leading-[1.04] font-bold tracking-tight text-balance">{headline}</h1>
            <p id="journey-status" tabIndex={-1} role="status" className="mt-3 w-fit rounded-sm text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-ring">{status}</p>
            {action && (
              <div data-journey-action className="mt-6 min-w-0">
                <div className="[&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">{action}</div>
                {actionDetail && <p id="journey-action-detail" title={actionDetail} className="mt-2.5 max-w-[34rem] truncate text-sm font-medium">{actionDetail}</p>}
              </div>
            )}
            {(chapterReview || (active === "study" && current.tutorHref)) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
                {chapterReview && <span className="inline-flex flex-wrap items-center gap-2">{chapterReview.title} cần ôn {chapterReview.sample && <MockDataChip source="mock" />}</span>}
                {active === "study" && current.tutorHref && (
                  <Link href={current.tutorHref} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2", dark ? "focus-visible:outline-surface" : "focus-visible:outline-ring")}>
                    <MessageCircle aria-hidden="true" className="size-4" /> Hỏi Mây về bài này
                  </Link>
                )}
              </div>
            )}
            <div className="mt-6 flex min-w-0 flex-wrap items-center gap-2.5"><LearningStats daily={daily} /></div>
          </div>
          <div className="relative mx-auto w-full max-w-[26rem] pt-24 sm:max-w-[30rem] lg:max-w-none lg:pt-40 lg:pl-8">
            <div aria-hidden="true" className="absolute top-0 right-3 z-10 flex items-start lg:right-8">
              <p className="mt-3 mr-1 w-max max-w-[8.5rem] -rotate-3 rounded-2xl rounded-br-sm bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-ambient-md sm:max-w-[11rem] sm:text-sm lg:mt-8">{mayLine}</p>
              <div className="may-bob">
                <StudyImage src={mayPortrait} sizes="(min-width: 1024px) 176px, 112px" priority
                  className="size-28 rounded-full bg-transparent lg:size-44 [-webkit-mask-image:radial-gradient(closest-side,black_66%,transparent_100%)] [mask-image:radial-gradient(closest-side,black_66%,transparent_100%)]" />
              </div>
            </div>
            <HeroTicket current={current} isNew={isNew} />
          </div>
        </div>
        <CloudBank />
      </div>
      <div className={cn(homeWidth, "relative z-10 -mt-20 lg:-mt-28")}>{children}</div>
    </section>
  );
}

export function LearnerHomeSkeleton() {
  return (
    <section role="status" aria-label="Đang tải trang chủ" className="[&_.animate-pulse]:motion-reduce:animate-none">
      <div className="overflow-hidden pt-10 pb-24" style={{ background: sky.day.background }}>
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
