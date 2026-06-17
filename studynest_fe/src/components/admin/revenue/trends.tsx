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
        borderColor: "#00a73d",
        backgroundColor: "rgba(0, 167, 61, 0.1)",
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Tăng trưởng (%)",
        data: trendData.map((d) => d.growth_rate ?? 0),
        borderColor: "#10b981",
        backgroundColor: "#10b981",
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
        ticks: {
          color: "#6b7280",
          callback: (value: number) => formatCurrency(value),
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: { color: "#10b981", callback: (value: number) => `${value}%` },
      },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-900">Xu hướng doanh thu</h3>
        <div className="flex gap-2">
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                months === m
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <HiTrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-green-600 text-sm font-medium">TB hàng tháng</p>
          </div>
          <p className="text-xl font-bold text-green-800">
            {formatCurrency(data?.avg_monthly_revenue)}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-emerald-600 text-sm font-medium mb-1">
            TB tăng trưởng
          </p>
          <p className="text-xl font-bold text-emerald-800">
            {(data?.avg_growth_rate ?? 0).toFixed(1)}%
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <HiStar className="w-4 h-4 text-yellow-600" />
            <p className="text-yellow-600 text-sm font-medium">
              Tháng tốt nhất
            </p>
          </div>
          <p className="text-xl font-bold text-yellow-800">
            {data?.best_month || "N/A"} -{" "}
            {formatCurrency(data?.best_month_revenue)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 relative">
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
