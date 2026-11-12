"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  Cloud,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import LecturerWelcome from "@/components/lecturer/welcome";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { useUserStore } from "@/stores/user";
import { HoldEarningsResponse } from "@/types/lecturer/hold";
import {
  CoursePerformanceItem,
  LecturerOverview,
} from "@/types/lecturer/statistics";
import { LecturerWallet } from "@/types/lecturer/wallet";

interface IsLecturerResponse {
  is_lecturer: boolean;
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0 ₫";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const LecturerHome = () => {
  const router = useRouter();

  // Kiểm tra quyền giảng viên
  const { data: lecturerData, isLoading: isCheckingLecturer } =
    useSWR<IsLecturerResponse | null>(
      "/lecturer/courses/is_lecturer",
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
      {
        shouldRetryOnError: false,
      }
    );

  const isLecturer = lecturerData?.is_lecturer === true;

  if (isCheckingLecturer) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 max-w-7xl mx-auto space-y-6">
        <div className="space-y-3">
          <Skeleton variant="text" className="h-6 w-48 rounded-full" />
          <Skeleton variant="text" className="h-10 w-80 rounded-xl" />
          <Skeleton variant="text" className="h-4 w-96 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-28 rounded-[20px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton
            variant="rect"
            className="lg:col-span-8 h-96 rounded-[24px]"
          />
          <Skeleton
            variant="rect"
            className="lg:col-span-4 h-96 rounded-[24px]"
          />
        </div>
      </div>
    );
  }

  if (isLecturer) {
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

  // Dữ liệu ví giảng viên
  const { data: wallet } = useSWR<LecturerWallet>(
    "/lecturer/wallets/lecturer/wallet",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false }
  );

  // Số lượng giao dịch đang giữ (hold)
  const { data: holdData } = useSWR<HoldEarningsResponse>(
    "/lecturer/transactions/earnings/holding?page=1&limit=1",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false }
  );

  // Số liệu tổng quan giảng viên
  const { data: overview, isLoading: isLoadingOverview } =
    useSWR<LecturerOverview>(
      "/lecturer/statistics/overview",
      async (url) => {
        const response = await api.get(url);
        return response.data;
      },
      { revalidateOnFocus: false }
    );

  // Danh sách khóa học tiêu biểu
  const { data: coursesPerformance, isLoading: isLoadingCourses } = useSWR<
    CoursePerformanceItem[]
  >(
    "/lecturer/statistics/courses",
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false }
  );

  const holdCount = holdData?.total ?? 0;
  const topCourses = Array.isArray(coursesPerformance)
    ? coursesPerformance.slice(0, 4)
    : [];
  const revenueGrowth = overview?.revenue_growth ?? 0;
  const isGrowthPositive = revenueGrowth >= 0;

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
      description: "Theo dõi doanh thu & tương tác",
      href: "/lecturer/dashboard",
      icon: BarChart3,
      iconBg: "bg-accent text-accent-foreground border-accent-border/70",
      hoverBorder: "hover:border-accent-border",
    },
    {
      title: "Mã giảm giá",
      description: "Tạo chiến dịch ưu đãi học viên",
      href: "/lecturer/discounts",
      icon: Tag,
      iconBg:
        "bg-accent-vanilla text-accent-vanilla-foreground border-accent-vanilla-border/70",
      hoverBorder: "hover:border-accent-vanilla-border",
    },
    {
      title: "Yêu cầu hoàn tiền",
      description: "Xử lý phản hồi & đối soát",
      href: "/lecturer/refund",
      icon: RotateCcw,
      iconBg:
        "bg-destructive-bg text-destructive-foreground border-destructive-border/70",
      hoverBorder: "hover:border-destructive-border",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-16 overflow-hidden">
      {/* Đốm mây Ambient Pastel nền */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 w-[640px] h-[320px] bg-gradient-to-b from-primary-light/65 via-secondary-light/30 to-transparent blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-48 -right-24 w-80 h-80 bg-accent/20 blur-3xl rounded-full -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 space-y-8">
        {/* 1. Hero Chào Mừng Giảng Viên */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <Badge
              variant="info"
              className="px-3 py-1 text-xs font-medium tracking-wide shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Không gian Giảng viên • Mây Mây
            </Badge>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Chào mừng trở lại,{" "}
              <span className="text-primary">
                {user?.fullname || "Thầy/Cô"}
              </span>
              !
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Quản lý các khóa học tâm huyết, theo dõi tiến trình học viên và
              lan tỏa tri thức trên Học viện trên mây.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/lecturer/dashboard">
              <Button
                variant="pastel"
                size="md"
                leftIcon={<BarChart3 className="w-4 h-4" />}
              >
                Bảng thống kê
              </Button>
            </Link>
            <Link href="/lecturer/courses/create">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Tạo khóa học mới
              </Button>
            </Link>
          </div>
        </section>

        {/* 2. Hàng 4 Thẻ Chỉ Số Tổng Quan (KPIs — Dữ liệu thực) */}
        <section
          aria-label="Chỉ số tổng quan giảng dạy"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* KPI 1: Tổng khóa học */}
          <Link href="/lecturer/courses" className="block group">
            <Card
              interactive
              className="p-5 rounded-[20px] border-border bg-surface shadow-xs group-hover:border-primary-pastel transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-primary-light text-primary border border-primary-pastel/60 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-subtle-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Tổng khóa học
                </p>
                {isLoadingOverview ? (
                  <Skeleton variant="text" className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {(overview?.total_courses ?? 0).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </Card>
          </Link>

          {/* KPI 2: Tổng học viên */}
          <Link href="/lecturer/dashboard" className="block group">
            <Card
              interactive
              className="p-5 rounded-[20px] border-border bg-surface shadow-xs group-hover:border-secondary-pastel transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-secondary-light text-secondary-foreground border border-secondary-pastel/60 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-subtle-foreground group-hover:text-secondary-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Tổng học viên
                </p>
                {isLoadingOverview ? (
                  <Skeleton variant="text" className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {(overview?.total_students ?? 0).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </Card>
          </Link>

          {/* KPI 3: Đánh giá trung bình */}
          <Link href="/lecturer/dashboard" className="block group">
            <Card
              interactive
              className="p-5 rounded-[20px] border-border bg-surface shadow-xs group-hover:border-accent-vanilla-border transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-accent-vanilla text-accent-vanilla-foreground border border-accent-vanilla-border/60 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <span className="text-[11px] font-medium text-subtle-foreground">
                  {overview?.total_reviews ?? 0} đánh giá
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Đánh giá trung bình
                </p>
                {isLoadingOverview ? (
                  <Skeleton variant="text" className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {(overview?.average_rating ?? 0).toFixed(1)}{" "}
                    <span className="text-sm font-normal text-subtle-foreground">
                      / 5.0
                    </span>
                  </p>
                )}
              </div>
            </Card>
          </Link>

          {/* KPI 4: Doanh thu tháng này */}
          <Link href="/lecturer/wallets" className="block group">
            <Card
              interactive
              className="p-5 rounded-[20px] border-border bg-surface shadow-xs group-hover:border-success-border transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-success-bg text-success-foreground border border-success-border flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                {!isLoadingOverview && (
                  <Badge
                    variant={isGrowthPositive ? "success" : "destructive"}
                    size="sm"
                    className="gap-1 text-[11px]"
                  >
                    {isGrowthPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {isGrowthPositive ? "+" : ""}
                    {revenueGrowth.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Doanh thu tháng này
                </p>
                {isLoadingOverview ? (
                  <Skeleton variant="text" className="h-8 w-28 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-0.5 truncate">
                    {formatCurrency(overview?.this_month_revenue)}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        </section>

        {/* 3. Bố cục chính 2 cột (8/12 Trái - 4/12 Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột Trái (8 cột): Truy cập nhanh + Khóa học nổi bật */}
          <div className="lg:col-span-8 space-y-6">
            {/* Truy cập nhanh */}
            <Card className="rounded-[24px] border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Truy cập nhanh
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Các công cụ giảng dạy và quản lý thường dùng
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {quickActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={`group flex flex-col items-start p-4 rounded-2xl border border-border bg-background/50 hover:bg-surface ${item.hoverBorder} hover:shadow-ambient-sm transition-all duration-200 text-left cursor-pointer`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${item.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Hiệu suất Khóa học Tiêu biểu */}
            <Card className="rounded-[24px] border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Khóa học nổi bật
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hiệu suất các khóa học đang thu hút học viên nhất
                  </p>
                </div>
                <Link
                  href="/lecturer/courses"
                  className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 transition-colors"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLoadingCourses ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton
                      key={idx}
                      variant="rect"
                      className="h-16 w-full rounded-xl"
                    />
                  ))}
                </div>
              ) : topCourses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Chưa có dữ liệu khóa học
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
                    Hãy tạo và xuất bản khóa học đầu tiên để bắt đầu tiếp cận
                    hàng ngàn học sinh THPT trên StudyNest.
                  </p>
                  <Link href="/lecturer/courses/create">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Tạo khóa học ngay
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {topCourses.map((course) => (
                    <Link
                      key={course.course_id}
                      href={`/lecturer/courses/${course.course_id}/stats`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0 group hover:bg-primary-light/20 -mx-2 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={getImageUrl(
                            course.thumbnail || "/logo/studynest-logo.svg"
                          )}
                          alt={course.title}
                          className="w-16 h-11 rounded-lg object-cover bg-primary-light/50 border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {course.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-subtle-foreground" />
                              {course.total_students} học viên
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              {course.average_rating.toFixed(1)} (
                              {course.reviews_count})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-19 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-bold text-foreground">
                            {formatCurrency(course.revenue)}
                          </p>
                          <p className="text-[11px] text-subtle-foreground">
                            Tổng doanh thu
                          </p>
                        </div>
                        <Badge
                          variant={
                            course.status === "published"
                              ? "success"
                              : "default"
                          }
                          size="sm"
                        >
                          {course.status === "published"
                            ? "Đang bán"
                            : "Bản nháp"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Cột Phải (4 cột): Ví + Hold + Bắt đầu nhanh */}
          <div className="lg:col-span-4 space-y-6">
            {/* Thẻ Ví Giảng Viên — Cloudy Blue Gradient */}
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-primary via-primary-hover to-primary-active p-6 text-primary-foreground shadow-ambient-lg border border-primary-pastel/30">
              {/* Họa tiết trang trí mềm */}
              <div
                className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold">Ví của giảng viên</h2>
                </div>
                {wallet?.kyc_verified && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                    Đã xác minh
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-primary-foreground/80">
                    Số dư khả dụng
                  </p>
                  <p className="text-3xl font-bold tracking-tight mt-0.5">
                    {wallet ? formatCurrency(wallet.balance) : "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-[11px] text-primary-foreground/75">
                      Tổng thu nhập
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {wallet ? formatCurrency(wallet.total_in) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-primary-foreground/75">
                      Tổng đã rút
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {wallet ? formatCurrency(wallet.total_out) : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push("/lecturer/wallets")}
                    className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Chi tiết ví
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/lecturer/withdraw/create")}
                    className="px-3.5 py-2.5 rounded-xl bg-surface text-primary hover:bg-primary-light text-xs font-semibold transition-colors cursor-pointer text-center shadow-2xs"
                  >
                    Rút tiền
                  </button>
                </div>
              </div>
            </div>

            {/* Thẻ Giao dịch Đang Giữ (Hold) */}
            <Card className="rounded-[24px] border-border bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Giao dịch đang hold
                </h2>
                {holdCount > 0 && (
                  <Badge variant="warning" size="sm">
                    Chờ đối soát
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary-light/50 border border-primary-pastel/60 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Số lượng giao dịch
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {holdCount}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="pastel"
                size="md"
                fullWidth
                onClick={() => router.push("/lecturer/hold")}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Xem chi tiết giao dịch
              </Button>
            </Card>

            {/* Thẻ Bắt đầu / Tài nguyên Giảng viên */}
            <Card
              variant="muted"
              className="rounded-[24px] border-border p-6 shadow-xs"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-primary-light text-primary border border-primary-pastel/60 flex items-center justify-center shrink-0">
                  <Cloud className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">
                    Mẹo giảng dạy hiệu quả
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                    Quản lý tập trung tài liệu PDF, video bài giảng và câu hỏi
                    trắc nghiệm để tái sử dụng cho nhiều khóa học.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/lecturer/resources")}
                    >
                      Kho tài nguyên
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push("/lecturer/courses/create")}
                    >
                      Tạo khóa mới
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerHome;
