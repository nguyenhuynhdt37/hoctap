"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
  } = props;

  return (
    <div className="z-40 h-16 w-full shrink-0 border-t border-border bg-surface/95 shadow-md backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-1 px-2 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Bài trước"
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-200 sm:px-4 ${
            hasPrev
              ? "cursor-pointer text-foreground hover:bg-primary-pastel/50 hover:text-primary hover:shadow-xs"
              : "cursor-not-allowed text-muted-foreground/50"
          }`}
          title="Bài trước"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden text-sm font-medium min-[480px]:inline">Trước</span>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <p className="min-w-0 truncate text-center text-sm font-semibold text-foreground">
            {currentTitle || "Chọn bài học"}
            {currentDuration ? (
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                {currentDuration}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Ẩn nội dung khóa học" : "Hiện nội dung khóa học"}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-light hover:bg-primary-pastel/40 hover:text-primary"
            title={sidebarOpen ? "Ẩn nội dung khóa học" : "Hiện nội dung khóa học"}
          >
            {sidebarOpen ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Bài tiếp theo"
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-200 sm:px-4 ${
            hasNext
              ? "cursor-pointer bg-primary text-white hover:bg-primary-hover hover:shadow-sm"
              : "cursor-not-allowed bg-border text-muted-foreground"
          } ${
            lessonJustCompleted && hasNext ? "scale-110 animate-bounce shadow-md" : ""
          }`}
          title="Bài tiếp theo"
        >
          <span className="hidden text-sm font-medium min-[480px]:inline">Tiếp</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
