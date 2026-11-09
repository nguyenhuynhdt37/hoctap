/* eslint-disable @next/next/no-img-element */
"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import type {
  LecturerCourseStats,
  TimelinePoint,
} from "@/types/lecturer/course-stats";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StatsResponse = LecturerCourseStats;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

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
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
};

export default function LecturerCourseStats() {
  const params = useParams<{ id?: string }>();
  const courseId = params?.id;
  const Doughnut = useMemo(
    () =>
      dynamic(() => import("react-chartjs-2").then((m) => m.Doughnut), {
        ssr: false,
      }),
    []
  );
  const Bar = useMemo(
    () =>
      dynamic(() => import("react-chartjs-2").then((m) => m.Bar), {
        ssr: false,
      }),
    []
  );
  const Line = useMemo(
    () =>
      dynamic(() => import("react-chartjs-2").then((m) => m.Line), {
        ssr: false,
      }),
    []
  );
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
        CategoryScale,
        LinearScale,
        BarElement,
        LineElement,
        PointElement
      );
    } catch {}
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
          { headers: { accept: "application/json" } }
        );
        if (!mounted) return;
        setData(res.data);
      } catch (e: any) {
        if (!mounted) return;
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data?.message ||
          "Không thể tải thống kê";
        setError(msg);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  // Fetch timeline
  useEffect(() => {
    if (!courseId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(
          `/lecturer/courses/${courseId}/students/timeline?mode=${mode}`,
          { headers: { accept: "application/json" } }
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
      labels: ["Miễn phí", "Trả phí"],
      datasets: [
        {
          data: [data.free_students || 0, data.paid_students || 0],
          backgroundColor: ["#BFD7ED", "#356FA7"],
          borderColor: "#ffffff",
          borderWidth: 2,
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
      labels: ["Hoàn thành", "Chưa hoàn thành"],
      datasets: [
        {
          label: "Số học viên",
          data: [completed, inProgress],
          backgroundColor: ["rgba(53, 111, 167, 0.75)", "rgba(191, 215, 237, 0.75)"],
          borderColor: ["#356FA7", "#7BAFD4"],
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    };
  }, [data]);

  const doughnutOptions: any = {
    responsive: true,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 10, color: "#3D4A5A" },
      },
      tooltip: { enabled: true, backgroundColor: "#3D4A5A" },
    },
  };

  const barOptions: any = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, backgroundColor: "#3D4A5A" },
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
  };

  const lineOptions: any = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, backgroundColor: "#3D4A5A" },
    },
    scales: {
      x: {
        grid: { color: "#E7EEF7", borderDash: [4, 6] },
        ticks: { color: "#6F7C8C" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#E7EEF7" },
        ticks: { color: "#6F7C8C", precision: 0 },
      },
    },
  };

  // Combined flow line (enroll + activity) with soft gradient fills
  const combinedLineData = useMemo(() => {
    if (!timeline) return null;
    const labels = Array.from(
      new Set([
        ...timeline.enroll_timeline.map((i) => i.time),
        ...timeline.activity_timeline.map((i) => i.time),
      ])
    ).sort();
    const enrollMap = new Map(
      timeline.enroll_timeline.map((i) => [i.time, i.count])
    );
    const activityMap = new Map(
      timeline.activity_timeline.map((i) => [i.time, i.count])
    );
    const enrollSeries = labels.map((t) => enrollMap.get(t) || 0);
    const activitySeries = labels.map((t) => activityMap.get(t) || 0);
    const enrollBg = (ctx: any) => {
      const { ctx: c, chartArea } = ctx.chart;
      if (!chartArea) return "rgba(53, 111, 167, 0.12)";
      const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, "rgba(53, 111, 167, 0.30)");
      g.addColorStop(1, "rgba(53, 111, 167, 0.03)");
      return g;
    };
    const activityBg = (ctx: any) => {
      const { ctx: c, chartArea } = ctx.chart;
      if (!chartArea) return "rgba(247, 201, 217, 0.20)";
      const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, "rgba(247, 201, 217, 0.45)");
      g.addColorStop(1, "rgba(247, 201, 217, 0.05)");
      return g;
    };
    return {
      labels,
      datasets: [
        {
          label: "Đăng ký",
          data: enrollSeries,
          borderColor: "#356FA7",
          backgroundColor: enrollBg,
          fill: false,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#356FA7",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
        {
          label: "Hoạt động",
          data: activitySeries,
          borderColor: "#D9829F",
          backgroundColor: activityBg,
          fill: false,
          tension: 0.3,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#D9829F",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
      ],
    };
  }, [timeline]);

  return (
    <div className="min-h-screen bg-[#F6FAFF]">
      <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#3D4A5A]">
            Thống kê học viên
          </h1>
          <p className="text-[#6F7C8C]">
            {data?.title
              ? `Khóa học: ${data.title}`
              : "Tổng quan tình trạng học"}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#E7EEF7] bg-white shadow-xs p-5 animate-pulse"
              >
                <div className="h-4 w-32 bg-[#E8F2FA] rounded mb-3" />
                <div className="h-8 w-24 bg-[#E8F2FA] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="rounded-2xl border border-[#F8E9C9] bg-[#FFF1D9] p-5 text-[#875415]">
            {error}
          </div>
        )}

        {/* Content */}
        {data && !isLoading && !error && (
          <div className="space-y-6">
            {/* Course meta overview */}
            <div className="rounded-[24px] border border-[#E7EEF7] bg-white shadow-xs p-6">
              <div className="flex items-start gap-4">
                {data.thumbnail_url ? (
                  <img
                    src={getGoogleDriveImageUrl(data.thumbnail_url)}
                    alt={data.title}
                    className="w-28 h-16 rounded-xl object-cover border border-[#E7EEF7]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#3D4A5A]">
                    {data.title}
                  </h3>
                  <p className="text-sm text-[#6F7C8C]">
                    Tạo: {formatDateTime(data.created_at)} • Cập nhật:{" "}
                    {formatDateTime(data.updated_at)} • Duyệt:{" "}
                    {data.approved_at ? formatDateTime(data.approved_at) : "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Giá gốc</div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatCurrency(data.base_price || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Lượt xem</div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatNumber(data.views || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Đánh giá TB</div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {Number(data.rating_avg || 0).toFixed(1)} (
                    {formatNumber(data.total_reviews || 0)})
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Chương / Bài</div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {data.sections_count} / {data.lessons_count}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Tổng thời lượng
                  </div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatDuration(data.total_length_seconds)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Trạng thái duyệt
                  </div>
                  <div className="font-semibold text-[#3D4A5A] capitalize">
                    {data.approval_status} · vòng {data.review_round}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Tổng học viên
                  </div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatNumber(data.total_students || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Học viên trả phí
                  </div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatNumber(data.paid_students || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Học viên miễn phí
                  </div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatNumber(data.free_students || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Hoàn thành</div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {formatNumber(data.completed_students || 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">
                    Tỉ lệ hoàn thành
                  </div>
                  <div className="font-semibold text-[#3D4A5A]">
                    {Number(data.completion_rate || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-xl border border-[#E7EEF7] bg-[#F6FAFF]/60 p-3">
                  <div className="text-xs text-[#6F7C8C] mb-1">Doanh thu</div>
                  <div className="font-semibold text-[#356FA7]">
                    {formatCurrency(data.total_revenue || 0)}
                  </div>
                </div>
              </div>
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[20px] border border-[#E7EEF7] bg-white shadow-xs p-5">
                <div className="text-sm text-[#6F7C8C] mb-1">Tổng học viên</div>
                <div className="text-3xl font-semibold text-[#3D4A5A]">
                  {data.total_students}
                </div>
              </div>
              <div className="rounded-[20px] border border-[#E7EEF7] bg-white shadow-xs p-5">
                <div className="text-sm text-[#6F7C8C] mb-1">
                  Tiến độ trung bình
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full max-w-[220px] h-2.5 bg-[#E8F2FA] rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-[#356FA7] rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, data.avg_progress)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xl font-semibold text-[#3D4A5A]">
                    {data.avg_progress.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="rounded-[20px] border border-[#E7EEF7] bg-white shadow-xs p-5">
                <div className="text-sm text-[#6F7C8C] mb-1">Doanh thu</div>
                {(() => {
                  const total =
                    (data.revenue_paid || 0) +
                      (data.revenue_holding || 0) +
                      (data.revenue_pending || 0) ||
                    data.total_revenue ||
                    0;
                  return (
                    <>
                      <div className="text-3xl font-semibold text-[#356FA7]">
                        {formatCurrency(total)}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#6F7C8C]">
                        <div className="rounded-lg bg-[#E4F3E9] border border-[#BFE3CC] p-2">
                          <div>Đã thanh toán</div>
                          <div className="font-semibold text-[#276749]">
                            {formatCurrency(data.revenue_paid || 0)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#E8F2FA] border border-[#BFD7ED] p-2">
                          <div>Đang giữ</div>
                          <div className="font-semibold text-[#356FA7]">
                            {formatCurrency(data.revenue_holding || 0)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#FFF1D9] border border-[#F8E9C9] p-2">
                          <div>Chờ xử lý</div>
                          <div className="font-semibold text-[#875415]">
                            {formatCurrency(data.revenue_pending || 0)}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Status distribution */}
            <div className="rounded-[24px] border border-[#E7EEF7] bg-white shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#3D4A5A]">
                    Phân bố trạng thái học
                  </h2>
                  <p className="text-sm text-[#6F7C8C]">
                    Tổng quan các nhóm tiến độ
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-center">
                  {doughnutData ? (
                    <div className="w-64 h-64">
                      {/* @ts-ignore */}
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[#E7EEF7] bg-[#F6FAFF]/50 p-4">
                  {barData ? (
                    <div className="w-full">
                      {/* @ts-ignore */}
                      <Bar data={barData} options={barOptions} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Timeline (Flow line) */}
            <div className="rounded-[24px] border border-[#E7EEF7] bg-white shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#3D4A5A]">
                    Timeline học viên
                  </h2>
                  <p className="text-sm text-[#6F7C8C]">
                    Theo dõi theo thời gian
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={mode}
                    onChange={(e) =>
                      setMode(
                        (e.target.value as
                          | "day"
                          | "month"
                          | "quarter"
                          | "year") || "day"
                      )
                    }
                    className="px-3 py-2 rounded-xl border border-[#E7EEF7] bg-white text-sm text-[#3D4A5A] focus:outline-none focus:ring-2 focus:ring-[#356FA7]/25 focus:border-[#356FA7]"
                  >
                    <option value="day">Theo ngày</option>
                    <option value="month">Theo tháng</option>
                    <option value="quarter">Theo quý</option>
                    <option value="year">Theo năm</option>
                  </select>
                </div>
              </div>
              <div className="rounded-2xl border border-[#E7EEF7] bg-[#F6FAFF]/50 p-4">
                {combinedLineData ? (
                  <div className="w-full h-[320px]">
                    {/* @ts-ignore */}
                    <Line data={combinedLineData} options={lineOptions} />
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-[#8190A3]">
                    Không có dữ liệu
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
