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
import { InstructorGrowthResponse } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { HiTrendingUp } from "react-icons/hi";

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

export default function InstructorGrowth() {
  const [period, setPeriod] = useState<"day" | "month">("month");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useSWR<InstructorGrowthResponse>(
    `/admin/statistics/instructors/growth?period=${period}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const growthData = data?.data || [];

  const chartData = {
    labels: growthData.map((d) => d.date),
    datasets: [
      {
        label: "Giảng viên mới",
        data: growthData.map((d) => d.new_instructors),
        borderColor: "#356FA7",
        backgroundColor: "rgba(191, 215, 237, 0.35)",
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Tổng cộng dồn",
        data: growthData.map((d) => d.total_instructors),
        borderColor: "#7BAFD4",
        backgroundColor: "#7BAFD4",
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
        ticks: { color: "#6F7C8C" },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: { color: "#356FA7" },
      },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-[20px] shadow-xs border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-foreground">
          Tăng trưởng giảng viên
        </h3>
        <div className="flex gap-1.5 bg-background p-1 rounded-xl border border-border">
          {(["day", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                period === p
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "day" ? "30 ngày" : "12 tháng"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary-light/70 border border-primary-pastel/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HiTrendingUp className="w-4 h-4 text-primary" />
            <p className="text-primary text-xs font-semibold uppercase tracking-wider">Mới trong kỳ</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {data?.total_new_this_period ?? 0}
          </p>
        </div>
        <div className="bg-secondary-light/70 border border-secondary-pastel/60 rounded-xl p-4">
          <p className="text-secondary-foreground text-xs font-semibold uppercase tracking-wider mb-1">
            Tăng trưởng
          </p>
          <p className="text-2xl font-bold text-foreground">
            {(data?.growth_rate ?? 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 relative">
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
