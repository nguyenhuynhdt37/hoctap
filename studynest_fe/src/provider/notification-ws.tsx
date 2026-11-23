"use client";

import { useAuthReady } from "@/hooks/auth/useAuthedSWR";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import type { Notification } from "@/types/user/notification";
import { useEffect } from "react";

interface NotificationWSData {
  type: string;
  data: Notification;
}

export function NotificationWS({ role_name }: { role_name: string }) {
  const ready = useAuthReady();
  const userId = useUserStore((state) => {
    const user = state.user;
    return user && !user.is_banned && user.roles?.includes(role_name) ? user.id : null;
  });
  const add = useRealtimeNotiStore((state) => state.add);

  useEffect(() => {
    if (!ready || !userId) return;

    let active = true;
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    function reconnect() {
      if (!active) return;
      retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 12_000));
    }

    async function connect() {
      if (!active) return;
      try {
        const next = await connectWebSocket(
          "/api/v1/notifications/ws/notifications",
          role_name,
          (event: NotificationWSData) => {
            if (active && useUserStore.getState().user?.id === userId &&
                event?.type === "notification.created" && event.data) {
              add(role_name, event.data);
            }
          },
        );
        if (!active) {
          next.close(1000);
          return;
        }
        socket = next;
        const connectedAt = Date.now();
        socket.onclose = (event) => {
          socket = undefined;
          if (event.code === 1000) return;
          if (Date.now() - connectedAt >= 12_000) attempts = 0;
          reconnect();
        };
      } catch {
        reconnect();
      }
    }

    void connect();
    return () => {
      active = false;
      clearTimeout(retry);
      socket?.close(1000);
    };
  }, [ready, userId, role_name, add]);

  return null;
}
