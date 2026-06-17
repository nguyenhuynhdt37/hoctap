"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { RevenueByCategoryResponse } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#00a73d",
  "#10b981",
  "#14b8a6",
  "#059669",
  "#047857",
  "#0d9488",
  "#22c55e",
  "#34d399",
];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function CategoryPieChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: response, isLoading } = useSWR<RevenueByCategoryResponse>(
    "/admin/statistics/revenue/by-category",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const data = response?.data || [];

  const chartData = {
    labels: data.map((d) => d.category_name),
    datasets: [
      {
        data: data.map((d) => parseFloat(String(d.revenue)) || 0),
        backgroundColor: COLORS.slice(0, data.length),
        borderColor: "#fff",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        borderRadius: 8,
        callbacks: {
          label: (ctx: { raw: number; label: string }) =>
            `${ctx.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
  };

  const totalRevenue = data.reduce(
    (sum, d) => sum + (parseFloat(String(d.revenue)) || 0),
    0
  );

  if (!mounted) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 h-full">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        Doanh thu theo danh mục
      </h3>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Không có dữ liệu
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="relative h-48 w-48 mx-auto lg:mx-0 flex-shrink-0">
            <Doughnut data={chartData} options={options as any} />
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-gray-500 text-xs">Tổng</span>
              <span className="text-gray-900 font-bold text-sm">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3 max-h-48 overflow-y-auto">
            {data.map((item, idx) => (
              <div
                key={item.category_id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-700 truncate max-w-[120px]">
                    {item.category_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {(parseFloat(String(item.percentage)) || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
