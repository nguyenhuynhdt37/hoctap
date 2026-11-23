"use client";

import { Button, Skeleton } from "@/components/ui";
import type { ReactNode } from "react";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import type { Mission } from "@/lib/learning-hub/mission-types";
import { cn } from "@/lib/utils";
import { BookOpen, CalendarDays, Check, ClipboardList, Code2, Flag, Gift, Coins, Trophy, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { missionHref } from "../missions/mission-board";
import { ProgressRing, Seal } from "./home-ui";
import { HomeLink, number } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

type DailyLearningState = ReturnType<typeof useDailyLearningState>;

const icons: Partial<Record<Mission["template"], LucideIcon>> = {
  "lesson.completed": BookOpen,
  "quiz.completed": ClipboardList,
  "code.completed": Code2,
  "daily_checkin.completed": CalendarDays,
  "course.complete": Trophy,
};

function Frame({ children, id = "daily-missions" }: { children: ReactNode; id?: string }) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby="missions-title" className="relative isolate scroll-mt-24 focus-visible:outline-2 focus-visible:outline-ring">
      {/* Trang sổ nghiêng nhẹ phía sau, nội dung vẫn thẳng hàng để dễ đọc. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 -rotate-1 rounded-[2.5rem] border-2 border-accent-vanilla-border bg-accent-vanilla/55 lg:-rotate-[1.2deg]" />
      <div aria-hidden="true" className="absolute inset-y-8 left-3 -z-10 hidden w-3 flex-col justify-between sm:flex">
        {Array.from({ length: 7 }, (_, i) => <span key={i} className="size-3 rounded-full bg-background shadow-[inset_0_1px_2px_var(--sn-vanilla-200)]" />)}
      </div>
      <div className="px-5 py-6 sm:pr-8 sm:pl-12 sm:py-8 lg:pr-14">{children}</div>
    </section>
  );
}

function StampCard({ mission, now, board, checkInAvailable, heroClaimId }: {
  mission: Mission; now: number; board: DailyLearningState["board"]; checkInAvailable: boolean; heroClaimId?: string;
}) {
  const [wasClaimed] = useState(mission.status === "claimed");
  const { pendingId, feedback, claim } = board;
  const pending = pendingId === mission.id;
  const expired = mission.status !== "claimed" && Boolean(mission.expires_at) && Date.parse(mission.expires_at as string) <= now;
  const status = expired ? "expired" : mission.status;
  const claimed = status === "claimed" && !pending;
  const completed = status === "completed" || pending;
  const failed = feedback?.id === mission.id && feedback.kind === "error" && heroClaimId !== mission.id;
  const unavailable = failed && isHubUnavailable(feedback.error);
  const href = !claimed && !completed && !expired ? missionHref(mission) : null;
  const Icon = icons[mission.template] ?? Flag;
  const { xp, peak } = mission.reward;
  const blocked = Boolean(pendingId);

  return (
    <li className="relative grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-4">
      <span aria-hidden="true" className={cn(
        "relative grid size-24 place-items-center rounded-[1.6rem] border-2 border-dashed",
        claimed ? "border-success-border bg-success-bg" : completed ? "border-primary bg-primary-light" : "border-primary-pastel bg-surface",
      )}>
        {claimed ? <Seal fresh={!wasClaimed}><Check className="size-8" strokeWidth={3} /></Seal> : (
          <ProgressRing value={completed ? mission.progress.target : mission.progress.current} max={mission.progress.target} size={64} stroke={6} label={`Tiến độ ${mission.title}`}>
            {completed ? <Gift className="size-6 text-primary" /> : <Icon className="size-6 text-foreground" />}
          </ProgressRing>
        )}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-base leading-snug font-bold wrap-anywhere">{mission.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold">
          <span className="tabular-nums">{number.format(mission.progress.current)}/{number.format(mission.progress.target)}</span>
          {xp > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-accent-foreground"><Zap aria-hidden="true" className="size-3" />+{number.format(xp)} XP</span>}
          {peak > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-accent-vanilla-foreground"><Coins aria-hidden="true" className="size-3" />+{number.format(peak)} Coin</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {completed && (
            <Button size="sm" variant="primary" className="min-h-10 rounded-full px-4 motion-reduce:transition-none" aria-disabled={blocked || unavailable || undefined} aria-busy={pending || undefined}
              onClick={() => { if (!blocked && !unavailable) void claim(mission); }}>
              {pending ? "Đang nhận…" : failed && !unavailable ? "Thử lại" : "Nhận thưởng"}<span className="sr-only"> — {mission.title}</span>
            </Button>
          )}
          {claimed && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success-foreground"><Check aria-hidden="true" className="size-4" />Đã nhận thưởng</span>}
          {expired && <span className="text-sm font-semibold">Đã hết hạn</span>}
          {href && <HomeLink href={href} endIcon={false} className="min-h-10 px-4 py-1.5 text-sm">{checkInAvailable ? "Điểm danh" : "Thực hiện"}<span className="sr-only"> — {mission.title}</span></HomeLink>}
        </div>
        {failed && <p role="alert" className="mt-2 text-sm text-destructive-foreground">{hubErrorMessage(feedback.error, "Chưa nhận được thưởng. Bấm Thử lại để nhận phần thưởng này.")}</p>}
      </div>
    </li>
  );
}

export function StickerBook({ daily, heroClaimId }: { daily: DailyLearningState; heroClaimId?: string }) {
  const { board, missions, now, source, checkIn } = daily;
  const { overview, feedback } = board;

  if (overview.error) {
    return <Frame><h2 id="missions-title" className="mb-4 text-3xl font-extrabold tracking-tight">Sổ tem hôm nay</h2>
      <HubLoadError error={overview.error} title="Chưa tải được nhiệm vụ" message="Tải lại để xem tiến độ nhiệm vụ và phần thưởng đang chờ." onRetry={() => void overview.mutate().catch(() => undefined)} isRetrying={overview.isValidating} /></Frame>;
  }
  if (!overview.data) {
    return (
      <Frame>
        <h2 id="missions-title" className="mb-5 text-3xl font-extrabold tracking-tight">Sổ tem hôm nay</h2>
        <div role="status" aria-label="Đang tải nhiệm vụ" className="grid gap-5 sm:grid-cols-2 [&_.animate-pulse]:motion-reduce:animate-none">
          {[0, 1, 2, 3].map((i) => <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4"><Skeleton className="size-24 rounded-[1.6rem]" /><div className="space-y-2 pt-2"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-10 w-28 rounded-full" /></div></div>)}
        </div>
      </Frame>
    );
  }

  const { daily_resets_at } = overview.data;
  const list = (missions.daily ?? overview.data.daily).map((mission) => mission.expires_at ? mission : { ...mission, expires_at: daily_resets_at });
  const finished = list.filter(({ status }) => status === "completed" || status === "claimed").length;
  const notice = feedback && feedback.id !== heroClaimId
    ? feedback.kind === "success" ? "Đã nhận thưởng." : ""
    : "";

  return (
    <Frame>
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ProgressRing value={finished} max={Math.max(1, list.length)} size={76} stroke={8} tone={list.length > 0 && finished === list.length ? "success" : "primary"} label="Nhiệm vụ hoàn thành hôm nay">
          <span className="text-base font-extrabold tabular-nums">{finished}/{list.length}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h2 id="missions-title" className="text-3xl font-extrabold tracking-tight">Sổ tem hôm nay</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">Làm mới lúc 00:00 (giờ Việt Nam) {source === "mock" && <MockDataChip source="mock" />}</p>
        </div>
        <HomeLink href="/missions" endIcon={false} className="bg-surface/80 text-sm">Tất cả nhiệm vụ</HomeLink>
      </div>
      {list.length ? (
        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {list.map((mission) => <StampCard key={mission.id} mission={mission} now={now} board={board} heroClaimId={heroClaimId}
            checkInAvailable={mission.template === "daily_checkin.completed" && checkIn.data?.checked_today === false} />)}
        </ul>
      ) : (
        <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-accent-vanilla-border bg-surface/70 p-4">
          <StudyImage fallback={mayPortrait} sizes="80px" className="size-20 shrink-0 rounded-full" />
          <div><p className="text-base font-bold">Hôm nay chưa có nhiệm vụ</p><p className="mt-1 text-sm">Ghé lại sau để bắt đầu một nhịp học mới cùng Mây nhé.</p></div>
        </div>
      )}
      <p role="status" className={cn("mt-4 text-sm font-semibold", !notice && "sr-only")}>{notice}</p>
    </Frame>
  );
}
