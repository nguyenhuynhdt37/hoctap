/* eslint-disable @next/next/no-img-element */
"use client";

import { Alert, Badge, Button, Card, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type {
  LecturerCourseStats,
  TimelinePoint,
} from "@/types/lecturer/course-stats";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Clock,
  Coins,
  Eye,
  Layers,
  Pencil,
  Printer,
  Star,
  TrendingUp,
  Users,
} from "pulsoicon-react";
import { useEffect, useMemo, useState } from "react";

type StatsResponse = LecturerCourseStats;

const formatCoin = (value: number) => formatVndAsCoin(value);

const formatVndApprox = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value ?? 0)) + " đ";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Number.isFinite(value) ? value : 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const formatDuration = (seconds?: number) => {
  const s = Math.max(0, Number(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return `${m} phút ${rem} giây`;
  return `${rem} giây`;
};

const getApprovalMeta = (
  status?: string | null,
): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case "approved":
      return { label: "Đã duyệt", variant: "success" };
    case "pending":
      return { label: "Chờ duyệt", variant: "warning" };
    case "rejected":
      return { label: "Bị từ chối", variant: "destructive" };
    case "draft":
      return { label: "Bản nháp", variant: "neutral" };
    default:
      return { label: status || "Đang cập nhật", variant: "neutral" };
  }
};

const MODE_OPTIONS: Array<{
  value: "day" | "month" | "quarter" | "year";
  label: string;
}> = [
  { value: "day", label: "Theo ngày" },
  { value: "month", label: "Theo tháng" },
  { value: "quarter", label: "Theo quý" },
  { value: "year", label: "Theo năm" },
];

export default function LecturerCourseStats() {
  const params = useParams<{ id?: string }>();
  const courseId = params?.id;

  const [data, setData] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"day" | "month" | "quarter" | "year">("day");
  const [timeline, setTimeline] = useState<{
    enroll_timeline: TimelinePoint[];
    activity_timeline: TimelinePoint[];
  } | null>(null);

  useEffect(() => {
    try {
      ChartJS.register(
        ArcElement,
        Tooltip,
        Legend,
        Filler,
        CategoryScale,
        LinearScale,
        BarElement,
        LineElement,
        PointElement,
      );
    } catch {
      // Bỏ qua nếu đã đăng ký
    }
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<StatsResponse>(
          `/lecturer/courses/${courseId}/students/stats`,
          { headers: { accept: "application/json" } },
        );
        if (!mounted) return;
        setData(res.data);
      } catch (e: unknown) {
        if (!mounted) return;
        const errObj = e as {
          response?: { data?: { detail?: string; message?: string } };
        };
        const msg =
          errObj?.response?.data?.detail ||
          errObj?.response?.data?.message ||
          "Không thể tải thống kê khóa học";
        setError(msg);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(
          `/lecturer/courses/${courseId}/students/timeline?mode=${mode}`,
          { headers: { accept: "application/json" } },
        );
        if (!mounted) return;
        setTimeline({
          enroll_timeline: res.data?.enroll_timeline || [],
          activity_timeline: res.data?.activity_timeline || [],
        });
      } catch {
        if (!mounted) return;
        setTimeline({ enroll_timeline: [], activity_timeline: [] });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId, mode]);

  const doughnutData = useMemo(() => {
    if (!data) return null;
    return {
      labels: ["Trả phí", "Miễn phí"],
      datasets: [
        {
          data: [data.paid_students || 0, data.free_students || 0],
          backgroundColor: ["#356FA7", "#BFD7ED"],
          borderColor: "#ffffff",
          borderWidth: 2.5,
          hoverOffset: 6,
        },
      ],
    };
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return null;
    const completed = data.completed_students || 0;
    const inProgress = Math.max(0, (data.total_students || 0) - completed);
    return {
      labels: ["Đã hoàn thành", "Đang theo học"],
      datasets: [
        {
          label: "Số học viên",
          data: [completed, inProgress],
          backgroundColor: [
            "rgba(53, 111, 167, 0.8)",
            "rgba(191, 215, 237, 0.85)",
          ],
          borderColor: ["#356FA7", "#7BAFD4"],
          borderWidth: 1,
          borderRadius: 12,
          barThickness: 48,
        },
      ],
    };
  }, [data]);

  const combinedLineData = useMemo(() => {
    if (!timeline) return null;
    const labels = Array.from(
      new Set([
        ...timeline.enroll_timeline.map((i) => i.time),
        ...timeline.activity_timeline.map((i) => i.time),
      ]),
    ).sort();
    if (labels.length === 0) return null;

    const enrollMap = new Map(
      timeline.enroll_timeline.map((i) => [i.time, i.count]),
    );
    const activityMap = new Map(
      timeline.activity_timeline.map((i) => [i.time, i.count]),
    );
    const enrollSeries = labels.map((t) => enrollMap.get(t) || 0);
    const activitySeries = labels.map((t) => activityMap.get(t) || 0);

    return {
      labels,
      datasets: [
        {
          label: "Đăng ký mới",
          data: enrollSeries,
          borderColor: "#356FA7",
          backgroundColor: "rgba(191, 215, 237, 0.35)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#356FA7",
          pointBorderWidth: 2,
        },
        {
          label: "Hoạt động học tập",
          data: activitySeries,
          borderColor: "#D47496",
          backgroundColor: "rgba(247, 201, 217, 0.28)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#D47496",
          pointBorderWidth: 2,
        },
      ],
    };
  }, [timeline]);

  const timelineSummary = useMemo(() => {
    const totalEnrolls = (timeline?.enroll_timeline ?? []).reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );
    const totalActivities = (timeline?.activity_timeline ?? []).reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );
    return { totalEnrolls, totalActivities };
  }, [timeline]);

  const totalRevenueAll = useMemo(() => {
    if (!data) return 0;
    const sumBreakdown =
      (data.revenue_paid || 0) +
      (data.revenue_holding || 0) +
      (data.revenue_pending || 0);
    return sumBreakdown > 0 ? sumBreakdown : data.total_revenue || 0;
  }, [data]);

  const avgProgress = Math.min(100, Math.max(0, Number(data?.avg_progress || 0)));
  const completionRate = Math.min(
    100,
    Math.max(0, Number(data?.completion_rate || 0)),
  );
  const conversionRate =
    data && data.views > 0
      ? Math.min(100, ((data.total_students || 0) / data.views) * 100)
      : 0;

  const gaugeRadius = 32;
  const gaugeCirc = 2 * Math.PI * gaugeRadius;
  const approvalMeta = getApprovalMeta(data?.approval_status);

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Bar điều hướng nhanh của khóa học */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/lecturer/courses"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại khóa học</span>
          </Link>

          {courseId && (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/lecturer/courses/${courseId}/users`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-surface"
                  leftIcon={<Users className="h-3.5 w-3.5" />}
                >
                  Học viên
                </Button>
              </Link>
              <Link href={`/lecturer/chapters?course_id=${courseId}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-surface"
                  leftIcon={<Layers className="h-3.5 w-3.5" />}
                >
                  Chương bài
                </Button>
              </Link>
              <Link href={`/lecturer/courses/${courseId}/edit`}>
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  className="rounded-full"
                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Chỉnh sửa
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface"
                onClick={() => window.print()}
                leftIcon={<Printer className="h-3.5 w-3.5" />}
              >
                In báo cáo
              </Button>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-[32px]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-[24px]" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-[28px]" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <Alert variant="warning" title="Không thể tải thống kê khóa học">
            {error}
          </Alert>
        )}

        {/* Nội dung chính */}
        {data && !isLoading && !error && (
          <div className="space-y-6">
            {/* Hero Hồ Sơ & 2 Vòng Đo Tiến Độ */}
            <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-secondary-pastel/40 blur-3xl"
              />

              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {data.thumbnail_url && (
                    <img
                      src={getImageUrl(data.thumbnail_url)}
                      alt={data.title}
                      className="aspect-video w-full shrink-0 rounded-2xl border border-surface object-cover shadow-xs sm:w-44"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        <BarChart3 animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                        Thống kê chi tiết khóa học
                      </span>
                      <Badge variant={approvalMeta.variant} size="sm" dot>
                        {approvalMeta.label} · vòng {data.review_round}
                      </Badge>
                    </div>

                    <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {data.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 px-2.5 py-1 font-medium text-foreground">
                        <BookOpen animated={false} className="h-3.5 w-3.5 text-primary" />
                        {data.sections_count} chương · {data.lessons_count} bài
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 px-2.5 py-1 font-medium text-foreground">
                        <Clock animated={false} className="h-3.5 w-3.5 text-primary" />
                        {formatDuration(data.total_length_seconds)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-vanilla-border bg-accent-vanilla/85 px-2.5 py-1 font-bold text-warning-foreground">
                        <Coins animated={false} className="h-3.5 w-3.5 text-[#C98A2C]" />
                        {data.base_price === 0
                          ? "Miễn phí"
                          : formatCoin(data.base_price || 0)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground tabular-nums">
                      Tạo: {formatDateTime(data.created_at)} · Cập nhật:{" "}
                      {formatDateTime(data.updated_at)} · Duyệt:{" "}
                      {formatDateTime(data.approved_at)}
                    </p>
                  </div>
                </div>

                {/* 2 Vòng đo tiến độ SVG */}
                <div className="grid grid-cols-2 gap-3.5 xl:w-[370px] shrink-0">
                  <div className="flex flex-col items-center rounded-[24px] border border-surface bg-surface/88 p-4 text-center shadow-2xs backdrop-blur-xs">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                        <circle
                          cx="40"
                          cy="40"
                          r={gaugeRadius}
                          fill="none"
                          stroke="var(--color-primary-light)"
                          strokeWidth="7"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r={gaugeRadius}
                          fill="none"
                          stroke="var(--color-primary)"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={gaugeCirc}
                          strokeDashoffset={
                            gaugeCirc * (1 - avgProgress / 100)
                          }
                        />
                      </svg>
                      <span className="absolute font-display text-sm font-bold tabular-nums text-foreground">
                        {avgProgress.toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-foreground">
                      Tiến độ TB
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {avgProgress.toFixed(1)}% bài học
                    </p>
                  </div>

                  <div className="flex flex-col items-center rounded-[24px] border border-surface bg-surface/88 p-4 text-center shadow-2xs backdrop-blur-xs">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                        <circle
                          cx="40"
                          cy="40"
                          r={gaugeRadius}
                          fill="none"
                          stroke="var(--color-success-bg)"
                          strokeWidth="7"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r={gaugeRadius}
                          fill="none"
                          stroke="#3E9B63"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={gaugeCirc}
                          strokeDashoffset={
                            gaugeCirc * (1 - completionRate / 100)
                          }
                        />
                      </svg>
                      <span className="absolute font-display text-sm font-bold tabular-nums text-foreground">
                        {completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-foreground">
                      Hoàn thành khóa
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {formatNumber(data.completed_students || 0)} học viên
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Bento 4 Chỉ số Đa Sắc Mây */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-[24px] border-accent-vanilla-border bg-gradient-to-br from-accent-vanilla/85 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-warning-foreground">
                  <span>Tổng doanh thu</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent-vanilla-border bg-surface text-[#C98A2C]">
                    <Coins animated={false} className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                  {formatCoin(totalRevenueAll)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  ≈ {formatVndApprox(totalRevenueAll)}
                </p>
              </Card>

              <Card className="rounded-[24px] border-primary-pastel bg-gradient-to-br from-primary-light/85 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Tổng học viên</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-pastel bg-surface text-primary">
                    <Users animated={false} className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                  {formatNumber(data.total_students || 0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {formatNumber(data.paid_students || 0)} trả phí ·{" "}
                  {formatNumber(data.free_students || 0)} miễn phí
                </p>
              </Card>

              <Card className="rounded-[24px] border-secondary-pastel bg-gradient-to-br from-secondary-light/85 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-secondary-foreground">
                  <span>Lượt xem &amp; Chuyển đổi</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-secondary-pastel bg-surface text-secondary-foreground">
                    <Eye animated={false} className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                  {formatNumber(data.views || 0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Tỷ lệ ghi danh / xem: {conversionRate.toFixed(1)}%
                </p>
              </Card>

              <Card className="rounded-[24px] border-success-border bg-gradient-to-br from-success-bg/80 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-success-foreground">
                  <span>Điểm đánh giá</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-success-border bg-surface text-accent-vanilla-foreground">
                    <Star animated={false} className="h-4 w-4 fill-current" />
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                  {Number(data.rating_avg || 0).toFixed(1)}{" "}
                  <span className="font-sans text-xs font-normal text-muted-foreground">
                    / 5.0
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Từ {formatNumber(data.total_reviews || 0)} lượt nhận xét
                </p>
              </Card>
            </div>

            {/* Đối soát Doanh thu 3 Trạng thái */}
            <Card
              variant="surface"
              density="none"
              className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
            >
              <div className="border-b border-border bg-accent-vanilla/45 px-6 py-4">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Phân bổ doanh thu theo trạng thái giải ngân
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-success-border bg-success-bg/60 p-4">
                  <p className="text-xs font-semibold text-success-foreground">
                    Đã giải ngân về ví
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold tabular-nums text-warning-foreground">
                    <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" />
                    {formatCoin(data.revenue_paid || 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    ≈ {formatVndApprox(data.revenue_paid)}
                  </p>
                </div>

                <div className="rounded-2xl border border-primary-pastel bg-primary-light/55 p-4">
                  <p className="text-xs font-semibold text-primary">
                    Đang tạm giữ (kỳ bảo vệ quỹ)
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold tabular-nums text-warning-foreground">
                    <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" />
                    {formatCoin(data.revenue_holding || 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    ≈ {formatVndApprox(data.revenue_holding)}
                  </p>
                </div>

                <div className="rounded-2xl border border-warning-border bg-warning-bg/70 p-4">
                  <p className="text-xs font-semibold text-warning-foreground">
                    Đang chờ xử lý
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold tabular-nums text-warning-foreground">
                    <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" />
                    {formatCoin(data.revenue_pending || 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    ≈ {formatVndApprox(data.revenue_pending)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Phân bố Học viên & Tiến độ (2 cột 5/7) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[26px] border border-border shadow-2xs lg:col-span-5"
              >
                <div className="border-b border-border bg-primary-light/35 px-6 py-4">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Cơ cấu học viên
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tỷ lệ học viên trả phí và miễn phí
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center p-6">
                  {doughnutData && (
                    <div className="relative h-56 w-56">
                      <Doughnut
                        data={doughnutData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          cutout: "72%",
                          plugins: {
                            legend: {
                              position: "bottom",
                              labels: { boxWidth: 10, color: "#3D4A5A" },
                            },
                            tooltip: {
                              enabled: true,
                              backgroundColor: "#3D4A5A",
                            },
                          },
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 -top-6 flex flex-col items-center justify-center">
                        <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                          {formatNumber(data.total_students || 0)}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Học viên
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card
                variant="surface"
                density="none"
                className="overflow-hidden rounded-[26px] border border-border shadow-2xs lg:col-span-7"
              >
                <div className="border-b border-border bg-secondary-light/35 px-6 py-4">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Phân bố hoàn thành khóa học
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    So sánh nhóm học viên đã hoàn thành và đang theo học
                  </p>
                </div>
                <div className="p-6">
                  {barData && (
                    <div className="h-56 w-full">
                      <Bar
                        data={barData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              enabled: true,
                              backgroundColor: "#3D4A5A",
                            },
                          },
                          scales: {
                            x: {
                              grid: { display: false },
                              ticks: { color: "#6F7C8C" },
                            },
                            y: {
                              beginAtZero: true,
                              grid: { color: "#E7EEF7" },
                              ticks: { color: "#6F7C8C", precision: 0 },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Biểu đồ Diễn biến Học viên theo Thời gian */}
            <Card
              variant="surface"
              density="none"
              className="overflow-hidden rounded-[28px] border border-primary-pastel/80 shadow-xs"
            >
              <div className="flex flex-col gap-3 border-b border-border bg-gradient-to-r from-primary-light/55 via-surface to-secondary-light/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
                    <TrendingUp animated={false} className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Diễn biến đăng ký &amp; hoạt động học tập
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tổng kỳ: {formatNumber(timelineSummary.totalEnrolls)} đăng
                      ký mới · {formatNumber(timelineSummary.totalActivities)}{" "}
                      lượt hoạt động
                    </p>
                  </div>
                </div>

                <div
                  className="inline-flex flex-wrap items-center rounded-full border border-border bg-surface p-1"
                  role="group"
                  aria-label="Chọn chu kỳ thời gian"
                >
                  {MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        mode === opt.value
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {combinedLineData ? (
                  <div className="h-[320px] w-full">
                    <Line
                      data={combinedLineData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        plugins: {
                          legend: {
                            position: "top",
                            align: "end",
                            labels: {
                              usePointStyle: true,
                              pointStyle: "circle",
                              color: "#3D4A5A",
                            },
                          },
                          tooltip: {
                            enabled: true,
                            backgroundColor: "#3D4A5A",
                            padding: 12,
                            cornerRadius: 10,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: "#6F7C8C" },
                          },
                          y: {
                            beginAtZero: true,
                            grid: { color: "#E7EEF7" },
                            ticks: { color: "#6F7C8C", precision: 0 },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 text-sm text-muted-foreground">
                    Chưa có dữ liệu diễn biến trong chu kỳ này
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
