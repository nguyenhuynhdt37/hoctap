"use client";

import {
  BookOpen,
  CheckCircle2,
  CircleX,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  FileText,
  FlaskConical,
  MessageCircle,
} from "pulsoicon-react";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { Badge } from "@/components/ui";
import type { ActiveLessonResponse } from "@/types/user/activeLesson";
import type { CodeExercise, TestResult } from "@/types/user/learning";
import { cn } from "@/lib/utils";
import TestResults from "./test-results";

export type CodeInfoTab = "info" | "tests";

interface InfoPanelProps {
  lesson: ActiveLessonResponse;
  infoTab: CodeInfoTab;
  setInfoTab: (tab: CodeInfoTab) => void;
  onOpenQa: () => void;
  currentExercise: CodeExercise | undefined;
  testResult: TestResult | null;
  accessToken?: string;
  lessonAuthorId?: string | null;
}

export default function InfoPanel({
  lesson,
  infoTab,
  setInfoTab,
  onOpenQa,
  currentExercise,
  testResult,
}: InfoPanelProps) {

  const passPercentage =
    testResult && testResult.total > 0
      ? Math.round((testResult.passed / testResult.total) * 100)
      : 0;
  const isAllPassed = Boolean(testResult && testResult.total > 0 && passPercentage === 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs">
      {/* Segmented Tabs Header: Đề bài | Test Bench | Hỏi đáp */}
      <div className="shrink-0 border-b border-border bg-gradient-to-r from-primary-light/65 via-surface to-surface-muted/60 p-2">
        <div
          role="tablist"
          aria-label="Đề bài, Test Bench và Hỏi đáp"
          className="grid grid-cols-3 gap-1 rounded-full border border-border/80 bg-background p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={infoTab === "info"}
            onClick={() => setInfoTab("info")}
            className={cn(
              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-all cursor-pointer",
              infoTab === "info"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-primary",
            )}
          >
            <BookOpen aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
            <span className="truncate">Đề bài</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={infoTab === "tests"}
            onClick={() => setInfoTab("tests")}
            className={cn(
              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-all cursor-pointer",
              infoTab === "tests"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-primary",
            )}
          >
            <FlaskConical aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
            <span className="truncate">Test Bench</span>
            {testResult && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                  infoTab === "tests"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isAllPassed
                      ? "bg-success-bg text-success-foreground"
                      : "bg-destructive-bg text-destructive-foreground",
                )}
              >
                {testResult.passed}/{testResult.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenQa}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold text-muted-foreground transition-all hover:bg-primary-light/60 hover:text-primary cursor-pointer"
          >
            <MessageCircle aria-hidden="true" animated={false} className="size-3.5 shrink-0" />
            <span className="truncate">Hỏi đáp</span>
          </button>
        </div>
      </div>

      {/* Nội dung Tab */}
      <div
        className={cn(
          "min-h-0 flex-1",
          infoTab === "info"
            ? "overflow-y-auto p-4 sm:p-5"
            : "flex flex-col overflow-hidden p-0",
        )}
      >
        {infoTab === "info" ? (
          <div className="space-y-5">
            {/* Tiêu đề bài học & trạng thái */}
            <div className="space-y-2 border-b border-border/70 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                  Nhiệm vụ thực hành
                </span>
                {currentExercise?.is_pass && (
                  <Badge variant="success" size="sm">
                    Đã vượt qua
                  </Badge>
                )}
              </div>
              <h2 className="font-display text-xl font-bold leading-snug text-foreground">
                {currentExercise?.title || lesson.title}
              </h2>
              {currentExercise?.title && currentExercise.title !== lesson.title && (
                <p className="text-xs font-medium text-muted-foreground">
                  Bài học: {lesson.title}
                </p>
              )}
            </div>

            {currentExercise && (
              <>
                {/* 3 Chip Thông Số Thực Thi */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-primary-pastel/75 bg-primary-light/50 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-primary uppercase">
                      <Code2 aria-hidden="true" animated={false} className="size-3" />
                      <span>Ngôn ngữ</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-extrabold text-foreground">
                      {currentExercise.language.name}
                    </p>
                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                      v{currentExercise.language.version}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/50 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
                      <Clock aria-hidden="true" animated={false} className="size-3" />
                      <span>Time</span>
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-foreground tabular-nums">
                      {(currentExercise.time_limit / 1000).toFixed(2)}s
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">Giới hạn</p>
                  </div>

                  <div className="rounded-2xl border border-accent-border/80 bg-accent/45 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-accent-foreground uppercase">
                      <Cpu aria-hidden="true" animated={false} className="size-3" />
                      <span>Memory</span>
                    </div>
                    <p className="mt-1 text-xs font-extrabold text-foreground tabular-nums">
                      {(currentExercise.memory_limit / (1024 * 1024)).toFixed(0)} MB
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">Tối đa</p>
                  </div>
                </div>

                {/* Phiếu điểm lần chạy gần nhất */}
                {testResult && (
                  <div
                    className={cn(
                      "rounded-2xl border p-3.5",
                      isAllPassed
                        ? "border-success-border bg-success-bg/65"
                        : "border-primary-pastel bg-primary-light/55",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {testResult.sample_only ? "Kết quả chạy mẫu" : "Kết quả chấm bài"}
                      </span>
                      <span
                        className={cn(
                          "font-display text-base font-bold tabular-nums",
                          isAllPassed ? "text-success-foreground" : "text-primary",
                        )}
                      >
                        {passPercentage}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
                      <span className="inline-flex items-center gap-1 text-success-foreground tabular-nums">
                        <CheckCircle2 aria-hidden="true" animated={false} className="size-3.5" />
                        {testResult.passed} đạt
                      </span>
                      <span className="inline-flex items-center gap-1 text-destructive-foreground tabular-nums">
                        <CircleX aria-hidden="true" animated={false} className="size-3.5" />
                        {testResult.failed} lỗi
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        / {testResult.total} test
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isAllPassed ? "bg-success-foreground" : "bg-primary",
                        )}
                        style={{ width: `${passPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Mô tả đề bài */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Yêu cầu đề bài
                  </h3>
                  {currentExercise.description ? (
                    <div className="prose prose-sm max-w-none rounded-2xl border border-border/80 bg-background/60 p-4 text-foreground/95">
                      <MarkdownRenderer
                        content={currentExercise.description}
                        isHtml={false}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border bg-background/50 p-4 text-xs italic text-muted-foreground">
                      Bài tập này chưa có mô tả chi tiết.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Tài nguyên đính kèm */}
            {lesson.resources && lesson.resources.length > 0 && (
              <div className="space-y-2 border-t border-border/70 pt-4">
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <FileText aria-hidden="true" animated={false} className="size-3.5 text-primary" />
                  <span>Tài nguyên tham khảo</span>
                </h3>
                <div className="space-y-2">
                  {lesson.resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2 rounded-2xl border border-border bg-background/65 px-3.5 py-2.5 text-xs font-semibold transition-colors hover:border-primary-pastel hover:bg-primary-light/55"
                    >
                      <span className="truncate text-foreground group-hover:text-primary">
                        {resource.title || resource.url}
                      </span>
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
        ) : currentExercise &&
          currentExercise.testcases &&
          currentExercise.testcases.length > 0 ? (
          <TestResults
            testcases={currentExercise.testcases}
            testResult={testResult}
            embedded
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span className="grid size-11 place-items-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
              <FlaskConical aria-hidden="true" animated={false} className="size-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">
              Chưa có Test Case nào
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bài tập này chưa được cấu hình kịch bản kiểm thử tự động.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
