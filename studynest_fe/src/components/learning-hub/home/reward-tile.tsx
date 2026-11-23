"use client";

import { Button, Skeleton } from "@/components/ui";
import { pathCover, StudyImage } from "@/components/user/home/study-image";
import { useRewardInventory } from "@/lib/learning-hub/mission-hooks";
import type { RewardInventory } from "@/lib/learning-hub/mission-types";
import { cn } from "@/lib/utils";
import { Copy, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { ProgressRing, voucherMask } from "./home-ui";
import { number, vietnamTimeZone } from "./section";
import type { useDailyLearningState } from "./use-daily-learning-state";

const expiryDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: vietnamTimeZone });
type Coupon = RewardInventory["coupons"][number];
const statusLabel = { available: "Khả dụng", used: "Đã dùng", expired: "Hết hạn", revoked: "Đã thu hồi" } as const;

function Voucher({ coupon, now, onCopy }: { coupon: Coupon; now: number; onCopy: () => void }) {
  const usable = coupon.status === "available" && Date.parse(coupon.expires_at) > now;
  return (
    <li className="relative drop-shadow-md">
      <div style={voucherMask("5.75rem")} className={cn("flex min-w-0 rounded-2xl", usable ? "bg-accent-vanilla text-accent-vanilla-foreground" : "bg-disabled text-foreground")}>
        <div className="grid w-[5.75rem] shrink-0 place-items-center px-2 py-4 text-center">
          <p className="text-2xl leading-none font-extrabold tabular-nums">-{number.format(coupon.max_percent)}%</p>
        </div>
        <div className="min-w-0 flex-1 border-l-2 border-dashed border-accent-vanilla-border px-4 py-3">
          <p className="truncate text-sm font-bold" title={coupon.title}>{coupon.title}</p>
          <p className="mt-0.5 text-xs font-medium tabular-nums">{coupon.code_masked}</p>
          <p className="text-xs">{usable ? `Hết hạn ${expiryDate.format(new Date(coupon.expires_at))}` : statusLabel[coupon.status === "available" ? "expired" : coupon.status]}</p>
          {usable && <Button size="sm" variant="outline" className="mt-1.5 min-h-10 rounded-full motion-reduce:transition-none" leftIcon={<Copy aria-hidden="true" className="size-3.5" />} onClick={onCopy}>Sao chép mã<span className="sr-only"> {coupon.title}</span></Button>}
        </div>
      </div>
    </li>
  );
}

export function VoucherShelf({ daily }: { daily: ReturnType<typeof useDailyLearningState> }) {
  const inventory = useRewardInventory();
  const { xp, source } = daily;
  const [feedback, setFeedback] = useState("");
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

  async function copy(coupon: Coupon) {
    if (coupon.status !== "available" || Date.parse(coupon.expires_at) <= Date.now()) return;
    setFeedback("");
    try {
      await navigator.clipboard.writeText(coupon.code_masked);
      setFeedback("Đã sao chép mã hiển thị.");
    } catch {
      setFeedback("Chưa sao chép được. Tải lại để xem số dư và mã hiện có.");
    }
  }

  return (
    <section id="phan-thuong" tabIndex={-1} aria-labelledby="rewards-title" className="relative scroll-mt-24 rounded-[2rem] bg-surface p-5 shadow-ambient-md focus-visible:outline-2 focus-visible:outline-ring sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="rewards-title" className="text-2xl font-extrabold tracking-tight">Phần thưởng</h2>
        {(xp || inventory.data) && <MockDataChip source={source} />}
      </div>
      {xp && !daily.board.overview.error && (
        <div className="mb-4 flex items-center gap-4">
          <ProgressRing value={xp.required_xp > 0 ? xp.current_xp : 100} max={xp.required_xp || 100} size={72} stroke={8} label={xp.required_xp ? `${number.format(xp.current_xp)}/${number.format(xp.required_xp)} XP lên cấp` : "Đang cập nhật XP để lên cấp"}>
            <span className="text-lg font-extrabold">{number.format(xp.level)}</span>
          </ProgressRing>
          <div>
            <p className="text-base font-bold">Cấp {number.format(xp.level)}</p>
            <p className="text-sm">{xp.required_xp ? `${number.format(xp.current_xp)}/${number.format(xp.required_xp)} XP lên cấp` : "Đang cập nhật XP để lên cấp"}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-accent-vanilla-foreground"><Coins aria-hidden="true" className="size-4" />{number.format(xp.peak_balance)} Coin</p>
          </div>
        </div>
      )}
      {inventory.error ? (
        <HubLoadError error={inventory.error} title="Chưa tải được mã thưởng" message="Tải lại để xem mã thưởng hiện có." onRetry={() => void inventory.mutate().catch(() => undefined)} isRetrying={inventory.isValidating} />
      ) : !inventory.data ? (
        <div role="status" aria-label="Đang tải phần thưởng" className="space-y-3 [&_.animate-pulse]:motion-reduce:animate-none"><Skeleton className="h-10 w-40 rounded-full" /><Skeleton className="h-24 w-full rounded-2xl" /></div>
      ) : (
        <>
          {inventory.data.coupons.length ? (
            <ul aria-label="Mã thưởng" className="relative grid gap-3">
              {inventory.data.coupons.map((coupon) => <Voucher key={coupon.id} coupon={coupon} now={now} onCopy={() => void copy(coupon)} />)}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent-vanilla-border p-2.5">
              <StudyImage fallback={pathCover} sizes="96px" className="aspect-[4/3] w-24 shrink-0 rounded-xl" />
              <p className="text-sm leading-relaxed font-medium">Mã giảm giá · Sắp có</p>
            </div>
          )}
          <p role="status" className="mt-2 text-sm font-medium">{feedback}</p>
        </>
      )}
    </section>
  );
}
