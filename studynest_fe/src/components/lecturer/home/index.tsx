"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Library,
  Plus,
  RotateCcw,
  ShieldCheck,
  Tag,
  Video,
} from "pulsoicon-react";
import { Card, Skeleton } from "@/components/ui";
import LecturerWelcome from "@/components/lecturer/welcome";
import api from "@/lib/utils/fetcher/client/axios";
import { useUserStore } from "@/stores/user";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import { LecturerRefundRequestsResponse } from "@/types/lecturer/refund";
import {
  CoursePerformanceItem,
  LecturerOverview,
} from "@/types/lecturer/statistics";
import { LecturerWallet } from "@/types/lecturer/wallet";
import { CloudWaveChart, ColorCloudKpis } from "./revenue-pulse";
import { StudioHero } from "./studio-hero";
import { TopCoursesCard } from "./top-courses-card";
import { CloudTreasuryPass, HoldPulseCard } from "./wallet-panel";

interface IsLecturerResponse {
  is_lecturer: boolean;
}

const LecturerHome = ({ isLecturer }: { isLecturer?: boolean }) => {
  const router = useRouter();

  const { data: lecturerData, isLoading: isCheckingLecturer } =
    useSWR<IsLecturerResponse | null>(
      isLecturer === undefined ? "/lecturer/courses/is_lecturer" : null,
      async (url) => {
        try {
          const response = await api.get(url);
          return response.data;
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          if (status && [400, 401, 403, 404].includes(status)) {
            return null;
          }
          throw error;
        }
      },
      { shouldRetryOnError: false },
    );

  const canAccessDashboard = isLecturer ?? lecturerData?.is_lecturer === true;

  if (isCheckingLecturer) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 bg-background px-4 py-7 sm:px-6 lg:px-8">
        <Skeleton variant="rect" className="h-60 w-full rounded-[32px]" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Skeleton
            variant="rect"
            className="h-80 rounded-[28px] xl:col-span-8"
          />
          <Skeleton
            variant="rect"
            className="h-80 rounded-[28px] xl:col-span-4"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-32 rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  if (canAccessDashboard) {
    return <LecturerDashboard router={router} />;
  }

  return <LecturerWelcome />;
};

const LecturerDashboard = ({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) => {
  const user = useUserStore((s) => s.user);

  const { data: wallet } = useSWR<LecturerWallet>(
    "/lecturer/wallets/lecturer/wallet",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false },
  );

  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false },
  );

  const { data: pendingRefunds } = useSWR<LecturerRefundRequestsResponse | null>(
    "/lecturer/refunds/requests?page=1&limit=1&refund_status=requested",
    async (url) => {
      try {
        const response = await api.get(url);
        return response.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const { data: overview, isLoading: isLoadingOverview } =
    useSWR<LecturerOverview>(
      "/lecturer/statistics/overview",
      async (url) => {
        const response = await api.get(url);
        return response.data;
      },
      { revalidateOnFocus: false },
    );

  const { data: coursesPerformance, isLoading: isLoadingCourses } = useSWR<
    CoursePerformanceItem[]
  >(
    "/lecturer/statistics/courses",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false },
  );

  const { data: contractStatus } = useSWR<{
    has_signed_master: boolean;
    contract_number: string | null;
    status: string | null;
  } | null>(
    "/lecturer/contracts/status",
    async (url) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const holdCount = holdData?.total ?? 0;
  const pendingRefundCount = pendingRefunds?.total ?? 0;

  // 6 phím tắt vận hành đa sắc mây (2×3 gọn đẹp)
  const cloudDockActions = [
    {
      title: "Tạo khóa học",
      description: "Soạn giáo trình & xuất bản",
      href: "/lecturer/courses/create",
      icon: Plus,
      tileBg: "from-primary-light/85 to-surface border-primary-pastel/80",
      iconBg: "bg-surface text-primary border-primary-pastel",
    },
    {
      title: "Quản lý khóa học",
      description: "Chương bài, tài nguyên & HV",
      href: "/lecturer/courses",
      icon: Video,
      tileBg: "from-secondary-light/80 to-surface border-secondary-pastel/80",
      iconBg: "bg-surface text-secondary-foreground border-secondary-pastel",
    },
    {
      title: "Combo & Lộ trình",
      description: "Đóng gói khóa học trọn bộ",
      href: "/lecturer/combos",
      icon: Library,
      tileBg: "from-primary-light/70 to-surface border-primary-pastel/70",
      iconBg: "bg-surface text-primary border-primary-pastel",
    },
    {
      title: "Mã giảm giá",
      description: "Chiến dịch ưu đãi & combo",
      href: "/lecturer/discounts",
      icon: Tag,
      tileBg: "from-accent-vanilla/90 to-surface border-accent-vanilla-border/80",
      iconBg:
        "bg-surface text-accent-vanilla-foreground border-accent-vanilla-border",
    },
    {
      title: "Thống kê sâu",
      description: "Phân tích doanh thu & tương tác",
      href: "/lecturer/dashboard",
      icon: BarChart3,
      tileBg: "from-success-bg/80 to-surface border-success-border/80",
      iconBg: "bg-surface text-success-foreground border-success-border",
    },
    {
      title: "Trạm hoàn tiền",
      description: "Thẩm định & đối soát hồ sơ",
      href: "/lecturer/refund",
      icon: RotateCcw,
      tileBg: "from-destructive-bg/65 to-surface border-destructive-border/75",
      iconBg: "bg-surface text-destructive-foreground border-destructive-border",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Tầng 1: Sky Studio Panoramic Hero */}
        <StudioHero
          fullname={user?.fullname}
          overview={overview}
          pendingRefundCount={pendingRefundCount}
          holdCount={holdCount}
        />

        {/* Tầng 2: Asymmetric Showcase (8/4) — Cloud Wave Chart + Cloud Treasury Pass */}
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <CloudWaveChart />
          </div>
          <div className="xl:col-span-4">
            <CloudTreasuryPass wallet={wallet} />
          </div>
        </div>

        {/* Tầng 3: 4 Thẻ KPI Đa Sắc Mây */}
        <ColorCloudKpis
          overview={overview}
          isLoadingOverview={isLoadingOverview}
        />

        {/* Tầng 4: Spotlight Podium (7/12) + Cloud Dock & Hold Pulse (5/12) */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <TopCoursesCard
              courses={coursesPerformance}
              isLoading={isLoadingCourses}
            />
          </div>

          <div className="space-y-6 xl:col-span-5">
            {/* Cloud Dock: 6 phím tắt vận hành đa sắc pastel */}
            <Card
              variant="surface"
              density="none"
              className="overflow-hidden rounded-[28px] border border-border shadow-xs"
            >
              <div className="border-b border-border bg-gradient-to-r from-primary-light/50 via-surface to-accent-vanilla/50 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Điều phối nhanh
                </h2>
                <p className="text-xs text-muted-foreground">
                  Truy cập 1 chạm tới mọi phân khu vận hành giảng dạy
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5">
                {cloudDockActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={`group flex flex-col items-start rounded-2xl border bg-gradient-to-br p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer ${item.tileBg}`}
                    >
                      <div className="mb-2.5 flex w-full items-center justify-between">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-2xs transition-transform group-hover:scale-105 ${item.iconBg}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Hold Pulse Card */}
            <HoldPulseCard holdCount={holdCount} />

            {/* Legal Contract Trust Card */}
            {contractStatus?.has_signed_master && (
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/60 via-surface to-success-bg/40 p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
                      <ShieldCheck size={19} animated={false} />
                    </span>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                        <CheckCircle2 size={10} animated={false} />
                        {contractStatus.status === "countersigned"
                          ? "Đã đồng ký 2 bên"
                          : "Đã ký điện tử PKI"}
                      </span>
                      <h3 className="mt-1.5 text-sm font-bold text-foreground">
                        Hợp đồng Đối tác Giảng viên
                      </h3>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-primary">
                        {contractStatus.contract_number}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/lecturer/contracts")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-primary-pastel bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
                  >
                    <FileText size={13} animated={false} />
                    Xem A4
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerHome;
