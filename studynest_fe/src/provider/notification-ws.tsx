"use client";

import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { useRealtimeNotiStore } from "@/stores/notifications";
import { useUserStore } from "@/stores/user";
import { Notification } from "@/types/user/notification";
import { useEffect, useLayoutEffect, useRef } from "react";

interface NotificationWSProps {
  accessToken: string | null;
  role_name: string;
}

interface NotificationWSData {
  type: string;
  data: Notification;
}

export function NotificationWS({
  accessToken,
  role_name,
}: NotificationWSProps) {
  const userId = useUserStore((s) => s.user?.id ?? null);
  const add = useRealtimeNotiStore((s) => s.add);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const isClosing = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount - useLayoutEffect để cleanup đồng bộ trước khi React cleanup
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isClosing.current = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Component unmounting");
        } catch {}
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // ❌ Không có user hoặc token → đóng WS
    if (!userId || !accessToken) {
      isClosing.current = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.close(1000);
        } catch {}
        wsRef.current = null;
      }

      return;
    }

    isClosing.current = false;
    attempts.current = 0;

    const endpoint = `/api/v1/notifications/ws/notifications`;

    const connect = async () => {
      if (wsRef.current || !mountedRef.current || isClosing.current) return; // tránh double connect

      try {
        const ws = await connectWebSocket(
          endpoint,
          accessToken,
          role_name,
          (data: NotificationWSData) => {
            if (!mountedRef.current || isClosing.current) return;
            console.log("data notification-ws", data);
            if (!data) return;
            if (data.type === "notification.created") {
              add(role_name, data.data);
            }
          },
          () => {
            wsRef.current = null;
            if (isClosing.current || !mountedRef.current) return;

            const timeout = Math.min(1000 * 2 ** attempts.current, 12000);
            attempts.current++;

            reconnectTimer.current = setTimeout(() => {
              if (mountedRef.current && !isClosing.current) {
                connect();
              }
            }, timeout);
          }
        );

        if (!mountedRef.current || isClosing.current) {
          try {
            ws.close(1000, "Component unmounting");
          } catch {}
          return;
        }

        wsRef.current = ws;
        attempts.current = 0;
      } catch (err) {
        if (isClosing.current || !mountedRef.current) return;

        const timeout = Math.min(1000 * 2 ** attempts.current, 12000);
        attempts.current++;

        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current && !isClosing.current) {
            connect();
          }
        }, timeout);
      }
    };

    connect();

    return () => {
      isClosing.current = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Effect cleanup");
        } catch {}
        wsRef.current = null;
      }
    };
  }, [userId, accessToken, role_name, add]);

  return null;
}
