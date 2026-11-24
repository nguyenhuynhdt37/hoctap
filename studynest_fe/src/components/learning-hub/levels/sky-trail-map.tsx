"use client";

import {
  Award,
  Check,
  Cloud,
  Crown,
  Eye,
  Flag,
  Lock,
  MapPin,
  Star,
  Ticket,
} from "pulsoicon-react";
import { Badge, Button, CoinBadge } from "@/components/ui";
import type { LevelReward, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { LevelItemReward } from "./level-item-reward";
import type { RealmTheme } from "./realm-themes";

const number = new Intl.NumberFormat("vi-VN");

export type LevelsViewMode = "map" | "grid";

interface RewardListProps {
  reward: LevelReward;
  onPreviewItem?: (reward: LevelReward, item: ShopItem) => void;
}

function RewardList({ reward, onPreviewItem }: RewardListProps) {
  return (
    <ul aria-label="Phần thưởng" className="relative mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
      <li>
        <CoinBadge
          kind="white"
          amount={`+${number.format(reward.coins)}`}
          surface="light"
          size="sm"
        />
      </li>
      {reward.items.map((item) => (
        <li key={item.id} className="min-w-0 max-w-full">
          <LevelItemReward
            item={item}
            onSelect={onPreviewItem ? (selected) => onPreviewItem(reward, selected) : undefined}
          />
        </li>
      ))}
      {reward.coupon && reward.milestone !== "ten" && (
        <li className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-dashed border-accent-border bg-accent/55 px-2.5 py-1 text-xs font-semibold text-accent-foreground">
          <Ticket aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
          <span className="wrap-anywhere">
            Giảm đến {reward.coupon.max_percent}% · {reward.coupon.valid_days} ngày
          </span>
        </li>
      )}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ chặng bay đơn lẻ (Cấp thường & Trạm Mây cấp 5)                  */
/* ------------------------------------------------------------------ */
interface SkyLevelCardProps {
  reward: LevelReward;
  currentLevel: number;
  onPreview: (reward: LevelReward, item?: ShopItem) => void;
}

function SkyLevelCard({ reward, currentLevel, onPreview }: SkyLevelCardProps) {
  const isMidMilestone = reward.milestone === "five";
  const active = reward.level === currentLevel;
  const reached = reward.reached || active;
  const hasPreviewable = reward.items.length > 0;
  const StateIcon = active ? MapPin : reached ? Check : isMidMilestone ? Flag : Lock;

  return (
    <article
      id={`level-${reward.level}`}
      tabIndex={-1}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group relative isolate flex min-w-0 scroll-mt-32 flex-col justify-between overflow-hidden rounded-[22px] border p-4 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        active
          ? "border-primary bg-gradient-to-br from-primary-light/90 via-surface to-surface shadow-[0_14px_30px_-10px_rgba(53,111,167,0.22)] ring-2 ring-primary/25"
          : isMidMilestone
            ? "border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/70 via-surface to-surface-muted/80 shadow-sm"
            : reached
              ? "border-success-border/80 bg-surface shadow-xs"
              : "border-border bg-surface/90",
      )}
    >
      {/* Số cấp watermark tinh tế kiểu editorial */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-1.5 -bottom-4 select-none font-display text-7xl font-bold leading-none tabular-nums",
          active
            ? "text-primary/10"
            : isMidMilestone
              ? "text-accent-vanilla-foreground/10"
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
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : reached
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : isMidMilestone
                      ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                      : "border-border bg-background text-muted-foreground",
              )}
            >
              <StateIcon animated={false} className="size-4" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[11px] font-bold tracking-wider uppercase",
                  isMidMilestone
                    ? "text-accent-vanilla-foreground"
                    : active
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {isMidMilestone ? "Trạm nghỉ mây" : active ? "Đang bay tại đây" : "Chặng bay"}
              </p>
              <h4 className="font-display text-lg font-bold text-foreground tabular-nums">
                Cấp {number.format(reward.level)}
              </h4>
            </div>
          </div>

          <Badge
            variant={active ? "primary" : reached ? "success" : isMidMilestone ? "vanilla" : "outline"}
            className="shrink-0"
          >
            {active ? "Đang đứng" : reached ? "Đã đạt" : "Chưa mở"}
          </Badge>
        </div>

        <RewardList
          reward={reward}
          onPreviewItem={(r, item) => onPreview(r, item)}
        />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11px] font-semibold">
        <span className="text-muted-foreground tabular-nums">
          Mốc {number.format(reward.xp_required)} XP
        </span>

        <div className="flex items-center gap-2">
          {hasPreviewable && (
            <button
              type="button"
              onClick={() => onPreview(reward)}
              className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light/70 px-2.5 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
            >
              <Eye aria-hidden="true" animated={false} className="size-3" />
              <span>Ướm thử</span>
            </button>
          )}
          {reached && reward.level > 1 ? (
            <span className="text-success-foreground">
              {reward.granted ? "✓ Đã nhận quà" : "Đang cập nhật"}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {reward.level === 1 ? "Mốc khởi hành" : "Chờ mở khóa"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Đảo Mây Lớn (Cấp 10, 20, ...) — Boarding Pass Sanctuary Sáng Pastel */
/* ------------------------------------------------------------------ */
interface CloudSanctuaryCardProps {
  reward: LevelReward;
  currentLevel: number;
  milestone: number;
  realm: RealmTheme;
  onPreview: (reward: LevelReward, item?: ShopItem) => void;
}

export function CloudSanctuaryCard({
  reward,
  currentLevel,
  milestone,
  realm,
  onPreview,
}: CloudSanctuaryCardProps) {
  const active = reward.level === currentLevel;
  const reached = reward.reached || active;
  const isNextIsland = reward.level === milestone;
  const hasItems = reward.items.length > 0;

  return (
    <article
      id={`level-${reward.level}`}
      tabIndex={-1}
      aria-current={active ? "step" : undefined}
      className={cn(
        "relative isolate scroll-mt-32 overflow-hidden rounded-[2rem] border bg-gradient-to-br shadow-[0_20px_42px_-12px_rgba(53,111,167,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        realm.sanctuaryBg,
        realm.sanctuaryBorder,
        active && "ring-2 ring-primary/40",
      )}
    >
      {/* Đốm mây mờ nền pastel */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -top-14 -left-10 -z-10 size-52 rounded-full blur-3xl",
          realm.blobClass,
        )}
      />
      <Cloud
        aria-hidden="true"
        animated={false}
        strokeWidth={0.65}
        className="pointer-events-none absolute right-6 -bottom-10 -z-10 size-52 -rotate-6 text-surface/75"
      />

      <div className="grid md:grid-cols-[minmax(0,1fr)_270px]">
        {/* Cánh trái: Thông tin Đảo Mây Lớn & Phần thưởng */}
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-extrabold tracking-[0.14em] uppercase",
                realm.pill,
              )}
            >
              <Crown aria-hidden="true" animated={false} className="size-3.5" />
              Đảo Mây Lớn · {realm.code}
            </span>
            <Badge
              variant={active ? "primary" : reached ? "success" : isNextIsland ? "info" : "outline"}
              className={cn(!reached && !isNextIsland && "bg-surface/90 text-foreground")}
            >
              {active
                ? "Bạn đang ở đây"
                : reached
                  ? "Đã chinh phục"
                  : isNextIsland
                    ? "Mục tiêu kế tiếp"
                    : "Chưa mở khóa"}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl tabular-nums">
              Cấp {number.format(reward.level)}
            </h4>
            <span className={cn("text-xs font-bold tabular-nums", realm.sanctuaryAccent)}>
              Mốc {number.format(reward.xp_required)} XP
            </span>
          </div>

          <RewardList
            reward={reward}
            onPreviewItem={(r, item) => onPreview(r, item)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {hasItems && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onPreview(reward)}
                className="min-h-10 rounded-full px-4 font-bold"
              >
                <Eye aria-hidden="true" className="size-4" />
                <span>Ướm thử trọn bộ quà</span>
              </Button>
            )}
            {reached && reward.level > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg/85 px-3 py-1 text-xs font-bold text-success-foreground">
                <Check aria-hidden="true" animated={false} className="size-3.5" />
                {reward.granted ? "Đã nhận trọn bộ quà" : "Đang cập nhật quà"}
              </span>
            )}
          </div>
        </div>

        {/* Cánh phải kiểu cuống vé Boarding Pass (có vết khuyết bán nguyệt + đường xé đứt nét) */}
        <div className="relative flex flex-col justify-between border-t border-dashed border-border-strong bg-surface/75 p-5 backdrop-blur-sm md:border-t-0 md:border-l sm:p-6">
          {/* Vết đục lỗ bán nguyệt của cuống vé trên desktop */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3.5 -left-3.5 hidden size-7 rounded-full border border-border-strong bg-background md:block"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3.5 -left-3.5 hidden size-7 rounded-full border border-border-strong bg-background md:block"
          />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                Vé ưu đãi đảo mây
              </p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">
                {reward.coupon
                  ? `Giảm đến ${reward.coupon.max_percent}%`
                  : "Mã ưu đãi sắp mở"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {reward.coupon
                  ? `Hiệu lực ${reward.coupon.valid_days} ngày từ lúc chạm mốc`
                  : "Tặng kèm khi chinh phục đảo lớn"}
              </p>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-xs",
                realm.pill,
              )}
            >
              {reached ? (
                <Award animated={false} className="size-6" />
              ) : (
                <Star animated={false} className="size-6" />
              )}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-border pt-3 text-[11px] font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-accent-foreground">
              <Ticket aria-hidden="true" animated={false} className="size-3.5" />
              BOARDING PASS
            </span>
            <span className="tabular-nums">LV.{number.format(reward.level)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Bản đồ Đường Bay Uốn Lượn (Alternating Sky Trail) & Chế độ Lưới Gọn */
/* ------------------------------------------------------------------ */
interface SkyTrailMapProps {
  items: LevelReward[];
  currentLevel: number;
  viewMode: LevelsViewMode;
  onPreview: (reward: LevelReward, item?: ShopItem) => void;
}

export function SkyTrailMap({
  items,
  currentLevel,
  viewMode,
  onPreview,
}: SkyTrailMapProps) {
  if (items.length === 0) return null;

  if (viewMode === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((reward) => (
          <SkyLevelCard
            key={reward.level}
            reward={reward}
            currentLevel={currentLevel}
            onPreview={onPreview}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative py-2">
      {/* Trục đường bay nền dọc (trái trên mobile, chính giữa trên desktop) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-4 bottom-4 left-5 w-0.5 -translate-x-1/2 border-l-2 border-dashed border-primary-pastel md:left-1/2"
      />

      <ol className="relative space-y-5 md:space-y-6">
        {items.map((reward, index) => {
          const isLeft = index % 2 === 0;
          const active = reward.level === currentLevel;
          const reached = reward.reached || active;
          const isMidMilestone = reward.milestone === "five";

          return (
            <li
              key={reward.level}
              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 md:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] md:gap-0"
            >
              {/* Nút mốc mây trên đường bay */}
              <div className="relative z-10 col-start-1 row-start-1 flex flex-col items-center justify-center md:col-start-2">
                {/* Cánh nối ngang tinh tế trên desktop */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute top-1/2 hidden h-0.5 w-6 -translate-y-1/2 md:block",
                    isLeft ? "right-1/2 mr-5" : "left-1/2 ml-5",
                    reached ? "bg-primary/60" : "border-t-2 border-dashed border-primary-pastel bg-transparent",
                  )}
                />

                <span
                  aria-hidden="true"
                  className={cn(
                    "grid place-items-center rounded-full border-2 font-display font-bold tabular-nums transition-transform",
                    active
                      ? "may-bob size-11 border-primary bg-primary text-base text-primary-foreground shadow-[0_8px_20px_-4px_rgba(53,111,167,0.45)] ring-4 ring-primary-light"
                      : isMidMilestone
                        ? "size-10 border-accent-vanilla-border bg-accent-vanilla text-sm text-accent-vanilla-foreground shadow-sm"
                        : reached
                          ? "size-9 border-success-border bg-success-bg text-xs text-success-foreground shadow-xs"
                          : "size-9 border-primary-pastel bg-surface text-xs text-muted-foreground",
                  )}
                >
                  {reward.level}
                </span>
              </div>

              {/* Thẻ chặng bay (duy nhất 1 phần tử DOM để giữ id hợp lệ trên mọi màn hình) */}
              <div
                className={cn(
                  "col-start-2 row-start-1 min-w-0",
                  isLeft ? "md:col-start-1 md:pr-6" : "md:col-start-3 md:pl-6",
                )}
              >
                <SkyLevelCard
                  reward={reward}
                  currentLevel={currentLevel}
                  onPreview={onPreview}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
