"use client";

import {
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Maximize2,
  Minimize2,
} from "pulsoicon-react";

interface FooterControlsProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentTitle: string;
  currentDuration: string;
  goNext: () => void;
  goPrev: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  lessonJustCompleted?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export default function FooterControls(props: FooterControlsProps) {
  const {
    sidebarOpen,
    toggleSidebar,
    currentTitle,
    currentDuration,
    goNext,
    goPrev,
    hasPrev = true,
    hasNext = true,
    lessonJustCompleted = false,
    focusMode = false,
    onToggleFocusMode,
  } = props;

  return (
    <div className="z-40 h-16 w-full shrink-0 border-t border-primary-pastel/70 bg-surface/92 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Bài trước"
          className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-all sm:px-4 ${
            hasPrev
              ? "cursor-pointer border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              : "cursor-not-allowed border-border/60 bg-background/50 text-muted-foreground/45"
          }`}
          title="Bài trước"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden min-[480px]:inline">Bài trước</span>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <p className="min-w-0 truncate text-center text-xs font-bold text-foreground sm:text-sm">
            {currentTitle || "Chọn bài học"}
            {currentDuration ? (
              <span className="ml-2 hidden rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary sm:inline">
                {currentDuration}
              </span>
            ) : null}
          </p>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-pressed={sidebarOpen}
            aria-label={sidebarOpen ? "Ẩn mục lục khóa học" : "Hiện mục lục khóa học"}
            className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
              sidebarOpen
                ? "border-primary-pastel bg-primary-light text-primary"
                : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light"
            }`}
            title={sidebarOpen ? "Ẩn mục lục" : "Hiện mục lục"}
          >
            <ListChecks className="size-4" animated={false} aria-hidden="true" />
            <span className="hidden md:inline">{sidebarOpen ? "Ẩn mục lục" : "Mục lục"}</span>
          </button>

          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              aria-pressed={focusMode}
              aria-label={focusMode ? "Thoát chế độ tập trung" : "Chế độ tập trung"}
              className={`hidden h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors lg:inline-flex ${
                focusMode
                  ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light"
              }`}
              title={focusMode ? "Thoát chế độ tập trung" : "Bật chế độ tập trung"}
            >
              {focusMode ? (
                <Minimize2 className="size-3.5" animated={false} aria-hidden="true" />
              ) : (
                <Maximize2 className="size-3.5" animated={false} aria-hidden="true" />
              )}
              <span>{focusMode ? "Thoát" : "Tập trung"}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Bài tiếp theo"
          className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold transition-all sm:px-5 ${
            hasNext
              ? "cursor-pointer bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover"
              : "cursor-not-allowed bg-border text-muted-foreground"
          } ${
            lessonJustCompleted && hasNext ? "scale-105 ring-4 ring-primary-pastel" : ""
          }`}
          title="Bài tiếp theo"
        >
          <span className="hidden min-[480px]:inline">Bài tiếp</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
