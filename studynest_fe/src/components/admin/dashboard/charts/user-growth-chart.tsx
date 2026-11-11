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
} from "chart.js";
import { Line } from "react-chartjs-2";
import { UserStatsResponse, RevenuePeriod } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const formatDate = (date: string, period: RevenuePeriod) => {
  const d = new Date(date);
  switch (period) {
    case "day":
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    case "week":
      return `T${Math.ceil(d.getDate() / 7)}`;
    case "month":
      return d.toLocaleDateString("vi-VN", { month: "short" });
    case "year":
      return d.getFullYear().toString();
    default:
      return date;
  }
};

export default function UserGrowthChart() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useSWR<UserStatsResponse>(
    `/admin/statistics/users?period=${period}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const growthData = data?.growth || [];

  const chartData = {
    labels: growthData.map((d) => formatDate(d.date, period)),
    datasets: [
      {
        label: "Người dùng mới",
        data: growthData.map((d) => d.new_users ?? 0),
        borderColor: "#356FA7",
        backgroundColor: "#356FA7",
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Hoạt động",
        data: growthData.map((d) => d.active_users ?? 0),
        borderColor: "#D9829F",
        backgroundColor: "#F7C9D9",
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [5, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { usePointStyle: true, padding: 20, color: "#3D4A5A" },
      },
      tooltip: {
        backgroundColor: "#3D4A5A",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        borderRadius: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6F7C8C" } },
      y: { grid: { color: "#E7EEF7" }, ticks: { color: "#6F7C8C" } },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-[20px] shadow-xs border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Tăng trưởng người dùng
          </h3>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-muted-foreground">
              Tổng:{" "}
              <span className="font-semibold text-foreground">
                {(data?.total ?? 0).toLocaleString("vi-VN")}
              </span>
            </span>
            <span className="text-success-foreground">
              Đã xác minh:{" "}
              <span className="font-semibold">
                {(data?.verified ?? 0).toLocaleString("vi-VN")}
              </span>
            </span>
            <span className="text-destructive-foreground">
              Bị cấm:{" "}
              <span className="font-semibold">
                {(data?.banned ?? 0).toLocaleString("vi-VN")}
              </span>
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 bg-background p-1 rounded-xl border border-border">
          {(["day", "week", "month", "year"] as RevenuePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                period === p
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
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
      </div>

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
