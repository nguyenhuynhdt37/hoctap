"use client";

import { Button, Skeleton, Textarea } from "@/components/ui";
import { pathCover, StudyImage } from "@/components/user/home/study-image";
import { useWeeklyReport } from "@/lib/learning-hub/hooks";
import { Check, Clipboard, Share2 } from "pulsoicon-react";
import { useState } from "react";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";

const date = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

export function WeeklyReport() {
  const report = useWeeklyReport();
  const [share, setShare] = useState<"idle" | "copied" | "manual">("idle");
  const data = report.data;
  const week = data ? `${date.format(new Date(data.week_start))} – ${date.format(new Date(data.week_end))}` : "";
  async function copyReport() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.share_text);
      setShare("copied");
    } catch {
      setShare("manual");
    }
  }

  async function shareReport() {
    if (!data) return;
    try {
      await navigator.share({ text: data.share_text });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copyReport();
    }
  }

  return (
    <section aria-label="Chia sẻ kết quả học tập" className="rounded-3xl border border-secondary-pastel bg-surface p-5 shadow-ambient-sm sm:p-6">
      <div>
        {report.error ? (
          <HubLoadError error={report.error} title="Chưa tải được tóm tắt tuần" message="Tải lại để lấy nội dung chia sẻ với phụ huynh." onRetry={report.retry} isRetrying={report.isValidating} />
        ) : !data ? (
          <div role="status" aria-label="Đang tải tóm tắt tuần" className="flex items-center gap-3 [&_.animate-pulse]:motion-reduce:animate-none">
            <Skeleton className="size-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-36 rounded-full" /></div>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <StudyImage fallback={pathCover} sizes="64px" className="size-16 shrink-0 rounded-full border-2 border-surface" />
              <div className="min-w-0">
                <h2 className="text-lg leading-snug font-extrabold text-secondary-foreground">Gửi phụ huynh tuần này</h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-secondary-foreground"><span>Tuần {week}</span><MockDataChip source={report.source} /></div>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-secondary-foreground">
              {data.lessons_completed} bài học · {data.quizzes_taken} lượt trắc nghiệm · {data.reviews_done} lượt ôn · {data.study_days} ngày học
            </p>
            {data.top_courses[0] && <p className="mt-1 text-sm text-secondary-foreground">
              Học nhiều nhất ở <strong className="wrap-anywhere">{data.top_courses[0].title}</strong>.
            </p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" leftIcon={share === "copied" ? <Check className="size-4" /> : <Clipboard className="size-4" />} onClick={() => void copyReport()} className="min-h-11 rounded-full px-5 motion-reduce:transition-none">
                Sao chép báo cáo
              </Button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <Button variant="outline" leftIcon={<Share2 className="size-4" />} onClick={() => void shareReport()} className="min-h-11 rounded-full">
                  Chia sẻ
                </Button>
              )}
            </div>
            <p role="status" className="mt-2 text-sm font-medium text-secondary-foreground">
              {share === "copied" && "Đã sao chép báo cáo để bạn gửi cho phụ huynh."}
              {share === "manual" && "Trình duyệt chưa sao chép được. Chọn nội dung bên dưới để sao chép."}
            </p>
            {share === "manual" && <Textarea aria-label="Nội dung báo cáo tuần" className="mt-2" rows={4} readOnly value={data.share_text} onFocus={(event) => event.currentTarget.select()} />}
          </>
        )}
      </div>
    </section>
  );
}
