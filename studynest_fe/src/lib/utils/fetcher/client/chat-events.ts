/** Decode SSE across arbitrary UTF-8/network chunk boundaries. */
export async function consumeChatEvents<T>(
  response: Pick<Response, "body" | "headers">,
  onDelta: (delta: string) => void,
): Promise<T> {
  if (!response.headers.get("content-type")?.includes("text/event-stream") || !response.body) {
    throw new Error("Máy chủ không trả về luồng chat hợp lệ.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) {
          data.push(line.slice(5).trimStart());
        } else if (line === "" && data.length) {
          const event = JSON.parse(data.join("\n"));
          data = [];
          if (event.type === "delta" && typeof event.delta === "string") onDelta(event.delta);
          else if (event.type === "done") return event.data as T;
          else if (event.type === "error") throw new Error(event.message || "Luồng chat bị gián đoạn.");
        }
      }
      if (done) throw new Error("Kết nối bị ngắt trước khi hoàn tất câu trả lời. Vui lòng thử lại.");
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
