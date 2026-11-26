"use client";

import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  ClipboardList,
  Gift,
  GraduationCap,
  Play,
  type PulsoIcon,
} from "pulsoicon-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { MockDataChip } from "../mock-data-chip";
import type { getJourneyState, StepId } from "./journey-state";
import { number } from "./section";

const stops: Record<
  StepId,
  { title: string; icon: PulsoIcon; iconBox: string }
> = {
  study: {
    title: "Học bài đang dở",
    icon: BookOpen,
    iconBox: "bg-primary-light border-primary-pastel text-primary",
  },
  review: {
    title: "Ôn câu đến hạn",
    icon: Brain,
    iconBox: "bg-accent border-accent-border text-accent-foreground",
  },
  missions: {
    title: "Nhiệm vụ trong ngày",
    icon: ClipboardList,
    iconBox:
      "bg-accent-vanilla border-accent-vanilla-border text-accent-vanilla-foreground",
  },
  reward: {
    title: "Nhận thưởng",
    icon: Gift,
    iconBox: "bg-secondary-light border-secondary-pastel text-secondary-foreground",
  },
  grade: {
    title: "Chọn cấp lớp",
    icon: GraduationCap,
    iconBox: "bg-primary-light border-primary-pastel text-primary",
  },
  course: {
    title: "Chọn khóa",
    icon: BookOpen,
    iconBox: "bg-accent border-accent-border text-accent-foreground",
  },
  trial: {
    title: "Học thử",
    icon: Play,
    iconBox:
      "bg-accent-vanilla border-accent-vanilla-border text-accent-vanilla-foreground",
  },
};

export function TodayJourney({
  journey,
  sampleReview,
  stepNotes,
  claimableCount,
  rewardStatus,
  reviewPreview,
  links,
}: {
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
  const showWaiting =
    !journey.isNew && Boolean(claimableCount) && journey.active !== "reward";
  const doneCount = journey.steps.filter((s) => s.status === "done").length;

  return (
    <div className="min-w-0 rounded-[1.5rem] border border-primary-pastel/80 bg-surface/95 p-4 shadow-ambient-md backdrop-blur-md sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-foreground sm:text-base">
            {journey.isNew ? "3 bước bắt đầu học thử" : "Lộ trình hôm nay"}
          </h2>
          <span className="rounded-full border border-primary-pastel bg-primary-light px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
            {doneCount}/{journey.steps.length} bước
          </span>
        </div>

        {(sampleReview || showWaiting) && (
          <div className="flex flex-wrap items-center gap-2">
            {showWaiting && (
              <p
                id={rewardId}
                className="flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-secondary-light px-3 py-1 text-xs font-semibold text-secondary-foreground"
              >
                <Gift aria-hidden="true" className="size-3.5" />
                {number.format(claimableCount ?? 0)} phần thưởng chờ nhận
              </p>
            )}
            {sampleReview && (
              <div id={sampleId} title="Dữ liệu mẫu cho câu ôn">
                <MockDataChip source="mock" />
              </div>
            )}
          </div>
        )}
      </div>

      <ol
        aria-label={
          journey.isNew ? "Hành trình học thử" : "Các chặng hôm nay"
        }
        className={cn(
          "grid gap-3",
          journey.isNew
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {journey.steps.map(({ id, status }, index) => {
          const { title, icon: Icon, iconBox } = stops[id];
          const active = journey.active === id;
          const isDone = status === "done";
          const sample = id === "review" && sampleReview;
          const description = [
            sample && sampleId,
            id === "reward" && showWaiting && rewardId,
          ]
            .filter(Boolean)
            .join(" ");
          const label = isDone
            ? (stepNotes[id] ?? "Hoàn thành")
            : status === "loading"
              ? "Đang tải"
              : status === "error"
                ? "Chưa tải được"
                : status === "pending" && id === "review" && stepNotes.review
                  ? stepNotes.review
                  : active
                    ? id === "reward"
                      ? (rewardStatus ?? "Chờ nhận thưởng")
                      : "Đang thực hiện"
                    : "Sắp tới";
          const href = links[id];

          const cardClass = cn(
            "group relative flex items-center gap-3 rounded-2xl border p-3.5 transition-colors",
            isDone
              ? "border-success-border bg-success-bg/35"
              : active
                ? "border-primary bg-primary-light/55 shadow-ambient-xs"
                : "border-border bg-background/60 hover:border-primary-pastel hover:bg-primary-light/30",
          );

          const inner = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                  isDone
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : iconBox,
                )}
              >
                {isDone ? (
                  <Check size={18} animated={false} />
                ) : (
                  <Icon size={18} animated={false} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                    Bước {index + 1}
                  </span>
                </div>
                <p className="truncate text-sm font-bold text-foreground">
                  {title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-xs font-medium",
                    isDone
                      ? "text-success-foreground"
                      : status === "error"
                        ? "text-destructive-foreground"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground",
                  )}
                >
                  {label}
                </p>
              </div>

              {href && (
                <ArrowRight
                  size={15}
                  animated={false}
                  aria-hidden="true"
                  className="shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              )}
            </>
          );

          return (
            <li
              key={id}
              aria-current={active ? "step" : undefined}
              aria-describedby={description || undefined}
              className="min-w-0"
            >
              {href ? (
                <Link
                  href={href}
                  className={cn(
                    cardClass,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div className={cardClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      {reviewPreview && (
        <div className="mt-4 max-w-2xl">{reviewPreview}</div>
      )}
    </div>
  );
}
