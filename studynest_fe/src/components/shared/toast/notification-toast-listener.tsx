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

    if (!prevNotificationsRef.current[activeRole]) {
      prevNotificationsRef.current[activeRole] = new Set();
      bucket.top10.forEach((noti) => {
        prevNotificationsRef.current[activeRole].add(noti.id);
      });
      return;
    }

    const prevSet = prevNotificationsRef.current[activeRole];
    const newNotifications = bucket.top10.filter(
      (noti) => !prevSet.has(noti.id)
    );

    newNotifications.forEach((noti: Notification) => {
      prevSet.add(noti.id);

      toast(
        (t) => (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm mb-1">
                {noti.title}
              </p>
              <p className="text-muted-foreground text-sm line-clamp-2">
                {noti.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 rounded-md p-0.5 text-subtle-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
            background: "var(--color-surface)",
            color: "var(--color-foreground)",
            borderRadius: "1rem",
            padding: "1rem",
            boxShadow: "var(--shadow-ambient-md)",
            border: "1px solid var(--color-border)",
            borderLeft: "4px solid var(--color-primary)",
            maxWidth: "420px",
            fontSize: "0.875rem",
          },
        }
      );
    });
  }, [buckets, activeRole]);

  return null;
}
