"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { StudentAnalyticsResponse } from "@/types/lecturer/statistics";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import useSWR from "swr";
import { HiUserAdd, HiUserCircle, HiChartPie } from "react-icons/hi";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudentAnalytics() {
  const { data, isLoading } = useSWR<StudentAnalyticsResponse>(
    "/lecturer/statistics/students",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const chartData = {
    labels: data?.students_by_course.map((item) => item.course_title) || [],
    datasets: [
      {
        data: data?.students_by_course.map((item) => item.count) || [],
        backgroundColor: [
          "#10b981", // Green
          "#3b82f6", // Blue
          "#6366f1", // Indigo
          "#f59e0b", // Amber
          "#ef4444", // Red
          "#ec4899", // Pink
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          font: { size: 11 },
          color: "#4b5563",
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "#1f2937",
        padding: 12,
        borderRadius: 8,
      },
    },
    cutout: "75%",
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Phân Tích Học Viên</h3>
        <p className="text-sm text-gray-500">Tăng trưởng và phân bố học viên</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <HiUserAdd className="text-green-600" />
            <span className="text-xs font-medium text-green-700">
              Học viên mới
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data?.total_new_students ?? 0}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <HiUserCircle className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              Đang hoạt động
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data?.active_students ?? 0}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.students_by_course.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <HiChartPie className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Chưa có dữ liệu phân bố</p>
          </div>
        ) : (
          <Doughnut data={chartData} options={options} />
        )}
      </div>
    </div>
  );
}
