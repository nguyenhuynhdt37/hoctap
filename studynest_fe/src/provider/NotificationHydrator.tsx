"use client";

import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import { isDpopMode } from "@/lib/auth/mode";
import type { AuthRole } from "@/lib/auth/routes";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import type { NotificationsResponse } from "@/types/user/notification";
import { useEffect, useRef } from "react";

export function InitRealtimeNoti({
  role,
  notifications,
}: {
  role: string;
  notifications: NotificationsResponse | undefined | null;
}) {
  const userId = useUserStore((state) => state.user?.id);
  const previous = useRef<{ userId: string; role: string; newest: string | undefined }>(null);
  const init = useRealtimeNotiStore((state) => state.init);
  useEffect(() => {
    if (role && userId) init(role, userId);
  }, [role, userId, init]);

  useEffect(() => {
    if (!role || !userId || !Array.isArray(notifications?.items)) return;
    const { add, hydrate } = useRealtimeNotiStore.getState();
    const newest = notifications.items[0];
    const last = previous.current;
    if (!isDpopMode && last?.userId === userId && last.role === role &&
        newest && !newest.is_read && (!last.newest || newest.created_at > last.newest)) {
      add(role, newest);
    }
    previous.current = { userId, role, newest: newest?.created_at };
    hydrate(role, notifications.items, notifications.unread ?? 0);
  }, [role, userId, notifications]);

  return null;
}

export function RoleNotificationsBootstrap({ role }: { role: AuthRole }) {
  const hasUser = useUserStore((state) => Boolean(
    state.user && (role === "USER" || state.user.roles?.includes(role))
  ));
  const limit = role === "ADMIN" ? 20 : 10;
  const path = hasUser
    ? `/notifications/${role.toLowerCase()}?limit=${limit}&page=1&sort_by=created_at&order_dir=desc`
    : null;
  const { data } = useAuthedSWR<NotificationsResponse>(path, {
    revalidateOnFocus: !isDpopMode,
    refreshInterval: isDpopMode ? 0 : 15_000,
  });

  return <InitRealtimeNoti role={role} notifications={data} />;
}

export function UserNotificationsBootstrap() {
  return <RoleNotificationsBootstrap role="USER" />;
}
