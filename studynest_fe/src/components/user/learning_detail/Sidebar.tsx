"use client";

import { Section } from "@/types/user/curriculum";
import { RefObject, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleHelp,
  CirclePlay,
  Clock,
  Code,
  FileText,
  Headphones,
  Layers,
  Lock,
  Mic,
  Pencil,
  Search,
  X,
} from "pulsoicon-react";
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
}

export default function Sidebar(props: SidebarProps) {
  const [openResources, setOpenResources] = useState<{
    open: boolean;
    lessonTitle?: string;
    resources: any[];
  }>({ open: false, resources: [] });
  const [lessonQuery, setLessonQuery] = useState("");

  const {
    sections,
    sidebarOpen,
    setSidebarOpen,
    expandedSections,
    toggleSection,
    lessonRefs,
    activeLesson,
    selectLesson,
    totalDurationLabel,
    completedLessons,
    totalLessons,
  } = props;

  const progressPct =
    totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) return `${hours}g ${minutes}p`;
    if (minutes > 0) return `${minutes}p ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
  };

  const normalizedQuery = lessonQuery.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return sections;
    return sections
      .map((sec) => {
        const matchSec = sec.title.toLowerCase().includes(normalizedQuery);
        const lessons = matchSec
          ? sec.lessons
          : sec.lessons.filter((l) => l.title.toLowerCase().includes(normalizedQuery));
        return { ...sec, lessons };
      })
      .filter((sec) => sec.lessons.length > 0);
  }, [sections, normalizedQuery]);

  return (
    <>
      {sidebarOpen && (
        <aside
          data-learning-sidebar
          aria-label="Mục lục khóa học"
          className="absolute inset-y-0 right-0 z-40 flex w-full max-w-full flex-col overflow-hidden bg-surface shadow-lg sm:w-[22rem] sm:border-l sm:border-border lg:static lg:z-auto lg:h-full lg:w-[21rem] lg:shrink-0 lg:shadow-none xl:w-[23rem]"
        >
          {/* Header Mục lục + Tiến độ tổng + Tìm kiếm nhanh */}
          <div className="shrink-0 space-y-3 border-b border-primary-pastel/60 bg-gradient-to-br from-primary-light/70 via-surface to-accent/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-primary uppercase">
                  Lộ trình khóa học
                </p>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Nội dung bài học
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng nội dung khóa học"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Thẻ tiến độ gọn */}
            <div className="rounded-2xl border border-primary-pastel/70 bg-surface/90 p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="text-primary tabular-nums">
                  {completedLessons}/{totalLessons} bài hoàn thành ({progressPct}%)
                </span>
                {totalDurationLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Clock className="size-3" animated={false} aria-hidden="true" />
                    {totalDurationLabel}
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4A85BF] to-[#356FA7] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Ô tìm kiếm nhanh bài học */}
            <label className="relative block">
              <span className="sr-only">Tìm bài học trong khóa</span>
              <Search
                aria-hidden="true"
                animated={false}
                className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-primary"
              />
              <input
                type="search"
                value={lessonQuery}
                onChange={(e) => setLessonQuery(e.target.value)}
                placeholder="Tìm nhanh tên bài học hoặc chương…"
                className="h-9 w-full rounded-full border border-border bg-surface pr-8 pl-9 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              {lessonQuery && (
                <button
                  type="button"
                  onClick={() => setLessonQuery("")}
                  aria-label="Xóa tìm kiếm bài học"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </label>
          </div>

          {/* Danh sách chương & bài */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5 pb-24">
            {filteredSections.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Không tìm thấy bài học nào khớp với “{lessonQuery}”.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSections.map((section, secIdx) => {
                  const isExpanded = Boolean(normalizedQuery) || expandedSections.has(section.id);
                  const secPct =
                    (section.total_lessons || 0) > 0
                      ? Math.round(((section.completed_lessons || 0) / (section.total_lessons || 1)) * 100)
                      : 0;

                  return (
                    <div
                      key={section.id}
                      className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2.5 px-3.5 py-3.5 text-left transition-colors hover:bg-primary-light/40"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary-pastel bg-primary-light font-display text-sm font-bold text-primary">
                            {String(secIdx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-bold text-foreground">
                              {section.title}
                            </h4>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                              <span className="text-primary tabular-nums">
                                {section.completed_lessons || 0}/{section.total_lessons || 0} bài
                              </span>
                              <span>· {formatDuration(section.total_duration || 0)}</span>
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-background">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${secPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-border/50 border-t border-border/60 bg-background/60">
                          {section.lessons.map((lesson) => {
                            const isCurrent = activeLesson === lesson.id;
                            return (
                              <div
                                key={lesson.id}
                                ref={(el) => {
                                  if (lessonRefs.current) {
                                    lessonRefs.current[lesson.id] = el;
                                  }
                                }}
                                className={`cursor-pointer px-3.5 py-3 transition-all ${
                                  isCurrent
                                    ? "border-l-4 border-primary bg-primary-light/70"
                                    : lesson.is_completed
                                      ? "bg-success-bg/20 hover:bg-surface"
                                      : "hover:bg-surface"
                                }`}
                                onClick={() => {
                                  if (lesson.is_locked || isCurrent) return;
                                  selectLesson(lesson.id);
                                }}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div
                                    className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                                      isCurrent
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : lesson.is_locked
                                          ? "bg-border text-muted-foreground"
                                          : lesson.is_completed
                                            ? "bg-success-bg text-success-foreground"
                                            : "bg-primary-light text-primary"
                                    }`}
                                  >
                                    {isCurrent ? (
                                      <CirclePlay solid animated={false} className="size-4" />
                                    ) : lesson.is_completed ? (
                                      <CircleCheck solid animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "quiz" ? (
                                      <CircleHelp solid animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "code" ? (
                                      <Code animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "flashcard" ? (
                                      <Layers animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "listening" ? (
                                      <Headphones animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "fill_blank" ? (
                                      <Pencil animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "speaking" ? (
                                      <Mic animated={false} className="size-4" />
                                    ) : lesson.lesson_type === "info" ? (
                                      <FileText animated={false} className="size-4" />
                                    ) : (
                                      <CirclePlay solid animated={false} className="size-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <h5
                                        className={`truncate text-xs font-bold sm:text-sm ${
                                          isCurrent
                                            ? "text-primary"
                                            : lesson.is_locked
                                              ? "text-muted-foreground/60"
                                              : "text-foreground"
                                        }`}
                                      >
                                        {lesson.title}
                                      </h5>
                                      {lesson.is_locked && (
                                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                                          <Lock animated={false} className="size-2.5" />
                                          Khóa
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                                      {formatDuration(lesson.duration)}
                                      {isCurrent ? " · Đang học" : ""}
                                    </p>

                                    {lesson.resources && lesson.resources.length > 0 && (
                                      <button
                                        type="button"
                                        disabled={lesson.is_locked}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenResources({
                                            open: true,
                                            lessonTitle: lesson.title,
                                            resources: lesson.resources as any[],
                                          });
                                        }}
                                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition ${
                                          lesson.is_locked
                                            ? "cursor-not-allowed border-border text-muted-foreground/50"
                                            : "cursor-pointer border-primary-pastel bg-surface text-primary hover:bg-primary-light"
                                        }`}
                                      >
                                        <FileText className="size-3" animated={false} aria-hidden="true" />
                                        <span>{lesson.resources.length} tài liệu</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
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
