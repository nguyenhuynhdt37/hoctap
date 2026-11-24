"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight,
  BarChart3,
  Layers,
  Library,
  Plus,
  RotateCcw,
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
import { RevenuePulse } from "./revenue-pulse";
import { StudioHero } from "./studio-hero";
import { TopCoursesCard } from "./top-courses-card";
import { WalletPanel } from "./wallet-panel";

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
      <div className="mx-auto max-w-7xl space-y-6 bg-background px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton variant="rect" className="h-52 w-full rounded-[28px]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-32 rounded-[22px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton
            variant="rect"
            className="h-96 rounded-[24px] lg:col-span-8"
          />
          <Skeleton
            variant="rect"
            className="h-96 rounded-[24px] lg:col-span-4"
          />
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

  const holdCount = holdData?.total ?? 0;
  const pendingRefundCount = pendingRefunds?.total ?? 0;

  const quickActions = [
    {
      title: "Tạo khóa học mới",
      description: "Thiết kế giáo trình & xuất bản",
      href: "/lecturer/courses/create",
      icon: Plus,
      iconBg: "bg-primary-light text-primary border-primary-pastel/70",
      hoverBorder: "hover:border-primary-pastel",
    },
    {
      title: "Quản lý khóa học",
      description: "Chỉnh sửa nội dung & học viên",
      href: "/lecturer/courses",
      icon: Video,
      iconBg: "bg-primary-light text-primary border-primary-pastel/70",
      hoverBorder: "hover:border-primary-pastel",
    },
    {
      title: "Chương & Bài học",
      description: "Sắp xếp cấu trúc bài giảng",
      href: "/lecturer/chapters",
      icon: Layers,
      iconBg:
        "bg-secondary-light text-secondary-foreground border-secondary-pastel/70",
      hoverBorder: "hover:border-secondary-pastel",
    },
    {
      title: "Thống kê & Báo cáo",
      description: "Phân tích doanh thu & tương tác",
      href: "/lecturer/dashboard",
      icon: BarChart3,
      iconBg: "bg-accent text-accent-foreground border-accent-border/70",
      hoverBorder: "hover:border-accent-border",
    },
    {
      title: "Combo & Lộ trình",
      description: "Đóng gói khóa học và mở bán",
      href: "/lecturer/combos",
      icon: Library,
      iconBg: "bg-primary-light text-primary border-primary-pastel/70",
      hoverBorder: "hover:border-primary-pastel",
    },
    {
      title: "Mã giảm giá",
      description: "Tạo chiến dịch ưu đãi & combo",
      href: "/lecturer/discounts",
      icon: Tag,
      iconBg:
        "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border/70",
      hoverBorder: "hover:border-accent-vanilla-border",
    },
    {
      title: "Trạm hoàn tiền",
      description: "Xử lý phản hồi & đối soát",
      href: "/lecturer/refund",
      icon: RotateCcw,
      iconBg:
        "bg-destructive-bg text-destructive-foreground border-destructive-border/70",
      hoverBorder: "hover:border-destructive-border",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* 1. Studio Hero & Action Radar */}
        <StudioHero
          fullname={user?.fullname}
          pendingRefundCount={pendingRefundCount}
          holdCount={holdCount}
        />

        {/* 2. Bố cục chính 2 cột (8/12 Trái - 4/12 Phải) */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* Cột Trái (8 cột) */}
          <div className="space-y-6 xl:col-span-8">
            {/* KPI + Nhịp Doanh Thu */}
            <RevenuePulse
              overview={overview}
              isLoadingOverview={isLoadingOverview}
            />

            {/* Bảng xếp hạng Khóa học nổi bật */}
            <TopCoursesCard
              courses={coursesPerformance}
              isLoading={isLoadingCourses}
            />

            {/* Lối tắt vận hành Studio */}
            <Card
              variant="surface"
              density="none"
              className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
            >
              <div className="border-b border-border bg-primary-light/30 px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Công cụ vận hành nhanh
                </h2>
                <p className="text-xs text-muted-foreground">
                  Truy cập tức thì các phân khu giảng dạy, khuyến mãi và đối soát
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 md:grid-cols-3">
                {quickActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={`group flex flex-col items-start rounded-2xl border border-border bg-background/60 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-xs cursor-pointer ${item.hoverBorder}`}
                    >
                      <div className="mb-3 flex w-full items-center justify-between">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${item.iconBg}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-subtle-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Cột Phải (4 cột Sticky): Ví Kho Bạc + Hold + Tài nguyên */}
          <div className="xl:col-span-4">
            <WalletPanel wallet={wallet} holdCount={holdCount} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerHome;
