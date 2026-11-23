import { authedFetch } from "./axios";
import { consumeChatEvents } from "./chat-events";

export async function postChatStream<T>(
  path: string, body: unknown, onDelta: (delta: string) => void, signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 180000);
  const send = () => authedFetch(`/api${path}`, {
    method: "POST", signal: controller.signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ ...(body as object), stream: true }),
  });
  try {
    const response = await send();
    if (!response.ok) {
      throw Object.assign(new Error("Không gửi được tin nhắn."), { response: { status: response.status } });
    }
    return await consumeChatEvents<T>(response, onDelta);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
