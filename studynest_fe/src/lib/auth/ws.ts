import { createDpopProof } from "@/lib/auth/dpop";
import { getDpopSocketTarget } from "@/lib/auth/http";
import { isDpopMode } from "@/lib/auth/mode";
import { getAccessToken } from "@/lib/auth/session";

const connectTimeoutMs = 15_000;
const initialMessages = new WeakMap<WebSocket, MessageEvent>();

export class WebSocketConnectionError extends Error {
  constructor(readonly code?: number) {
    super(code === 4401 ? "Phiên WebSocket chưa được xác thực." : "Không kết nối được WebSocket.");
    this.name = "WebSocketConnectionError";
  }
}

// The first media frame can arrive before the caller attaches its handlers.
export function takeInitialWebSocketMessage(socket: WebSocket): MessageEvent | undefined {
  const message = initialMessages.get(socket);
  initialMessages.delete(socket);
  return message;
}

function isLegacyMediaReady(socket: WebSocket, path: string, frame: Record<string, unknown>): boolean {
  if (frame.type !== "ready") return false;
  // Both media endpoints emit this control frame only after authorizing the session.
  if (socket.protocol === "studynest-dictation" && path.endsWith("/api/v1/agent/dictation")) {
    return frame.sample_rate === 16000 && typeof frame.max_seconds === "number";
  }
  return socket.protocol === "studynest-voice" &&
    /\/api\/v1\/tutor-chat\/(?:lessons\/[^/]+\/)?voice$/.test(path) &&
    typeof frame.thread_id === "string" && typeof frame.can_read_lesson === "boolean";
}

export async function openAuthedWebSocket(
  url: string,
  opts?: { protocols?: string | string[] },
): Promise<WebSocket> {
  let socketUrl: URL;
  try {
    socketUrl = new URL(url);
  } catch {
    throw new WebSocketConnectionError();
  }
  if (socketUrl.protocol === "https:") socketUrl.protocol = "wss:";
  if (socketUrl.protocol === "http:") socketUrl.protocol = "ws:";
  if (
    !["ws:", "wss:"].includes(socketUrl.protocol) ||
    socketUrl.username || socketUrl.password ||
    [...socketUrl.searchParams.keys()].some(
      (key) => /^(token|access_token|refresh_token|authorization|dpop|ticket)$/i.test(key),
    )
  ) {
    throw new WebSocketConnectionError();
  }
  socketUrl.hash = "";

  const protocols = typeof opts?.protocols === "string" ? [opts.protocols] : opts?.protocols;
  let accessToken: string | null = null;
  let authFrame: string | undefined;
  if (isDpopMode) {
    const target = getDpopSocketTarget(socketUrl);
    if (!target || protocols?.some((protocol) => /^(ticket|bearer)\./i.test(protocol))) {
      throw new WebSocketConnectionError();
    }
    accessToken = getAccessToken();
    if (!accessToken) throw new WebSocketConnectionError(4401);
    const dpop = await createDpopProof({ method: "GET", url: target, accessToken });
    if (getAccessToken() !== accessToken) throw new WebSocketConnectionError(4401);
    authFrame = JSON.stringify({ type: "auth", token: accessToken, dpop });
  }

  return new Promise<WebSocket>((resolve, reject) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(socketUrl, protocols);
    } catch {
      reject(new WebSocketConnectionError());
      return;
    }
    let timer = setTimeout(fail, connectTimeoutMs);
    let awaitingAck = false;

    function cleanup() {
      clearTimeout(timer);
      authFrame = undefined;
      accessToken = null;
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
    }

    function finish() {
      if (socket.readyState !== WebSocket.OPEN) return;
      cleanup();
      resolve(socket);
    }

    function fail(code?: number) {
      cleanup();
      socket.close();
      reject(new WebSocketConnectionError(code));
    }

    function onClose(event: CloseEvent) {
      cleanup();
      reject(new WebSocketConnectionError(event.code));
    }

    function onMessage(event: MessageEvent) {
      if (!awaitingAck || typeof event.data !== "string") return;
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!frame || typeof frame !== "object") return;
      if (frame.type === "auth_ok") {
        finish();
      } else if (isLegacyMediaReady(socket, socketUrl.pathname, frame)) {
        initialMessages.set(socket, event);
        finish();
      }
    }

    function onOpen() {
      if (authFrame === undefined) {
        finish();
        return;
      }
      try {
        if (getAccessToken() !== accessToken) {
          fail(4401);
          return;
        }
        awaitingAck = true;
        socket.send(authFrame);
      } catch {
        fail();
        return;
      } finally {
        authFrame = undefined;
        accessToken = null;
      }
      clearTimeout(timer);
      timer = setTimeout(fail, connectTimeoutMs);
    }

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
  });
}
