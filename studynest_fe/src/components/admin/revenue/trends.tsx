"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RevenueTrendsResponse } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { HiTrendingUp, HiStar } from "react-icons/hi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RevenueTrends() {
  const [months, setMonths] = useState(12);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useSWR<RevenueTrendsResponse>(
    `/admin/statistics/revenue/trends?period=month&months=${months}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const trendData = data?.data || [];

  const chartData = {
    labels: trendData.map((d) => d.period),
    datasets: [
      {
        label: "Doanh thu",
        data: trendData.map((d) => parseFloat(String(d.revenue)) || 0),
        borderColor: "#356FA7",
        backgroundColor: "rgba(191, 215, 237, 0.35)",
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Tăng trưởng (%)",
        data: trendData.map((d) => d.growth_rate ?? 0),
        borderColor: "#7BAFD4",
        backgroundColor: "#7BAFD4",
        type: "line" as const,
        tension: 0.4,
        borderDash: [5, 5],
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, color: "#3D4A5A" },
      },
      tooltip: { backgroundColor: "#3D4A5A", padding: 12, borderRadius: 10 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6F7C8C" } },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        grid: { color: "#E7EEF7" },
        ticks: {
          color: "#6F7C8C",
          callback: (value: number) => formatCurrency(value),
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: { color: "#356FA7", callback: (value: number) => `${value}%` },
      },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-[20px] shadow-xs border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-foreground">Xu hướng doanh thu</h3>
        <div className="flex gap-1.5 bg-background p-1 rounded-xl border border-border">
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                months === m
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-primary-light/70 border border-primary-pastel/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HiTrendingUp className="w-4 h-4 text-primary" />
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">TB hàng tháng</p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(data?.avg_monthly_revenue)}
          </p>
        </div>
        <div className="bg-secondary-light/70 border border-secondary-pastel/60 rounded-xl p-4">
          <p className="text-secondary-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            TB tăng trưởng
          </p>
          <p className="text-xl font-bold text-foreground">
            {(data?.avg_growth_rate ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-surface-muted border border-accent-vanilla rounded-xl p-4 col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <HiStar className="w-4 h-4 text-warning" />
            <p className="text-warning-foreground text-xs font-semibold uppercase tracking-wider">
              Tháng tốt nhất
            </p>
          </div>
          <p className="text-xl font-bold text-foreground">
            {data?.best_month || "N/A"} -{" "}
            {formatCurrency(data?.best_month_revenue)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={options as any} />
        )}
      </div>
    </div>
  );
}
