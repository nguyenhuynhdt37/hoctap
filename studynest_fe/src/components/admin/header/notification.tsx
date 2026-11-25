"use client";

import api from "@/lib/utils/fetcher/client/axios";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { Notification } from "@/types/user/notification";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, Clock } from "pulsoicon-react";

export function NotificationButton({ role }: { role: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const markAsRead = useRealtimeNotiStore((s) => s.markAsRead);

  const bucket = useRealtimeNotiStore((s) => s.buckets[role]);
  const top10 = bucket?.top10 ?? [];
  const unread = bucket?.unread ?? 0;

  const visibleItems = useMemo(
    () => (tab === "unread" ? top10.filter((n) => !n.is_read) : top10),
    [tab, top10],
  );

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
      wallet: "Ví & Coin",
      course: "Khóa học",
      system: "Hệ thống",
      provider: "Đối tác",
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
      } catch {
        // Ignore silent failure
      }
    }

    if (notification.url && notification.action === "open_url") {
      router.push(notification.url);
    } else {
      router.push("/admin/notifications");
    }
  };

  const handleMarkAllRead = async () => {
    const unreadItems = top10.filter((n) => !n.is_read);
    if (unreadItems.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(
        unreadItems.map(async (n) => {
          await api.post(`/notifications/read/${n.id}`);
          markAsRead(role, n.id);
        }),
      );
    } catch {
      // Ignore silent failure
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
          isOpen
            ? "border-primary bg-primary-light text-primary shadow-2xs"
            : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary"
        }`}
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-surface bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground shadow-xs">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full z-50 mt-2.5 flex max-h-[520px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface/95 shadow-[0_24px_60px_-18px_rgba(53,111,167,0.28)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="border-b border-primary-pastel/60 bg-gradient-to-r from-primary-light/85 via-surface to-accent-vanilla/45 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Thông báo</h3>
                {unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {unread} mới
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={() => void handleMarkAllRead()}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-surface/80 disabled:opacity-50"
                >
                  <CheckCheck size={13} animated={false} />
                  Đọc hết
                </button>
              )}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              {(
                [
                  ["all", `Tất cả (${top10.length})`],
                  ["unread", `Chưa đọc (${unread})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    tab === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light/70 text-primary">
                  <Bell size={20} animated={false} />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {tab === "unread"
                    ? "Bạn đã đọc hết thông báo!"
                    : "Chưa có thông báo nào"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Các cập nhật hệ thống mới nhất sẽ hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {visibleItems.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-primary-light/45 ${
                      !notification.is_read
                        ? "border-l-2 border-l-primary bg-primary-light/25"
                        : "bg-surface"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-1.5 shrink-0">
                        <span
                          className={`block h-2 w-2 rounded-full ${
                            !notification.is_read
                              ? "bg-primary"
                              : "bg-border"
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`mb-1 text-xs leading-snug ${
                            notification.is_read
                              ? "font-medium text-muted-foreground"
                              : "font-bold text-foreground"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <p className="mb-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {notification.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 text-subtle-foreground">
                            <Clock size={11} animated={false} />
                            {formatDate(notification.created_at)}
                          </span>
                          <span className="rounded-full bg-primary-light px-2 py-0.5 font-semibold text-primary">
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

          {/* Footer */}
          <div className="border-t border-border/80 bg-background/60 px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="block w-full rounded-xl py-1.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary-light/70"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
