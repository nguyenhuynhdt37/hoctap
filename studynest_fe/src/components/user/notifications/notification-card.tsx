"use client";

import { cn } from "@/lib/utils";
import type { Notification } from "@/types/user/notification";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Globe,
  Mail,
  MailOpen,
  Monitor,
  Smartphone,
  Trash2,
} from "pulsoicon-react";
import {
  formatExactTimeVn,
  formatRelativeTimeVn,
  getNotificationActionLabel,
  getNotificationChannel,
  parseSecuritySession,
} from "./notification-meta";

interface NotificationCardProps {
  notification: Notification;
  isBusy?: boolean;
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationCard({
  notification,
  isBusy = false,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}: NotificationCardProps) {
  const isRead = notification.is_read;
  const channel = getNotificationChannel(notification.type);
  const ChannelIcon = channel.Icon;
  const sessionInfo = parseSecuritySession(notification);
  const actionLabel = getNotificationActionLabel(notification);

  const handleOpen = () => {
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-4 transition-all duration-200 sm:p-5",
        isRead
          ? "border-border bg-surface hover:border-primary-pastel/80 hover:shadow-xs"
          : "border-primary-pastel bg-gradient-to-r from-primary-light/55 via-surface to-surface shadow-2xs hover:border-primary hover:shadow-sm",
        isBusy && "pointer-events-none opacity-60",
      )}
    >
      {/* Dải nhấn trái cho thông báo chưa đọc */}
      {!isRead && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-3 left-0 w-1 rounded-r-full",
            channel.accentBarClass,
          )}
        />
      )}

      <div className="flex items-start gap-3.5">
        {/* Icon kênh */}
        <span
          className={cn(
            "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-transform duration-200 group-hover:scale-105",
            channel.iconBoxClass,
          )}
        >
          <ChannelIcon
            aria-hidden="true"
            animated={false}
            className="size-5"
          />
        </span>

        {/* Nội dung chính */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {!isRead && (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary"
                    title="Chưa đọc"
                  />
                )}
                <h3
                  className={cn(
                    "text-sm leading-snug text-foreground sm:text-[15px]",
                    isRead ? "font-semibold" : "font-bold",
                  )}
                >
                  {notification.title}
                </h3>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    channel.badgeClass,
                  )}
                >
                  {channel.shortLabel}
                </span>
              </div>

              <p
                className={cn(
                  "mt-1.5 text-xs leading-relaxed sm:text-sm",
                  isRead ? "text-muted-foreground" : "text-foreground/90",
                )}
              >
                {notification.content}
              </p>
            </div>

            {/* Cụm nút thao tác nhanh */}
            <div className="flex shrink-0 items-center gap-1">
              {isRead ? (
                onMarkAsUnread && (
                  <button
                    type="button"
                    onClick={() => onMarkAsUnread(notification.id)}
                    aria-label="Đánh dấu chưa đọc"
                    title="Đánh dấu chưa đọc"
                    className="flex size-8 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition hover:border-primary-pastel hover:bg-primary-light hover:text-primary cursor-pointer"
                  >
                    <Mail
                      aria-hidden="true"
                      animated={false}
                      className="size-4"
                    />
                  </button>
                )
              ) : (
                onMarkAsRead && (
                  <button
                    type="button"
                    onClick={() => onMarkAsRead(notification.id)}
                    aria-label="Đánh dấu đã đọc"
                    title="Đánh dấu đã đọc"
                    className="flex size-8 items-center justify-center rounded-xl border border-primary-pastel/70 bg-surface text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    <MailOpen
                      aria-hidden="true"
                      animated={false}
                      className="size-4"
                    />
                  </button>
                )
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(notification.id)}
                  aria-label="Xóa thông báo"
                  title="Xóa thông báo"
                  className="flex size-8 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition hover:border-destructive-border hover:bg-destructive-bg hover:text-destructive-foreground cursor-pointer"
                >
                  <Trash2
                    aria-hidden="true"
                    animated={false}
                    className="size-4"
                  />
                </button>
              )}
            </div>
          </div>

          {/* Rich Metadata cho thông báo Bảo mật (phiên đăng nhập) */}
          {sessionInfo && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-secondary-pastel/70 bg-secondary-light/35 px-3 py-2 text-[11px] font-medium text-secondary-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5">
                {sessionInfo.isMobile ? (
                  <Smartphone
                    aria-hidden="true"
                    animated={false}
                    className="size-3"
                  />
                ) : (
                  <Monitor
                    aria-hidden="true"
                    animated={false}
                    className="size-3"
                  />
                )}
                <span>{sessionInfo.deviceLabel}</span>
              </span>
              {sessionInfo.browserLabel && (
                <span className="rounded-full bg-surface/90 px-2.5 py-0.5">
                  Trình duyệt: {sessionInfo.browserLabel}
                </span>
              )}
              {sessionInfo.ipAddress && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 font-mono">
                  <Globe
                    aria-hidden="true"
                    animated={false}
                    className="size-3"
                  />
                  <span>{sessionInfo.ipAddress}</span>
                </span>
              )}
              {sessionInfo.methodLabel && (
                <span className="rounded-full bg-surface/90 px-2.5 py-0.5">
                  Qua {sessionInfo.methodLabel}
                </span>
              )}
            </div>
          )}

          {/* Footer: Thời gian + Nút CTA ngữ cảnh */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-[11px] text-subtle-foreground tabular-nums">
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock
                  aria-hidden="true"
                  animated={false}
                  className="size-3"
                />
                <span>{formatRelativeTimeVn(notification.created_at)}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatExactTimeVn(notification.created_at)}</span>
            </div>

            {notification.url && actionLabel && (
              <Link
                href={notification.url}
                onClick={handleOpen}
                className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
