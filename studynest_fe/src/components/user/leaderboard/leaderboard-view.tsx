"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Coins,
  Crown,
  Flame,
  Medal,
  Search,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  Zap,
  type PulsoIcon,
} from "pulsoicon-react";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import { useDebouncedUrlSearch, useUrlQueryState } from "@/hooks/useUrlQueryState";
import { CoinBadge, Skeleton } from "@/components/ui";
import { HubLoadError } from "@/components/learning-hub/hub-page-state";
import { EmblemIcon, FramedAvatar, TitleBadge } from "@/components/learning-hub/shop/item-art";
import { cn } from "@/lib/utils";
import type {
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardResponse,
} from "@/types/user/leaderboard";

const numberFmt = new Intl.NumberFormat("vi-VN");

interface CategoryTheme {
  id: LeaderboardCategory;
  label: string;
  shortLabel: string;
  icon: PulsoIcon;
  auraFrom: string;
  auraVia: string;
  pillActive: string;
  barGradient: string;
  badgeTone: string;
  ctaHref: string;
  ctaLabel: string;
}

const CATEGORIES: CategoryTheme[] = [
  {
    id: "xp",
    label: "Cấp độ & XP",
    shortLabel: "XP",
    icon: Trophy,
    auraFrom: "from-amber-400/25",
    auraVia: "via-sky-400/15",
    pillActive: "bg-amber-400 text-slate-950 shadow-amber-400/30",
    barGradient: "from-amber-400 to-orange-400",
    badgeTone: "border-amber-300/60 bg-amber-50 text-amber-900",
    ctaHref: "/levels",
    ctaLabel: "Xem lộ trình cấp độ",
  },
  {
    id: "streak",
    label: "Chuỗi ngày học",
    shortLabel: "Streak",
    icon: Flame,
    auraFrom: "from-orange-500/25",
    auraVia: "via-rose-400/15",
    pillActive: "bg-orange-400 text-slate-950 shadow-orange-400/30",
    barGradient: "from-orange-400 to-rose-400",
    badgeTone: "border-orange-300/60 bg-orange-50 text-orange-900",
    ctaHref: "/missions",
    ctaLabel: "Giữ chuỗi hôm nay",
  },
  {
    id: "coins",
    label: "Kho Coin trắng",
    shortLabel: "Coin",
    icon: Coins,
    auraFrom: "from-sky-400/25",
    auraVia: "via-indigo-400/15",
    pillActive: "bg-sky-300 text-slate-950 shadow-sky-300/30",
    barGradient: "from-sky-400 to-indigo-400",
    badgeTone: "border-sky-300/60 bg-sky-50 text-sky-900",
    ctaHref: "/shop",
    ctaLabel: "Ghé Cửa hàng Mây",
  },
  {
    id: "lessons",
    label: "Chăm chỉ học bài",
    shortLabel: "Bài học",
    icon: BookOpen,
    auraFrom: "from-violet-400/25",
    auraVia: "via-sky-400/15",
    pillActive: "bg-violet-300 text-slate-950 shadow-violet-300/30",
    barGradient: "from-violet-400 to-sky-400",
    badgeTone: "border-violet-300/60 bg-violet-50 text-violet-900",
    ctaHref: "/my-learning",
    ctaLabel: "Học tiếp bài mới",
  },
  {
    id: "quiz",
    label: "Cao thủ Thực chiến",
    shortLabel: "Thực chiến",
    icon: Target,
    auraFrom: "from-rose-400/25",
    auraVia: "via-amber-400/15",
    pillActive: "bg-rose-300 text-slate-950 shadow-rose-300/30",
    barGradient: "from-rose-400 to-amber-400",
    badgeTone: "border-rose-300/60 bg-rose-50 text-rose-900",
    ctaHref: "/review",
    ctaLabel: "Luyện tập ngay",
  },
];

function ScoreDisplay({
  category,
  score,
  unit,
  surface = "light",
  size = "md",
}: {
  category: LeaderboardCategory;
  score: number;
  unit: string;
  surface?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}) {
  if (category === "coins") {
    return (
      <CoinBadge
        kind="white"
        amount={score}
        surface={surface}
        size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
      />
    );
  }
  const textClass =
    size === "lg"
      ? "text-2xl font-extrabold tracking-tight tabular-nums"
      : size === "sm"
        ? "text-sm font-bold tabular-nums"
        : "text-base font-extrabold tabular-nums";
  return (
    <span className={cn("inline-flex items-baseline gap-1", surface === "dark" ? "text-white" : "text-foreground")}>
      <span className={textClass}>{numberFmt.format(score)}</span>
      <span className={cn("text-xs font-semibold", surface === "dark" ? "text-slate-300" : "text-[color:var(--sn-neutral-600)]")}>
        {unit}
      </span>
    </span>
  );
}

function PodiumCard({
  entry,
  category,
  unit,
  place,
}: {
  entry: LeaderboardEntry;
  category: LeaderboardCategory;
  unit: string;
  place: 1 | 2 | 3;
}) {
  const isFirst = place === 1;
  const styles =
    place === 1
      ? {
          shell:
            "border-amber-300/70 bg-gradient-to-b from-slate-900 via-[#152238] to-[#0f172a] text-white shadow-[0_24px_60px_-20px_rgba(245,158,11,0.45)] md:-mt-6 md:pb-8",
          pedestal: "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-slate-950",
          ring: "ring-amber-300/50",
          label: "Hạng #1 · Quán quân",
          surface: "dark" as const,
        }
      : place === 2
        ? {
            shell:
              "border-slate-300/80 bg-gradient-to-b from-surface via-surface to-primary-light/40 text-foreground shadow-lg",
            pedestal: "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900",
            ring: "ring-slate-300/60",
            label: "Hạng #2 · Á quân",
            surface: "light" as const,
          }
        : {
            shell:
              "border-amber-200/80 bg-gradient-to-b from-surface via-surface to-accent-vanilla/45 text-foreground shadow-lg",
            pedestal: "bg-gradient-to-r from-amber-200 to-orange-200 text-amber-950",
            ring: "ring-amber-200/70",
            label: "Hạng #3 · Quý quân",
            surface: "light" as const,
          };

  return (
    <article
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-[28px] border p-5 text-center transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        styles.shell,
        entry.is_me && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {isFirst && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/2 h-36 w-56 -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl"
        />
      )}

      <div className={cn("mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold", styles.pedestal)}>
        {isFirst ? (
          <Crown aria-hidden="true" className="size-3.5" />
        ) : (
          <Medal aria-hidden="true" className="size-3.5" />
        )}
        <span>{styles.label}</span>
      </div>

      <div className={cn("relative mb-3 inline-grid place-items-center rounded-full p-1 ring-4", styles.ring)}>
        <FramedAvatar
          src={entry.avatar}
          name={entry.fullname}
          equipment={entry.equipment}
          className={isFirst ? "size-20 text-xl" : "size-16 text-lg"}
        />
        <EmblemIcon
          item={entry.equipment?.emblem}
          decorative
          className="absolute -right-0.5 -bottom-0.5 size-6 rounded-full ring-2 ring-surface"
        />
      </div>

      <h3 className={cn("max-w-full truncate text-base font-extrabold", isFirst ? "text-white" : "text-foreground")}>
        {entry.fullname}
        {entry.is_me && (
          <span className="ml-1.5 inline-flex align-middle rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            Bạn
          </span>
        )}
      </h3>

      <div className="mt-1.5 flex min-h-6 flex-wrap items-center justify-center gap-1.5">
        <TitleBadge item={entry.equipment?.title} className="max-w-44 [&>span]:truncate" />
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
            isFirst ? "bg-white/10 text-amber-200" : "bg-primary-light text-primary",
          )}
        >
          <Star aria-hidden="true" animated={false} className="size-3" />
          Cấp {entry.level}
        </span>
      </div>

      <div
        className={cn(
          "mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border px-3 py-2.5",
          isFirst ? "border-white/15 bg-white/8" : "border-border/80 bg-background/70",
        )}
      >
        <ScoreDisplay category={category} score={entry.score} unit={unit} surface={styles.surface} size="lg" />
        <span className={cn("text-xs font-medium", isFirst ? "text-slate-300" : "text-[color:var(--sn-neutral-600)]")}>
          {entry.secondary_label}
        </span>
      </div>
    </article>
  );
}

function LeaderboardRow({
  entry,
  category,
  unit,
  topScore,
  theme,
}: {
  entry: LeaderboardEntry;
  category: LeaderboardCategory;
  unit: string;
  topScore: number;
  theme: CategoryTheme;
}) {
  const ratio = topScore > 0 ? Math.min(100, Math.max(4, Math.round((entry.score / topScore) * 100))) : 0;

  return (
    <li
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border p-3.5 transition-all sm:flex-row sm:items-center sm:gap-4 sm:px-4 motion-reduce:transition-none",
        entry.is_me
          ? "border-primary bg-primary-light/55 shadow-sm ring-1 ring-primary/30"
          : "border-border/80 bg-surface hover:border-primary-pastel hover:bg-primary-light/25",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border text-sm font-extrabold tabular-nums",
            entry.rank <= 3
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : entry.is_me
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground",
          )}
        >
          #{entry.rank}
        </span>

        <div className="relative shrink-0">
          <FramedAvatar
            src={entry.avatar}
            name={entry.fullname}
            equipment={entry.equipment}
            className="size-11 text-sm"
          />
          <EmblemIcon
            item={entry.equipment?.emblem}
            decorative
            className="absolute -right-0.5 -bottom-0.5 size-4.5 rounded-full ring-1 ring-surface"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground">{entry.fullname}</span>
            {entry.is_me && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                Bạn
              </span>
            )}
            <TitleBadge item={entry.equipment?.title} className="hidden max-w-40 sm:inline-flex [&>span]:truncate" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[color:var(--sn-neutral-600)]">
            <span className="font-semibold text-primary">Cấp {entry.level}</span>
            <span>{entry.secondary_label}</span>
            {entry.current_streak > 0 && category !== "streak" && (
              <span className="inline-flex items-center gap-0.5 text-orange-700">
                <Flame aria-hidden="true" animated={false} className="size-3.5" />
                {entry.current_streak} ngày
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:w-64 sm:justify-end">
        <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-background sm:block">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", theme.barGradient)}
            style={{ width: `${ratio}%` }}
          />
        </div>
        <div className="shrink-0 text-right">
          <ScoreDisplay category={category} score={entry.score} unit={unit} size="md" />
        </div>
      </div>
    </li>
  );
}

const LEADERBOARD_QUERY_SCHEMA = {
  category: {
    type: "string",
    default: "xp" as LeaderboardCategory,
    allowed: ["xp", "streak", "coins", "lessons", "quiz"] as const,
  },
  search: { type: "string", default: "" as string, trim: true },
} as const;

export function LeaderboardView() {
  const { values, setParam } = useUrlQueryState(LEADERBOARD_QUERY_SCHEMA);
  const { category } = values;
  const { inputValue: query, setInputValue: setQuery } = useDebouncedUrlSearch(
    values.search,
    (val) => setParam("search", val),
  );

  const activeTheme = useMemo(
    () => CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0],
    [category],
  );

  const { data, error, isLoading, isValidating, mutate } = useAuthedSWR<LeaderboardResponse>(
    `/gamification/leaderboard?category=${category}&limit=50`,
    { keepPreviousData: true, shouldRetryOnError: false },
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    const list = data?.entries ?? [];
    if (!normalizedQuery) return list;
    return list.filter((entry) => entry.fullname.toLowerCase().includes(normalizedQuery));
  }, [data?.entries, normalizedQuery]);

  const showPodium = !normalizedQuery && (data?.entries.length ?? 0) >= 3;
  const podiumTop3 = useMemo(() => {
    if (!showPodium || !data) return [];
    const [first, second, third] = data.entries;
    return [
      { entry: second, place: 2 as const },
      { entry: first, place: 1 as const },
      { entry: third, place: 3 as const },
    ];
  }, [showPodium, data]);

  const listEntries = showPodium ? filteredEntries.slice(3) : filteredEntries;
  const ActiveIcon = activeTheme.icon;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      {/* ── OBSIDIAN SKY HALL-OF-FAME HERO ── */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-[#0d1628] p-6 text-white shadow-2xl sm:p-8">
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-br to-transparent blur-3xl",
            activeTheme.auraFrom,
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -right-20 -bottom-24 h-80 w-80 rounded-full bg-gradient-to-tl to-transparent blur-3xl",
            activeTheme.auraVia,
          )}
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1 text-xs font-semibold text-sky-200 backdrop-blur-sm">
              <Crown aria-hidden="true" className="size-4 text-amber-300" />
              <span>Hall of Fame · Bảng Vàng Mây Mây</span>
            </div>

            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {data?.meta.label ?? activeTheme.label}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                {data?.meta.tagline ?? "Cùng tranh tài qua 5 hạng mục học tập thực chiến và ghi tên mình lên bục vinh danh."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-xs font-semibold text-slate-200">
                <UsersRound aria-hidden="true" animated={false} className="size-4 text-sky-300" />
                {numberFmt.format(data?.total_participants ?? 0)} học viên tham gia
              </span>
              <Link
                href={activeTheme.ctaHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-100"
              >
                <span>{activeTheme.ctaLabel}</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* ── MY RANK SPOTLIGHT CARD ── */}
          <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-300 uppercase">
                <ActiveIcon aria-hidden="true" animated={false} className="size-4 text-amber-300" />
                Vị trí của bạn
              </span>
              {data?.me && (
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">
                  Top {data.me.top_percent}%
                </span>
              )}
            </div>

            {isLoading && !data ? (
              <div className="space-y-2.5">
                <Skeleton className="h-9 w-32 bg-white/10" />
                <Skeleton className="h-4 w-48 bg-white/10" />
              </div>
            ) : data?.me ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold tracking-tight text-white tabular-nums">
                        #{data.me.rank}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        / {numberFmt.format(data.me.total_participants)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{data.me.secondary_label}</p>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-slate-950/50 px-3.5 py-2 text-right">
                    <ScoreDisplay
                      category={category}
                      score={data.me.score}
                      unit={data.meta.unit}
                      surface="dark"
                      size="md"
                    />
                  </div>
                </div>

                {data.me.rank === 1 ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/12 px-3.5 py-2 text-xs font-semibold text-amber-200">
                    <Crown aria-hidden="true" animated={false} className="size-4 shrink-0" />
                    <span>Bạn đang giữ Ngôi Vương #1 ở hạng mục này!</span>
                  </div>
                ) : data.me.next_rank_gap !== null ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-3.5 py-2 text-xs text-sky-100">
                    <TrendingUp aria-hidden="true" animated={false} className="size-4 shrink-0 text-sky-300" />
                    <span>
                      Cần thêm{" "}
                      <strong className="font-bold text-white">
                        {numberFmt.format(data.me.next_rank_gap)} {data.meta.unit}
                      </strong>{" "}
                      để vượt <strong className="font-bold text-white">{data.me.next_rank_user_name}</strong>
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-300">Chưa ghi nhận thứ hạng của bạn trong hạng mục này.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── FLOATING GLASS CATEGORY SWITCHER + SEARCH ── */}
      <div className="sticky top-20 z-20 flex flex-col gap-3 rounded-[24px] border border-border/80 bg-surface/90 p-3 shadow-sm backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Hạng mục bảng xếp hạng" className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((item) => {
            const Icon = item.icon;
            const selected = item.id === category;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setParam("category", item.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition-all sm:text-sm motion-reduce:transition-none",
                  selected
                    ? cn(item.pillActive, "shadow-md")
                    : "border border-border/70 bg-background/70 text-foreground hover:border-primary-pastel hover:bg-primary-light/60",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <label className="relative block w-full lg:w-64">
          <span className="sr-only">Tìm học viên trong bảng xếp hạng</span>
          <Search
            aria-hidden="true"
            animated={false}
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[color:var(--sn-neutral-500)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên học viên…"
            className="h-10 w-full rounded-full border border-border bg-background pr-4 pl-10 text-sm text-foreground placeholder:text-[color:var(--sn-neutral-500)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      {/* ── ERROR STATE ── */}
      {error && (
        <HubLoadError
          error={error}
          title="Chưa tải được bảng xếp hạng"
          message="Kiểm tra kết nối và thử tải lại bảng vàng nhé."
          onRetry={() => void mutate()}
          isRetrying={isValidating}
        />
      )}

      {/* ── LOADING SKELETON ── */}
      {isLoading && !data && !error && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-64 rounded-[28px]" />
            ))}
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((k) => (
              <Skeleton key={k} className="h-18 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {/* ── TOP 3 GRAND PODIUM ── */}
      {showPodium && data && (
        <section aria-label="Top 3 vinh danh" className="pt-2">
          <div className="grid items-end gap-4 md:grid-cols-3">
            {podiumTop3.map(({ entry, place }) => (
              <PodiumCard
                key={entry.user_id}
                entry={entry}
                category={category}
                unit={data.meta.unit}
                place={place}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FULL RANKING LIST ── */}
      {data && (
        <section aria-label="Danh sách xếp hạng" className="space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h2 className="inline-flex items-center gap-2 text-base font-extrabold text-foreground">
              <Award aria-hidden="true" animated={false} className="size-5 text-primary" />
              {normalizedQuery
                ? `Kết quả tìm kiếm (${filteredEntries.length})`
                : showPodium
                  ? `Các vị trí tiếp theo (${listEntries.length})`
                  : `Bảng xếp hạng (${listEntries.length})`}
            </h2>
            {isValidating && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Zap aria-hidden="true" animated={false} className="size-3.5" />
                Đang cập nhật…
              </span>
            )}
          </div>

          {listEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface/70 p-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                {normalizedQuery
                  ? `Không tìm thấy học viên nào khớp với "${query}".`
                  : "Chưa có thêm học viên trong hạng mục này."}
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {listEntries.map((entry) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  category={category}
                  unit={data.meta.unit}
                  topScore={data.top_score}
                  theme={activeTheme}
                />
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
