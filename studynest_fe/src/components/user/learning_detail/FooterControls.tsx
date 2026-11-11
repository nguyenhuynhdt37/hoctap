"use client";

import {
  HiArrowLeft,
  HiArrowRight,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";

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
    <>
      {/* Main Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-18 bg-surface/95 backdrop-blur-md border-t border-border shadow-md z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Previous Button */}
            <div className="flex items-center">
              <button
                onClick={goPrev}
                disabled={!hasPrev}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                  hasPrev
                    ? "text-foreground hover:text-primary hover:bg-primary-pastel/50 hover:shadow-xs cursor-pointer"
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
                title="Bài trước"
              >
                <HiArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Trước</span>
              </button>
            </div>

            {/* Center: Lesson Info */}
            <div className="flex-1 mx-6">
              <div className="text-center max-w-md mx-auto">
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentTitle || "Chọn bài học"}
                </p>
                {currentDuration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentDuration}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Next Button */}
            <div className="flex items-center">
              <button
                onClick={goNext}
                disabled={!hasNext}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                  hasNext
                    ? "bg-primary text-white hover:bg-primary-hover hover:shadow-sm cursor-pointer"
                    : "bg-border text-muted-foreground cursor-not-allowed"
                } ${
                  lessonJustCompleted && hasNext
                    ? "animate-bounce scale-110 shadow-md"
                    : ""
                }`}
                title="Bài tiếp theo"
              >
                <span className="text-sm font-medium">Tiếp</span>
                <HiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle - Below Footer */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-3 right-4 w-12 h-12 bg-surface hover:bg-primary-pastel/40 text-foreground hover:text-primary rounded-full shadow-md hover:shadow-lg border border-border hover:border-primary-light transition-all duration-300 flex items-center justify-center z-50 cursor-pointer"
        title={sidebarOpen ? "Ẩn nội dung khóa học" : "Hiện nội dung khóa học"}
      >
        {sidebarOpen ? (
          <HiChevronRight className="h-5 w-5" />
        ) : (
          <HiChevronLeft className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
