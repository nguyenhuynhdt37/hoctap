export async function connectWebSocket(
  endpoint: string, // ví dụ: "/api/v1/learning/ws/comments/abc123"
  token?: string, // JWT hoặc null nếu public
  role_name?: string | null,
  onMessage?: (data: any, ws: WebSocket) => void,
  onClose?: (event: CloseEvent) => void
): Promise<WebSocket> {
  const base = process.env.NEXT_PUBLIC_URL_BACKEND_WS || "ws://127.0.0.1:8000";

  // ✅ Ghép URL chính xác
  const wsUrl =
    token && role_name
      ? `${base}${endpoint}?access_token=${encodeURIComponent(
          token
        )}&role_name=${encodeURIComponent(role_name)}`
      : token
      ? `${base}${endpoint}?access_token=${encodeURIComponent(token)}`
      : `${base}${endpoint}`;

  console.log("🔌 Connecting WebSocket:", wsUrl);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected:", endpoint);
      resolve(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data, ws);
      } catch (err) {
        console.error("⚠️ Parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("⚡ WebSocket error:", err);
      reject(err);
    };

    ws.onclose = (event) => {
      console.warn(
        `🔴 WS closed (${endpoint}):`,
        event.code,
        event.reason || "no reason"
      );
      onClose?.(event);
    };
  });
}
