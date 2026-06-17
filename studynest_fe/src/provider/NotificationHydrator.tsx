"use client";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { NotificationsResponse } from "@/types/user/notification";
import { useEffect, useRef } from "react";

export function InitRealtimeNoti({
  role,
  notifications,
}: {
  role: string;
  notifications: NotificationsResponse | undefined | null;
}) {
  const { init, hydrate } = useRealtimeNotiStore((s) => s);
  const user = useUserStore((s) => s.user ?? null);
  const hasInited = useRef(false);

  // Init bucket trước, chỉ 1 lần
  useEffect(() => {
    if (role && user?.id && !hasInited.current) {
      init(role, user.id);
      hasInited.current = true;
    }
  }, [role, user?.id, init]);

  // Hydrate data sau khi đã init
  useEffect(() => {
    if (
      role &&
      notifications &&
      Array.isArray(notifications.items) &&
      hasInited.current
    ) {
      console.log("Hydrating notifications:", {
        role,
        itemsCount: notifications.items.length,
        unread: notifications.unread,
      });
      hydrate(role, notifications.items, notifications.unread ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, notifications, hasInited.current]);

  return null;
}
