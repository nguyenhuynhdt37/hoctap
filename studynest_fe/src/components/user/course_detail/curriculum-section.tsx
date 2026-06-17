"use client";

import { Section } from "@/types/user/course_detail";
import { HiBookOpen, HiChevronDown, HiChevronUp, HiPlay } from "react-icons/hi";

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
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Nội dung khóa học
        </h2>
        <button
          onClick={onToggleAll}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
        >
          {expandAll ? (
            <>
              <HiChevronUp className="h-4 w-4" />
              Thu gọn tất cả
            </>
          ) : (
            <>
              <HiChevronDown className="h-4 w-4" />
              Mở rộng tất cả
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow duration-300"
          >
            <button
              onClick={() => onToggleSection(section.id)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <HiBookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {section.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {section.lessons.length} bài học
                  </p>
                </div>
              </div>
              {expandedSections.has(section.id) ? (
                <HiChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <HiChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has(section.id) && (
              <div className="border-t border-gray-200 bg-gray-50/50">
                {section.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                        {index + 1}
                      </div>
                      <HiPlay className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 text-sm">
                        {lesson.title}
                      </span>
                      {lesson.is_preview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewLesson(courseId, lesson.id);
                          }}
                          className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-medium hover:bg-teal-600 transition-colors"
                        >
                          Xem trước
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                        {lesson.lesson_type === "video" ? "Video" : "Bài học"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatSecondsToMmSs(lesson.duration)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

