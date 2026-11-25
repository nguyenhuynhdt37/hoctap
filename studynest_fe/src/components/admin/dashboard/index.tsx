"use client";

import { memo, useCallback, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Download,
  Layers,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  Users,
  Wallet,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { OverviewResponse } from "@/types/admin/statistics";
import type { AdminCatalogOverview } from "@/types/catalog";
import type { PlatformWalletOverview } from "@/types/admin/wallet";

// Charts
import RevenueLineChart from "./charts/revenue-line-chart";
import CategoryPieChart from "./charts/category-pie-chart";
import UserGrowthChart from "./charts/user-growth-chart";
import CourseStatusChart from "./charts/course-status-chart";

// Stats
import OverviewStats from "./stats/overview-stats";
import FinanceStats from "./stats/finance-stats";
import ActivityStats from "./stats/activity-stats";
import InstructorStats from "./stats/instructor-stats";

// Tables
import TopCoursesTable from "./tables/top-courses-table";
import TopInstructorsTable from "./tables/top-instructors-table";

// Export
import ExportComprehensive from "./export-comprehensive";

const MemoizedRevenueLineChart = memo(RevenueLineChart);
const MemoizedCategoryPieChart = memo(CategoryPieChart);
const MemoizedUserGrowthChart = memo(UserGrowthChart);
const MemoizedCourseStatusChart = memo(CourseStatusChart);
const MemoizedOverviewStats = memo(OverviewStats);
const MemoizedFinanceStats = memo(FinanceStats);
const MemoizedActivityStats = memo(ActivityStats);
const MemoizedInstructorStats = memo(InstructorStats);
const MemoizedTopCoursesTable = memo(TopCoursesTable);
const MemoizedTopInstructorsTable = memo(TopInstructorsTable);

type ObservatoryLens = "sky" | "treasury" | "academic";

const LENSES: {
  key: ObservatoryLens;
  label: string;
  desc: string;
  icon: typeof Compass;
}[] = [
  {
    key: "sky",
    label: "Toàn cảnh Bầu trời",
    desc: "Bento đa tầng tổng hợp toàn hệ thống",
    icon: Compass,
  },
  {
    key: "treasury",
    label: "Tài chính & Kho bạc",
    desc: "Doanh thu, thanh khoản & chi trả GV",
    icon: TrendingUp,
  },
  {
    key: "academic",
    label: "Học thuật & Cộng đồng",
    desc: "Khóa học, tương tác & bảng xếp hạng",
    icon: BookOpen,
  },
];

const STUDIO_SHORTCUTS = [
  {
    href: "/admin/catalog",
    label: "Curriculum",
    desc: "Cấp học & Ma trận",
    icon: Layers,
    bg: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    href: "/admin/wallets",
    label: "Kho bạc Ví",
    desc: "Dòng tiền & Escrow",
    icon: Wallet,
    bg: "bg-success-bg text-success-foreground border-success-border",
  },
  {
    href: "/admin/transactions",
    label: "Giao dịch",
    desc: "7 dòng tiền & CSV",
    icon: Receipt,
    bg: "bg-info-bg text-info-foreground border-info-border",
  },
  {
    href: "/admin/discounts",
    label: "Voucher",
    desc: "Vé khuyến mãi",
    icon: Tag,
    bg: "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border",
  },
  {
    href: "/admin/refunds",
    label: "Hoàn tiền",
    desc: "Phân xử hồ sơ",
    icon: RotateCcw,
    bg: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
  {
    href: "/admin/withdraws",
    label: "Rút tiền GV",
    desc: "Chi trả hàng loạt",
    icon: ArrowUpRight,
    bg: "bg-accent text-accent-foreground border-accent-border",
  },
  {
    href: "/admin/users",
    label: "Thành viên",
    desc: "Hồ sơ 360°",
    icon: Users,
    bg: "bg-primary-light text-primary border-primary-pastel",
  },
  {
    href: "/admin/settings",
    label: "Cài đặt",
    desc: "AI 9Router & Phí",
    icon: SlidersHorizontal,
    bg: "bg-background text-foreground border-border",
  },
] as const;

export default function AdminDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [lens, setLens] = useState<ObservatoryLens>("sky");

  const { data: overview, mutate: mutateOverview } = useSWR<OverviewResponse>(
    "/admin/statistics/overview",
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  const { data: catalogOv, mutate: mutateCatalog } =
    useSWR<AdminCatalogOverview>(
      "/admin/catalog/overview",
      async (url: string) => (await api.get(url)).data,
      { revalidateOnFocus: false },
    );

  const { data: walletOv, mutate: mutateWallet } =
    useSWR<PlatformWalletOverview>(
      "/admin/platform-wallet/overview",
      async (url: string) => (await api.get(url)).data,
      { revalidateOnFocus: false },
    );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    void Promise.all([mutateOverview(), mutateCatalog(), mutateWallet()]);
  }, [mutateOverview, mutateCatalog, mutateWallet]);

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const pendingWithdraws = overview?.pending_withdrawals ?? 0;
  const pendingRefunds = overview?.pending_refunds ?? 0;
  const unclassifiedCourses = catalogOv?.health?.unclassified_courses ?? 0;
  const walletBalanced = walletOv?.reconciliation?.is_balanced ?? true;

  const attentionCount =
    pendingWithdraws +
    pendingRefunds +
    (unclassifiedCourses > 0 ? 1 : 0) +
    (walletBalanced ? 0 : 1);

  return (
    <main className="relative mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Ambient Cloud Sky Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 top-16 h-96 w-96 rounded-full bg-primary-light/55 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-secondary-light/25 blur-3xl" />
      </div>

      {/* Sky Observatory Hero Banner */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-gradient-to-br from-primary-light/95 via-surface/95 to-accent/40 p-6 shadow-[0_28px_64px_-22px_rgba(53,111,167,0.22)] backdrop-blur-md sm:p-8">
        {/* Decorative Cloud Puffs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/85 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 h-48 w-64 rounded-full bg-primary-pastel/35 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-1/4 top-1/2 h-32 w-48 rounded-full bg-secondary-light/40 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            {/* Sky Weather Pulse Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/95 px-3.5 py-1 text-xs font-semibold text-primary shadow-2xs">
                <Compass size={13} animated={false} />
                Mây Mây Sky Observatory
              </span>
              <span className="rounded-full bg-surface/85 px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                {todayLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  attentionCount === 0
                    ? "border-success-border bg-success-bg/90 text-success-foreground"
                    : "border-accent-vanilla-border bg-accent-vanilla/90 text-accent-vanilla-foreground"
                }`}
              >
                {attentionCount === 0 ? (
                  <CheckCircle2 size={13} animated={false} />
                ) : (
                  <AlertTriangle size={13} animated={false} />
                )}
                {attentionCount === 0
                  ? "Trời quang mây tạnh · Toàn hệ thống khớp chuẩn"
                  : `Mây nhẹ · ${attentionCount} đầu việc cần lưu tâm`}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Đài Quan Sát Điều Hành Mây Mây
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Không gian quan sát trực quan toàn bộ dòng tiền, tăng trưởng học viên, sức khỏe chương trình học và điều phối tức thì 8 phân hệ quản trị.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw size={15} />
              Làm mới
            </Button>
            <Button size="sm" onClick={() => setShowExport(true)}>
              <Download size={15} />
              Xuất báo cáo tổng hợp
            </Button>
          </div>
        </div>

        {/* Live Action Radar Chips (if anything needs attention or quick verify) */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/admin/wallets"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-success-border/80 bg-surface/90 px-3 py-1.5 text-xs font-semibold text-success-foreground transition-colors hover:bg-success-bg"
          >
            <ShieldCheck size={14} animated={false} />
            {walletBalanced
              ? "Đối soát Kho bạc: Khớp 100%"
              : "Cảnh báo: Kiểm tra đối soát Ví"}
          </Link>

          {unclassifiedCourses > 0 && (
            <Link
              href="/admin/catalog/courses"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/80 px-3 py-1.5 text-xs font-semibold text-accent-vanilla-foreground transition-colors hover:bg-accent-vanilla"
            >
              <Layers size={13} animated={false} />
              {unclassifiedCourses} khóa học chưa gán phân loại →
            </Link>
          )}

          {pendingWithdraws > 0 && (
            <Link
              href="/admin/withdraws?status=pending"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-warning-border bg-warning-bg px-3 py-1.5 text-xs font-semibold text-warning-foreground"
            >
              <ArrowUpRight size={13} animated={false} />
              {pendingWithdraws} lệnh rút tiền chờ duyệt →
            </Link>
          )}

          {pendingRefunds > 0 && (
            <Link
              href="/admin/refunds?refund_status=requested"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-secondary-pastel bg-secondary-light px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
            >
              <RotateCcw size={13} animated={false} />
              {pendingRefunds} hồ sơ hoàn tiền chờ xử lý →
            </Link>
          )}
        </div>

        {/* Floating Cloud Studio Dock (8 Shortcuts) */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
          {STUDIO_SHORTCUTS.map(({ href, label, desc, icon: Icon, bg }) => {
            const badgeCount =
              href === "/admin/withdraws"
                ? pendingWithdraws
                : href === "/admin/refunds"
                  ? pendingRefunds
                  : href === "/admin/catalog"
                    ? unclassifiedCourses
                    : 0;
            return (
              <Link
                key={href}
                href={href}
                className="group flex flex-col justify-between rounded-2xl border border-white/90 bg-surface/85 p-3 shadow-[0_8px_20px_-12px_rgba(53,111,167,0.18)] backdrop-blur-md transition-all hover:-translate-y-1 hover:border-primary-pastel hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border ${bg}`}
                  >
                    <Icon size={15} />
                  </span>
                  {badgeCount > 0 && (
                    <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
                      {badgeCount}
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <p className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                    {label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3 Observatory Lens Switcher */}
      <nav
        aria-label="Ống kính quan sát Dashboard"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {LENSES.map(({ key, label, desc, icon: Icon }) => {
          const active = lens === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setLens(key)}
              className={`group flex items-center gap-3.5 rounded-3xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_32px_-12px_rgba(53,111,167,0.45)]"
                  : "border-primary-pastel/60 bg-surface/90 text-foreground backdrop-blur-md hover:border-primary-pastel hover:bg-primary-light/40"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  active
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-primary-light text-primary group-hover:bg-surface"
                }`}
              >
                <Icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {label}
                </span>
                <span
                  className={`block truncate text-xs ${
                    active
                      ? "text-primary-foreground/85"
                      : "text-muted-foreground"
                  }`}
                >
                  {desc}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* 7 Overview KPI Cards */}
      <MemoizedOverviewStats key={`overview-${refreshKey}`} />

      {/* LENS 1: FULL SKY BENTO */}
      {lens === "sky" && (
        <div className="space-y-6">
          {/* Row 1: Revenue (8) + Category Donut (4) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <MemoizedRevenueLineChart key={`revenue-${refreshKey}`} />
            </div>
            <div className="lg:col-span-4">
              <MemoizedCategoryPieChart key={`category-${refreshKey}`} />
            </div>
          </div>

          {/* Row 2: 3-Column Bento Pulse (Finance + Activity + Instructor) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <MemoizedFinanceStats key={`finance-${refreshKey}`} />
            <MemoizedActivityStats key={`activity-${refreshKey}`} />
            <MemoizedInstructorStats key={`instructor-${refreshKey}`} />
          </div>

          {/* Row 3: Users Growth + Course Ecosystem */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MemoizedUserGrowthChart key={`users-${refreshKey}`} />
            <MemoizedCourseStatusChart key={`courses-${refreshKey}`} />
          </div>

          {/* Row 4: Leaderboards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MemoizedTopCoursesTable key={`topCourses-${refreshKey}`} />
            <MemoizedTopInstructorsTable key={`topInstructors-${refreshKey}`} />
          </div>
        </div>
      )}

      {/* LENS 2: TREASURY & FINANCE FOCUS */}
      {lens === "treasury" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <MemoizedRevenueLineChart key={`revenue-t-${refreshKey}`} />
            </div>
            <div className="lg:col-span-4">
              <MemoizedCategoryPieChart key={`category-t-${refreshKey}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MemoizedFinanceStats key={`finance-t-${refreshKey}`} />
            <MemoizedInstructorStats key={`instructor-t-${refreshKey}`} />
          </div>
          <MemoizedTopInstructorsTable key={`topInstructors-t-${refreshKey}`} />
        </div>
      )}

      {/* LENS 3: ACADEMIC & COMMUNITY FOCUS */}
      {lens === "academic" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <MemoizedUserGrowthChart key={`users-a-${refreshKey}`} />
            </div>
            <div className="lg:col-span-5">
              <MemoizedActivityStats key={`activity-a-${refreshKey}`} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MemoizedCourseStatusChart key={`courses-a-${refreshKey}`} />
            </div>
            <div className="lg:col-span-7">
              <MemoizedTopCoursesTable key={`topCourses-a-${refreshKey}`} />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportComprehensive
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
    </main>
  );
}
