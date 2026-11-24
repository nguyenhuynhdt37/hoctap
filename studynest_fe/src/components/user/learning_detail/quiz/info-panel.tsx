"use client";

import {
  BookOpen,
  CheckCircle2,
  CircleX,
  ExternalLink,
  FileText,
  HelpCircle,
  MessageCircle,
} from "pulsoicon-react";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import type { ActiveLessonResponse } from "@/types/user/activeLesson";

interface InfoPanelProps {
  lesson: ActiveLessonResponse;
  quizQuestionsCount: number;
  selectedAnswersCount: number;
  correctCount: number;
  onOpenQa: () => void;
}

export default function InfoPanel({
  lesson,
  quizQuestionsCount,
  selectedAnswersCount,
  correctCount,
  onOpenQa,
}: InfoPanelProps) {
  const wrongCount = Math.max(0, selectedAnswersCount - correctCount);
  const progressPct =
    quizQuestionsCount > 0
      ? Math.round((selectedAnswersCount / quizQuestionsCount) * 100)
      : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs">
      {/* Header cột kiến thức + nút mở Hỏi đáp toàn màn hình */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary-light/70 via-surface to-secondary-light/35 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary-pastel bg-primary text-primary-foreground shadow-2xs">
            <BookOpen aria-hidden="true" animated={false} className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-primary uppercase">
              Tài liệu ôn tập
            </p>
            <h3 className="truncate font-display text-sm font-bold text-foreground">
              Kiến thức trọng tâm
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenQa}
          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary-pastel bg-surface px-3 text-xs font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
        >
          <MessageCircle aria-hidden="true" animated={false} className="size-3.5" />
          <span>Hỏi đáp</span>
        </button>
      </div>

      {/* Nội dung cuộn độc lập */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-2 border-b border-border/70 pb-4">
          <h2 className="font-display text-xl font-bold leading-snug text-foreground">
            {lesson.title}
          </h2>

          {/* 3 ô Bento thống kê mini */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-2xl border border-primary-pastel/75 bg-primary-light/50 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                <HelpCircle aria-hidden="true" animated={false} className="size-3" />
                <span>Tiến độ</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-foreground tabular-nums">
                {selectedAnswersCount}/{quizQuestionsCount}
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-success-foreground uppercase">
                <CheckCircle2 aria-hidden="true" animated={false} className="size-3" />
                <span>Đúng</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-success-foreground tabular-nums">
                {correctCount}
              </p>
            </div>

            <div className="rounded-2xl border border-destructive-border/80 bg-destructive-bg/55 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-destructive-foreground uppercase">
                <CircleX aria-hidden="true" animated={false} className="size-3" />
                <span>Chưa đúng</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-destructive-foreground tabular-nums">
                {wrongCount}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mô tả / Tóm tắt lý thuyết */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Nội dung ôn tập
          </h4>
          {lesson.description ? (
            <div className="prose prose-sm max-w-none rounded-2xl border border-border/80 bg-background/60 p-4 text-foreground/95">
              <MarkdownRenderer
                content={lesson.description}
                isHtml={false}
                className="prose prose-sm max-w-none text-foreground/95"
              />
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-background/50 p-4 text-xs italic text-muted-foreground">
              Bài luyện tập này chưa có phần tóm tắt lý thuyết.
            </p>
          )}
        </div>

        {/* Tài nguyên đính kèm */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="space-y-2 border-t border-border/70 pt-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              <FileText aria-hidden="true" animated={false} className="size-3.5 text-primary" />
              <span>Tài nguyên tham khảo</span>
            </h4>
            <div className="space-y-2">
              {lesson.resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-2 rounded-2xl border border-border bg-background/65 px-3.5 py-2.5 text-xs font-semibold transition-colors hover:border-primary-pastel hover:bg-primary-light/55"
                >
                  <div className="min-w-0">
                    <p className="truncate text-foreground group-hover:text-primary">
                      {resource.title || resource.url}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {(resource.resource_type || "file").toUpperCase()}
                    </p>
                  </div>
                  <ExternalLink
                    aria-hidden="true"
                    animated={false}
                    className="size-3.5 shrink-0 text-primary"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
