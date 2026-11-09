"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { RevenueByCategoryResponse } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#356FA7",
  "#7BAFD4",
  "#F7C9D9",
  "#E3D5F5",
  "#F8E9C9",
  "#BFD7ED",
  "#598EC2",
  "#D9A7BC",
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
        borderColor: "#ffffff",
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
        backgroundColor: "#3D4A5A",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        borderRadius: 10,
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
    <div className="bg-white rounded-[20px] shadow-xs border border-[#E7EEF7] p-6 h-full">
      <h3 className="text-lg font-semibold text-[#3D4A5A] mb-6">
        Doanh thu theo danh mục
      </h3>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#356FA7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-[#6F7C8C]">
          Không có dữ liệu
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <div className="relative h-48 w-48 mx-auto lg:mx-0 flex-shrink-0">
            <Doughnut data={chartData} options={options as any} />
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[#6F7C8C] text-xs">Tổng</span>
              <span className="text-[#3D4A5A] font-bold text-sm">
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
                  <span className="text-sm text-[#6F7C8C] truncate max-w-[120px]">
                    {item.category_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-[#3D4A5A]">
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
