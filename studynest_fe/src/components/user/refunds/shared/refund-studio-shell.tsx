"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Cloud,
  FileText,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";

export type RefundTabId = "refundable" | "requests" | "create" | "detail";

interface RefundStudioShellProps {
  activeTab: RefundTabId;
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  heroRight?: ReactNode;
  heroFooter?: ReactNode;
  tone?: "blue" | "success" | "vanilla" | "destructive";
  children: ReactNode;
}

const TONE_CLASSES: Record<
  NonNullable<RefundStudioShellProps["tone"]>,
  { card: string; pill: string; blob: string; stroke: string }
> = {
  blue: {
    card: "border-primary-pastel from-primary-light/85 via-surface to-accent-vanilla/45",
    pill: "border-primary-pastel bg-primary-light text-primary",
    blob: "bg-primary-pastel/45",
    stroke: "var(--color-primary-pastel)",
  },
  success: {
    card: "border-success-border from-success-bg/75 via-surface to-accent-vanilla/50",
    pill: "border-success-border bg-success-bg text-success-foreground",
    blob: "bg-success-border/40",
    stroke: "var(--color-success-border)",
  },
  vanilla: {
    card: "border-accent-vanilla-border from-accent-vanilla/70 via-surface to-primary-light/45",
    pill: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
    blob: "bg-accent-vanilla/60",
    stroke: "var(--color-accent-vanilla-border)",
  },
  destructive: {
    card: "border-destructive-border from-destructive-bg/65 via-surface to-surface-muted",
    pill: "border-destructive-border bg-destructive-bg text-destructive-foreground",
    blob: "bg-destructive-border/35",
    stroke: "var(--color-destructive-border)",
  },
};

export function RefundStudioShell({
  activeTab,
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  heroRight,
  heroFooter,
  tone = "blue",
  children,
}: RefundStudioShellProps) {
  const palette = TONE_CLASSES[tone];

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-20 pt-6">
      {/* Dải nền bầu trời pastel loang nhẹ toàn trang */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[30rem] bg-gradient-to-b from-primary-light/55 via-surface-muted/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* ── THANH ĐIỀU HƯỚNG TRUNG TÂM THỐNG NHẤT CHO TOÀN BỘ /refunds/* ── */}
        <nav
          aria-label="Điều hướng trung tâm bảo vệ tài sản"
          className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-border/90 bg-surface/92 px-3 py-2 shadow-xs backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                <span>{backLabel || "Quay lại"}</span>
              </Link>
            )}

            <Link
              href="/refunds/refundable"
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all",
                activeTab === "refundable"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              <RotateCcw aria-hidden="true" animated={false} className="size-3.5" />
              <span>Khóa học đủ điều kiện</span>
            </Link>

            <Link
              href="/refunds/my-requests"
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all",
                activeTab === "requests"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-primary-light/60 hover:text-primary",
              )}
            >
              <FileText aria-hidden="true" animated={false} className="size-3.5" />
              <span>Yêu cầu của tôi</span>
            </Link>
          </div>

          <Link
            href="/wallets"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/65 px-3.5 text-xs font-bold text-accent-vanilla-foreground transition-colors hover:bg-accent-vanilla"
          >
            <Wallet aria-hidden="true" animated={false} className="size-3.5" />
            <span>Kho Coin & Ví</span>
          </Link>
        </nav>

        {/* ── HERO CLOUD SHIELD THỐNG NHẤT ── */}
        <section
          aria-label="Tổng quan trung tâm bảo vệ tài sản"
          className={cn(
            "relative isolate overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-[0_24px_48px_-12px_rgba(53,111,167,0.13)] sm:p-8",
            palette.card,
          )}
        >
          {/* Mây mờ & vân Guilloché chứng chỉ tài sản */}
          <div
            aria-hidden="true"
            className="sky-drift pointer-events-none absolute -top-20 -left-16 -z-10 h-60 w-80 rounded-full bg-surface/80 blur-3xl"
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -right-16 -bottom-20 -z-10 h-64 w-80 rounded-full blur-3xl",
              palette.blob,
            )}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 760 220"
            fill="none"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-55"
          >
            <path
              d="M-20 185 C 140 115, 280 220, 440 135 C 570 70, 670 135, 780 48"
              stroke={palette.stroke}
              strokeWidth="1.6"
            />
            <path
              d="M-20 202 C 150 132, 290 232, 455 150 C 585 88, 680 150, 780 68"
              stroke="var(--color-accent-vanilla-border)"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />
          </svg>
          <Cloud
            aria-hidden="true"
            animated={false}
            strokeWidth={0.65}
            className="pointer-events-none absolute -right-6 -bottom-10 -z-10 size-48 -rotate-6 text-surface/75"
          />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-2xl space-y-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase",
                  palette.pill,
                )}
              >
                <ShieldCheck aria-hidden="true" animated={false} className="size-3.5" />
                <span>{eyebrow}</span>
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>

            {heroRight && <div className="shrink-0">{heroRight}</div>}
          </div>

          {heroFooter && (
            <div className="mt-6 border-t border-border/70 pt-5">{heroFooter}</div>
          )}
        </section>

        {/* ── NỘI DUNG CHÍNH ĐỒNG BỘ ── */}
        {children}
      </div>
    </main>
  );
}
