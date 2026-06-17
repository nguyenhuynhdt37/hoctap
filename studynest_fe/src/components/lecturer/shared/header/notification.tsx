"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { Notification } from "@/types/user/notification";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiBell, HiClock } from "react-icons/hi";

export function NotificationButton({ role }: { role: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const markAsRead = useRealtimeNotiStore((s) => s.markAsRead);

  const bucket = useRealtimeNotiStore((s) => s.buckets[role]);
  const top10 = bucket?.top10 ?? [];
  const unread = bucket?.unread ?? 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wallet: "Ví",
      course: "Khóa học",
      system: "Hệ thống",
      learning: "Học tập",
    };
    return labels[type] || type;
  };

  const handleNotificationClick = async (notification: Notification) => {
    setIsOpen(false);

    if (!notification.is_read) {
      try {
        await api.post(`/notifications/read/${notification.id}`);
        markAsRead(role, notification.id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    if (notification.url && notification.action === "open_url") {
      router.push(notification.url);
    } else {
      router.push("/lecturer/notifications");
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-green-50 transition-colors"
        aria-label="Thông báo"
      >
        <HiBell className="h-6 w-6 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-green-100 rounded-xl shadow-2xl z-50 max-h-[500px] flex flex-col overflow-hidden"
        >
          <div className="p-4 border-b-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 className="font-semibold text-gray-900 flex items-center justify-between">
              <span>Thông báo</span>
              {unread > 0 && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  {unread} mới
                </span>
              )}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {top10.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <HiBell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {top10.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors ${
                      !notification.is_read
                        ? "bg-green-50/30 border-l-2 border-l-green-500"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-medium mb-1.5 leading-snug ${
                            notification.is_read
                              ? "text-gray-600"
                              : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p
                          className={`text-xs mb-2 line-clamp-2 leading-relaxed ${
                            notification.is_read
                              ? "text-gray-500"
                              : "text-gray-700"
                          }`}
                        >
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <HiClock className="h-3 w-3" />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-green-600 font-medium">
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {top10.length > 0 && (
            <div className="border-t-2 border-green-100 px-4 py-3 bg-gray-50">
              <Link
                href="/lecturer/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
              >
                Xem tất cả thông báo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
