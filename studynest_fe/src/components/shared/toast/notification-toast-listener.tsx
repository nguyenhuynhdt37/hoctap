"use client";

import { useRealtimeNotiStore } from "@/stores/notifications";
import { Notification } from "@/types/user/notification";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Bell } from "lucide-react";

export function NotificationToastListener() {
  const buckets = useRealtimeNotiStore((s) => s.buckets);
  const activeRole = useRealtimeNotiStore((s) => s.activeRole);
  const prevNotificationsRef = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!activeRole) return;

    const bucket = buckets[activeRole];
    if (!bucket || bucket.top10.length === 0) return;

    // Khởi tạo set cho role nếu chưa có
    if (!prevNotificationsRef.current[activeRole]) {
      prevNotificationsRef.current[activeRole] = new Set();
      // Lưu các notification hiện có để không hiển thị lại
      bucket.top10.forEach((noti) => {
        prevNotificationsRef.current[activeRole].add(noti.id);
      });
      return;
    }

    // Tìm notification mới (chưa có trong prevNotifications)
    const prevSet = prevNotificationsRef.current[activeRole];
    const newNotifications = bucket.top10.filter(
      (noti) => !prevSet.has(noti.id)
    );

    // Hiển thị toast cho mỗi notification mới
    newNotifications.forEach((noti: Notification) => {
      prevSet.add(noti.id);

      toast(
        (t) => (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-teal-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm mb-1">
                {noti.title}
              </p>
              <p className="text-gray-600 text-sm line-clamp-2">
                {noti.content}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Đóng thông báo"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: "#fff",
            color: "#1f2937",
            borderRadius: "0.75rem",
            padding: "1rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e5e7eb",
            borderLeft: "4px solid #00bba7",
            maxWidth: "420px",
            fontSize: "0.875rem",
          },
        }
      );
    });
  }, [buckets, activeRole]);

  return null;
}

