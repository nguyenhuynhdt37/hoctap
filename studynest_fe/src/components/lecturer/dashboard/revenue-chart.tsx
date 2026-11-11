"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { RevenueChartItem } from "@/types/lecturer/statistics";
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
import { useState } from "react";
import useSWR from "swr";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function RevenueChart() {
  const [period, setPeriod] = useState<"month" | "year">("month");

  const { data, isLoading } = useSWR<RevenueChartItem[]>(
    `/lecturer/statistics/revenue-chart?period=${period}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const chartData = {
    labels: data?.map((item) => item.date) || [],
    datasets: [
      {
        label: "Doanh thu",
        data: data?.map((item) => item.revenue) || [],
        fill: true,
        backgroundColor: "rgba(191, 215, 237, 0.35)",
        borderColor: "#356FA7",
        tension: 0.4,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#356FA7",
        pointHoverBackgroundColor: "#356FA7",
        pointHoverBorderColor: "#ffffff",
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
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            const raw = context.raw;
            const coursesSold = data?.[context.dataIndex]?.courses_sold || 0;
            return [
              `Doanh thu: ${formatCurrency(raw)}`,
              `Khóa học bán ra: ${coursesSold}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6F7C8C", font: { size: 11 } },
      },
      y: {
        border: { display: false },
        grid: { color: "#E7EEF7" },
        ticks: {
          color: "#6F7C8C",
          font: { size: 11 },
          callback: (value: any) => {
            if (value >= 1000000) return `${value / 1000000}M`;
            if (value >= 1000) return `${value / 1000}k`;
            return value;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-[20px] p-6 border border-border shadow-xs h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Biểu Đồ Doanh Thu</h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi doanh thu theo thời gian thực
          </p>
        </div>
        <div className="flex bg-background p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            onClick={() => setPeriod("month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === "month"
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            30 Ngày
          </button>
          <button
            onClick={() => setPeriod("year")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              period === "year"
                ? "bg-primary text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            12 Tháng
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-background rounded-xl">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}
