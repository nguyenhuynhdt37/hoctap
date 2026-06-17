"use client";

import { ActiveLessonResponse } from "@/types/user/activeLesson";
import CodeLesson from "./code";
import QuizLesson from "./quiz";
import VideoLesson from "./video";

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
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-gray-500">
            <p>Không tìm thấy bài học</p>
            <p className="text-sm mt-2">Vui lòng chọn bài học khác</p>
          </div>
        </div>
      );
    }

    switch (activeLessonData.lesson_type) {
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
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-500">
              <p>
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
