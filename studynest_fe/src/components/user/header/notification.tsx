"use client";

import { DeviceNotificationBanner } from "@/components/user/notifications/device-notification-banner";
import {
  formatRelativeTimeVn,
  getNotificationChannel,
  normalizeChannelKey,
  type NotificationChannelKey,
} from "@/components/user/notifications/notification-meta";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { useRealtimeNotiStore } from "@/stores/notifications";
import type { Notification } from "@/types/user/notification";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Inbox,
  Radio,
} from "pulsoicon-react";

const QUICK_CHANNELS: Array<{ key: NotificationChannelKey; label: string }> = [
  { key: "", label: "Tất cả" },
  { key: "learning", label: "Học tập" },
  { key: "course", label: "Khóa học" },
  { key: "wallet", label: "Ví & Coin" },
  { key: "security", label: "Bảo mật" },
  { key: "refund", label: "Hoàn tiền" },
];

export function NotificationButton({ role }: { role: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [channelFilter, setChannelFilter] = useState<NotificationChannelKey>("");
  const [markingAll, setMarkingAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const titleId = useId();

  const markAsRead = useRealtimeNotiStore((s) => s.markAsRead);
  const markAllRead = useRealtimeNotiStore((s) => s.markAllRead);
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
      if (popupRef.current?.contains(document.activeElement)) {
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return top10.filter((item) => {
      if (tab === "unread" && item.is_read) return false;
      if (channelFilter && normalizeChannelKey(item.type) !== channelFilter) {
        return false;
      }
      return true;
    });
  }, [top10, tab, channelFilter]);

  const handleMarkSingleRead = async (
    e: React.MouseEvent,
    notification: Notification,
  ) => {
    e.stopPropagation();
    if (notification.is_read || busyId === notification.id) return;
    setBusyId(notification.id);
    try {
      await api.post(`/notifications/read/${notification.id}`);
      markAsRead(role, notification.id);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      showToast.error("Không thể cập nhật trạng thái thông báo.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unread <= 0) return;
    setMarkingAll(true);
    try {
      const endpoint =
        role === "LECTURER"
          ? "/notifications/read-all/lecturer"
          : role === "ADMIN"
            ? "/notifications/read-all/admin"
            : "/notifications/read-all/user";
      await api.post(endpoint);
      markAllRead(role);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch {
      showToast.error("Không thể đánh dấu tất cả lúc này.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    setIsOpen(false);

    if (!notification.is_read) {
      try {
        await api.post(`/notifications/read/${notification.id}`);
        markAsRead(role, notification.id);
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        // Không chặn điều hướng nếu đánh dấu đọc lỗi tạm thời
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
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsOpen(false);
        }
      }}
    >
      <Button
        ref={buttonRef}
        variant="pastel"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "relative rounded-full border-0 active:translate-y-0 aria-expanded:bg-primary-pastel/70 motion-reduce:transition-none",
          unread > 0 && "ring-2 ring-primary/20",
        )}
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
      >
        {unread > 0 ? (
          <BellRing aria-hidden="true" className="size-5 text-primary" />
        ) : (
          <Bell aria-hidden="true" className="size-5" />
        )}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-4.5 rounded-full border-2 border-surface bg-primary px-1 py-0.5 text-[10px] leading-none font-bold tabular-nums text-primary-foreground shadow-2xs"
          >
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
          className="absolute top-full right-0 z-50 mt-2.5 flex max-h-[min(34rem,calc(100dvh-5.5rem))] w-[min(26.5rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl"
        >
          {/* Header Cloudy Blue Pastel sáng thoáng */}
          <div className="relative isolate shrink-0 overflow-hidden border-b border-border bg-gradient-to-br from-primary-light/90 via-surface to-secondary-light/45 px-4 py-4 text-foreground">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-white/75 blur-2xl"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-2xs">
                  <BellRing
                    aria-hidden="true"
                    animated={false}
                    className="size-4"
                  />
                </span>
                <div>
                  <h2
                    id={titleId}
                    className="text-sm font-bold tracking-tight text-foreground"
                  >
                    Trung tâm thông báo
                  </h2>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Radio
                      aria-hidden="true"
                      animated={false}
                      className="size-3 text-success-foreground"
                    />
                    <span>
                      {unread > 0
                        ? `${unread} tin chưa đọc · Trực tuyến`
                        : "Bạn đã đọc hết · Trực tuyến"}
                    </span>
                  </p>
                </div>
              </div>

              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={markingAll}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 py-1.5 text-[11px] font-bold text-primary shadow-2xs transition hover:bg-primary hover:text-primary-foreground disabled:opacity-60 cursor-pointer"
                >
                  <span className="inline-flex items-center">
                    <CheckCheck
                      aria-hidden="true"
                      animated={false}
                      className="size-3.5"
                    />
                  </span>
                  <span>{markingAll ? "Đang xử lý..." : "Đọc tất cả"}</span>
                </button>
              )}
            </div>

            {/* Tab Tất cả / Chưa đọc */}
            <div className="mt-3.5 flex items-center gap-1.5 rounded-full border border-border bg-surface/85 p-1">
              <button
                type="button"
                onClick={() => setTab("all")}
                className={cn(
                  "flex-1 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer",
                  tab === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Tất cả ({top10.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("unread")}
                className={cn(
                  "flex-1 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer",
                  tab === "unread"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Chưa đọc ({unread})</span>
              </button>
            </div>
          </div>

          {/* Chip lọc kênh nhanh */}
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border bg-background/70 px-3.5 py-2.5 no-scrollbar">
            {QUICK_CHANNELS.map((ch) => {
              const active = channelFilter === ch.key;
              return (
                <button
                  key={ch.key || "all"}
                  type="button"
                  onClick={() => setChannelFilter(ch.key)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
                    active
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "border border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-primary",
                  )}
                >
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>

          {/* Banner bật thông báo thiết bị (ẩn khi đã bật) */}
          <div className="pt-2">
            <DeviceNotificationBanner compact />
          </div>

          {/* Danh sách thông báo */}
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                  <Inbox
                    aria-hidden="true"
                    animated={false}
                    className="size-5"
                  />
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {tab === "unread"
                    ? "Không còn thông báo chưa đọc"
                    : "Không có thông báo trong mục này"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Mọi cập nhật mới sẽ xuất hiện trực tiếp tại đây.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {filteredItems.map((notification) => {
                  const channel = getNotificationChannel(notification.type);
                  const ChannelIcon = channel.Icon;
                  const isBusy = busyId === notification.id;

                  return (
                    <li key={notification.id} className="group relative">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => void handleNotificationClick(notification)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void handleNotificationClick(notification);
                          }
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          !notification.is_read
                            ? "border-primary-pastel/80 bg-primary-light/45 hover:bg-primary-light/75"
                            : "border-transparent bg-surface hover:border-border hover:bg-background",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs",
                            channel.iconBoxClass,
                          )}
                        >
                          <ChannelIcon
                            aria-hidden="true"
                            animated={false}
                            className="size-4"
                          />
                        </span>

                        <div className="min-w-0 flex-1 pr-6">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-xs leading-snug wrap-break-word text-foreground sm:text-[13px]",
                                notification.is_read
                                  ? "font-medium"
                                  : "font-bold",
                              )}
                            >
                              {notification.title}
                            </p>
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed wrap-break-word text-muted-foreground">
                            {notification.content}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 text-subtle-foreground">
                              <Clock
                                aria-hidden="true"
                                animated={false}
                                className="size-3"
                              />
                              <span>
                                {formatRelativeTimeVn(notification.created_at)}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                channel.badgeClass,
                              )}
                            >
                              {channel.shortLabel}
                            </span>
                          </div>
                        </div>

                        {/* Chấm chưa đọc / Nút đánh dấu đã đọc nhanh */}
                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={(e) =>
                              void handleMarkSingleRead(e, notification)
                            }
                            disabled={isBusy}
                            aria-label="Đánh dấu đã đọc"
                            title="Đánh dấu đã đọc"
                            className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full border border-transparent text-primary transition hover:border-primary-pastel hover:bg-surface cursor-pointer"
                          >
                            <span className="inline-flex items-center">
                              <Check
                                aria-hidden="true"
                                animated={false}
                                className="size-3.5"
                              />
                            </span>
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer mở toàn trang */}
          <div className="shrink-0 border-t border-border bg-background/85 p-2.5">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-2xl bg-primary-light px-3 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              <span>Mở toàn bộ trung tâm thông báo</span>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
