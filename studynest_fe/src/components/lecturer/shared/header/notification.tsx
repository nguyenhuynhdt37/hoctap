"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { Notification } from "@/types/user/notification";

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
      provider: "Đơn vị cung cấp",
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
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl hover:bg-primary-light/70 text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Thông báo giảng viên"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-surface shadow-2xs">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-border rounded-[20px] shadow-ambient-lg z-50 max-h-[500px] flex flex-col overflow-hidden"
        >
          <div className="px-4 py-3.5 border-b border-border bg-gradient-to-r from-primary-light/60 to-secondary-light/40">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Thông báo</span>
              {unread > 0 && (
                <Badge variant="primary" size="sm">
                  {unread} mới
                </Badge>
              )}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {top10.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Chưa có thông báo nào
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Các cập nhật mới về khóa học và học viên sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {top10.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-primary-light/40 transition-colors cursor-pointer ${
                      !notification.is_read
                        ? "bg-primary-light/25 border-l-2 border-l-primary"
                        : "bg-surface"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-1.5 flex-shrink-0 w-2">
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm mb-1 leading-snug ${
                            notification.is_read
                              ? "font-medium text-muted-foreground"
                              : "font-semibold text-foreground"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p
                          className={`text-xs mb-2 line-clamp-2 leading-relaxed ${
                            notification.is_read
                              ? "text-subtle-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] text-subtle-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="text-[11px] text-subtle-foreground">
                            •
                          </span>
                          <Badge variant="default" size="sm" className="text-[10px]">
                            {getTypeLabel(notification.type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {top10.length > 0 && (
            <div className="border-t border-border px-4 py-3 bg-background/60">
              <Link
                href="/lecturer/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-primary hover:text-primary-hover font-semibold text-xs transition-colors"
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
