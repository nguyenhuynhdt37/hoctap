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
import {
  InstructorGrowthResponse,
  RevenuePeriod,
} from "@/types/admin/statistics";
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
        borderColor: "#00a73d",
        backgroundColor: "rgba(0, 167, 61, 0.1)",
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Tổng cộng dồn",
        data: growthData.map((d) => d.total_instructors),
        borderColor: "#10b981",
        backgroundColor: "#10b981",
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
      legend: { position: "top" as const, labels: { usePointStyle: true } },
      tooltip: { backgroundColor: "#1f2937", padding: 12, borderRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6b7280" } },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        grid: { color: "#f3f4f6" },
        ticks: { color: "#6b7280" },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: { color: "#10b981" },
      },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-900">
          Tăng trưởng giảng viên
        </h3>
        <div className="flex gap-2">
          {(["day", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === p
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p === "day" ? "30 ngày" : "12 tháng"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HiTrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-green-600 text-sm font-medium">Mới trong kỳ</p>
          </div>
          <p className="text-2xl font-bold text-green-800">
            {data?.total_new_this_period ?? 0}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-emerald-600 text-sm font-medium mb-1">
            Tăng trưởng
          </p>
          <p className="text-2xl font-bold text-emerald-800">
            {(data?.growth_rate ?? 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={options as any} />
        )}
      </div>
    </div>
  );
}
