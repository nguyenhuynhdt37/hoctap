"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { ActivityStatsResponse } from "@/types/admin/statistics";
import {
  HiEye,
  HiCheckCircle,
  HiChat,
  HiPencil,
  HiClipboardCheck,
} from "react-icons/hi";
import useSWR from "swr";

export default function ActivityStats() {
  const { data, isLoading } = useSWR<ActivityStatsResponse>(
    "/admin/statistics/activity?period=month",
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const activities = [
    {
      title: "Lượt xem bài học",
      value: data?.lesson_views ?? 0,
      icon: HiEye,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Hoàn thành bài học",
      value: data?.lesson_completions ?? 0,
      icon: HiCheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Bình luận",
      value: data?.comments ?? 0,
      icon: HiChat,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Ghi chú tạo mới",
      value: data?.notes_created ?? 0,
      icon: HiPencil,
      color: "text-green-700",
      bg: "bg-green-100",
    },
    {
      title: "Lượt làm quiz",
      value: data?.quiz_attempts ?? 0,
      icon: HiClipboardCheck,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Hoạt động</h3>

      <div className="space-y-3">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-xl ${activity.bg} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${activity.color}`} />
                <span className="text-gray-700 text-sm font-medium">
                  {activity.title}
                </span>
              </div>
              <span className={`font-bold ${activity.color}`}>
                {activity.value.toLocaleString("vi-VN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
