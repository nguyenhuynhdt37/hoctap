"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { LessonOverview } from "@/types/user/learning";

interface LessonTabProps {
  lessonOverview?: LessonOverview;
}

export default function LessonTab({ lessonOverview }: LessonTabProps) {
  if (!lessonOverview) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {lessonOverview.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {lessonOverview.lesson_type && (
            <span className="px-2 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              {lessonOverview.lesson_type}
            </span>
          )}
          {typeof lessonOverview.duration === "number" && (
            <span className="px-2 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200">
              Thời lượng: {Math.floor((lessonOverview.duration || 0) / 60)}'
            </span>
          )}
          {typeof lessonOverview.quizzes_count === "number" &&
            lessonOverview.quizzes_count > 0 && (
              <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                Quiz: {lessonOverview.quizzes_count}
              </span>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Giới thiệu bài học
          </h3>
          {lessonOverview.description ? (
            <MarkdownRenderer
              content={lessonOverview.description}
              isHtml={false}
              className="prose prose-sm max-w-none text-gray-700 text-justify break-words"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">
              Thông tin chi tiết về bài học sẽ xuất hiện tại đây. Hãy sử dụng
              thanh bên để chuyển giữa các bài.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

