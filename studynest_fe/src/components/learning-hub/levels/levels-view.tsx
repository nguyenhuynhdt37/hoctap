"use client";

import { Badge, Button, EmptyState, Progress, Skeleton } from "@/components/ui";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import { useLevelsOverview } from "@/lib/learning-hub/levels-hooks";
import { formatCoin, nextMilestone } from "@/lib/learning-hub/shop-logic";
import type { LevelReward, LevelsOverview } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { Check, Cloud, Coins, Flag, Gift, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { LevelItemReward } from "./level-item-reward";

const number = new Intl.NumberFormat("vi-VN");

function SkyIsland({ className }: { className?: string }) {
  return <svg viewBox="0 0 240 126" aria-hidden="true" className={className}>
    <path className="fill-surface" d="M19 72c-12-1-10-17 2-17 3-13 23-16 29-1 19-6 24 18 8 18ZM162 41c-10 0-10-14 1-14 4-11 19-14 25 0 13-4 19 14 7 14ZM165 106c-11-1-8-15 3-14 5-13 25-12 29 0 17-5 22 14 8 14Z" />
    <circle cx="137" cy="30" r="22" className="fill-accent-vanilla stroke-accent-vanilla-border" strokeWidth="2" />
    <path d="m63 70 95-5-14 24-31 22-22-12Z" className="fill-accent stroke-accent-foreground" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="m91 79 22 32m18-32-18 32" className="fill-none stroke-accent-border" strokeWidth="2" />
    <path d="M53 70q11-17 37-15 13-17 35-11 15-1 21 9 19 1 23 15-17 15-50 13-44 2-66-11Z" className="fill-surface stroke-primary" strokeWidth="1.5" />
    <path d="M97 54V19l31 7-31 10" className="fill-secondary-pastel stroke-secondary-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M64 113q-16 2-24-4m104 9q21-5 29 0" className="fill-none stroke-primary-pastel" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 6" />
  </svg>;
}

function FlightTicket({ current, milestone, hasMilestone }: {
  current: LevelsOverview["current"];
  milestone: number;
  hasMilestone: boolean;
}) {
  return (
    <div className="relative isolate grid min-w-0 overflow-hidden rounded-[1.5rem] border border-primary-pastel bg-surface md:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
      <section aria-label="Cấp độ hiện tại" className="min-w-0 p-5 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-hover"><MapPin aria-hidden="true" className="size-4" />Vị trí hiện tại</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cấp {number.format(current.level)}</h2>
          <span className="text-sm font-semibold tabular-nums">{number.format(current.total_xp)} XP tích lũy</span>
        </div>
        {current.required_xp > 0 && (
          <Progress value={current.current_xp} max={current.required_xp} size="sm"
            label={`${number.format(current.current_xp)} / ${number.format(current.required_xp)} XP để lên cấp ${number.format(current.level + 1)}`}
            className="mt-4 [&_[role=progressbar]]:relative motion-reduce:[&_[role=progressbar]>div]:transition-none" />
        )}
        <Link href="/shop" className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-accent-vanilla px-3 py-2 text-sm font-semibold text-accent-vanilla-foreground hover:underline">
          <Coins aria-hidden="true" className="size-4 shrink-0" /><span className="wrap-anywhere tabular-nums">{formatCoin(current.peak_balance)}</span>
        </Link>
      </section>
      <div className="relative isolate grid min-h-24 min-w-0 overflow-hidden border-t border-dashed border-primary-pastel bg-primary-light p-5 md:content-center md:border-t-0 md:border-l md:p-7">
        <SkyIsland className="pointer-events-none absolute -right-6 -bottom-5 -z-10 w-48 sm:w-56 md:-right-12 md:-bottom-3" />
        <div className="w-fit max-w-[64%] rounded-lg bg-primary-light/95">
          <p className="text-sm font-semibold text-primary-hover">Đảo mây kế tiếp</p>
          {hasMilestone
            ? <a href={`#level-${milestone}`} className="inline-flex min-h-11 items-center rounded-sm text-lg font-bold text-primary-hover underline decoration-primary/50 underline-offset-4">Cấp {number.format(milestone)}</a>
            : <p className="mt-1 text-lg font-bold">Cấp {number.format(milestone)}</p>}
        </div>
      </div>
    </div>
  );
}

function FlightStop({ reward, current, milestone }: { reward: LevelReward; current: number; milestone: number }) {
  const major = reward.milestone === "ten";
  const small = reward.milestone === "five";
  const active = reward.level === current;
  const nextIsland = reward.level === milestone;
  const reached = reward.reached || active;
  const StateIcon = active ? MapPin : reached ? Check : major || small ? Flag : Cloud;

  return (
    <li className="relative grid min-w-0 scroll-mt-24 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-4"
      id={`level-${reward.level}`} tabIndex={-1} aria-current={active ? "step" : undefined}>
      <div className={cn("relative z-10 mt-3 grid size-9 place-items-center rounded-full border-2 bg-surface text-primary-hover sm:mt-4 sm:size-12",
        major && "border-double border-primary bg-primary-light", small && "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
        reached && !active && !major && "border-success-border bg-success-bg text-success-foreground", active && "border-primary bg-primary-light")}>
        <StateIcon aria-hidden="true" className="size-4 sm:size-5" />
      </div>
      <article className={cn("relative isolate min-w-0 scroll-mt-24 overflow-hidden px-3.5 py-3.5 sm:px-6",
        major ? "rounded-[1.5rem] border border-primary-pastel bg-primary-light py-5 sm:py-7"
          : small ? "rounded-2xl border border-dashed border-accent-vanilla-border bg-surface-muted"
            : "rounded-xl border border-border bg-surface",
        active && "border-primary ring-1 ring-primary/30")}>
        {major && <SkyIsland className="pointer-events-none absolute top-0 -right-11 -z-10 w-40 opacity-40 sm:-right-6 sm:w-56 sm:opacity-90 lg:right-0" />}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className={cn("font-bold", major ? "font-display text-2xl sm:text-3xl" : "text-base sm:text-lg")}>
            {major ? "Đảo mây cấp" : small ? "Trạm mây cấp" : "Cấp"} {number.format(reward.level)}
          </h3>
          <Badge variant={active ? "info" : reached ? "success" : "outline"} className={cn("w-fit", !reached && "bg-surface")}>
            {active ? "Bạn đang ở đây" : reached ? "Đã đạt" : nextIsland ? "Đảo kế tiếp" : "Sắp tới"}
          </Badge>
        </div>
        <ul aria-label="Phần thưởng" className="relative mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
          <li className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-accent-vanilla px-2 py-1 text-xs font-bold text-accent-vanilla-foreground sm:text-sm">
            <Coins aria-hidden="true" className="size-4 shrink-0" /><span className="wrap-anywhere">+{formatCoin(reward.coins)}</span>
          </li>
          {reward.items.map((item) => <li key={item.id} className="min-w-0 max-w-full"><LevelItemReward item={item} /></li>)}
          {(reward.coupon || major) && <li className="inline-flex max-w-full items-start gap-1.5 rounded-lg border border-dashed border-accent-border bg-surface px-2 py-1 text-xs font-medium text-accent-foreground">
            <Ticket aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="wrap-anywhere">{reward.coupon
              ? `Mã giảm đến ${reward.coupon.max_percent}% · ${reward.coupon.valid_days} ngày`
              : "Mã giảm giá · Sắp có"}</span>
          </li>}
        </ul>
        {reached && reward.level > 1 && <p className="mt-2 text-xs font-medium">
          {reward.granted ? "Đã nhận phần thưởng" : "Phần thưởng đang được cập nhật"}
        </p>}
      </article>
    </li>
  );
}

export function LevelsView() {
  const { current, rewards, error, isValidating, loadMore, retry } = useLevelsOverview();
  const milestone = current ? nextMilestone(current.level) : undefined;
  const nextIsland = rewards.find((reward) => reward.level === milestone);

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-16">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-8 sm:pt-10">
        <header className="relative isolate mb-5 overflow-hidden rounded-t-hero border-b border-primary-pastel px-1 pb-5 sm:mb-7 sm:px-2 sm:pb-7">
          <Cloud aria-hidden="true" strokeWidth={0.7} className="pointer-events-none absolute -right-6 -bottom-20 -z-10 size-52 -rotate-12 text-primary-light sm:size-64" />
          <MockDataChip source={getHubDataSource()} />
          <h1 className="type-display">Cấp độ &amp; phần thưởng</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed sm:text-base">Mỗi cấp có một món quà. Cứ 10 cấp, bạn sẽ ghé một đảo mây lớn.</p>
        </header>

        {current && milestone !== undefined ? (
          <FlightTicket current={current} milestone={milestone} hasMilestone={Boolean(nextIsland)} />
        ) : error ? (
          <HubLoadError error={error} title="Chưa tải được đường bay" message="Bạn thử tải lại để xem cấp và phần thưởng nhé." onRetry={retry} isRetrying={isValidating} />
        ) : (
          <div role="status" aria-label="Đang tải cấp độ" className="space-y-3">
            <Skeleton className="h-36 rounded-section" /><Skeleton className="h-16 w-3/4 rounded-card" />
          </div>
        )}

        {current && milestone !== undefined && (
          <section aria-labelledby="flight-path" className="mt-8 sm:mt-11">
            <h2 id="flight-path" className="font-display text-2xl font-semibold sm:text-3xl">Đường bay của bạn</h2>
            {rewards.length > 0 ? (
              <ol className="relative mt-4 space-y-3 before:pointer-events-none before:absolute before:inset-y-5 before:left-[1.0625rem] before:border-l-2 before:border-dashed before:border-primary-pastel sm:before:left-[1.4375rem]">
                {rewards.map((reward) => <FlightStop key={reward.level} reward={reward} current={current.level} milestone={milestone} />)}
              </ol>
            ) : <EmptyState icon={<Gift />} title="Chưa có phần thưởng để hiển thị" className="mt-4" />}

            {error && <div className="mt-4">
              <HubLoadError error={error} title="Chưa tải được các cấp tiếp theo" message="Bạn có thể thử lại ngay tại chặng này." onRetry={retry} isRetrying={isValidating} />
            </div>}
            <p role="status" className="sr-only">{rewards.length > 0 && `Đã tải ${number.format(rewards.length)} cấp trên đường bay.`}</p>
            {!error && <Button variant="outline" onClick={() => void loadMore()} aria-busy={isValidating || undefined}
              aria-disabled={isValidating || undefined} className="mt-5 min-h-11 w-full bg-surface sm:ml-[4.5rem] sm:w-fit">
              {isValidating ? "Đang tải thêm cấp…" : "Xem thêm cấp"}
            </Button>}
          </section>
        )}
      </div>
    </main>
  );
}
