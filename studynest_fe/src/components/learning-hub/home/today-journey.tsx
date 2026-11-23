"use client";

import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Check, ClipboardList, Gift, GraduationCap, Play, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { MockDataChip } from "../mock-data-chip";
import { CloudShape } from "./home-ui";
import type { getJourneyState, StepId } from "./journey-state";
import { number } from "./section";

const stops: Record<StepId, { title: string; icon: LucideIcon; cloud: string }> = {
  study: { title: "Học bài đang dở", icon: BookOpen, cloud: "text-primary-pastel" },
  review: { title: "Ôn câu đến hạn", icon: Brain, cloud: "text-accent" },
  missions: { title: "Nhiệm vụ trong ngày", icon: ClipboardList, cloud: "text-accent-vanilla" },
  reward: { title: "Nhận thưởng", icon: Gift, cloud: "text-secondary-pastel" },
  grade: { title: "Chọn cấp lớp", icon: GraduationCap, cloud: "text-primary-pastel" },
  course: { title: "Chọn khóa", icon: BookOpen, cloud: "text-accent" },
  trial: { title: "Học thử", icon: Play, cloud: "text-accent-vanilla" },
};

/** Đường bay nối các chặng, đi lên xuống theo từng đám mây. */
function flightPath(count: number) {
  const points = Array.from({ length: count }, (_, i) => [((i + 0.5) / count) * 1000, i % 2 ? 46 : 96] as const);
  return points.reduce((d, [x, y], i) => {
    if (i === 0) return `M0 ${y} L${x} ${y}`;
    const [px] = points[i - 1];
    const mid = (px + x) / 2;
    return `${d} C${mid} ${points[i - 1][1]} ${mid} ${y} ${x} ${y}`;
  }, "") + ` L1000 ${points[count - 1][1]}`;
}

export function TodayJourney({ journey, sampleReview, stepNotes, claimableCount, rewardStatus, reviewPreview, links }: {
  journey: ReturnType<typeof getJourneyState>;
  sampleReview: boolean;
  stepNotes: Partial<Record<StepId, string>>;
  claimableCount?: number;
  rewardStatus?: string;
  reviewPreview?: ReactNode;
  links: Partial<Record<StepId, string | null | undefined>>;
}) {
  const sampleId = useId();
  const rewardId = useId();
  const showWaiting = !journey.isNew && Boolean(claimableCount) && journey.active !== "reward";
  const count = journey.steps.length;

  return (
    <div className="min-w-0">
      {(sampleReview || showWaiting) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:justify-end">
          {showWaiting && (
            <p id={rewardId} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-info-foreground shadow-ambient-sm">
              <Gift aria-hidden="true" className="size-4" /> {number.format(claimableCount ?? 0)} phần thưởng chờ nhận
            </p>
          )}
          {sampleReview && <div id={sampleId} title="Dữ liệu mẫu cho câu ôn"><MockDataChip source="mock" /></div>}
        </div>
      )}
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 1000 140" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-6 hidden h-32 w-full lg:block">
          <path d={flightPath(count)} fill="none" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-primary" />
        </svg>
        <span aria-hidden="true" className="pointer-events-none absolute top-8 bottom-8 left-[2.9rem] border-l-[3px] border-dotted border-primary lg:hidden" />
        <ol aria-label={journey.isNew ? "Hành trình học thử" : "Các chặng hôm nay"} className={cn("relative grid gap-3 lg:items-start lg:gap-0", journey.isNew ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {journey.steps.map(({ id, status }, index) => {
            const { title, icon: Icon, cloud } = stops[id];
            const active = journey.active === id;
            const sample = id === "review" && sampleReview;
            const description = [sample && sampleId, id === "reward" && showWaiting && rewardId].filter(Boolean).join(" ");
            const label = status === "done" ? (stepNotes[id] ?? "Hoàn thành")
              : status === "loading" ? "Đang tải" : status === "error" ? "Chưa tải được"
                : status === "pending" && id === "review" && stepNotes.review ? stepNotes.review
                  : active ? (id === "reward" ? rewardStatus ?? "Chờ nhận thưởng" : "Chặng hiện tại") : "Sắp tới";
            const href = !active ? links[id] : undefined;
            return (
              <li key={id} aria-current={active ? "step" : undefined} aria-describedby={description || undefined}
                className={cn("relative grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 lg:flex lg:flex-col lg:gap-0 lg:text-center", index % 2 === 0 ? "lg:mt-8" : "lg:mt-0")}>
                <span aria-hidden="true" className={cn("relative grid h-[4.5rem] w-[5.5rem] shrink-0 place-items-center lg:h-24 lg:w-32", active && "scale-110")}>
                  <CloudShape className={cn("absolute inset-0 size-full drop-shadow-md", cloud, status === "pending" && !active && "opacity-80")} />
                  <Icon className={cn("relative mt-2 size-7 lg:size-8", status === "done" ? "text-success-foreground" : "text-foreground")} />
                  {status === "done" && <span className="absolute -top-0.5 right-1 grid size-7 place-items-center rounded-full border-2 border-surface bg-success-bg text-success-foreground lg:right-3"><Check className="size-4" /></span>}
                  {active && (
                    <span className="may-bob absolute -top-4 -left-1 lg:-top-3 lg:left-1">
                      <StudyImage src={mayPortrait} sizes="40px" className="size-10 rounded-full border-2 border-surface shadow-ambient-md" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 lg:mt-1">
                  <p className="text-base leading-snug font-bold wrap-anywhere">
                    {href ? <Link href={href} className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">{title}</Link> : title}
                  </p>
                  <p className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs leading-relaxed font-semibold",
                    status === "done" ? "bg-success-bg text-success-foreground" : status === "error" ? "bg-destructive-bg text-destructive-foreground"
                      : active ? "bg-primary text-primary-foreground" : "bg-surface text-foreground")}>{label}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {reviewPreview && <div className="mt-6 max-w-xl -rotate-1 lg:ml-[18%]">{reviewPreview}</div>}
    </div>
  );
}
