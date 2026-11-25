"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { BarChart3, Coins, ShoppingBag } from "pulsoicon-react";
import { Card, Skeleton } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { RevenueChartItem } from "@/types/lecturer/statistics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const formatVndApprox = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";

export default function RevenueChart() {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [metric, setMetric] = useState<"revenue" | "courses_sold">("revenue");

  const { data, isLoading } = useSWR<RevenueChartItem[]>(
    `/lecturer/statistics/revenue-chart?period=${period}`,
    async (url) => {
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    { revalidateOnFocus: false },
  );

  const summary = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const totalRev = list.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalSold = list.reduce(
      (sum, item) => sum + (item.courses_sold || 0),
      0,
    );
    const peakRev = list.reduce(
      (max, item) => Math.max(max, item.revenue || 0),
      0,
    );
    const avgRev = list.length > 0 ? totalRev / list.length : 0;
    return { totalRev, totalSold, peakRev, avgRev, count: list.length };
  }, [data]);

  const isRevenueMode = metric === "revenue";

  const chartData = {
    labels: data?.map((item) => item.date) || [],
    datasets: [
      {
        label: isRevenueMode ? "Doanh thu" : "Khóa học bán ra",
        data:
          data?.map((item) =>
            isRevenueMode ? item.revenue : item.courses_sold,
          ) || [],
        fill: true,
        backgroundColor: isRevenueMode
          ? "rgba(191, 215, 237, 0.42)"
          : "rgba(227, 213, 245, 0.45)",
        borderColor: isRevenueMode ? "#356FA7" : "#6B5CA5",
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: isRevenueMode ? "#356FA7" : "#6B5CA5",
        pointHoverBackgroundColor: isRevenueMode ? "#356FA7" : "#6B5CA5",
        pointHoverBorderColor: "#ffffff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#3D4A5A",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        borderRadius: 12,
        displayColors: false,
        callbacks: {
          label: (context: { dataIndex: number }) => {
            const point = data?.[context.dataIndex];
            if (!point) return "";
            return [
              `Doanh thu: ${formatVndAsCoin(point.revenue)} (≈ ${formatVndApprox(point.revenue)})`,
              `Khóa học bán ra: ${point.courses_sold} lượt`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6F7C8C", font: { size: 11 }, maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(191, 215, 237, 0.35)" },
        ticks: {
          color: "#6F7C8C",
          font: { size: 11 },
          callback: (val: string | number) => {
            const num = Number(val) || 0;
            return isRevenueMode ? formatVndAsCoin(num) : `${num} lượt`;
          },
        },
      },
    },
  };

  return (
    <Card
      variant="surface"
      density="none"
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-primary-pastel/80 shadow-xs"
    >
      {/* Header + 2 nhóm công tắc chuyển đổi */}
      <div className="flex flex-col gap-3 border-b border-border bg-gradient-to-r from-primary-light/60 via-surface to-secondary-light/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
            <BarChart3 animated={false} className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Biểu đồ Doanh thu &amp; Lượt bán
            </h2>
            <p className="text-xs text-muted-foreground">
              Theo dõi biến động theo chu kỳ với độ chính xác từng mốc thời gian
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chuyển đổi chỉ số */}
          <div
            className="inline-flex items-center rounded-full border border-border bg-surface p-1"
            role="group"
            aria-label="Chọn chỉ số hiển thị"
          >
            <button
              type="button"
              onClick={() => setMetric("revenue")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                isRevenueMode
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Coins animated={false} className="h-3 w-3" />
              Doanh thu
            </button>
            <button
              type="button"
              onClick={() => setMetric("courses_sold")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                !isRevenueMode
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <ShoppingBag animated={false} className="h-3 w-3" />
              Lượt bán
            </button>
          </div>

          {/* Chuyển đổi chu kỳ */}
          <div
            className="inline-flex items-center rounded-full border border-primary-pastel/80 bg-surface p-1"
            role="group"
            aria-label="Chọn chu kỳ"
          >
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                period === "month"
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              30 ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriod("year")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                period === "year"
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Theo năm
            </button>
          </div>
        </div>
      </div>

      {/* 4 chỉ số tóm tắt kỳ */}
      <div className="grid grid-cols-2 gap-3 border-b border-border/70 bg-background/50 px-6 py-3.5 sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Tổng doanh thu kỳ</p>
          <p className="mt-0.5 font-display text-base font-bold text-primary tabular-nums">
            {formatVndAsCoin(summary.totalRev)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Đỉnh cao nhất</p>
          <p className="mt-0.5 font-display text-base font-bold text-foreground tabular-nums">
            {formatVndAsCoin(summary.peakRev)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Trung bình / mốc</p>
          <p className="mt-0.5 font-display text-base font-bold text-foreground tabular-nums">
            {formatVndAsCoin(summary.avgRev)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Tổng lượt bán</p>
          <p className="mt-0.5 font-display text-base font-bold text-secondary-foreground tabular-nums">
            {summary.totalSold.toLocaleString("vi-VN")} lượt
          </p>
        </div>
      </div>

      {/* Vùng biểu đồ */}
      <div className="flex-1 p-6">
        {isLoading ? (
          <Skeleton variant="rect" className="h-[280px] w-full rounded-2xl" />
        ) : !data || data.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary-pastel bg-primary-light/20 text-center">
            <p className="text-sm font-semibold text-foreground">
              Chưa có dữ liệu doanh thu trong chu kỳ này
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Khi phát sinh giao dịch mới, biểu đồ sẽ cập nhật tự động.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <Line data={chartData} options={options} />
          </div>
        )}
      </div>
    </Card>
  );
}
