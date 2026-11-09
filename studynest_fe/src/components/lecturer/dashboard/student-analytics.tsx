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
          "#356FA7",
          "#7BAFD4",
          "#F7C9D9",
          "#E3D5F5",
          "#F8E9C9",
          "#BFD7ED",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
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
          color: "#6F7C8C",
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: "#3D4A5A",
        padding: 12,
        borderRadius: 10,
      },
    },
    cutout: "75%",
  };

  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#E7EEF7] shadow-xs h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#3D4A5A]">Phân Tích Học Viên</h3>
        <p className="text-sm text-[#6F7C8C]">Tăng trưởng và phân bố học viên</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#E8F2FA]/70 border border-[#BFD7ED]/60 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <HiUserAdd className="text-[#356FA7]" />
            <span className="text-xs font-semibold text-[#356FA7]">
              Học viên mới
            </span>
          </div>
          <p className="text-2xl font-bold text-[#3D4A5A]">
            {data?.total_new_students ?? 0}
          </p>
        </div>
        <div className="bg-[#FCE8EF]/70 border border-[#F7C9D9]/60 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <HiUserCircle className="text-[#8A3B58]" />
            <span className="text-xs font-semibold text-[#8A3B58]">
              Đang hoạt động
            </span>
          </div>
          <p className="text-2xl font-bold text-[#3D4A5A]">
            {data?.active_students ?? 0}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F6FAFF] rounded-xl">
            <div className="w-6 h-6 border-2 border-[#356FA7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.students_by_course.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#8190A3]">
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
