"use client";

import { memo } from "react";
import { TutorScope, MessageSource } from "@/types/user/tutor-chat";
import {
  HiPlay,
  HiDocumentText,
  HiCode,
  HiQuestionMarkCircle,
  HiLink,
  HiPhotograph,
  HiVideoCamera,
} from "react-icons/hi";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// ========== SCOPE SELECTOR ==========

const SCOPE_OPTIONS: { value: TutorScope; label: string }[] = [
  { value: "lesson", label: "Bài này" },
  { value: "section", label: "Chương này" },
  { value: "course", label: "Toàn khóa" },
];

interface ScopeSelectorProps {
  scope: TutorScope;
  onScopeChange: (scope: TutorScope) => void;
  disabled?: boolean;
}

export const ScopeSelector = memo(function ScopeSelector({
  scope,
  onScopeChange,
  disabled,
}: ScopeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100/80 rounded-lg">
      {SCOPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onScopeChange(option.value)}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            scope === option.value
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

// ========== SOURCE LIST ==========

interface SourceListProps {
  sources: MessageSource[];
  onSourceClick: (source: MessageSource) => void;
  currentLessonId?: string; // ID của lesson hiện tại để check xem có trùng không
}

export const SourceList = memo(function SourceList({
  sources,
  onSourceClick,
  currentLessonId,
}: SourceListProps) {
  if (!sources?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {sources.map((source, idx) => {
        const Icon = getSourceIcon(source);
        const label = getSourceLabel(source);
        const isCurrentLesson = source.lesson_id === currentLessonId;

        return (
          <HoverCard
            key={`${source.source_type}-${source.index}-${idx}`}
            openDelay={0}
            closeDelay={100}
          >
            <HoverCardTrigger asChild>
              <button
                onClick={() => onSourceClick(source)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors text-xs text-gray-600 max-w-full cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{label}</span>
              </button>
            </HoverCardTrigger>

            <HoverCardContent
              className="w-80 p-0 overflow-hidden rounded-xl border-gray-200 shadow-xl"
              side="top"
              align="start"
            >
              <div className="p-4 bg-white">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-green-50 rounded-lg shrink-0">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-green-600 tracking-wider">
                        {getSourceTypeLabel(source)}
                      </span>
                      {source.timestamp_seconds !== undefined &&
                        source.timestamp_seconds !== null && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                            {formatTime(source.timestamp_seconds)}
                          </span>
                        )}
                      {source.similarity !== undefined && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                          {Math.round(source.similarity * 100)}%
                        </span>
                        
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 leading-snug truncate">
                      {getSourceTitle(source)}
                    </h4>
                  </div>
                </div>

                {/* Summary */}
                {source.summary && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg italic">
                      "{source.summary}"
                    </p>
                  </div>
                )}

                {/* Code preview */}
                {source.source_type === "code" && source.code_content && (
                  <div className="mb-3">
                    <pre className="text-[11px] text-gray-700 bg-gray-900 text-gray-100 p-2.5 rounded-lg overflow-x-auto max-h-24">
                      <code>
                        {source.code_content.slice(0, 200)}
                        {source.code_content.length > 200 ? "..." : ""}
                      </code>
                    </pre>
                  </div>
                )}

                {/* Quiz option preview */}
                {source.source_type === "quiz" && source.quizz_option_title && (
                  <div className="mb-3 bg-amber-50 p-2.5 rounded-lg">
                    <p className="text-[11px] font-medium text-amber-800 mb-1">
                      {source.quizz_option_title}
                    </p>
                    {source.quizz_option_content && (
                      <p className="text-[11px] text-amber-700">
                        {source.quizz_option_content}
                      </p>
                    )}
                  </div>
                )}

                {/* Warning for non-current lesson video */}
                {source.source_type === "video" &&
                  !isCurrentLesson &&
                  source.lesson_id && (
                    <div className="mb-3 bg-orange-50 border border-orange-200 p-2 rounded-lg">
                      <p className="text-[11px] text-orange-700">
                        ⚠️ Video này thuộc bài học khác, không thể seek tới thời
                        điểm cụ thể.
                      </p>
                    </div>
                  )}

                {/* Warning for quiz in different lesson */}
                {source.source_type === "quiz" &&
                  !isCurrentLesson &&
                  source.lesson_id && (
                    <div className="mb-3 bg-orange-50 border border-orange-200 p-2 rounded-lg">
                      <p className="text-[11px] text-orange-700">
                        ⚠️ Quiz này thuộc bài học khác, sẽ chuyển đến bài học
                        đó.
                      </p>
                    </div>
                  )}

                {/* Footer */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    {source.chunk_index !== undefined
                      ? `Chunk: ${source.chunk_index}`
                      : `#${source.index}`}
                  </span>
                  <span className="text-green-600 font-medium hover:underline cursor-pointer flex items-center gap-1">
                    {getActionLabel(source, isCurrentLesson)} &rarr;
                  </span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
});

// ========== HELPER FUNCTIONS ==========

function getSourceTypeLabel(source: MessageSource): string {
  switch (source.source_type) {
    case "video":
      return "Video Bài Giảng";
    case "code":
      return "Source Code";
    case "quiz":
      return "Bài Tập / Quiz";
    case "resource":
      const title = (source.resource_title || "").toLowerCase();
      if (
        title.includes("video") ||
        title.includes("youtube") ||
        title.includes("mp4")
      ) {
        return "Video Tham Khảo";
      }
      if (
        title.includes("image") ||
        title.includes("png") ||
        title.includes("jpg")
      ) {
        return "Hình Ảnh";
      }
      return "Tài Liệu";
    default:
      return "Nguồn";
  }
}

function getSourceTitle(source: MessageSource): string {
  switch (source.source_type) {
    case "video":
      return source.lesson_title || "Video bài giảng";
    case "resource":
      return source.resource_title || "Tài liệu";
    case "code":
      return source.lesson_title || "Source code";
    case "quiz":
      return source.lesson_title || "Quiz";
    default:
      return source.lesson_title || source.resource_title || "Nguồn";
  }
}

function getActionLabel(
  source: MessageSource,
  isCurrentLesson: boolean
): string {
  switch (source.source_type) {
    case "video":
      if (isCurrentLesson && source.timestamp_seconds !== undefined) {
        return "Nhấn để xem tại thời điểm";
      }
      return "Xem bài học";
    case "resource":
      return "Mở tài liệu";
    case "code":
      return "Xem code";
    case "quiz":
      if (source.quizz_option_id) {
        return "Đi đến câu hỏi";
      }
      return "Xem quiz";
    default:
      return "Xem chi tiết";
  }
}

function formatTime(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getSourceIcon(source: MessageSource) {
  switch (source.source_type) {
    case "video":
      return HiPlay;
    case "resource":
      const title = (source.resource_title || "").toLowerCase();
      if (
        title.includes("video") ||
        title.includes("youtube") ||
        title.includes("mp4")
      ) {
        return HiVideoCamera;
      }
      if (
        title.includes("image") ||
        title.includes("png") ||
        title.includes("jpg")
      ) {
        return HiPhotograph;
      }
      if (source.resource_url?.startsWith("http")) {
        return HiLink;
      }
      return HiDocumentText;
    case "code":
      return HiCode;
    case "quiz":
      return HiQuestionMarkCircle;
    default:
      return HiDocumentText;
  }
}

function getSourceLabel(source: MessageSource): string {
  switch (source.source_type) {
    case "video": {
      const time =
        source.timestamp_seconds !== undefined
          ? formatTime(source.timestamp_seconds)
          : "";
      return `${source.lesson_title || "Video"} ${time ? `(${time})` : ""}`;
    }
    case "resource":
      return source.resource_title || "Tài liệu";
    case "code":
      return source.lesson_title || "Source code";
    case "quiz":
      return source.quizz_option_title || source.lesson_title || "Quiz";
    default:
      return source.resource_title || source.lesson_title || "Nguồn";
  }
}
