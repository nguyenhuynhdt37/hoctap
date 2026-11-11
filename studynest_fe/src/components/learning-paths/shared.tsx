"use client";
import axios from "axios";
import api from "@/lib/utils/fetcher/client/axios";
import { Button } from "@/components/ui";
export const fetchLearning = <T,>(url: string) =>
  api.get<T>(url, { timeout: 15000 }).then((r) => r.data);
export const price = (amount: number | string, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "VND",
    maximumFractionDigits: 2,
  }).format(Number(amount));
export const control =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
export function message(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
      return detail
        .map((x: { msg?: string }) => x.msg ?? "Dữ liệu không hợp lệ")
        .join("; ");
  }
  return "Chưa thực hiện được. Vui lòng thử lại.";
}
export function LoadError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-2xl border border-destructive-border bg-destructive-bg p-5 text-destructive-foreground"
    >
      <p>{message(error)}</p>
      <Button variant="outline" onClick={retry}>
        Thử lại
      </Button>
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-2xl bg-primary-light"
        />
      ))}
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
