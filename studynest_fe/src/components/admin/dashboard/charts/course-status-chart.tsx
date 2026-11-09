"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { CourseStatsResponse } from "@/types/admin/statistics";
import { useState, useEffect } from "react";
import useSWR from "swr";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CourseStatusChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useSWR<CourseStatsResponse>(
    "/admin/statistics/courses",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const statusData = {
    labels: ["Đã xuất bản", "Bản nháp", "Lưu trữ"],
    datasets: [
      {
        data: data
          ? [
              data.by_status?.published ?? 0,
              data.by_status?.draft ?? 0,
              data.by_status?.archived ?? 0,
            ]
          : [0, 0, 0],
        backgroundColor: ["#356FA7", "#F8E9C9", "#BFD7ED"],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const levelData = {
    labels: ["Cơ bản", "Trung cấp", "Nâng cao", "Tất cả"],
    datasets: [
      {
        data: data
          ? [
              data.by_level?.beginner ?? 0,
              data.by_level?.intermediate ?? 0,
              data.by_level?.advanced ?? 0,
              data.by_level?.all ?? 0,
            ]
          : [0, 0, 0, 0],
        backgroundColor: ["#7BAFD4", "#356FA7", "#F7C9D9", "#E3D5F5"],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#3D4A5A", padding: 12, borderRadius: 10 },
    },
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-[20px] shadow-xs border border-[#E7EEF7] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#3D4A5A]">Thống kê khóa học</h3>
        {data && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#356FA7]">
              {data.total ?? 0}
            </p>
            <p className="text-[#6F7C8C] text-sm">Tổng khóa học</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#356FA7] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Status Pie */}
          <div>
            <p className="text-sm font-medium text-[#6F7C8C] mb-3 text-center">
              Theo trạng thái
            </p>
            <div className="h-32 relative">
              <Pie data={statusData} options={options as any} />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#356FA7]" />
                  Xuất bản
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_status?.published ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F8E9C9] border border-[#E6B84D]" />
                  Bản nháp
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_status?.draft ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#BFD7ED]" />
                  Lưu trữ
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_status?.archived ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Level Pie */}
          <div>
            <p className="text-sm font-medium text-[#6F7C8C] mb-3 text-center">
              Theo cấp độ
            </p>
            <div className="h-32 relative">
              <Pie data={levelData} options={options as any} />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7BAFD4]" />
                  Cơ bản
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_level?.beginner ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#356FA7]" />
                  Trung cấp
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_level?.intermediate ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#6F7C8C]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F7C9D9]" />
                  Nâng cao
                </span>
                <span className="font-medium text-[#3D4A5A]">
                  {data?.by_level?.advanced ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Stats */}
      {data && (
        <div className="mt-6 pt-4 border-t border-[#E7EEF7] grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#356FA7]">
              {(data.avg_rating ?? 0).toFixed(1)}
              <span className="text-[#D99B26] ml-1">★</span>
            </p>
            <p className="text-[#6F7C8C] text-xs">Đánh giá TB</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#356FA7]">
              {(data.total_enrollments ?? 0).toLocaleString("vi-VN")}
            </p>
            <p className="text-[#6F7C8C] text-xs">Lượt đăng ký</p>
          </div>
        </div>
      )}
    </div>
  );
}
