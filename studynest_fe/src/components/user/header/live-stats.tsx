"use client";

import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import { MockDataChip } from "@/components/learning-hub/mock-data-chip";
import { HubLoadError } from "@/components/learning-hub/hub-page-state";
import { useGamificationStats, useGamificationStreak } from "@/lib/learning-hub/mission-hooks";
import { useShopInventory } from "@/lib/learning-hub/shop-hooks";
import { formatCoin } from "@/lib/learning-hub/shop-logic";
import { cn } from "@/lib/utils";
import type { WalletSummary } from "@/types/user/wallet";
import { Coins, Flame, Flag, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Dữ liệu sống của header. Mọi hook đi qua fetcher/SWR sẵn có và CHỈ được gắn
 * khi người dùng đã đăng nhập (component này không bao giờ render cho khách).
 * Đang tải: khung xương gọn; lỗi: ẩn hẳn. Không bao giờ chặn header.
 */
const quiet = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

export function useWalletBalance() {
  return useAuthedSWR<WalletSummary>("/wallets", quiet);
}

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatMoney(value: number) {
  return `${money.format(value)}đ`;
}

/** Gọn cho chip: 250.000đ, 1,2tr. Giá trị đầy đủ nằm ở aria-label/title. */
export function formatMoneyShort(value: number) {
  if (Math.abs(value) < 1_000_000) return formatMoney(value);
  return `${(value / 1_000_000).toFixed(1).replace(".", ",").replace(/,0$/, "")}tr`;
}

function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-4 animate-pulse rounded-full bg-primary-pastel/70 motion-reduce:animate-none", className)} />;
}

const chipBase =
  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none";

export function StreakChip({ onNavigate }: { onNavigate?: () => void }) {
  const { data, error } = useGamificationStreak();
  if (error && !data) return null;
  const days = data?.current_streak;
  return (
    <Link
      href="/missions"
      onClick={onNavigate}
      aria-label={data ? `Chuỗi học ${days} ngày liên tiếp` : "Chuỗi học liên tiếp"}
      title="Chuỗi ngày học liên tiếp"
      className={cn(chipBase, "min-h-11 max-w-16 px-2 md:max-w-none md:px-3 [&>span]:truncate", "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground hover:bg-accent-vanilla-border/60")}
    >
      <Flame aria-hidden="true" className="size-4 shrink-0" />
      {data ? <span>{days}</span> : <Skeleton className="w-5" />}
    </Link>
  );
}

export function CoinChip() {
  const { xp } = useGamificationStats();
  const inventory = useShopInventory();
  const balance = inventory.data?.balance ?? xp?.peak_balance;
  const label = balance !== undefined ? formatCoin(balance) : undefined;

  return (
    <Link href="/shop" aria-label={label ? `Cửa hàng Mây, số dư ${label}` : "Cửa hàng Mây"}
      title={label} className={cn(chipBase, "min-h-11 min-w-11 justify-center border-accent-vanilla-border bg-accent-vanilla px-2 text-accent-vanilla-foreground hover:bg-accent-vanilla-border/60 md:px-3")}>
      <Coins aria-hidden="true" className="size-4 shrink-0" />
      <span aria-hidden="true" className="hidden max-w-24 truncate lg:inline">{label ?? "Coin"}</span>
    </Link>
  );
}

export function WalletChip({ onNavigate }: { onNavigate?: () => void }) {
  const { data, error, isLoading } = useWalletBalance();
  if (error && !data) return null;
  return (
    <Link
      href="/wallets"
      onClick={onNavigate}
      aria-label={data ? `Ví của tôi, số dư ${formatMoney(data.balance)}` : "Ví của tôi"}
      title={data ? formatMoney(data.balance) : "Ví của tôi"}
      className={cn(chipBase, "border-primary-pastel bg-primary-light text-primary hover:bg-primary-pastel/60")}
    >
      <Wallet aria-hidden="true" className="size-4 shrink-0" />
      {isLoading && !data ? <Skeleton className="w-12" /> : <span>{formatMoneyShort(data?.balance ?? 0)}</span>}
    </Link>
  );
}

type Cell = { key: string; href: string; label: string; icon: ReactNode; value: ReactNode; extra?: ReactNode; srValue: string };

/**
 * "Vé bay" dữ liệu sống chỉ hiển thị trong bảng mở rộng.
 */
export function LiveTicket({ onNavigate }: { onNavigate: () => void }) {
  const { xp, streak, overview, source } = useGamificationStats();
  const wallet = useWalletBalance();
  const inventory = useShopInventory();
  const coinBalance = inventory.data?.balance ?? xp?.peak_balance;

  const cells: Cell[] = [];

  if (!xp && !overview.error) {
    cells.push({ key: "level", href: "/levels", label: "Cấp", icon: <Trophy className="size-4" />, value: <Skeleton className="w-10" />, srValue: "Đang tải" });
  } else if (xp && !overview.error) {
    const { level, current_xp, required_xp } = xp;
    const pct = required_xp > 0 ? Math.min(100, Math.round((current_xp / required_xp) * 100)) : 0;
    cells.push({
      key: "level", href: "/levels", label: "Cấp độ", icon: <Trophy className="size-4" />,
      value: <>Cấp {level}</>, srValue: `Cấp ${level}, ${current_xp} trên ${required_xp} XP`,
      extra: (
        <span className="mt-1.5 block">
          <span aria-hidden="true" className="relative block h-1.5 w-full overflow-hidden rounded-full bg-primary-pastel/60">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-1 block text-xs font-medium tabular-nums text-foreground">{current_xp}/{required_xp} XP</span>
        </span>
      ),
    });
  }

  if (coinBalance !== undefined) {
    const label = formatCoin(coinBalance);
    cells.push({ key: "coin", href: "/shop", label: "Số dư Coin", icon: <Coins className="size-4" />, value: label, srValue: label });
  }

  if (!streak.data && !streak.error) {
    cells.push({ key: "streak", href: "/missions", label: "Chuỗi ngày", icon: <Flame className="size-4" />, value: <Skeleton className="w-8" />, srValue: "Đang tải" });
  } else if (streak.data) {
    cells.push({ key: "streak", href: "/missions", label: "Chuỗi ngày", icon: <Flame className="size-4" />, value: <>{streak.data.current_streak} ngày</>, srValue: `${streak.data.current_streak} ngày liên tiếp` });
  }

  if (wallet.isLoading && !wallet.data) {
    cells.push({ key: "wallet", href: "/wallets", label: "Số dư ví", icon: <Wallet className="size-4" />, value: <Skeleton className="w-16" />, srValue: "Đang tải" });
  } else if (wallet.data) {
    cells.push({ key: "wallet", href: "/wallets", label: "Số dư ví", icon: <Wallet className="size-4" />, value: <>{formatMoney(wallet.data.balance)}</>, srValue: formatMoney(wallet.data.balance) });
  }

  if (overview.data && !overview.error) {
    const { daily, long_term } = overview.data;
    const ready = [...daily, ...long_term.flatMap((group) => group.missions)].filter((m) => m.status === "completed").length;
    cells.push({
      key: "missions", href: "/missions", label: "Chờ nhận thưởng", icon: <Flag className="size-4" />,
      value: ready > 0 ? <>{ready} nhiệm vụ</> : <>Chưa có</>, srValue: ready > 0 ? `${ready} nhiệm vụ chờ nhận thưởng` : "Chưa có nhiệm vụ chờ nhận thưởng",
    });
  }


  // Thứ tự hiển thị: cấp, chuỗi, ví, Coin, nhiệm vụ.
  const order = ["level", "streak", "wallet", "coin", "missions"];
  cells.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return (
    <section
      aria-label="Hành trình của bạn hôm nay"
      className="relative overflow-clip rounded-2xl border border-primary-pastel/80 bg-linear-to-r from-primary-light/70 via-surface to-secondary/50"
    >
      <span aria-hidden="true" className="absolute top-1/2 -left-2 size-4 -translate-y-1/2 rounded-full border border-primary-pastel/80 bg-surface" />
      <span aria-hidden="true" className="absolute top-1/2 -right-2 size-4 -translate-y-1/2 rounded-full border border-primary-pastel/80 bg-surface" />
      <ul className="grid grid-cols-2 gap-px px-3 py-1 md:flex md:items-stretch md:px-5">
        {cells.map((cell) => (
          <li
            key={cell.key}
            className={cn("min-w-0 md:flex-1 md:border-l md:border-dashed md:border-primary-pastel md:first:border-l-0", cell.key === "level" && "col-span-2 md:flex-[1.4]")}
          >
            <Link
              href={cell.href}
              onClick={onNavigate}
              className="group flex min-h-11 flex-col justify-center rounded-xl px-2 py-2 transition-colors hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary-hover">
                <span aria-hidden="true">{cell.icon}</span>
                {cell.label}
              </span>
              <span className="mt-0.5 block truncate text-base font-semibold tabular-nums text-foreground">
                <span className="sr-only">{cell.srValue}</span>
                <span aria-hidden="true">{cell.value}</span>
              </span>
              {cell.extra}
            </Link>
          </li>
        ))}
      </ul>
      {xp && !overview.error && source === "mock" && <div className="px-4 pb-2"><MockDataChip source={source} /></div>}
      {(overview.error || streak.error) && <div className="space-y-2 p-3">
        {overview.error && <HubLoadError error={overview.error} title="Chưa tải được cấp độ và nhiệm vụ" message="Bạn thử tải lại để cập nhật XP và Coin." onRetry={() => void overview.mutate().catch(() => undefined)} isRetrying={overview.isValidating} />}
        {streak.error && <HubLoadError error={streak.error} title="Chưa tải được chuỗi ngày học" message="Bạn thử tải lại để cập nhật chuỗi ngày học." onRetry={() => void streak.mutate().catch(() => undefined)} isRetrying={streak.isValidating} />}
      </div>}
    </section>
  );
}
