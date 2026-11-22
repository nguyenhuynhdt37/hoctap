/**
 * Trích xuất và định dạng thông báo lỗi từ API response hoặc Error object thành chuỗi an toàn.
 * Xử lý an toàn các định dạng lỗi từ FastAPI/Pydantic (array of objects { type, loc, msg, input }),
 * các object lỗi lồng nhau, axios error response hoặc JavaScript Error chuẩn.
 */
export function formatApiError(
  error: unknown,
  fallbackMessage: string = "Đã xảy ra lỗi. Vui lòng thử lại sau."
): string {
  if (!error) return fallbackMessage;

  if (typeof error === "string") return error;

  const err = error as any;

  // 1. Kiểm tra response.data.detail (FastAPI / Pydantic)
  const detail = err?.response?.data?.detail ?? err?.detail;
  if (detail) {
    if (typeof detail === "string") return detail;

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: any) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (typeof item === "object") {
            const field = Array.isArray(item.loc)
              ? item.loc.filter((part: any) => part !== "body").join(".")
              : "";
            const msg = item.msg || item.message || JSON.stringify(item);
            return field ? `${field}: ${msg}` : msg;
          }
          return String(item);
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join("; ");
      }
    } else if (typeof detail === "object") {
      if (detail.msg) {
        const field = Array.isArray(detail.loc)
          ? detail.loc.filter((part: any) => part !== "body").join(".")
          : "";
        return field ? `${field}: ${detail.msg}` : String(detail.msg);
      }
      if (detail.message) return String(detail.message);
      try {
        return JSON.stringify(detail);
      } catch {
        // Fallback
      }
    }
  }

  // 2. Kiểm tra response.data.message
  const message = err?.response?.data?.message ?? err?.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }
  if (typeof message === "object" && message !== null) {
    if (message.msg) return String(message.msg);
    if (message.message) return String(message.message);
    try {
      return JSON.stringify(message);
    } catch {
      // Fallback
    }
  }

  return fallbackMessage;
}
