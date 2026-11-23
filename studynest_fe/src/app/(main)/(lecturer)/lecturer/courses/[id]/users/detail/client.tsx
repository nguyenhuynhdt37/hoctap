"use client";

import LecturerStudentDetails from "@/components/lecturer/courses/users/details";
import { Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { StudentDetailResponse } from "@/types/lecturer/student-detail";
import { isAxiosError } from "axios";
import Link from "next/link";

function normalizeError(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(normalizeError).filter(Boolean).join("; ");
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const { msg, message } = value as { msg?: unknown; message?: unknown };
    return msg || message ? String(msg || message) : JSON.stringify(value);
  }
  return String(value);
}

function getErrorMessage(error: unknown): string {
  const fallback = "Không thể tải dữ liệu học viên";
  if (!isAxiosError<{ detail?: unknown; message?: unknown }>(error) || !error.response) {
    return fallback;
  }
  const { data, status } = error.response;
  if (!data || typeof data !== "object") return fallback;
  return normalizeError(data.detail) || normalizeError(data.message) || `${fallback} (mã lỗi ${status})`;
}

export default function StudentDetailDataLoader({ id, userId }: { id: string; userId: string }) {
  const coursePath = `/lecturer/courses/${encodeURIComponent(id)}`;
  const { data, error, isValidating, mutate } = useAuthedSWR<StudentDetailResponse>(
    `${coursePath}/students/${encodeURIComponent(userId)}`,
    { shouldRetryOnError: false },
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-screen-2xl mx-auto px-2 md:px-4 lg:px-6 py-6 md:py-8">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs" role="alert">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Lỗi tải dữ liệu
            </h1>
            <p className="text-muted-foreground">{getErrorMessage(error)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`${coursePath}/users`}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm transition-colors"
              >
                Quay lại danh sách học viên
              </Link>
              <Button variant="outline" disabled={isValidating} onClick={() => void mutate()}>
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background" role="status" aria-label="Đang tải dữ liệu học viên">
        <div className="mx-auto max-w-screen-2xl space-y-4 px-2 py-6 md:px-4 md:py-8 lg:px-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-14 w-full max-w-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((card) => <Skeleton key={card} className="h-28" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <LecturerStudentDetails params={{ id, userId }} data={data} />;
}
