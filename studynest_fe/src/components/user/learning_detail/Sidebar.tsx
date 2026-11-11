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
          className="w-[434px] flex-shrink-0 bg-surface shadow-lg border-l border-border overflow-y-auto"
          style={{
            height: `calc(100vh - ${headerHeightPx}px - ${footerHeightPx}px)`,
            marginTop: 0,
          }}
        >
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary-pastel/50 to-secondary-pastel/40 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Nội dung khóa học
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface/70 transition-colors cursor-pointer"
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
                  className="border border-border rounded-xl overflow-hidden bg-surface shadow-xs hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full cursor-pointer px-4 py-4 text-left flex items-center justify-between hover:bg-primary-pastel/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-xs">
                        <HiBookOpen className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">
                          {section.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatProgress(
                            section.completed_lessons || 0,
                            section.total_lessons || 0
                          )}{" "}
                          • {formatDuration(section.total_duration || 0)}
                        </p>
                        <div className="mt-1 flex items-center space-x-2">
                          <div className="w-full bg-border rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${
                                  ((section.completed_lessons || 0) /
                                    (section.total_lessons || 1)) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-primary font-semibold">
                            {section.completed_lessons || 0}/
                            {section.total_lessons || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <HiChevronUp className="h-5 w-5 text-primary" />
                    ) : (
                      <HiChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {expandedSections.has(section.id) && (
                    <div className="border-t border-border bg-background/80">
                      {section.lessons.map((lesson, index) => {
                        return (
                          <div
                            key={lesson.id}
                            ref={(el) => {
                              if (lessonRefs.current) {
                                lessonRefs.current[lesson.id] = el;
                              }
                            }}
                            className={`px-4 py-3 hover:bg-surface transition-all duration-200 cursor-pointer ${
                              lesson.is_completed
                                ? "bg-background border-l-2 border-muted-foreground/40"
                                : ""
                            } ${
                              activeLesson === lesson.id
                                ? "bg-primary-pastel/60 border-l-4 border-primary shadow-xs ring-1 ring-primary-light/60"
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
                                    ? "bg-primary text-white shadow-sm"
                                    : lesson.is_locked
                                    ? "bg-border text-muted-foreground"
                                    : "bg-primary-pastel text-primary"
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
                                        ? "text-primary"
                                        : lesson.is_locked
                                        ? "text-muted-foreground/60"
                                        : lesson.is_completed
                                        ? "text-muted-foreground"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {lesson.title}
                                  </h5>
                                  {lesson.is_locked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-pastel/70 text-primary border border-primary-light/60">
                                      <HiLockClosed className="w-3 h-3" />
                                      Khóa
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`text-xs ${
                                      lesson.is_locked
                                        ? "text-muted-foreground/60"
                                        : "text-muted-foreground"
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
                                            ? "text-muted-foreground/50 border-border cursor-not-allowed"
                                            : "text-primary border-primary-light/60 hover:bg-primary-pastel/50 cursor-pointer"
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
                                  <HiLockClosed className="h-4 w-4 text-muted-foreground" />
                                ) : lesson.is_completed ? (
                                  activeLesson === lesson.id ? (
                                    <HiPlay className="h-4 w-4 text-primary" />
                                  ) : (
                                    <HiCheckCircle className="h-4 w-4 text-primary" />
                                  )
                                ) : activeLesson === lesson.id ? (
                                  <HiPlay className="h-4 w-4 text-primary" />
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
