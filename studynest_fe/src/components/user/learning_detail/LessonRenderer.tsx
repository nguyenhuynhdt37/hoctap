"use client";

import { ActiveLessonResponse } from "@/types/user/activeLesson";
import CodeLesson from "./code";
import QuizLesson from "./quiz";
import VideoLesson from "./video";
import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { Button } from "@/components/ui/button";

interface LessonRendererProps {
  activeLessonData: ActiveLessonResponse | undefined;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onSeekToTime?: (timeSeconds: number) => void;
  accessToken?: string;
}

export default function LessonRenderer({
  activeLessonData,
  onMarkCompleted,
  completedLessons,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onSeekToTime,
  accessToken,
}: LessonRendererProps) {
  const renderLesson = () => {
    if (!activeLessonData) {
      return (
        <div className="bg-surface border border-border rounded-2xl shadow-xs p-8 text-center">
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Không tìm thấy bài học</p>
            <p className="text-sm mt-2">Vui lòng chọn bài học khác</p>
          </div>
        </div>
      );
    }

    switch (activeLessonData.lesson_type) {
      case "article": {
        const completed = activeLessonData.is_completed || completedLessons?.has(activeLessonData.id);
        return (
          <article className="rounded-2xl border border-border bg-surface p-5 text-foreground sm:p-8">
            <h1 className="mb-6 text-xl font-semibold sm:text-2xl">{activeLessonData.title}</h1>
            <MarkdownRenderer content={activeLessonData.description || "Nội dung đang được cập nhật."} isHtml={false} />
            {onMarkCompleted && (
              <div className="mt-8 border-t border-border pt-5">
                <Button disabled={completed || activeLessonData.is_locked} onClick={() => onMarkCompleted(activeLessonData.id)}>
                  {completed ? "Đã hoàn thành" : "Đánh dấu đã học xong"}
                </Button>
              </div>
            )}
          </article>
        );
      }

      case "video":
        return (
          <VideoLesson
            key={activeLessonData.id}
            lesson={activeLessonData}
            onMarkCompleted={onMarkCompleted}
            completedLessons={completedLessons}
            onSeekToTime={onSeekToTime}
          />
        );

      case "quiz":
        return (
          <QuizLesson
            key={activeLessonData.id}
            lesson={activeLessonData}
            onNext={onNext || (() => {})}
            onPrev={onPrev || (() => {})}
            hasNext={hasNext || false}
            hasPrev={hasPrev || false}
            onMarkCompleted={onMarkCompleted}
            completedLessons={completedLessons}
            accessToken={accessToken}
            quizzes={
              activeLessonData.quizzes?.map((q) => {
                // Sắp xếp options theo position trước khi tính correct_answer
                const sortedOptions = [...q.options].sort((a, b) => a.position - b.position);
                const correctIndex = sortedOptions.findIndex((opt) => opt.is_correct);
                
                return {
                  id: q.id,
                  question: q.question,
                  options: sortedOptions.map((opt) => opt.text),
                  correct_answer: correctIndex >= 0 ? correctIndex : 0,
                  explanation: q.explanation,
                  difficulty_level: q.difficulty_level,
                };
              }) || []
            }
          />
        );

      case "code":
        return (
          <CodeLesson
            key={activeLessonData.id}
            lesson={activeLessonData}
            onMarkCompleted={onMarkCompleted}
            completedLessons={completedLessons}
            accessToken={accessToken}
          />
        );

      default:
        return (
          <div className="bg-surface border border-border rounded-2xl shadow-xs p-8 text-center">
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground">
                Loại bài học không được hỗ trợ: {activeLessonData.lesson_type}
              </p>
              <p className="text-sm mt-2">
                Vui lòng liên hệ admin để được hỗ trợ
              </p>
            </div>
          </div>
        );
    }
  };

  return <>{renderLesson()}</>;
}
