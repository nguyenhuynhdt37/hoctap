"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Compass,
  Gift,
  LayoutGrid,
  Layers,
  Map as MapIcon,
  Rocket,
} from "pulsoicon-react";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useLevelsOverview } from "@/lib/learning-hub/levels-hooks";
import { nextMilestone } from "@/lib/learning-hub/shop-logic";
import type { LevelReward, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { HubLoadError } from "../hub-page-state";
import { getRealmTheme } from "./realm-themes";
import { RewardPreviewModal } from "./reward-preview-modal";
import { SkyPassportHero } from "./sky-passport-hero";
import {
  CloudSanctuaryCard,
  SkyTrailMap,
  type LevelsViewMode,
} from "./sky-trail-map";

type FilterMode = "all" | "milestones" | "items" | "upcoming";

function scrollToLevel(level: number) {
  const el = document.getElementById(`level-${level}`);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

export function LevelsView() {
  const { current, rewards, error, isValidating, loadMore, retry } = useLevelsOverview();
  const [selectedChapter, setSelectedChapter] = useState<number | "all">("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<LevelsViewMode>("map");
  const [previewState, setPreviewState] = useState<{
    reward: LevelReward;
    itemId?: string | null;
  } | null>(null);

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
        const reachedCount = sorted.filter(
          (r) => r.reached || (current && r.level <= current.level),
        ).length;
        return {
          index,
          minLevel,
          maxLevel,
          realm: getRealmTheme(index),
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
          if (filterMode === "milestones") {
            return reward.milestone === "ten" || reward.milestone === "five";
          }
          if (filterMode === "items") {
            return reward.items.length > 0 || Boolean(reward.coupon);
          }
          if (filterMode === "upcoming") {
            return current ? reward.level > current.level : true;
          }
          return true;
        });
        return { ...ch, filtered };
      })
      .filter((ch) => ch.filtered.length > 0);
  }, [chapters, selectedChapter, filterMode, current]);

  const handleJumpToLevel = (level: number) => {
    setFilterMode("all");
    setSelectedChapter("all");
    window.requestAnimationFrame(() => scrollToLevel(level));
  };

  const handleJumpToMyLevel = () => {
    if (!current) return;
    handleJumpToLevel(current.level);
  };

  const handlePreviewReward = (reward: LevelReward, item?: ShopItem) => {
    setPreviewState({ reward, itemId: item?.id ?? null });
  };

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-24">
      {/* Nền mây pastel loang nhẹ toàn trang đồng bộ Trang chủ */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[34rem] bg-gradient-to-b from-primary-light/55 via-surface-muted/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        {/* ── 1. HERO HỘ CHIẾU BẦU TRỜI ── */}
        {current && milestone !== undefined ? (
          <SkyPassportHero
            current={current}
            milestone={milestone}
            hasMilestone={Boolean(nextIsland)}
            rewards={rewards}
            onJumpToMyLevel={handleJumpToMyLevel}
            onJumpToMilestone={handleJumpToLevel}
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
            <Skeleton className="h-72 rounded-[2rem] motion-reduce:animate-none" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <Skeleton key={k} className="h-36 rounded-2xl motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        )}

        {/* ── 2. THANH ĐIỀU KHIỂN KÍNH MỜ (CHỌN TẦNG MÂY + LỌC + CHẾ ĐỘ XEM) ── */}
        {current && chapters.length > 0 && (
          <section
            aria-label="Bộ lọc, chọn tầng mây và chế độ hiển thị"
            className="sticky top-20 z-20 space-y-3 rounded-[24px] border border-primary-pastel/75 bg-surface/92 p-3.5 shadow-[0_12px_28px_-10px_rgba(53,111,167,0.12)] backdrop-blur-md"
          >
            {/* Dải chọn tầng mây + Chuyển đổi Đường bay / Lưới gọn */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Layers aria-hidden="true" animated={false} className="size-4 text-primary" />
                  Tầng mây:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChapter("all")}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-bold transition-all cursor-pointer",
                    selectedChapter === "all"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light/70",
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
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : containsMe
                            ? "border-primary-pastel bg-primary-light text-primary"
                            : completed
                              ? "border-success-border bg-success-bg/75 text-success-foreground"
                              : "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light/50",
                      )}
                    >
                      {completed && !isSelected && (
                        <Check aria-hidden="true" animated={false} className="size-3" />
                      )}
                      <span>
                        {ch.minLevel}–{ch.maxLevel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bộ chuyển chế độ Đường Bay / Lưới Gọn */}
              <div
                role="group"
                aria-label="Chế độ hiển thị bản đồ"
                className="inline-flex items-center rounded-full border border-border bg-background p-1"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "map"}
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                    viewMode === "map"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MapIcon aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Đường bay</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Lưới gọn</span>
                </button>
              </div>
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5">
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
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Hiển thị {visibleChapters.reduce((acc, c) => acc + c.filtered.length, 0)} chặng
              </span>
            </div>
          </section>
        )}

        {/* ── 3. HÀNH TRÌNH CÁC TẦNG MÂY (SKY ATLAS CHAPTERS) ── */}
        {current && milestone !== undefined && (
          <div className="space-y-10">
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
                const pct =
                  ch.items.length > 0 ? Math.round((ch.reachedCount / ch.items.length) * 100) : 0;

                return (
                  <section
                    key={ch.index}
                    aria-labelledby={`realm-heading-${ch.index}`}
                    className="space-y-5"
                  >
                    {/* Banner đầu Tầng Mây chuẩn pastel sáng */}
                    <div
                      className={cn(
                        "relative isolate flex flex-col gap-4 overflow-hidden rounded-[1.75rem] border bg-gradient-to-r p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-6",
                        ch.realm.headerBg,
                      )}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-extrabold",
                              ch.realm.pill,
                            )}
                          >
                            <Rocket aria-hidden="true" animated={false} className="size-3.5" />
                            Tầng {ch.index + 1} · Cấp {ch.minLevel}–{ch.maxLevel}
                          </span>
                          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                            {ch.realm.altitude}
                          </span>
                          {ch.reachedCount === ch.items.length && ch.items.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success-foreground">
                              <Check aria-hidden="true" animated={false} className="size-3" />
                              Hoàn thành tầng
                            </span>
                          )}
                        </div>
                        <h2
                          id={`realm-heading-${ch.index}`}
                          className="font-display text-xl font-bold text-foreground sm:text-2xl"
                        >
                          {ch.realm.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">{ch.realm.subtitle}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 sm:w-56 sm:flex-col sm:items-end">
                        <div className="flex w-full items-center justify-between text-xs font-bold tabular-nums">
                          <span className="text-muted-foreground">Tiến độ tầng</span>
                          <span className="text-primary">
                            {ch.reachedCount}/{ch.items.length} cấp ({pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full border border-border/70 bg-surface">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500 motion-reduce:transition-none",
                              ch.realm.progressFill,
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Đường bay uốn lượn hoặc Lưới gọn cho các cấp 1..9 trong tầng */}
                    {normalItems.length > 0 && (
                      <SkyTrailMap
                        items={normalItems}
                        currentLevel={current.level}
                        viewMode={viewMode}
                        onPreview={handlePreviewReward}
                      />
                    )}

                    {/* Thẻ Đảo Mây Lớn (Cấp 10, 20, ...) kiểu Boarding Pass sáng pastel */}
                    {bossItems.map((boss) => (
                      <CloudSanctuaryCard
                        key={boss.level}
                        reward={boss}
                        currentLevel={current.level}
                        milestone={milestone}
                        realm={ch.realm}
                        onPreview={handlePreviewReward}
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
                  className="min-h-11 w-full rounded-full border-primary-pastel bg-surface px-7 font-bold text-primary shadow-xs hover:bg-primary-light sm:w-fit"
                >
                  {isValidating
                    ? "Đang mở thêm tầng mây…"
                    : "Khám phá thêm tầng mây phía trước"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal ướm thử quà trực tiếp lên hồ sơ học viên */}
      {current && (
        <RewardPreviewModal
          reward={previewState?.reward ?? null}
          initialItemId={previewState?.itemId}
          currentLevel={current.level}
          totalXp={current.total_xp}
          onClose={() => setPreviewState(null)}
        />
      )}
    </main>
  );
}
