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
    <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="border-b border-border bg-gradient-to-r from-primary-pastel/40 to-secondary-pastel/30 flex-shrink-0">
        <div className="flex">
          <button
            onClick={() => setInfoTab("info")}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              infoTab === "info"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
            }`}
          >
            Thông tin
          </button>
          <button
            onClick={() => setInfoTab("qa")}
            className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
              infoTab === "qa"
                ? "border-primary text-primary bg-surface"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-surface/60"
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
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Tiêu đề
              </h4>
              <p className="text-foreground font-bold text-lg">{lesson.title}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Tổng số câu hỏi
              </h4>
              <p className="text-foreground">{quizQuestionsCount} câu</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Tiến độ
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-border rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (selectedAnswersCount / quizQuestionsCount) * 100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {selectedAnswersCount}/{quizQuestionsCount}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Kết quả
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-pastel rounded-lg flex items-center justify-center">
                    <HiCheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">
                    Đúng:{" "}
                    <span className="font-semibold text-primary">
                      {correctCount}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <HiXCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-foreground">
                    Sai:{" "}
                    <span className="font-semibold text-red-600">
                      {selectedAnswersCount - correctCount}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                Mô tả
              </h4>
              {lesson.description ? (
                <div className="prose prose-sm max-w-none text-foreground/90">
                  <MarkdownRenderer
                    content={lesson.description}
                    isHtml={false}
                    className="prose prose-sm max-w-none text-foreground/90"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  Chưa có mô tả cho bài học này
                </p>
              )}
            </div>

            {lesson.resources && lesson.resources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Tài nguyên
                </h4>
                <div className="space-y-2">
                  {lesson.resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary-light hover:bg-primary-pastel/30 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {resource.title || resource.url}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(resource.resource_type || "file").toUpperCase()}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-primary flex-shrink-0">
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
            className="relative -m-6 h-full overflow-hidden rounded-2xl border border-border"
          >
            <QASection
              lessonId={lesson.id}
              accessToken={accessToken}
              containerClassName="w-full bg-surface px-4 sm:px-6 lg:px-8 py-4"
            />
          </div>
        )}
      </div>
    </div>
  );
}

