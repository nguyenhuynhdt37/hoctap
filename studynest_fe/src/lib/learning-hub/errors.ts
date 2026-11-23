import { isAxiosError } from "axios";
import { coinCopy } from "./shop-logic";

export const unavailableMessage = "Tính năng này đang được cập nhật";

export function hubHttpStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status ?? error.status : undefined;
}

export function isHubUnavailable(error: unknown) {
  const status = hubHttpStatus(error);
  return status === 404 || status === 501;
}

export function hubErrorMessage(error: unknown, fallback: string) {
  if (isHubUnavailable(error)) return unavailableMessage;
  if (!isAxiosError(error)) return fallback;
  const status = error.response?.status ?? error.status;
  if (!status) return "Không thể kết nối tới máy chủ. Bạn kiểm tra kết nối rồi thử lại nhé.";
  if (status >= 500) return "Máy chủ đang gặp sự cố. Bạn thử lại nhé.";
  const detail = error.response?.data?.detail;
  if (status === 422 && Array.isArray(detail)) {
    const message = detail.find((entry) => typeof entry?.msg === "string")?.msg;
    if (message) return coinCopy(message);
  }
  if (typeof detail === "string" && detail.trim()) return coinCopy(detail);
  return typeof detail?.message === "string" ? coinCopy(detail.message) : fallback;
}
