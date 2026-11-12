import axios from "axios";
export function providerError(
  error: unknown,
  fallback = "Chưa thực hiện được. Vui lòng thử lại.",
) {
  if (!axios.isAxiosError(error)) return fallback;
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    if (
      detail.some(
        (item) => Array.isArray(item?.loc) && item.loc.includes("work_email"),
      )
    )
      return "Email cơ quan không hợp lệ. Vui lòng kiểm tra lại hoặc để trống.";
    return "Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và độ dài nội dung.";
  }
  return fallback;
}
export function providerDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
