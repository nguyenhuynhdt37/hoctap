"use client";

import { useRealtimeNotiStore } from "@/stores/notifications";
import { showDeviceNotification } from "@/lib/notifications/device-notifications";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { ArrowUpRight, Bell, X } from "pulsoicon-react";

const REALTIME_TOAST_DURATION_MS = 5500;

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

    // 2. Hiển thị Cloudy Glass Toast đồng bộ ở góc trên bên phải (bấm vào điều hướng tới link)
    const hasLink = Boolean(noti.url && noti.url.startsWith("/"));

    toast.custom(
      (t) => (
        <div
          role="status"
          aria-live="polite"
          className={`group relative w-[min(408px,calc(100vw-2rem))] overflow-hidden rounded-[1.25rem] border border-primary-pastel bg-gradient-to-br from-primary-light/70 via-surface/95 to-surface/95 backdrop-blur-xl shadow-[0_18px_40px_-14px_rgba(53,111,167,0.24),0_4px_12px_-4px_rgba(61,74,90,0.08)] ${
            t.visible ? "cloudy-toast-enter" : "cloudy-toast-leave"
          }`}
        >
          <div className="flex items-start gap-3 px-3.5 py-3">
            <div className="relative mt-0.5 shrink-0">
              <img
                src="/logo/maymay-app-icon-1024.png"
                alt="Mây Mây"
                className="size-10 rounded-xl border border-primary-pastel/90 object-cover shadow-2xs"
              />
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-surface bg-primary text-primary-foreground shadow-2xs">
                <Bell size={9} animated={false} aria-hidden="true" />
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                if (hasLink && noti.url) {
                  router.push(noti.url);
                }
              }}
              className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none"
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span
                  className="inline-block size-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-primary">
                  Thông báo mới
                </span>
                {hasLink && (
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary/80 transition-colors group-hover:text-primary">
                    Xem
                    <ArrowUpRight size={12} animated={false} aria-hidden="true" />
                  </span>
                )}
              </div>
              <p className="mb-0.5 line-clamp-1 text-[13.5px] font-bold text-foreground">
                {noti.title}
              </p>
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {noti.content}
              </p>
            </button>

            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="-mr-1 -mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-primary-light/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Đóng thông báo"
            >
              <X size={14} animated={false} aria-hidden="true" />
            </button>
          </div>

          <div
            className="h-[3px] w-full overflow-hidden bg-border/50"
            aria-hidden="true"
          >
            <div
              className="cloudy-toast-progress h-full w-full rounded-full bg-primary/65 group-hover:[animation-play-state:paused]"
              style={{ animationDuration: `${REALTIME_TOAST_DURATION_MS}ms` }}
            />
          </div>
        </div>
      ),
      {
        id: `realtime-noti-${noti.id}`,
        duration: REALTIME_TOAST_DURATION_MS,
      },
    );
  }, [live, router]);

  return null;
}
