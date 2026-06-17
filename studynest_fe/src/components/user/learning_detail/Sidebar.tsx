"use client";

import { Section } from "@/types/user/curriculum";
import { RefObject, useState } from "react";
import {
  HiBookOpen,
  HiCheckCircle,
  HiChevronDown,
  HiChevronUp,
  HiCode,
  HiDocumentText,
  HiLockClosed,
  HiPlay,
  HiQuestionMarkCircle,
  HiX,
} from "react-icons/hi";
import ResourcesModal from "./ResourcesModal";

interface SidebarProps {
  sections: Section[];
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  lessonRefs: RefObject<{ [key: string]: HTMLDivElement | null }>;
  activeLesson: string;
  selectLesson: (id: string) => void;
  progressLabel: string;
  totalDurationLabel: string;
  completedLessons: number;
  totalLessons: number;
  headerHeightPx?: number;
  footerHeightPx?: number;
}

export default function Sidebar(props: SidebarProps) {
  const [openResources, setOpenResources] = useState<{
    open: boolean;
    lessonTitle?: string;
    resources: any[];
  }>({ open: false, resources: [] });
  const {
    sections,
    sidebarOpen,
    setSidebarOpen,
    expandedSections,
    toggleSection,
    lessonRefs,
    activeLesson,
    selectLesson,
    progressLabel,
    totalDurationLabel,
    completedLessons,
    totalLessons,
    headerHeightPx = 80,
    footerHeightPx = 64,
  } = props;

  // Helper functions
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút ${remainingSeconds} giây`;
    } else {
      return `${remainingSeconds} giây`;
    }
  };

  const formatProgress = (completed: number, total: number) => {
    return `${completed}/${total}`;
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="w-[434px] flex-shrink-0 bg-white shadow-xl border-l border-teal-100 overflow-y-auto"
          style={{
            height: `calc(100vh - ${headerHeightPx}px - ${footerHeightPx}px)`,
            marginTop: 0,
          }}
        >
          <div className="p-6 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Nội dung khóa học
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-4 pb-48">
            {/* Progress card moved to header modal */}

            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-teal-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full cursor-pointer px-4 py-4 text-left flex items-center justify-between hover:bg-teal-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <HiBookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {section.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatProgress(
                            section.completed_lessons || 0,
                            section.total_lessons || 0
                          )}{" "}
                          • {formatDuration(section.total_duration || 0)}
                        </p>
                        <div className="mt-1 flex items-center space-x-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-1 rounded-full transition-all duration-300"
                              style={{
                                width: `${
                                  ((section.completed_lessons || 0) /
                                    (section.total_lessons || 1)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-teal-600 font-medium">
                            {section.completed_lessons || 0}/
                            {section.total_lessons || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <HiChevronUp className="h-5 w-5 text-teal-500" />
                    ) : (
                      <HiChevronDown className="h-5 w-5 text-teal-400" />
                    )}
                  </button>

                  {expandedSections.has(section.id) && (
                    <div className="border-t border-teal-100 bg-gradient-to-r from-gray-50 to-teal-50">
                      {section.lessons.map((lesson, index) => {
                        return (
                          <div
                            key={lesson.id}
                            ref={(el) => {
                              if (lessonRefs.current) {
                                lessonRefs.current[lesson.id] = el;
                              }
                            }}
                            className={`px-4 py-3 hover:bg-white transition-all duration-200 ${
                              lesson.is_completed
                                ? "bg-gray-50 border-l-2 border-gray-400"
                                : ""
                            } ${
                              activeLesson === lesson.id
                                ? "bg-gradient-to-r from-teal-100 to-emerald-100 border-l-4 border-teal-500 shadow-md ring-2 ring-teal-200"
                                : ""
                            }`}
                            onClick={() => {
                              if (
                                lesson.is_locked ||
                                activeLesson === lesson.id
                              )
                                return;
                              selectLesson(lesson.id);
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                                  activeLesson === lesson.id
                                    ? "bg-teal-500 text-white shadow-lg"
                                    : lesson.is_locked
                                    ? "bg-gray-200 text-teal-400"
                                    : "bg-teal-100 text-teal-600"
                                }`}
                              >
                                {activeLesson === lesson.id ? (
                                  <HiPlay className="h-5 w-5" />
                                ) : lesson.lesson_type === "quiz" ? (
                                  <HiQuestionMarkCircle className="h-4 w-4" />
                                ) : lesson.lesson_type === "code" ? (
                                  <HiCode className="h-4 w-4" />
                                ) : lesson.lesson_type === "info" ? (
                                  <HiDocumentText className="h-4 w-4" />
                                ) : (
                                  <HiPlay className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h5
                                    className={`text-sm font-semibold truncate ${
                                      activeLesson === lesson.id
                                        ? "text-teal-700"
                                        : lesson.is_locked
                                        ? "text-gray-400"
                                        : lesson.is_completed
                                        ? "text-gray-500"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {lesson.title}
                                  </h5>
                                  {lesson.is_locked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-600 border border-teal-200">
                                      <HiLockClosed className="w-3 h-3" />
                                      Khóa
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`text-xs ${
                                      lesson.is_locked
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {formatDuration(lesson.duration)}
                                  </p>
                                </div>
                                {lesson.resources &&
                                  lesson.resources.length > 0 && (
                                    <div className="mt-1">
                                      <button
                                        disabled={lesson.is_locked}
                                        onClick={() =>
                                          setOpenResources({
                                            open: true,
                                            lessonTitle: lesson.title,
                                            resources:
                                              lesson.resources as any[],
                                          })
                                        }
                                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border text-xs font-medium transition ${
                                          lesson.is_locked
                                            ? "text-gray-400 border-gray-200 cursor-not-allowed"
                                            : "text-teal-700 border-teal-200 hover:bg-teal-50 cursor-pointer"
                                        }`}
                                      >
                                        <span>📎</span>
                                        <span>
                                          {lesson.resources.length} tài nguyên
                                        </span>
                                      </button>
                                    </div>
                                  )}
                              </div>
                              <div className="flex-shrink-0">
                                {lesson.is_locked ? (
                                  <HiLockClosed className="h-4 w-4 text-teal-400" />
                                ) : lesson.is_completed ? (
                                  activeLesson === lesson.id ? (
                                    <HiPlay className="h-4 w-4 text-teal-500" />
                                  ) : (
                                    <HiCheckCircle className="h-4 w-4 text-teal-500" />
                                  )
                                ) : activeLesson === lesson.id ? (
                                  <HiPlay className="h-4 w-4 text-teal-500" />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <ResourcesModal
        open={openResources.open}
        onClose={() => setOpenResources({ open: false, resources: [] })}
        resources={(openResources.resources as any[]) || []}
        lessonTitle={openResources.lessonTitle}
      />
    </>
  );
}
