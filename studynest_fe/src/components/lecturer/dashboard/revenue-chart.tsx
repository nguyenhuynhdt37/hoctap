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
        backgroundColor: "rgba(16, 185, 129, 0.1)", // Green-500 with opacity
        borderColor: "rgba(16, 185, 129, 1)", // Green-500
        tension: 0.4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "rgba(16, 185, 129, 1)",
        pointHoverBackgroundColor: "rgba(16, 185, 129, 1)",
        pointHoverBorderColor: "#fff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        borderRadius: 8,
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
        ticks: { color: "#6b7280", font: { size: 11 } },
      },
      y: {
        border: { display: false },
        grid: { color: "#f3f4f6" },
        ticks: {
          color: "#6b7280",
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
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Biểu Đồ Doanh Thu</h3>
          <p className="text-sm text-gray-500">
            Theo dõi doanh thu theo thời gian thực
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setPeriod("month")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === "month"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            30 Ngày
          </button>
          <button
            onClick={() => setPeriod("year")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              period === "year"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            12 Tháng
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}
