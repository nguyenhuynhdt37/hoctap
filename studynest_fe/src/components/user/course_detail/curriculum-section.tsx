"use client";

import { Badge } from "@/components/ui";
import { Section } from "@/types/user/course_detail";
import {
  HiBookOpen,
  HiChevronDown,
  HiChevronUp,
  HiPlay,
} from "react-icons/hi";

interface CurriculumSectionProps {
  sections: Section[];
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  expandAll: boolean;
  onToggleAll: () => void;
  onPreviewLesson: (courseId: string, lessonId: string) => void;
  courseId: string;
  formatSecondsToMmSs: (seconds: number | null | undefined) => string;
}

export default function CurriculumSection({
  sections,
  expandedSections,
  onToggleSection,
  expandAll,
  onToggleAll,
  onPreviewLesson,
  courseId,
  formatSecondsToMmSs,
}: CurriculumSectionProps) {
  const totalLessons = (sections || []).reduce(
    (sum, s) => sum + (s.lessons?.length || 0),
    0
  );

  return (
    <section className="bg-surface rounded-[24px] p-6 sm:p-8 border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block mb-1">
            Lộ trình bài giảng
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            Nội dung chương trình học
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gồm {sections.length} chương chuyên đề • {totalLessons} bài học chi tiết
          </p>
        </div>

        {sections.length > 0 && (
          <button
            type="button"
            onClick={onToggleAll}
            className="px-4 py-2 rounded-full bg-primary-light/80 hover:bg-primary-pastel/70 text-xs sm:text-sm text-primary font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {expandAll ? (
              <>
                <HiChevronUp className="h-4 w-4" />
                <span>Thu gọn tất cả</span>
              </>
            ) : (
              <>
                <HiChevronDown className="h-4 w-4" />
                <span>Mở rộng tất cả</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sections.map((section, sectionIdx) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <div
              key={section.id}
              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                isExpanded
                  ? "border-primary-pastel bg-background/40 shadow-2xs"
                  : "border-border bg-surface hover:border-primary-pastel/80"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-primary-light/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 bg-primary-light border border-primary-pastel rounded-xl flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {String(sectionIdx + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                      {section.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {section.lessons.length} bài học
                    </p>
                  </div>
                </div>

                <span className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  {isExpanded ? (
                    <HiChevronUp className="h-4 w-4 text-primary" />
                  ) : (
                    <HiChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border/80 bg-surface divide-y divide-border/60">
                  {section.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-primary-light/25 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                          {index + 1}
                        </span>
                        <HiPlay className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground text-sm font-medium truncate">
                          {lesson.title}
                        </span>
                        {lesson.is_preview && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewLesson(courseId, lesson.id);
                            }}
                            className="text-xs bg-primary-light text-primary border border-primary-pastel px-2.5 py-0.5 rounded-full font-semibold hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shrink-0"
                          >
                            Học thử
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <Badge variant="default" size="sm">
                          <HiBookOpen className="w-3 h-3 mr-1 inline" />
                          {lesson.lesson_type === "video" ? "Video" : "Bài học"}
                        </Badge>
                        {lesson.duration ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatSecondsToMmSs(lesson.duration)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
