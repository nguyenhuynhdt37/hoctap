"use client";

import { IconBubble, Pill } from "@/components/user/home/landing-ui";
import { DeviceNotificationBanner } from "@/components/user/notifications/device-notification-banner";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { useRealtimeNotiStore } from "@/stores/notifications";
import type { Notification } from "@/types/user/notification";
import { Bell, Clock3 } from "pulsoicon-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function NotificationButton({ role }: { role: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const titleId = useId();
  const markAsRead = useRealtimeNotiStore((s) => s.markAsRead);

  const bucket = useRealtimeNotiStore((s) => s.buckets[role]);
  const top10 = bucket?.top10 ?? [];
  const unread = bucket?.unread ?? 0;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setIsOpen(false);
      if (popupRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
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
      router.push("/notifications");
    }
  };

  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <Button
        ref={buttonRef}
        variant="pastel"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full border-0 active:translate-y-0 aria-expanded:bg-primary-pastel/65 motion-reduce:transition-none"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute top-0 right-0 min-w-4 rounded-full border border-surface bg-primary px-1 py-0.5 text-[10px] leading-none font-semibold tabular-nums text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          ref={popupRef}
          id={popupId}
          role="region"
          aria-labelledby={titleId}
          className="absolute top-full right-0 z-10 mt-2.5 flex max-h-[min(28rem,calc(100dvh-6.5rem))] w-[23rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-linear-to-r from-primary-light/80 to-surface/80 px-3.5 py-3">
            <IconBubble shape="circle" className="h-9! w-9!">
              <Bell aria-hidden="true" className="size-4" />
            </IconBubble>
            <h2 id={titleId} className="min-w-0 flex-1 text-sm font-semibold text-foreground">Thông báo</h2>
            {unread > 0 && (
              <Pill className="shrink-0 rotate-2">{unread} mới</Pill>
            )}
          </div>

          <div className="pt-2">
            <DeviceNotificationBanner compact />
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {top10.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 px-5 py-9 text-center">
                <IconBubble shape="circle" className="ring-4 ring-primary-light/60">
                  <Bell aria-hidden="true" className="size-6" />
                </IconBubble>
                <p className="text-sm text-foreground">Chưa có thông báo nào</p>
              </div>
            ) : (
              <ul className="space-y-1 p-2">
                {top10.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
                        !notification.is_read && "bg-primary-light/60",
                      )}
                    >
                      <span
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full", !notification.is_read && "bg-primary")}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn(
                          "block text-sm leading-snug wrap-break-word text-foreground",
                          notification.is_read ? "font-medium" : "font-semibold",
                        )}>
                          {!notification.is_read && <span className="sr-only">Chưa đọc. </span>}
                          {notification.title}
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-relaxed wrap-break-word text-foreground">
                          {notification.content}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1 text-foreground">
                            <Clock3 aria-hidden="true" className="size-3" />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-primary-hover">
                            {getTypeLabel(notification.type)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {top10.length > 0 && (
            <div className="shrink-0 border-t border-border bg-background/80 p-2">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-semibold text-primary-hover transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none"
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
