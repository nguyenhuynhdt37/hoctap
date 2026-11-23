"use client";

import { useRealtimeNotiStore } from "@/stores/notifications";
import { showDeviceNotification } from "@/lib/notifications/device-notifications";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Bell, X } from "pulsoicon-react";

export function NotificationToastListener() {
  const router = useRouter();
  const live = useRealtimeNotiStore((s) => s.latestLiveNotification);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!live?.notification?.id) return;
    const noti = live.notification;
    if (seenIds.current.has(noti.id)) return;
    seenIds.current.add(noti.id);
    if (seenIds.current.size > 150) {
      const oldest = seenIds.current.values().next().value;
      if (oldest) seenIds.current.delete(oldest);
    }

    // 1. Phát thông báo gốc ra thiết bị (OS Notification Center / Desktop) nếu đã bật quyền
    void showDeviceNotification({
      id: noti.id,
      title: noti.title,
      body: noti.content,
      url: noti.url,
    });

    // 2. Hiển thị Toast nổi chuẩn Cloudy Blue trong trang web (bấm vào điều hướng tới link)
    toast(
      (t) => (
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <img
              src="/logo/maymay-app-icon-1024.png"
              alt="Mây Mây"
              className="size-10 rounded-2xl border border-primary-pastel/80 object-cover shadow-2xs"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              if (noti.url && noti.url.startsWith("/")) {
                router.push(noti.url);
              }
            }}
            className="min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none"
          >
            <p className="mb-0.5 text-sm font-bold text-foreground">
              {noti.title}
            </p>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {noti.content}
            </p>
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="shrink-0 rounded-full p-1 text-subtle-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="size-4" animated={false} aria-hidden="true" />
          </button>
        </div>
      ),
      {
        duration: 5500,
        style: {
          background: "var(--color-surface)",
          color: "var(--color-foreground)",
          borderRadius: "1.25rem",
          padding: "0.9rem 1rem",
          boxShadow: "var(--shadow-ambient-md)",
          border: "1px solid var(--color-primary-pastel)",
          borderLeft: "4px solid var(--color-primary)",
          maxWidth: "420px",
          fontSize: "0.875rem",
        },
      },
    );
  }, [live, router]);

  return null;
}
