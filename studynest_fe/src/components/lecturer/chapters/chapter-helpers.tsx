"use client";

import type {
  ApiSectionsResponse,
  Lesson,
  Section,
  SectionsResponse,
} from "@/types/lecturer/chapter";
import {
  BookOpen,
  Code,
  FileText,
  Headphones,
  HelpCircle,
  Layers,
  Mic,
  Pencil,
  Play,
} from "pulsoicon-react";
import type { ComponentType } from "react";

export type LessonTypeKey =
  | "video"
  | "quiz"
  | "code"
  | "flashcard"
  | "listening"
  | "fill_blank"
  | "speaking"
  | "article"
  | "info";

export interface LessonTypeMeta {
  key: LessonTypeKey;
  label: string;
  shortLabel: string;
  Icon: ComponentType<{ className?: string; animated?: boolean }>;
  iconBoxClass: string;
  iconTextClass: string;
  badgeClass: string;
  barClass: string;
}

export const LESSON_TYPE_META: Record<LessonTypeKey, LessonTypeMeta> = {
  video: {
    key: "video",
    label: "Video bài giảng",
    shortLabel: "Video",
    Icon: Play,
    iconBoxClass: "bg-primary-light border border-primary-pastel",
    iconTextClass: "text-primary",
    badgeClass: "bg-primary-light text-primary border-primary-pastel",
    barClass: "bg-primary",
  },
  quiz: {
    key: "quiz",
    label: "Trắc nghiệm",
    shortLabel: "Trắc nghiệm",
    Icon: HelpCircle,
    iconBoxClass: "bg-warning-bg border border-warning-border",
    iconTextClass: "text-warning-foreground",
    badgeClass: "bg-warning-bg text-warning-foreground border-warning-border",
    barClass: "bg-[#C98A2C]",
  },
  code: {
    key: "code",
    label: "Thực hành lập trình",
    shortLabel: "Lập trình",
    Icon: Code,
    iconBoxClass: "bg-accent border border-accent-border",
    iconTextClass: "text-accent-foreground",
    badgeClass: "bg-accent text-accent-foreground border-accent-border",
    barClass: "bg-[#7E57C2]",
  },
  flashcard: {
    key: "flashcard",
    label: "Thẻ ghi nhớ & Giọng đọc",
    shortLabel: "Flashcard",
    Icon: Layers,
    iconBoxClass: "bg-secondary-light border border-secondary-pastel",
    iconTextClass: "text-secondary-foreground",
    badgeClass:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    barClass: "bg-[#D16B8F]",
  },
  listening: {
    key: "listening",
    label: "Luyện Nghe Hội Thoại",
    shortLabel: "Luyện nghe",
    Icon: Headphones,
    iconBoxClass: "bg-primary-light border border-primary-pastel",
    iconTextClass: "text-primary",
    badgeClass: "bg-primary-light text-primary border-primary-pastel",
    barClass: "bg-[#5B8DEF]",
  },
  fill_blank: {
    key: "fill_blank",
    label: "Điền từ vào chỗ trống",
    shortLabel: "Điền từ",
    Icon: Pencil,
    iconBoxClass: "bg-accent border border-accent-border",
    iconTextClass: "text-accent-foreground",
    badgeClass: "bg-accent text-accent-foreground border-accent-border",
    barClass: "bg-[#8B6CE8]",
  },
  speaking: {
    key: "speaking",
    label: "Giao tiếp AI (Roleplay)",
    shortLabel: "Giao tiếp AI",
    Icon: Mic,
    iconBoxClass: "bg-success-bg border border-success-border",
    iconTextClass: "text-success-foreground",
    badgeClass: "bg-success-bg text-success-foreground border-success-border",
    barClass: "bg-[#4A9B6D]",
  },
  article: {
    key: "article",
    label: "Bài đọc",
    shortLabel: "Bài đọc",
    Icon: BookOpen,
    iconBoxClass: "bg-success-bg border border-success-border",
    iconTextClass: "text-success-foreground",
    badgeClass: "bg-success-bg text-success-foreground border-success-border",
    barClass: "bg-[#4A9B6D]",
  },
  info: {
    key: "info",
    label: "Thông tin",
    shortLabel: "Thông tin",
    Icon: FileText,
    iconBoxClass: "bg-secondary-light border border-secondary-pastel",
    iconTextClass: "text-secondary-foreground",
    badgeClass: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    barClass: "bg-[#D16B8F]",
  },
};

export function normalizeLessonType(lessonType?: string | null): LessonTypeKey {
  const raw = (lessonType || "video").toLowerCase();
  if (
    raw === "quiz" ||
    raw === "code" ||
    raw === "flashcard" ||
    raw === "listening" ||
    raw === "fill_blank" ||
    raw === "speaking" ||
    raw === "article" ||
    raw === "info"
  ) {
    return raw;
  }
  return "video";
}

export function getLessonMeta(lessonType?: string | null): LessonTypeMeta {
  return LESSON_TYPE_META[normalizeLessonType(lessonType)];
}

export function mapApiResponseToSections(
  apiData: ApiSectionsResponse
): SectionsResponse {
  return {
    status: "success",
    course_id: apiData.course_id,
    sections: [...(apiData.sections || [])]
      .sort((a, b) => a.position - b.position)
      .map((apiSection) => ({
        id: apiSection.section_id,
        title: apiSection.section_title,
        lessons: [...(apiSection.lessons || [])]
          .sort((a, b) => a.position - b.position)
          .map((apiLesson) => ({
            id: apiLesson.lesson_id,
            title: apiLesson.lesson_title,
            lesson_type: apiLesson.lesson_type,
          })),
      })),
  };
}

export interface CurriculumHealth {
  score: number;
  label: string;
  hint: string;
  emptySectionCount: number;
  typeCounts: Record<LessonTypeKey, number>;
  totalLessons: number;
  practiceCount: number;
  practiceRatio: number;
}

export function analyzeCurriculumHealth(sections: Section[]): CurriculumHealth {
  const typeCounts: Record<LessonTypeKey, number> = {
    video: 0,
    quiz: 0,
    code: 0,
    flashcard: 0,
    listening: 0,
    fill_blank: 0,
    speaking: 0,
    article: 0,
    info: 0,
  };

  let totalLessons = 0;
  let emptySectionCount = 0;

  for (const section of sections) {
    const lessons = section.lessons || [];
    if (lessons.length === 0) emptySectionCount += 1;
    for (const lesson of lessons) {
      totalLessons += 1;
      const key = normalizeLessonType(lesson.lesson_type);
      typeCounts[key] += 1;
    }
  }

  const practiceCount = typeCounts.quiz + typeCounts.code;
  const practiceRatio =
    totalLessons > 0 ? Math.round((practiceCount / totalLessons) * 100) : 0;

  if (sections.length === 0) {
    return {
      score: 0,
      label: "Chưa khởi tạo",
      hint: "Tạo chương học đầu tiên để bắt đầu dựng khung giáo trình.",
      emptySectionCount: 0,
      typeCounts,
      totalLessons: 0,
      practiceCount: 0,
      practiceRatio: 0,
    };
  }

  let score = 25; // Đã có cấu trúc chương
  if (sections.length >= 2) score += 15;
  if (totalLessons >= 3) score += 20;
  else if (totalLessons > 0) score += 10;

  if (emptySectionCount === 0) {
    score += 20;
  } else {
    const filledRatio = (sections.length - emptySectionCount) / sections.length;
    score += Math.round(filledRatio * 20);
  }

  const activeFormats = (Object.values(typeCounts) as number[]).filter((n) => n > 0).length;
  if (activeFormats >= 2) score += 10;
  if (practiceCount > 0) score += 10;

  score = Math.min(100, Math.max(0, score));

  let label = "Cần bổ sung";
  let hint = "Thêm bài học vào các chương trống để hoàn thiện lộ trình.";

  if (emptySectionCount > 0) {
    label = score >= 70 ? "Khá tốt" : "Cần bổ sung";
    hint = `Còn ${emptySectionCount} chương chưa có bài học — hãy bổ sung hoặc gom gọn.`;
  } else if (practiceCount === 0 && totalLessons >= 3) {
    label = "Tốt";
    hint = "Thêm 1–2 bài Trắc nghiệm hoặc Lập trình giúp học viên ghi nhớ sâu hơn.";
  } else if (score >= 85) {
    label = "Rất chuẩn";
    hint = "Cấu trúc chương mạch lạc, cân bằng tốt giữa bài giảng và thực hành.";
  } else {
    label = "Đang hoàn thiện";
    hint = "Tiếp tục bổ sung bài học để lộ trình học tập thêm phong phú.";
  }

  return {
    score,
    label,
    hint,
    emptySectionCount,
    typeCounts,
    totalLessons,
    practiceCount,
    practiceRatio,
  };
}

export function translateCourseStatus(status?: string | null): {
  label: string;
  className: string;
} {
  switch ((status || "").toLowerCase()) {
    case "approved":
    case "published":
      return {
        label: "Đã duyệt",
        className: "bg-success-bg text-success-foreground border-success-border",
      };
    case "pending":
      return {
        label: "Chờ duyệt",
        className: "bg-warning-bg text-warning-foreground border-warning-border",
      };
    case "rejected":
      return {
        label: "Bị từ chối",
        className:
          "bg-destructive-bg text-destructive-foreground border-destructive-border",
      };
    case "archived":
      return {
        label: "Đã lưu trữ",
        className: "bg-surface-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: "Bản nháp",
        className: "bg-primary-light text-primary border-primary-pastel",
      };
  }
}

export function ReadinessRing({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-primary-light"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold leading-none text-foreground">
          {clamped}%
        </span>
        <span className="mt-1 max-w-[66px] truncate text-[10px] font-semibold text-primary">
          {label}
        </span>
      </div>
    </div>
  );
}

export function dedupeLessons(lessons: Lesson[]): Lesson[] {
  const seen = new Set<string>();
  const out: Lesson[] = [];
  for (const lesson of lessons || []) {
    if (!lesson.id || seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    out.push(lesson);
  }
  return out;
}
