import {
  openAuthedWebSocket,
  takeInitialWebSocketMessage,
  WebSocketConnectionError,
} from "@/lib/auth/ws";
import { getDpopSocketBase } from "@/lib/auth/http";
import { isDpopMode } from "@/lib/auth/mode";
import api from "@/lib/utils/fetcher/client/axios";

export async function connectWebSocket(
  endpoint: string,
  role_name?: string | null,
  onMessage?: (data: any, ws: WebSocket) => void,
  onClose?: (event: CloseEvent) => void,
): Promise<WebSocket> {
  const base = isDpopMode ? getDpopSocketBase() : (
    process.env.NEXT_PUBLIC_URL_BACKEND_WS || process.env.NEXT_PUBLIC_URL_BACKEND || "ws://127.0.0.1:8000"
  );
  const url = new URL(`${base.replace(/\/$/, "")}${endpoint}`);
  if (role_name) url.searchParams.set("role_name", role_name);

  let socket: WebSocket;
  try {
    socket = await openAuthedWebSocket(url.href);
  } catch (error) {
    if (isDpopMode && error instanceof WebSocketConnectionError && error.code === 4401) {
      // The close code is generic. Let Axios refresh only if HTTP reports expiry.
      await api.get("/auth/me").catch(() => undefined);
    }
    throw error;
  }

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data, socket);
    } catch {
      // Ignore malformed application frames.
    }
  };
  socket.addEventListener("message", handleMessage);
  if (onClose) socket.addEventListener("close", onClose);
  const firstMessage = takeInitialWebSocketMessage(socket);
  if (firstMessage) handleMessage(firstMessage);
  return socket;
}
