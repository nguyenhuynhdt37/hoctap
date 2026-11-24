"use client";

import { useState } from "react";
import {
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  HelpCircle,
  Lightbulb,
  Video,
} from "pulsoicon-react";
import { LessonOverview } from "@/types/user/learning";
import { QAImageLightbox, QAMarkdownContent, type LightboxImage } from "../qa/qa-media-content";

interface LessonTabProps {
  lessonOverview?: LessonOverview;
}

const LESSON_TYPE_META: Record<string, { label: string; tone: string }> = {
  video: {
    label: "Video bài giảng",
    tone: "border-primary-pastel bg-primary-light text-primary",
  },
  quiz: {
    label: "Bài kiểm tra nhanh",
    tone: "border-secondary-pastel bg-secondary text-secondary-foreground",
  },
  code: {
    label: "Thực hành lập trình",
    tone: "border-accent-border bg-accent text-accent-foreground",
  },
  text: {
    label: "Bài đọc kiến thức",
    tone: "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground",
  },
};

function formatDurationVietnamese(totalSeconds?: number): string | null {
  if (typeof totalSeconds !== "number" || totalSeconds <= 0) return null;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins === 0) return `${secs} giây`;
  if (secs === 0) return `${mins} phút`;
  return `${mins} phút ${secs} giây`;
}

export default function LessonTab({ lessonOverview }: LessonTabProps) {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  if (!lessonOverview) {
    return (
      <div className="rounded-[24px] border border-dashed border-primary-pastel bg-background/60 p-8 text-center">
        <p className="font-display text-base font-bold text-foreground">
          Chọn một bài học ở thanh bên để xem nội dung chi tiết
        </p>
      </div>
    );
  }

  const typeKey = (lessonOverview.lesson_type || "video").toLowerCase();
  const typeMeta = LESSON_TYPE_META[typeKey] ?? {
    label: lessonOverview.lesson_type || "Bài học",
    tone: "border-primary-pastel bg-primary-light text-primary",
  };
  const durationLabel = formatDurationVietnamese(lessonOverview.duration);
  const resources = lessonOverview.resources ?? [];

  return (
    <div className="space-y-6">
      {/* ── BANNER TIÊU ĐỀ BÀI HỌC ── */}
      <header className="rounded-[24px] border border-primary-pastel/70 bg-gradient-to-r from-primary-light/75 via-surface to-accent/35 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${typeMeta.tone}`}
          >
            <Video className="size-3.5" animated={false} aria-hidden="true" />
            {typeMeta.label}
          </span>

          {durationLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-bold text-foreground">
              <Clock className="size-3.5 text-primary" animated={false} aria-hidden="true" />
              {durationLabel}
            </span>
          )}

          {typeof lessonOverview.quizzes_count === "number" &&
            lessonOverview.quizzes_count > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-secondary/60 px-3 py-1 text-[11px] font-bold text-secondary-foreground">
                <HelpCircle className="size-3.5" animated={false} aria-hidden="true" />
                {lessonOverview.quizzes_count} câu hỏi ôn tập
              </span>
            )}

          {resources.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-accent-vanilla/60 px-3 py-1 text-[11px] font-bold text-accent-vanilla-foreground">
              <FolderOpen className="size-3.5" animated={false} aria-hidden="true" />
              {resources.length} tài nguyên đính kèm
            </span>
          )}
        </div>

        <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {lessonOverview.title}
        </h2>
      </header>

      {/* ── NỘI DUNG CHI TIẾT BÀI HỌC ── */}
      <section className="rounded-[24px] border border-border/80 bg-background/55 p-5 sm:p-6">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary-light text-primary">
            <BookOpen className="size-4" animated={false} aria-hidden="true" />
          </span>
          <h3 className="font-display text-lg font-bold text-foreground">
            Nội dung trọng tâm & Hướng dẫn bài học
          </h3>
        </div>

        {lessonOverview.description?.trim() ? (
          <QAMarkdownContent
            content={lessonOverview.description}
            onOpenImage={setLightboxImage}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-pastel bg-surface p-6 text-center">
            <p className="text-sm font-semibold text-foreground">
              Bài học này tập trung trực tiếp qua phần trình bày chính phía trên.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bạn có thể chuyển sang tab Ghi chú để lưu lại ý chính theo mốc thời gian, hoặc mở Hỏi đáp để trao đổi ngay cùng thầy cô.
            </p>
          </div>
        )}
      </section>

      {/* ── TÀI NGUYÊN NHANH CỦA BÀI HỌC (NẾU CÓ) ── */}
      {resources.length > 0 && (
        <section className="rounded-[24px] border border-primary-pastel/70 bg-primary-light/25 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-primary" animated={false} aria-hidden="true" />
            <h3 className="font-display text-base font-bold text-foreground">
              Tài liệu đi kèm bài này ({resources.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-3 rounded-2xl border border-primary-pastel/70 bg-surface p-3.5 transition-colors hover:border-primary hover:bg-primary-light/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                    {r.title || r.url}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.resource_type || "Tài liệu"}
                  </div>
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-light text-primary transition-transform group-hover:translate-x-0.5">
                  <ExternalLink className="size-3.5" animated={false} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── MẸO HỌC HIỆU QUẢ ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/35 p-4 text-xs text-foreground">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-accent-vanilla-foreground shadow-2xs">
          <Lightbulb className="size-4" animated={false} aria-hidden="true" />
        </span>
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold text-foreground">Mẹo học sâu cùng Mây Mây</p>
          <p className="text-muted-foreground">
            Khi gặp đoạn kiến thức quan trọng, bấm qua tab <strong>Ghi chú</strong> để đóng dấu mốc thời gian video; nếu cần giải đáp bài tập, bạn có thể dán ảnh chụp màn hình (<kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px]">Ctrl+V</kbd>) ngay trong mục <strong>Hỏi đáp</strong>.
          </p>
        </div>
      </div>

      <QAImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
