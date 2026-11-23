"use client";

import { Skeleton } from "@/components/ui";
import { pathCover, StudyImage } from "@/components/user/home/study-image";
import { useFollowingPath } from "@/lib/learning-hub/home-api";
import { useHubGoals } from "@/lib/learning-hub/hooks";
import { getPathThumbnail } from "@/lib/learning-hub/media";
import { cn } from "@/lib/utils";
import type { CoursesMeItem } from "@/types/user/courses-me";
import { CalendarDays, Check } from "lucide-react";
import type { ReactNode } from "react";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { CourseThumb, ProgressRing, ThinBar } from "./home-ui";
import { HomeLink } from "./section";

const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "UTC" });
const lightLink = "border-transparent bg-surface text-foreground hover:bg-primary-light text-sm";

export function PathAndGoals({ course, children }: { course?: CoursesMeItem | null; children?: ReactNode }) {
  const path = useFollowingPath();
  const goals = useHubGoals();
  const items = goals.error ? [] : goals.data?.items ?? [];
  const goal = items.find((item) => item.target_type === "course" && item.target_id === course?.id) ?? items[0];
  const goalCourse = goal?.target_type === "course" && goal.target_id === course?.id ? course : undefined;
  const goalTitle = goal?.title || goalCourse?.title || "Mục tiêu học tập";
  const goalLink = goal ? `/goals?${goal.target_type}_id=${encodeURIComponent(goal.target_id)}` : "/goals";
  const steps = (path.detail?.stages ?? []).flatMap((stage) => stage.groups.map((group) => {
    const option = group.options.find((candidate) => candidate.completed)
      ?? group.options.find((candidate) => candidate.owned && candidate.available)
      ?? group.options.find((candidate) => candidate.available)
      ?? group.options[0];
    return { id: group.id, stage: stage.title, title: option?.title ?? group.title, thumbnail: option?.thumbnail, complete: group.completed };
  }));
  const currentStep = steps.find((step) => !step.complete);
  const pathThumbnail = getPathThumbnail(path.detail);
  const completedSteps = steps.filter(({ complete }) => complete).length;
  const ready = !path.error && !path.isLoading && !goals.error && !goals.isLoading;
  const showPath = Boolean(path.error || path.isLoading || path.path);
  const showGoal = Boolean(goals.error || goals.isLoading || goal);
  const empty = ready && !path.path && !goal;

  const pathBlock = path.error ? (
    <HubLoadError error={path.error} title="Chưa tải được lộ trình" message="Tải lại để xem lộ trình bạn đang theo." onRetry={path.retry} isRetrying={path.isValidating} />
  ) : path.isLoading ? (
    <Skeleton role="status" aria-label="Đang tải lộ trình" className="min-h-72 w-full rounded-[2.5rem] motion-reduce:animate-none" />
  ) : path.path && (
    <article className="grid min-w-0 overflow-hidden rounded-[2.5rem] bg-surface shadow-ambient-lg lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
      <CourseThumb src={pathThumbnail} fallback={pathCover} alt={`Ảnh bìa lộ trình ${path.path.title}`} sizes="(min-width: 1024px) 560px, 92vw" />
      <div className="min-w-0 space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-2xl leading-tight font-extrabold wrap-anywhere">{path.path.title}</h3>
        </div>
        {steps.length > 0 && (
          <ol aria-label="Các mốc trong lộ trình" className="relative flex flex-wrap items-center gap-2">
            {steps.slice(0, 4).map((step) => (
              <li key={step.id} aria-current={currentStep?.id === step.id ? "step" : undefined} className="relative w-16">
                <CourseThumb src={step.thumbnail} sizes="64px" className={cn("rounded-md border-2", step.complete ? "border-success-border" : currentStep?.id === step.id ? "border-primary" : "border-border")} />
                {step.complete && <span aria-hidden="true" className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-success-bg text-success-foreground"><Check className="size-3" strokeWidth={3} /></span>}
                <span className="sr-only">{step.stage}: {step.title}, {step.complete ? "hoàn thành" : currentStep?.id === step.id ? "đang theo" : "sắp tới"}</span>
              </li>
            ))}
            {steps.length > 4 && <li className="text-sm font-bold">+{steps.length - 4} mốc</li>}
          </ol>
        )}
        <p className="text-sm font-semibold">{steps.length ? `${completedSteps}/${steps.length} mốc hoàn thành` : "Mở lộ trình để xem các mốc"}</p>
        {steps.length > 0 && <ThinBar value={(100 * completedSteps) / steps.length} label="Tiến độ lộ trình" />}
        <div className="flex flex-wrap gap-2">
          <HomeLink href="/lo-trinh/cua-toi" primary endIcon={false} className="text-sm">Mở lộ trình</HomeLink>
          <HomeLink href="/goals" endIcon={false} className="border-primary-pastel text-sm">Đặt ngày về đích</HomeLink>
        </div>
      </div>
    </article>
  );

  const goalBlock = goals.error ? (
    <HubLoadError error={goals.error} title="Chưa tải được mục tiêu" message="Tải lại để xem ngày về đích và tiến độ." onRetry={goals.retry} isRetrying={goals.isValidating} />
  ) : goals.isLoading ? (
    <Skeleton role="status" aria-label="Đang tải mục tiêu" className="h-44 w-full rounded-[2rem] motion-reduce:animate-none" />
  ) : goal && (
    <article className="min-w-0 overflow-hidden rounded-[2rem] bg-surface shadow-ambient-md">
      <CourseThumb src={goal.thumbnail_url ?? goalCourse?.thumbnail_url} fallback={pathCover} alt={`Ảnh bìa mục tiêu ${goalTitle}`} sizes="(min-width: 1024px) 380px, 92vw" />
      <div className="flex items-center gap-4 p-5">
        <ProgressRing value={goal.progress_percent} size={64} stroke={7} label="Tiến độ mục tiêu"><span className="text-xs font-extrabold tabular-nums">{Math.round(goal.progress_percent)}%</span></ProgressRing>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg leading-snug font-extrabold wrap-anywhere">{goalTitle}</h3>
            {goals.source === "mock" && <MockDataChip source="mock" />}
          </div>
          <GoalDate dateString={goal.target_date} />
          <p className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-bold", goal.on_track ? "bg-success-bg text-success-foreground" : "bg-warning-bg text-warning-foreground")}>
            {goal.on_track ? "Đúng lịch" : `Chậm ${goal.behind_lessons} bài`}
          </p>
          <HomeLink href={goalLink} endIcon={false} className="min-h-9 border-primary-pastel py-1 text-sm">Xem mục tiêu</HomeLink>
        </div>
      </div>
    </article>
  );

  return (
    <section aria-labelledby="path-title" className="relative">
      <h2 id="path-title" className="mb-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Lộ trình và mục tiêu</h2>
      {empty ? (
        <>
        <div className="relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-[2.5rem] bg-primary-light text-primary-foreground">
          <StudyImage fallback={pathCover} sizes="(min-width: 1280px) 1200px, 92vw" className="absolute inset-0 -z-10 rounded-none" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-foreground via-foreground/70 to-transparent" />
          <div className="max-w-xl space-y-3 p-6 pt-32 sm:p-8">
            <h3 className="text-2xl font-extrabold">Chia mục tiêu thành từng mốc học</h3>
            <p className="text-base">Chọn một lộ trình, Mây sẽ nhắc bạn từng mốc.</p>
            <HomeLink href="/combo" endIcon={false} className={lightLink}>Chọn lộ trình</HomeLink>
          </div>
        </div>
        {children && <div className="mt-6 max-w-xl">{children}</div>}
        </>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-12 lg:items-start">
          {showPath && <div className="min-w-0 lg:col-span-8">{pathBlock}</div>}
          <div className={cn("flex min-w-0 flex-col gap-6", showPath ? "lg:col-span-4 lg:mt-10" : "lg:col-span-12 lg:flex-row lg:[&>*]:flex-1")}>
            {showGoal && goalBlock}
            {children}
          </div>
        </div>
      )}
    </section>
  );
}

function GoalDate({ dateString }: { dateString: string }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
      <CalendarDays aria-hidden="true" className="size-4" />
      Về đích <time dateTime={dateString} className="font-bold">{date.format(new Date(dateString))}</time>
    </p>
  );
}
