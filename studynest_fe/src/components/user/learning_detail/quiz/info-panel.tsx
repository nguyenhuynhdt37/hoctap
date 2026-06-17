"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { useRef, useEffect } from "react";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";
import QASection from "../qa";

interface InfoPanelProps {
  lesson: ActiveLessonResponse;
  infoTab: "info" | "qa";
  setInfoTab: (tab: "info" | "qa") => void;
  quizQuestionsCount: number;
  selectedAnswersCount: number;
  correctCount: number;
  accessToken?: string;
}

export default function InfoPanel({
  lesson,
  infoTab,
  setInfoTab,
  quizQuestionsCount,
  selectedAnswersCount,
  correctCount,
  accessToken,
}: InfoPanelProps) {
  const qaSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (infoTab === "qa") {
      const timeout = setTimeout(() => {
        qaSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [infoTab]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setInfoTab("info")}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              infoTab === "info"
                ? "border-green-500 text-green-600 bg-white"
                : "border-transparent text-gray-600 hover:text-green-600 hover:bg-white/50"
            }`}
          >
            Thông tin
          </button>
          <button
            onClick={() => setInfoTab("qa")}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
              infoTab === "qa"
                ? "border-green-500 text-green-600 bg-white"
                : "border-transparent text-gray-600 hover:text-green-600 hover:bg-white/50"
            }`}
          >
            Hỏi đáp
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto min-h-0">
        {infoTab === "info" ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Tiêu đề
              </h4>
              <p className="text-gray-900 font-bold text-lg">{lesson.title}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Tổng số câu hỏi
              </h4>
              <p className="text-gray-900">{quizQuestionsCount} câu</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Tiến độ
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (selectedAnswersCount / quizQuestionsCount) * 100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {selectedAnswersCount}/{quizQuestionsCount}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Kết quả
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <HiCheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700">
                    Đúng:{" "}
                    <span className="font-semibold text-emerald-600">
                      {correctCount}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <HiXCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-700">
                    Sai:{" "}
                    <span className="font-semibold text-red-600">
                      {selectedAnswersCount - correctCount}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Mô tả
              </h4>
              {lesson.description ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <MarkdownRenderer
                    content={lesson.description}
                    isHtml={false}
                    className="prose prose-sm max-w-none text-gray-700"
                  />
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">
                  Chưa có mô tả cho bài học này
                </p>
              )}
            </div>

            {lesson.resources && lesson.resources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Tài nguyên
                </h4>
                <div className="space-y-2">
                  {lesson.resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {resource.title || resource.url}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(resource.resource_type || "file").toUpperCase()}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-700 flex-shrink-0">
                        Mở
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            ref={qaSectionRef}
            className="relative -m-6 h-full overflow-hidden rounded-xl border border-gray-200"
          >
            <QASection
              lessonId={lesson.id}
              accessToken={accessToken}
              containerClassName="w-full bg-white px-4 sm:px-6 lg:px-8 py-4"
            />
          </div>
        )}
      </div>
    </div>
  );
}

