"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { RevenueStatsResponse, RevenuePeriod } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { HiExternalLink } from "react-icons/hi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: string, period: RevenuePeriod) => {
  const d = new Date(date);
  switch (period) {
    case "day":
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    case "week":
      return `Tuần ${Math.ceil(d.getDate() / 7)}`;
    case "month":
      return d.toLocaleDateString("vi-VN", { month: "short" });
    case "year":
      return d.getFullYear().toString();
    default:
      return date;
  }
};

export default function RevenueLineChart() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useSWR<RevenueStatsResponse>(
    `/admin/statistics/revenue?period=${period}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const chartData = {
    labels: (data?.data || []).map((d) => formatDate(d.date, period)),
    datasets: [
      {
        label: "Doanh thu",
        data: (data?.data || []).map((d) => parseFloat(String(d.amount)) || 0),
        borderColor: "#356FA7",
        backgroundColor: "rgba(191, 215, 237, 0.35)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#356FA7",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#3D4A5A",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        borderRadius: 10,
        callbacks: {
          label: (ctx: { raw: number }) => formatCurrency(ctx.raw),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6F7C8C" } },
      y: {
        grid: { color: "#E7EEF7" },
        ticks: {
          color: "#6F7C8C",
          callback: (value: number) => formatCurrency(value),
        },
      },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-[20px] shadow-xs border border-[#E7EEF7] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#3D4A5A]">Biểu đồ doanh thu</h3>
          <p className="text-[#6F7C8C] text-sm mt-1">
            Tổng: {formatCurrency(data?.total)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 bg-[#F6FAFF] p-1 rounded-xl border border-[#E7EEF7]">
            {(["day", "week", "month", "year"] as RevenuePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  period === p
                    ? "bg-[#356FA7] text-white shadow-2xs"
                    : "text-[#6F7C8C] hover:text-[#3D4A5A]"
                }`}
              >
                {p === "day"
                  ? "Ngày"
                  : p === "week"
                  ? "Tuần"
                  : p === "month"
                  ? "Tháng"
                  : "Năm"}
              </button>
            ))}
          </div>
          <Link
            href="/admin/revenue"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#356FA7] border border-[#BFD7ED] rounded-xl hover:bg-[#E8F2FA] transition-colors"
          >
            <HiExternalLink className="w-4 h-4" />
            Chi tiết
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#E8F2FA]/70 border border-[#BFD7ED]/60 rounded-xl p-4">
          <p className="text-[#356FA7] text-xs font-semibold uppercase tracking-wider">Thu nền tảng</p>
          <p className="text-[#3D4A5A] text-lg font-bold mt-1">
            {formatCurrency(data?.platform_income)}
          </p>
        </div>
        <div className="bg-[#FCE8EF]/70 border border-[#F7C9D9]/60 rounded-xl p-4">
          <p className="text-[#8A3B58] text-xs font-semibold uppercase tracking-wider">Chi giảng viên</p>
          <p className="text-[#3D4A5A] text-lg font-bold mt-1">
            {formatCurrency(data?.instructor_payout)}
          </p>
        </div>
        <div className="bg-[#E3D5F5]/40 border border-[#E3D5F5] rounded-xl p-4">
          <p className="text-[#593E7A] text-xs font-semibold uppercase tracking-wider">Số giao dịch</p>
          <p className="text-[#3D4A5A] text-lg font-bold mt-1">
            {(data?.data || [])
              .reduce((sum, d) => sum + (d.count || 0), 0)
              .toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#356FA7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={options as any} />
        )}
      </div>
    </div>
  );
}
