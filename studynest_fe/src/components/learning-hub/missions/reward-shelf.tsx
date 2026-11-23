"use client";

import { Badge, Button, Skeleton } from "@/components/ui";
import { CloudBlob, GlassCard, IconBubble } from "@/components/user/home/landing-ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { useGamificationStats, useRewardInventory } from "@/lib/learning-hub/mission-hooks";
import type { RewardInventory } from "@/lib/learning-hub/mission-types";
import { Copy, Gift, Coins, Ticket } from "pulsoicon-react";
import { useEffect, useId, useState } from "react";
import { number, SectionLoading, vietnamTimeZone } from "../home/section";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { BadgeCollection } from "./badge-collection";

const expiryDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: vietnamTimeZone });
type Coupon = RewardInventory["coupons"][number];

const couponStatus = {
  available: { label: "Khả dụng", variant: "success" },
  used: { label: "Đã dùng", variant: "outline" },
  expired: { label: "Hết hạn", variant: "outline" },
  revoked: { label: "Đã thu hồi", variant: "outline" },
} as const;

export function RewardShelf() {
  const { xp, overview, source } = useGamificationStats();
  const inventory = useRewardInventory();
  const id = useId();
  const [copyFeedback, setCopyFeedback] = useState("");
  const [now, setNow] = useState(Date.now);
  const nextExpiry = inventory.data?.coupons.reduce((next, coupon) => {
    const time = Date.parse(coupon.expires_at);
    return coupon.status === "available" && time > now ? Math.min(next, time) : next;
  }, Infinity);

  useEffect(() => {
    if (nextExpiry == null || !Number.isFinite(nextExpiry)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, Math.max(0, nextExpiry - Date.now())));
    return () => window.clearTimeout(timer);
  }, [nextExpiry, now]);

  async function copyCoupon(coupon: Coupon) {
    if (coupon.status !== "available" || Date.parse(coupon.expires_at) <= Date.now()) return;
    setCopyFeedback("");
    try {
      await navigator.clipboard.writeText(coupon.code_masked);
      setCopyFeedback("Đã sao chép mã hiển thị.");
    } catch {
      setCopyFeedback("Chưa sao chép được. Tải lại để xem số dư và mã hiện có.");
    }
  }

  return (
    <section aria-labelledby={id} className="mt-8 sm:mt-10">
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <IconBubble tone="vanilla" className="size-10!"><Gift aria-hidden="true" className="size-5" /></IconBubble>
        <h2 id={id} className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Kệ phần thưởng</h2>
        {inventory.data && !inventory.error && <MockDataChip source={source} />}
      </div>
      <GlassCard tilt={false} className="bg-linear-to-br from-surface to-surface-muted p-4 sm:p-6">
        <div className="mb-4 grid items-start gap-3 sm:grid-cols-2">
          <div className="relative isolate flex items-center gap-3 overflow-hidden rounded-2xl border border-accent-vanilla-border bg-accent-vanilla p-3.5 text-accent-vanilla-foreground sm:p-4">
            <CloudBlob className="-top-8 -right-6 -z-10 h-24 w-40 bg-surface" />
            <Coins aria-hidden="true" className="absolute -right-2 -bottom-6 -z-10 size-28 opacity-15" strokeWidth={1.25} />
            <IconBubble tone="vanilla" shape="circle" className="size-12! border-surface bg-surface shadow-ambient-sm"><Coins aria-hidden="true" className="size-6" /></IconBubble>
            <div className="min-w-0">
              <p className="text-xs font-semibold">Số dư Coin</p>
              {overview.error ? (
                <HubLoadError error={overview.error} message="Tải lại để xem số dư Coin." onRetry={() => void overview.mutate().catch(() => undefined)} isRetrying={overview.isValidating} />
              ) : xp ? (
                <p className="text-lg font-bold tabular-nums">{number.format(xp.peak_balance)} Coin</p>
              ) : <Skeleton role="status" aria-label="Đang tải số dư Coin" className="h-6 w-24 motion-reduce:animate-none" />}
            </div>
          </div>
          <BadgeCollection />
        </div>
        {inventory.error ? (
          <HubLoadError error={inventory.error} title="Chưa tải được mã thưởng" message="Tải lại để xem mã thưởng hiện có." onRetry={() => void inventory.mutate().catch(() => undefined)} isRetrying={inventory.isValidating} />
        ) : !inventory.data ? (
          <SectionLoading label="Đang tải mã thưởng"><Skeleton className="h-24 w-full rounded-2xl" /></SectionLoading>
        ) : inventory.data.coupons.length ? (
          <ul aria-label="Mã thưởng" className="grid gap-3 sm:grid-cols-2">
            {inventory.data.coupons.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} now={now} onCopy={() => void copyCoupon(coupon)} />)}
          </ul>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-primary-pastel bg-surface p-3 sm:p-4">
            <StudyImage fallback={mayPortrait} sizes="(min-width: 640px) 112px, 80px" className="aspect-square w-20 shrink-0 rounded-xl sm:aspect-[4/3] sm:w-28" />
            <div>
              <h3 className="text-sm font-semibold">Mã giảm giá</h3>
              <Badge variant="vanilla" className="mt-1">Sắp có</Badge>
            </div>
          </div>
        )}
        <p role="status" className="text-sm font-medium text-foreground">{copyFeedback}</p>
      </GlassCard>
    </section>
  );
}

function CouponCard({ coupon, now, onCopy }: { coupon: Coupon; now: number; onCopy: () => void }) {
  const expiresAt = new Date(coupon.expires_at);
  const status = coupon.status === "available" && expiresAt.getTime() <= now ? "expired" : coupon.status;
  const { label, variant } = couponStatus[status];
  return (
    <li className="min-w-0 rounded-2xl border border-secondary-pastel bg-surface">
      <div className="flex items-center gap-3 rounded-t-2xl bg-secondary-light p-3.5 text-secondary-foreground sm:p-4">
        <IconBubble tone="pink" className="size-10! border-surface bg-surface shadow-ambient-sm"><Ticket aria-hidden="true" className="size-5 -rotate-12" /></IconBubble>
        <div className="min-w-0">
          <p className="text-xs font-semibold">Giảm tối đa</p>
          <p className="text-lg leading-tight font-bold tabular-nums">{number.format(coupon.max_percent)}%</p>
        </div>
      </div>
      <div className="relative border-t border-dashed border-secondary-pastel p-3.5 before:absolute before:top-0 before:-left-px before:size-3 before:-translate-y-1/2 before:rounded-r-full before:border before:border-l-0 before:border-secondary-pastel before:bg-surface-muted after:absolute after:top-0 after:-right-px after:size-3 after:-translate-y-1/2 after:rounded-l-full after:border after:border-r-0 after:border-secondary-pastel after:bg-surface-muted sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 text-sm font-semibold wrap-anywhere">{coupon.title}</h3>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="max-w-full rounded-lg bg-primary-light px-2.5 py-1.5 font-sans text-sm font-semibold wrap-anywhere text-info-foreground">{coupon.code_masked}</code>
          {status === "available" && (
            <Button variant="outline" size="sm" onClick={onCopy} className="min-h-11 rounded-full motion-reduce:transition-none" leftIcon={<Copy aria-hidden="true" className="size-4" />}>
              Sao chép<span className="sr-only"> mã hiển thị — {coupon.title}</span>
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-foreground">Hạn dùng <time dateTime={coupon.expires_at}>{expiryDate.format(expiresAt)}</time></p>
      </div>
    </li>
  );
}
