"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Award,
  Check,
  Cloud,
  Compass,
  Crown,
  Flag,
  Gift,
  Layers,
  Lock,
  MapPin,
  Rocket,
  Star,
  Ticket,
  Trophy,
} from "pulsoicon-react";
import { Badge, Button, CoinBadge, EmptyState, Skeleton } from "@/components/ui";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import { useLevelsOverview } from "@/lib/learning-hub/levels-hooks";
import { nextMilestone } from "@/lib/learning-hub/shop-logic";
import type { LevelReward, LevelsOverview } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { LevelItemReward } from "./level-item-reward";

const number = new Intl.NumberFormat("vi-VN");

type FilterMode = "all" | "milestones" | "items" | "upcoming";

interface RealmTheme {
  name: string;
  subtitle: string;
  pill: string;
  headerBg: string;
  bossBg: string;
  bossAccent: string;
}

const REALMS: RealmTheme[] = [
  {
    name: "Chân Trời Bình Minh",
    subtitle: "Những bước cánh đầu tiên chạm vào bầu trời Mây Mây",
    pill: "border-sky-300/70 bg-sky-50 text-sky-900",
    headerBg: "from-sky-50 via-surface to-indigo-50/50 border-sky-200/80",
    bossBg: "from-[#0f223d] via-[#1c3d6e] to-[#2c5c94] border-sky-300/40",
    bossAccent: "text-sky-200",
  },
  {
    name: "Quần Đảo Mây Bạc",
    subtitle: "Vượt qua tầng mây thấp và mở khóa những danh hiệu đầu tiên",
    pill: "border-indigo-300/70 bg-indigo-50 text-indigo-900",
    headerBg: "from-indigo-50 via-surface to-violet-50/50 border-indigo-200/80",
    bossBg: "from-[#171d3b] via-[#2b346b] to-[#3f4b91] border-indigo-300/40",
    bossAccent: "text-indigo-200",
  },
  {
    name: "Hành Lang Cực Quang",
    subtitle: "Ánh sáng phương Bắc thắp sáng những chặng học bền bỉ",
    pill: "border-violet-300/70 bg-violet-50 text-violet-900",
    headerBg: "from-violet-50 via-surface to-fuchsia-50/50 border-violet-200/80",
    bossBg: "from-[#221542] via-[#3b2570] to-[#56359c] border-violet-300/40",
    bossAccent: "text-violet-200",
  },
  {
    name: "Vương Quốc Hoa Mây",
    subtitle: "Sắc hồng pastel nở rộ giữa tầng mây giữa trưa",
    pill: "border-rose-300/70 bg-rose-50 text-rose-900",
    headerBg: "from-rose-50 via-surface to-amber-50/50 border-rose-200/80",
    bossBg: "from-[#331429] via-[#572245] to-[#7c3261] border-rose-300/40",
    bossAccent: "text-rose-200",
  },
  {
    name: "Thành Phố Hoàng Hôn",
    subtitle: "Chạm ngưỡng cao thủ với bộ sưu tập vật phẩm quý hiếm",
    pill: "border-amber-300/70 bg-amber-50 text-amber-900",
    headerBg: "from-amber-50 via-surface to-orange-50/50 border-amber-200/80",
    bossBg: "from-[#2c1b0e] via-[#4d2f17] to-[#744720] border-amber-300/45",
    bossAccent: "text-amber-200",
  },
  {
    name: "Đỉnh Trời Huyền Thoại",
    subtitle: "Đẳng cấp tinh anh dành cho những nhà chinh phục kiên cường nhất",
    pill: "border-amber-400/80 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-950",
    headerBg: "from-amber-50/90 via-surface to-sky-50/60 border-amber-300/80",
    bossBg: "from-[#121629] via-[#262044] to-[#4a3216] border-amber-300/55",
    bossAccent: "text-amber-200",
  },
];

function getRealm(chapterIndex: number): RealmTheme {
  return REALMS[Math.min(chapterIndex, REALMS.length - 1)] ?? REALMS[0];
}

function scrollToLevel(level: number) {
  const el = document.getElementById(`level-${level}`);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ */
/* HERO — Obsidian Sky Command Deck + Circular Crest Ring              */
/* ------------------------------------------------------------------ */
function CommandDeckHero({
  current,
  milestone,
  hasMilestone,
  rewards,
  onJumpToMyLevel,
}: {
  current: LevelsOverview["current"];
  milestone: number;
  hasMilestone: boolean;
  rewards: LevelReward[];
  onJumpToMyLevel: () => void;
}) {
  const pct =
    current.required_xp > 0
      ? Math.min(100, Math.round((current.current_xp / current.required_xp) * 100))
      : 100;
  const xpLeft = Math.max(0, current.required_xp - current.current_xp);
  const reachedCount = rewards.filter((r) => r.reached || r.level <= current.level).length;
  const islandsUnlocked = rewards.filter(
    (r) => r.milestone === "ten" && (r.reached || r.level <= current.level),
  ).length;
  const totalIslands = rewards.filter((r) => r.milestone === "ten").length;

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <section
      aria-label="Tổng quan cấp độ hiện tại"
      className="relative isolate overflow-hidden rounded-[2rem] border border-slate-700/70 bg-[#0d1628] p-6 text-white shadow-2xl sm:p-8"
    >
      {/* Hiệu ứng cực quang nền tối */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 -z-10 size-80 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 -z-10 size-96 rounded-full bg-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/12 blur-3xl"
      />
      <Cloud
        aria-hidden="true"
        animated={false}
        strokeWidth={0.5}
        className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-64 -rotate-12 text-white/[0.06]"
      />

      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.92fr)] lg:items-center lg:gap-8">
        {/* Vòng tròn Cấp độ 3D Crest */}
        <div className="flex items-center gap-5 lg:flex-col lg:justify-center">
          <div className="relative grid size-36 shrink-0 place-items-center">
            <svg viewBox="0 0 132 132" className="size-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="levelRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="50%" stopColor="#FDE68A" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <circle
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="10"
              />
              <circle
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke="url(#levelRingGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 motion-reduce:transition-none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold tracking-[0.2em] text-amber-200/80 uppercase">
                Cấp độ
              </span>
              <span className="font-display text-4xl font-bold tracking-tight text-amber-200 tabular-nums">
                {number.format(current.level)}
              </span>
              <span className="mt-0.5 text-[11px] font-semibold text-sky-200 tabular-nums">
                {pct}%
              </span>
            </div>
          </div>

          <div className="lg:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-amber-200 uppercase">
                <Crown aria-hidden="true" animated={false} className="size-3.5" />
                Sky Odyssey
              </span>
              <MockDataChip source={getHubDataSource()} />
            </div>
            <p className="mt-2 text-lg font-bold text-white tabular-nums">
              {number.format(current.total_xp)} XP tích lũy
            </p>
          </div>
        </div>

        {/* Tiến độ & CTA */}
        <div className="min-w-0 space-y-4">
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-amber-200 uppercase">
              <Crown aria-hidden="true" animated={false} className="size-3.5" />
              Sky Odyssey · Hành trình cấp độ
            </span>
            <MockDataChip source={getHubDataSource()} />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {current.required_xp > 0
                ? `Chặng đường lên Cấp ${number.format(current.level + 1)}`
                : "Bạn đã chạm Đỉnh Trời Huyền Thoại!"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {current.required_xp > 0 ? (
                <>
                  Còn <strong className="text-amber-200 tabular-nums">{number.format(xpLeft)} XP</strong> nữa để mở khóa phần thưởng cấp kế tiếp.
                </>
              ) : (
                "Toàn bộ bầu trời Mây Mây đang ở dưới đôi cánh của bạn."
              )}
            </p>
          </div>

          {current.required_xp > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">Thanh năng lượng XP</span>
                <span className="tabular-nums text-amber-200">
                  {number.format(current.current_xp)} / {number.format(current.required_xp)} XP
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={current.required_xp}
                aria-valuenow={current.current_xp}
                aria-label={`${number.format(current.current_xp)} trên ${number.format(current.required_xp)} XP để lên cấp ${number.format(current.level + 1)}`}
                className="h-3 w-full overflow-hidden rounded-full bg-white/12 p-0.5"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-300 via-amber-200 to-amber-400 transition-all duration-500 motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={onJumpToMyLevel}
              className="min-h-10 rounded-full bg-amber-300 px-4 font-bold text-slate-950 hover:bg-amber-200"
            >
              <ArrowDown aria-hidden="true" className="size-4" />
              <span>Tới cấp của tôi</span>
            </Button>
            <Link
              href="/shop"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/18"
            >
              <Gift aria-hidden="true" animated={false} className="size-4 text-amber-200" />
              <span>Cửa hàng Mây</span>
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/18"
            >
              <Trophy aria-hidden="true" animated={false} className="size-4 text-sky-300" />
              <span>Bảng xếp hạng</span>
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Lưới Bento 4 chỉ số sống */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Kho Coin trắng</p>
            <div className="mt-2">
              <CoinBadge kind="white" amount={current.peak_balance} surface="dark" size="md" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Tổng XP</p>
            <p className="mt-1.5 text-xl font-extrabold text-white tabular-nums">
              {number.format(current.total_xp)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Đảo lớn đã mở</p>
            <p className="mt-1.5 text-xl font-extrabold text-amber-200 tabular-nums">
              {islandsUnlocked}
              <span className="text-xs font-semibold text-slate-400"> / {totalIslands}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-3.5 backdrop-blur-md">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Đảo kế tiếp</p>
            {hasMilestone ? (
              <button
                type="button"
                onClick={() => scrollToLevel(milestone)}
                className="mt-1.5 inline-flex items-center gap-1 text-xl font-extrabold text-sky-200 underline decoration-sky-300/40 underline-offset-4 hover:decoration-sky-200 cursor-pointer tabular-nums"
              >
                Cấp {number.format(milestone)}
              </button>
            ) : (
              <p className="mt-1.5 text-xl font-extrabold text-sky-200 tabular-nums">
                {reachedCount}/{rewards.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Danh sách phần thưởng của một cấp                                   */
/* ------------------------------------------------------------------ */
function RewardList({ reward, dark = false }: { reward: LevelReward; dark?: boolean }) {
  return (
    <ul aria-label="Phần thưởng" className="relative mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
      <li>
        <CoinBadge
          kind="white"
          amount={`+${number.format(reward.coins)}`}
          surface={dark ? "dark" : "light"}
          size="sm"
        />
      </li>
      {reward.items.map((item) => (
        <li key={item.id} className="min-w-0 max-w-full">
          <LevelItemReward item={item} />
        </li>
      ))}
      {(reward.coupon || reward.milestone === "ten") && (
        <li
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-dashed px-2.5 py-1 text-xs font-semibold",
            dark
              ? "border-amber-300/50 bg-amber-400/15 text-amber-100"
              : "border-accent-border bg-accent/60 text-accent-foreground",
          )}
        >
          <Ticket aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
          <span className="wrap-anywhere">
            {reward.coupon
              ? `Mã giảm đến ${reward.coupon.max_percent}% · ${reward.coupon.valid_days} ngày`
              : "Mã giảm giá · Sắp có"}
          </span>
        </li>
      )}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ Cấp độ dạng Battle-Pass Tile (Cấp thường & Trạm Mây)            */
/* ------------------------------------------------------------------ */
function LevelTile({
  reward,
  current,
}: {
  reward: LevelReward;
  current: number;
}) {
  const isMidMilestone = reward.milestone === "five";
  const active = reward.level === current;
  const reached = reward.reached || active;
  const StateIcon = active ? MapPin : reached ? Check : isMidMilestone ? Flag : Lock;

  return (
    <article
      id={`level-${reward.level}`}
      tabIndex={-1}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group relative isolate flex min-w-0 scroll-mt-28 flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        active
          ? "border-primary bg-gradient-to-br from-primary-light/85 via-surface to-surface shadow-md ring-2 ring-primary/30"
          : isMidMilestone
            ? "border-amber-300/80 bg-gradient-to-br from-accent-vanilla/70 via-surface to-surface shadow-xs"
            : reached
              ? "border-success-border/70 bg-surface"
              : "border-border/80 bg-surface/80 opacity-90",
      )}
    >
      {/* Số cấp watermark cỡ lớn */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-2 -bottom-4 select-none font-display text-7xl font-bold leading-none tabular-nums",
          active
            ? "text-primary/10"
            : isMidMilestone
              ? "text-amber-500/12"
              : "text-foreground/[0.045]",
        )}
      >
        {reward.level}
      </span>

      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : reached
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : isMidMilestone
                      ? "border-amber-300 bg-amber-100 text-amber-900"
                      : "border-border bg-background text-muted-foreground",
              )}
            >
              <StateIcon animated={false} className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-[color:var(--sn-neutral-500)] uppercase">
                {isMidMilestone ? "Trạm mây đặc biệt" : "Chặng bay"}
              </p>
              <h4 className="text-base font-extrabold text-foreground tabular-nums">
                Cấp {number.format(reward.level)}
              </h4>
            </div>
          </div>

          <Badge
            variant={active ? "info" : reached ? "success" : "outline"}
            className={cn("shrink-0", !reached && "bg-surface text-foreground")}
          >
            {active ? "Đang đứng" : reached ? "Đã đạt" : "Chưa mở"}
          </Badge>
        </div>

        <RewardList reward={reward} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px] font-semibold">
        <span className="text-[color:var(--sn-neutral-500)] tabular-nums">
          Mốc {number.format(reward.xp_required)} XP
        </span>
        {reached && reward.level > 1 ? (
          <span className="text-success-foreground">
            {reward.granted ? "✓ Đã nhận quà" : "Đang cập nhật"}
          </span>
        ) : (
          <span className="text-[color:var(--sn-neutral-500)]">
            {reward.level === 1 ? "Mốc khởi hành" : "Quà chờ mở khóa"}
          </span>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Đảo Mây Lớn (Cấp 10, 20, ..., 100) — Spotlight Boss Card            */
/* ------------------------------------------------------------------ */
function BossIslandCard({
  reward,
  current,
  milestone,
  realm,
}: {
  reward: LevelReward;
  current: number;
  milestone: number;
  realm: RealmTheme;
}) {
  const active = reward.level === current;
  const reached = reward.reached || active;
  const nextIsland = reward.level === milestone;

  return (
    <article
      id={`level-${reward.level}`}
      tabIndex={-1}
      aria-current={active ? "step" : undefined}
      className={cn(
        "relative isolate scroll-mt-28 overflow-hidden rounded-[1.75rem] border bg-gradient-to-br p-5 text-white shadow-xl sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        realm.bossBg,
        active && "ring-2 ring-amber-300",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 -z-10 size-48 rounded-full bg-amber-300/20 blur-3xl"
      />
      <Cloud
        aria-hidden="true"
        animated={false}
        strokeWidth={0.6}
        className="pointer-events-none absolute -right-6 -bottom-10 -z-10 size-48 -rotate-12 text-white/10"
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-400/20 px-3 py-0.5 text-[11px] font-extrabold tracking-[0.16em] text-amber-200 uppercase">
              <Crown aria-hidden="true" animated={false} className="size-3.5" />
              Đảo Mây Lớn
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                active
                  ? "bg-amber-300 text-slate-950"
                  : reached
                    ? "bg-emerald-400/20 text-emerald-200"
                    : nextIsland
                      ? "bg-sky-400/25 text-sky-100"
                      : "bg-white/12 text-slate-200",
              )}
            >
              {active ? "Bạn đang ở đây" : reached ? "Đã chinh phục" : nextIsland ? "Mục tiêu kế tiếp" : "Chưa mở khóa"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl tabular-nums">
              Cấp {number.format(reward.level)}
            </h4>
            <span className={cn("text-xs font-semibold tabular-nums", realm.bossAccent)}>
              Mốc {number.format(reward.xp_required)} XP
            </span>
          </div>

          <RewardList reward={reward} dark />
        </div>

        <div className="flex shrink-0 flex-col items-start gap-1.5 md:items-end">
          <div className="grid size-14 place-items-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-amber-200">
            {reached ? (
              <Award aria-hidden="true" animated={false} className="size-7" />
            ) : (
              <Star aria-hidden="true" animated={false} className="size-7" />
            )}
          </div>
          {reached && reward.level > 1 && (
            <p className="text-xs font-semibold text-white/80">
              {reward.granted ? "✓ Đã nhận trọn bộ quà" : "Đang cập nhật quà"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN VIEW                                                           */
/* ------------------------------------------------------------------ */
export function LevelsView() {
  const { current, rewards, error, isValidating, loadMore, retry } = useLevelsOverview();
  const [selectedChapter, setSelectedChapter] = useState<number | "all">("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const milestone = current ? nextMilestone(current.level) : undefined;
  const nextIsland = rewards.find((reward) => reward.level === milestone);

  // Gom nhóm các cấp thành từng Tầng Mây (mỗi tầng 10 cấp: 1-10, 11-20, ...)
  const chapters = useMemo(() => {
    const map = new Map<number, LevelReward[]>();
    for (const reward of rewards) {
      const idx = Math.floor((reward.level - 1) / 10);
      const list = map.get(idx) ?? [];
      list.push(reward);
      map.set(idx, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([index, items]) => {
        const sorted = [...items].sort((a, b) => a.level - b.level);
        const minLevel = index * 10 + 1;
        const maxLevel = (index + 1) * 10;
        const reachedCount = sorted.filter((r) => r.reached || (current && r.level <= current.level)).length;
        return {
          index,
          minLevel,
          maxLevel,
          realm: getRealm(index),
          items: sorted,
          reachedCount,
        };
      });
  }, [rewards, current]);

  const visibleChapters = useMemo(() => {
    return chapters
      .filter((ch) => selectedChapter === "all" || ch.index === selectedChapter)
      .map((ch) => {
        const filtered = ch.items.filter((reward) => {
          if (filterMode === "milestones") return reward.milestone === "ten" || reward.milestone === "five";
          if (filterMode === "items") return reward.items.length > 0 || Boolean(reward.coupon);
          if (filterMode === "upcoming") return current ? reward.level > current.level : true;
          return true;
        });
        return { ...ch, filtered };
      })
      .filter((ch) => ch.filtered.length > 0);
  }, [chapters, selectedChapter, filterMode, current]);

  const handleJumpToMyLevel = () => {
    if (!current) return;
    setFilterMode("all");
    setSelectedChapter("all");
    window.requestAnimationFrame(() => scrollToLevel(current.level));
  };

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-20">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {/* ── HERO COMMAND DECK ── */}
        {current && milestone !== undefined ? (
          <CommandDeckHero
            current={current}
            milestone={milestone}
            hasMilestone={Boolean(nextIsland)}
            rewards={rewards}
            onJumpToMyLevel={handleJumpToMyLevel}
          />
        ) : error ? (
          <HubLoadError
            error={error}
            title="Chưa tải được đường bay"
            message="Bạn thử tải lại để xem cấp và phần thưởng nhé."
            onRetry={retry}
            isRetrying={isValidating}
          />
        ) : (
          <div role="status" aria-label="Đang tải cấp độ" className="space-y-4">
            <Skeleton className="h-64 rounded-[2rem] motion-reduce:animate-none" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <Skeleton key={k} className="h-36 rounded-2xl motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        )}

        {/* ── STICKY GLASS CONTROL DECK (CHỌN TẦNG MÂY + BỘ LỌC) ── */}
        {current && chapters.length > 0 && (
          <section
            aria-label="Bộ lọc và chọn tầng mây"
            className="sticky top-20 z-20 space-y-3 rounded-[24px] border border-border/80 bg-surface/90 p-3.5 shadow-sm backdrop-blur-md"
          >
            {/* Dải chọn tầng 10 cấp */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--sn-neutral-600)]">
                <Layers aria-hidden="true" animated={false} className="size-4 text-primary" />
                Tầng mây:
              </span>
              <button
                type="button"
                onClick={() => setSelectedChapter("all")}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-bold transition-all cursor-pointer",
                  selectedChapter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light",
                )}
              >
                Tất cả ({rewards.length})
              </button>
              {chapters.map((ch) => {
                const isSelected = selectedChapter === ch.index;
                const completed = ch.reachedCount === ch.items.length && ch.items.length > 0;
                const containsMe = current.level >= ch.minLevel && current.level <= ch.maxLevel;
                return (
                  <button
                    key={ch.index}
                    type="button"
                    onClick={() => setSelectedChapter(ch.index)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold tabular-nums transition-all cursor-pointer",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : containsMe
                          ? "border-primary bg-primary-light text-primary"
                          : completed
                            ? "border-success-border bg-success-bg/70 text-success-foreground"
                            : "border-border bg-background text-foreground hover:border-primary-pastel",
                    )}
                  >
                    {completed && !isSelected && <Check aria-hidden="true" animated={false} className="size-3" />}
                    <span>
                      {ch.minLevel}–{ch.maxLevel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bộ lọc chế độ xem */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Compass aria-hidden="true" animated={false} className="mr-1 size-4 text-primary" />
                {(
                  [
                    { id: "all", label: "Mọi cấp độ" },
                    { id: "milestones", label: "Chỉ Trạm & Đảo lớn" },
                    { id: "items", label: "Có vật phẩm & Voucher" },
                    { id: "upcoming", label: "Cấp chưa mở" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterMode(tab.id)}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors cursor-pointer",
                      filterMode === tab.id
                        ? "bg-primary-light font-bold text-primary ring-1 ring-primary/30"
                        : "text-[color:var(--sn-neutral-600)] hover:bg-background hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-[color:var(--sn-neutral-500)]">
                Hiển thị {visibleChapters.reduce((acc, c) => acc + c.filtered.length, 0)} chặng
              </span>
            </div>
          </section>
        )}

        {/* ── DANH SÁCH TẦNG MÂY (BATTLE-PASS REALM CHAPTERS) ── */}
        {current && milestone !== undefined && (
          <div className="space-y-8">
            {visibleChapters.length === 0 ? (
              <EmptyState
                icon={<Gift />}
                title="Không có chặng nào khớp bộ lọc"
                description="Thử chuyển về 'Mọi cấp độ' hoặc chọn tầng mây khác để xem đầy đủ phần thưởng."
              />
            ) : (
              visibleChapters.map((ch) => {
                const normalItems = ch.filtered.filter((r) => r.milestone !== "ten");
                const bossItems = ch.filtered.filter((r) => r.milestone === "ten");
                const pct = ch.items.length > 0 ? Math.round((ch.reachedCount / ch.items.length) * 100) : 0;

                return (
                  <section
                    key={ch.index}
                    aria-labelledby={`realm-heading-${ch.index}`}
                    className="space-y-4"
                  >
                    {/* Header Tầng Mây */}
                    <div
                      className={cn(
                        "flex flex-col gap-3 rounded-3xl border bg-gradient-to-r p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
                        ch.realm.headerBg,
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-extrabold", ch.realm.pill)}>
                            <Rocket aria-hidden="true" animated={false} className="size-3.5" />
                            Tầng {ch.index + 1} · Cấp {ch.minLevel}–{ch.maxLevel}
                          </span>
                          {ch.reachedCount === ch.items.length && ch.items.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success-foreground">
                              <Check aria-hidden="true" animated={false} className="size-3" />
                              Hoàn thành tầng
                            </span>
                          )}
                        </div>
                        <h3 id={`realm-heading-${ch.index}`} className="font-display text-xl font-bold text-foreground sm:text-2xl">
                          {ch.realm.name}
                        </h3>
                        <p className="text-xs text-[color:var(--sn-neutral-600)]">{ch.realm.subtitle}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 sm:w-52 sm:flex-col sm:items-end">
                        <div className="flex w-full items-center justify-between text-xs font-bold tabular-nums">
                          <span className="text-[color:var(--sn-neutral-600)]">Tiến độ tầng</span>
                          <span className="text-primary">
                            {ch.reachedCount}/{ch.items.length} cấp
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lưới Battle-Pass các cấp thường & Trạm mây */}
                    {normalItems.length > 0 && (
                      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                        {normalItems.map((reward) => (
                          <LevelTile key={reward.level} reward={reward} current={current.level} />
                        ))}
                      </div>
                    )}

                    {/* Thẻ Boss Đảo Mây Lớn (Cấp 10, 20, ...) */}
                    {bossItems.map((boss) => (
                      <BossIslandCard
                        key={boss.level}
                        reward={boss}
                        current={current.level}
                        milestone={milestone}
                        realm={ch.realm}
                      />
                    ))}
                  </section>
                );
              })
            )}

            {error && (
              <HubLoadError
                error={error}
                title="Chưa tải được các cấp tiếp theo"
                message="Bạn có thể thử lại ngay tại chặng này."
                onRetry={retry}
                isRetrying={isValidating}
              />
            )}

            {!error && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => void loadMore()}
                  aria-busy={isValidating || undefined}
                  aria-disabled={isValidating || undefined}
                  className="min-h-11 w-full rounded-full bg-surface px-7 font-bold sm:w-fit"
                >
                  {isValidating ? "Đang tải thêm tầng mây…" : "Mở rộng thêm tầng mây phía trước"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
