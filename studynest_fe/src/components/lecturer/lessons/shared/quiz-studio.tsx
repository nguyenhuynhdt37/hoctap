"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import { renderLearningContent } from "@/components/shared/markdown-renderer/safe-html";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { QuizFormData } from "@/types/lecturer/lesson-api";
import { CreateQuizData, CreateQuizOption } from "@/types/lecturer/quiz";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  HelpCircle,
  Layers,
  ListChecks,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Video,
  X,
  XCircle,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ============================================
// TYPES & HELPERS
// ============================================

export interface QuizStudioItem extends CreateQuizData {
  uid: string;
}

export interface StudioVideoLessonOption {
  id: string;
  title: string;
  duration?: number | null;
}

export interface StudioVideoSectionGroup {
  sectionId: string;
  sectionTitle: string;
  isCurrent?: boolean;
  videos: StudioVideoLessonOption[];
}

export interface QuizStudioProps {
  mode: "create" | "edit";
  courseId?: string | null;
  sectionName?: string;
  formData: QuizFormData;
  onFormDataChange: (updater: (prev: QuizFormData) => QuizFormData) => void;
  quizzes: QuizStudioItem[];
  onQuizzesChange: (updater: (prev: QuizStudioItem[]) => QuizStudioItem[]) => void;
  videoSections: StudioVideoSectionGroup[];
  isSubmitting: boolean;
  hasChanges?: boolean;
  error: string | null;
  onClearError?: () => void;
  successBanner?: {
    title: string;
    description: string;
    lessonId?: string | null;
  } | null;
  onSubmit: () => Promise<void> | void;
  onBackToChapters: () => void;
  onOpenResources?: (lessonId: string) => void;
  onOpenEdit?: (lessonId: string) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const DIFFICULTY_META: Record<
  number,
  {
    label: string;
    short: string;
    badgeClass: string;
    dotClass: string;
    barClass: string;
  }
> = {
  1: {
    label: "Dễ — Nhận biết",
    short: "Dễ",
    badgeClass:
      "bg-success-bg text-success-foreground border-success-border",
    dotClass: "bg-success",
    barClass: "bg-success",
  },
  2: {
    label: "Trung bình — Thông hiểu",
    short: "Trung bình",
    badgeClass:
      "bg-warning-bg text-warning-foreground border-warning-border",
    dotClass: "bg-warning",
    barClass: "bg-warning",
  },
  3: {
    label: "Khó — Vận dụng",
    short: "Khó",
    badgeClass:
      "bg-secondary-light text-secondary-foreground border-secondary-pastel",
    dotClass: "bg-secondary-foreground",
    barClass: "bg-secondary-foreground",
  },
};

export function createQuizUid(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyQuizItem(): QuizStudioItem {
  return {
    uid: createQuizUid(),
    question: "",
    explanation: "",
    difficulty_level: 1,
    options: [
      { text: "", is_correct: true, feedback: "", position: 0 },
      { text: "", is_correct: false, feedback: "", position: 1 },
      { text: "", is_correct: false, feedback: "", position: 2 },
      { text: "", is_correct: false, feedback: "", position: 3 },
    ],
  };
}

export function stripMarkdownText(text: string): string {
  return (text || "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

export function getQuizValidationIssues(quiz: CreateQuizData): string[] {
  const issues: string[] = [];
  if (!stripMarkdownText(quiz.question)) {
    issues.push("Chưa nhập nội dung câu hỏi");
  }
  if (!quiz.options || quiz.options.length < 2) {
    issues.push("Cần ít nhất 2 phương án");
  } else {
    const emptyIdx = quiz.options.findIndex((opt) => !opt.text.trim());
    if (emptyIdx !== -1) {
      issues.push(
        `Phương án ${OPTION_LETTERS[emptyIdx] ?? emptyIdx + 1} chưa có nội dung`
      );
    }
    if (!quiz.options.some((opt) => opt.is_correct)) {
      issues.push("Chưa chọn đáp án đúng");
    }
  }
  return issues;
}

export function validateQuizStudioForm(
  formData: QuizFormData,
  quizzes: CreateQuizData[]
): { valid: boolean; message?: string; invalidQuizIndex?: number } {
  if (!formData.title.trim()) {
    return { valid: false, message: "Vui lòng nhập tiêu đề bài học trắc nghiệm." };
  }
  if (!stripMarkdownText(formData.description)) {
    return { valid: false, message: "Vui lòng nhập mô tả ngắn cho bài học trắc nghiệm." };
  }
  if (quizzes.length === 0) {
    return { valid: false, message: "Vui lòng tạo ít nhất 1 câu hỏi trắc nghiệm." };
  }
  for (let i = 0; i < quizzes.length; i++) {
    const issues = getQuizValidationIssues(quizzes[i]);
    if (issues.length > 0) {
      return {
        valid: false,
        message: `Câu ${i + 1}: ${issues[0]}.`,
        invalidQuizIndex: i,
      };
    }
  }
  return { valid: true };
}

// ============================================
// MAIN STUDIO COMPONENT
// ============================================

export function QuizStudio({
  mode,
  sectionName,
  formData,
  onFormDataChange,
  quizzes,
  onQuizzesChange,
  videoSections,
  isSubmitting,
  hasChanges = true,
  error,
  onClearError,
  successBanner,
  onSubmit,
  onBackToChapters,
  onOpenResources,
  onOpenEdit,
}: QuizStudioProps) {
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [infoExpanded, setInfoExpanded] = useState(mode === "create");
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);
  const [aiScopeMode, setAiScopeMode] = useState<"single" | "multiple" | "chapter">(
    "multiple"
  );
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [aiApplyMode, setAiApplyMode] = useState<"append" | "replace">("append");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingQuizzes, setIsGeneratingQuizzes] = useState(false);
  const [openFeedbackMap, setOpenFeedbackMap] = useState<Record<string, boolean>>({});
  const [previewSelectedIdx, setPreviewSelectedIdx] = useState<number | null>(null);
  const aiPanelRef = useRef<HTMLDivElement | null>(null);

  const handleToggleAiPanel = () => {
    setAiPanelExpanded((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          aiPanelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
      return next;
    });
  };

  const allVideoLessons = useMemo(
    () => videoSections.flatMap((group) => group.videos),
    [videoSections]
  );

  // Giữ activeQuizIndex luôn nằm trong giới hạn mảng quizzes
  useEffect(() => {
    if (quizzes.length === 0) {
      setActiveQuizIndex(0);
    } else if (activeQuizIndex >= quizzes.length) {
      setActiveQuizIndex(quizzes.length - 1);
    }
  }, [quizzes.length, activeQuizIndex]);

  // Reset trạng thái chọn thử đáp án ở khung Xem trước khi đổi câu hỏi
  const currentQuiz = quizzes[activeQuizIndex] ?? null;
  useEffect(() => {
    setPreviewSelectedIdx(null);
  }, [currentQuiz?.uid]);

  // Tính toán sức khỏe bộ đề
  const stats = useMemo(() => {
    const total = quizzes.length;
    const issuesByIndex = quizzes.map((q) => getQuizValidationIssues(q));
    const validCount = issuesByIndex.filter((list) => list.length === 0).length;
    const withExplanationCount = quizzes.filter(
      (q) => stripMarkdownText(q.explanation).length > 0
    ).length;
    const easyCount = quizzes.filter((q) => (q.difficulty_level || 1) === 1).length;
    const mediumCount = quizzes.filter((q) => q.difficulty_level === 2).length;
    const hardCount = quizzes.filter((q) => q.difficulty_level === 3).length;

    const hasTitle = formData.title.trim().length > 0;
    const hasDesc = stripMarkdownText(formData.description).length > 0;
    const allQuizzesValid = total > 0 && validCount === total;
    const hasExplanations = total > 0 && withExplanationCount === total;

    const scoreParts = [
      hasTitle ? 20 : 0,
      hasDesc ? 15 : 0,
      total > 0 ? Math.round((validCount / total) * 45) : 0,
      total > 0 ? Math.round((withExplanationCount / total) * 20) : 0,
    ];
    const readinessPercent = Math.min(
      100,
      scoreParts.reduce((a, b) => a + b, 0)
    );

    const firstInvalidIndex = issuesByIndex.findIndex((list) => list.length > 0);

    return {
      total,
      validCount,
      withExplanationCount,
      easyCount,
      mediumCount,
      hardCount,
      hasTitle,
      hasDesc,
      allQuizzesValid,
      hasExplanations,
      readinessPercent,
      issuesByIndex,
      firstInvalidIndex,
    };
  }, [quizzes, formData]);

  // ============================================
  // AI HANDLERS
  // ============================================

  const handleGenerateTitle = async () => {
    if (!formData.title.trim()) {
      showToast.error("Vui lòng nhập tiêu đề nháp trước khi nhờ AI tối ưu.");
      return;
    }
    setIsGeneratingTitle(true);
    onClearError?.();
    try {
      const response = await api.post("/lecturers/chat/lesson/rewrite_the_title", {
        title: formData.title.trim(),
      });
      if (typeof response.data === "string" && response.data.trim()) {
        onFormDataChange((prev) => ({ ...prev, title: response.data.trim() }));
        showToast.success("Đã tối ưu tiêu đề bài học bằng AI.");
      } else {
        showToast.error("AI chưa trả về tiêu đề mới. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tối ưu tiêu đề bằng AI"));
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      showToast.error("Vui lòng nhập tiêu đề bài học trước.");
      return;
    }
    if (!sectionName) {
      showToast.error("Đang tải thông tin chương học. Vui lòng thử lại sau giây lát.");
      return;
    }
    setIsGeneratingDescription(true);
    onClearError?.();
    try {
      const response = await api.post("/lecturers/chat/lesson/create_description", {
        title: formData.title.trim(),
        section_name: sectionName,
      });
      if (typeof response.data === "string" && response.data.trim()) {
        onFormDataChange((prev) => ({ ...prev, description: response.data }));
        showToast.success("Đã tạo mô tả bài học bằng AI.");
      } else {
        showToast.error("AI chưa trả về mô tả. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tạo mô tả tự động"));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleToggleLesson = (id: string) => {
    if (aiScopeMode === "single") {
      setSelectedLessonIds([id]);
      return;
    }
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSectionVideos = (section: StudioVideoSectionGroup) => {
    const ids = section.videos.map((v) => v.id);
    if (ids.length === 0) return;
    setSelectedLessonIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !ids.includes(id));
      }
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const handleSwitchScopeMode = (nextMode: "single" | "multiple" | "chapter") => {
    setAiScopeMode(nextMode);
    if (nextMode === "single") {
      setSelectedLessonIds((prev) => (prev.length > 0 ? [prev[0]] : []));
    } else if (nextMode === "chapter") {
      setSelectedLessonIds((prev) => {
        if (prev.length > 0) return prev;
        const currentGroup =
          videoSections.find((g) => g.isCurrent) || videoSections[0];
        return currentGroup ? currentGroup.videos.map((v) => v.id) : [];
      });
    }
  };

  const handleToggleAllVideos = () => {
    if (selectedLessonIds.length === allVideoLessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(allVideoLessons.map((v) => v.id));
    }
  };

  const handleGenerateQuizzesFromVideos = async () => {
    if (selectedLessonIds.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một bài học video làm ngữ cảnh.");
      return;
    }
    setIsGeneratingQuizzes(true);
    onClearError?.();
    try {
      const response = await api.post("/lecturers/chat/lesson/quizzes", {
        lesson_ids: selectedLessonIds,
      });
      const generated = Array.isArray(response.data) ? response.data : [];
      if (generated.length === 0) {
        showToast.error("AI chưa sinh được câu hỏi từ video đã chọn. Vui lòng thử lại.");
        return;
      }

      const formatted: QuizStudioItem[] = generated.map((quiz: any) => ({
        uid: createQuizUid(),
        question: quiz.question || "",
        explanation: quiz.explanation || "",
        difficulty_level:
          quiz.difficulty_level === 2 || quiz.difficulty_level === 3
            ? quiz.difficulty_level
            : 1,
        options: (quiz.options || []).map((opt: any, idx: number) => ({
          text: opt.text || "",
          is_correct: Boolean(opt.is_correct),
          feedback: opt.feedback || "",
          position: idx,
        })),
      }));

      // Kiểm tra nếu hiện tại chỉ có 1 câu trống thì tự thay thế gọn gàng
      const onlySingleEmpty =
        quizzes.length === 1 &&
        !stripMarkdownText(quizzes[0].question) &&
        quizzes[0].options.every((o) => !o.text.trim());

      if (aiApplyMode === "replace" || onlySingleEmpty) {
        onQuizzesChange(() => formatted);
        setActiveQuizIndex(0);
      } else {
        const nextIndex = quizzes.length;
        onQuizzesChange((prev) => [...prev, ...formatted]);
        setActiveQuizIndex(nextIndex);
      }

      showToast.success(
        `Đã sinh ${formatted.length} câu hỏi trắc nghiệm từ ${selectedLessonIds.length} bài giảng video.`
      );
      setSelectedLessonIds([]);
      setAiPanelExpanded(false);
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể tạo câu hỏi tự động từ video"));
    } finally {
      setIsGeneratingQuizzes(false);
    }
  };

  // ============================================
  // QUIZ MUTATION HANDLERS
  // ============================================

  const updateCurrentQuiz = (updater: (quiz: QuizStudioItem) => QuizStudioItem) => {
    onQuizzesChange((prev) =>
      prev.map((item, idx) => (idx === activeQuizIndex ? updater(item) : item))
    );
  };

  const handleAddQuiz = () => {
    const newItem = createEmptyQuizItem();
    onQuizzesChange((prev) => [...prev, newItem]);
    setActiveQuizIndex(quizzes.length);
  };

  const handleDuplicateQuiz = () => {
    if (!currentQuiz) return;
    const copy: QuizStudioItem = {
      ...currentQuiz,
      uid: createQuizUid(),
      options: currentQuiz.options.map((opt, idx) => ({ ...opt, position: idx })),
    };
    const insertAt = activeQuizIndex + 1;
    onQuizzesChange((prev) => [
      ...prev.slice(0, insertAt),
      copy,
      ...prev.slice(insertAt),
    ]);
    setActiveQuizIndex(insertAt);
    showToast.success(`Đã nhân bản câu ${activeQuizIndex + 1}.`);
  };

  const handleMoveQuiz = (direction: -1 | 1) => {
    const target = activeQuizIndex + direction;
    if (target < 0 || target >= quizzes.length) return;
    onQuizzesChange((prev) => {
      const next = [...prev];
      const [moved] = next.splice(activeQuizIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setActiveQuizIndex(target);
  };

  const handleRemoveQuiz = () => {
    if (quizzes.length <= 1) {
      showToast.error("Bài trắc nghiệm cần có ít nhất 1 câu hỏi.");
      return;
    }
    const nextIdx = Math.max(0, activeQuizIndex - 1);
    onQuizzesChange((prev) => prev.filter((_, idx) => idx !== activeQuizIndex));
    setActiveQuizIndex(nextIdx);
  };

  const handleOptionChange = (
    optIdx: number,
    field: keyof CreateQuizOption,
    value: string | boolean
  ) => {
    updateCurrentQuiz((quiz) => ({
      ...quiz,
      options: quiz.options.map((opt, idx) => {
        if (field === "is_correct" && value === true) {
          return { ...opt, is_correct: idx === optIdx };
        }
        return idx === optIdx ? { ...opt, [field]: value } : opt;
      }),
    }));
  };

  const handleAddOption = () => {
    if (!currentQuiz) return;
    if (currentQuiz.options.length >= 4) {
      showToast.error("Mỗi câu hỏi hỗ trợ tối đa 4 phương án (A–D).");
      return;
    }
    updateCurrentQuiz((quiz) => ({
      ...quiz,
      options: [
        ...quiz.options,
        {
          text: "",
          is_correct: false,
          feedback: "",
          position: quiz.options.length,
        },
      ],
    }));
  };

  const handleRemoveOption = (optIdx: number) => {
    if (!currentQuiz) return;
    if (currentQuiz.options.length <= 2) {
      showToast.error("Mỗi câu hỏi cần ít nhất 2 phương án trả lời.");
      return;
    }
    updateCurrentQuiz((quiz) => {
      const filtered = quiz.options
        .filter((_, idx) => idx !== optIdx)
        .map((opt, idx) => ({ ...opt, position: idx }));
      if (!filtered.some((opt) => opt.is_correct) && filtered.length > 0) {
        filtered[0] = { ...filtered[0], is_correct: true };
      }
      return { ...quiz, options: filtered };
    });
  };

  const handleTriggerSubmit = () => {
    const check = validateQuizStudioForm(formData, quizzes);
    if (!check.valid) {
      showToast.error(check.message || "Vui lòng kiểm tra lại thông tin bộ đề.");
      if (typeof check.invalidQuizIndex === "number") {
        setActiveQuizIndex(check.invalidQuizIndex);
      } else {
        setInfoExpanded(true);
      }
      return;
    }
    void onSubmit();
  };

  // Ring SVG thông số
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (stats.readinessPercent / 100) * ringCircumference;

  const currentDiff =
    DIFFICULTY_META[currentQuiz?.difficulty_level || 1] || DIFFICULTY_META[1];
  const currentIssues = currentQuiz ? getQuizValidationIssues(currentQuiz) : [];

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── HERO / STICKY STUDIO HEADER (CLOUDY BLUE PASTEL) ── */}
      <div className="border-b border-border bg-gradient-to-b from-primary-light/60 via-surface to-surface">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBackToChapters}
                className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Quay lại Chương &amp; bài học
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <ListChecks className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                  {formData.title.trim() ||
                    (mode === "create"
                      ? "Xưởng soạn bài Trắc nghiệm mới"
                      : "Chỉnh sửa bài Trắc nghiệm")}
                </h1>
                {sectionName && (
                  <Badge variant="primary" size="sm">
                    Chương: {sectionName}
                  </Badge>
                )}
                {mode === "edit" && (
                  <Badge
                    variant={hasChanges ? "warning" : "success"}
                    size="sm"
                  >
                    {hasChanges ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                Soạn câu hỏi trắc nghiệm trực tiếp, sinh câu hỏi thông minh từ bài giảng video và kiểm thử ngay trên khung xem trước học viên.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {allVideoLessons.length > 0 && (
                <Button
                  type="button"
                  variant={aiPanelExpanded ? "primary" : "pastel"}
                  size="sm"
                  onClick={handleToggleAiPanel}
                  leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                >
                  {aiPanelExpanded
                    ? `Đang chọn Video AI (${allVideoLessons.length})`
                    : `AI sinh từ Video (${allVideoLessons.length})`}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuiz}
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Thêm câu hỏi
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleTriggerSubmit}
                disabled={isSubmitting || (mode === "edit" && !hasChanges)}
                isLoading={isSubmitting}
                loadingText={mode === "create" ? "Đang tạo..." : "Đang lưu..."}
                leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {mode === "create" ? "Tạo bài Trắc nghiệm" : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE 2 CỘT ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {successBanner && (
          <div className="mb-5">
            <Alert variant="success" title={successBanner.title}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">{successBanner.description}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {successBanner.lessonId && onOpenEdit && mode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenEdit(successBanner.lessonId!)}
                    >
                      Mở trang chỉnh sửa
                    </Button>
                  )}
                  {successBanner.lessonId && onOpenResources && (
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      leftIcon={<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => onOpenResources(successBanner.lessonId!)}
                    >
                      Quản lý tài nguyên
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onBackToChapters}
                  >
                    Về Chương &amp; bài học
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        )}

        {error && (
          <div className="mb-5">
            <Alert variant="destructive" title="Có lỗi xảy ra">
              {error}
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ── CỘT TRÁI (8/12): AI + THÔNG TIN + SOẠN CÂU HỎI ── */}
          <div className="space-y-5 lg:col-span-8">
            {/* KHỐI AI SINH QUIZ TỪ VIDEO (NẰM NGAY ĐẦU CỘT TRÁI KHI MỞ) */}
            {allVideoLessons.length > 0 && aiPanelExpanded && (
              <div ref={aiPanelRef}>
                <Card
                  variant="pastel-blue"
                  className="border-2 border-primary-pastel p-5 shadow-sm"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                        <Bot className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          Sinh câu hỏi tự động từ bài giảng Video
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Chọn 1 bài cụ thể, một vài bài tự chọn hoặc chọn nhanh cả chương để AI đọc transcript &amp; chỉ mục tạo bộ câu hỏi.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {aiScopeMode !== "single" && (
                        <button
                          type="button"
                          onClick={handleToggleAllVideos}
                          className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                        >
                          {selectedLessonIds.length === allVideoLessons.length
                            ? "Bỏ chọn tất cả"
                            : `Chọn tất cả (${allVideoLessons.length} video)`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setAiPanelExpanded(false)}
                        aria-label="Đóng bảng chọn video AI"
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-primary-pastel bg-surface text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Bộ chọn phạm vi: 1 bài / Một vài bài / Cả chương */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                      {[
                        { id: "single", label: "Theo 1 bài" },
                        { id: "multiple", label: "Một vài bài" },
                        { id: "chapter", label: "Cả chương" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            handleSwitchScopeMode(
                              opt.id as "single" | "multiple" | "chapter"
                            )
                          }
                          className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                            aiScopeMode === opt.id
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Đã chọn{" "}
                      <strong className="text-primary">
                        {selectedLessonIds.length}
                      </strong>{" "}
                      bài video
                    </span>
                  </div>

                  {/* Chế độ Cả chương: hiển thị từng thẻ Chương */}
                  {aiScopeMode === "chapter" ? (
                    <div className="mb-4 max-h-60 space-y-2.5 overflow-y-auto pr-1">
                      {videoSections.map((group) => {
                        const groupIds = group.videos.map((v) => v.id);
                        const selectedInGroup = groupIds.filter((id) =>
                          selectedLessonIds.includes(id)
                        ).length;
                        const allSelected =
                          groupIds.length > 0 && selectedInGroup === groupIds.length;
                        return (
                          <button
                            key={group.sectionId}
                            type="button"
                            onClick={() => handleToggleSectionVideos(group)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                              allSelected
                                ? "border-primary bg-surface shadow-xs"
                                : "border-border bg-surface/85 hover:border-primary-pastel"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                  allSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-surface"
                                }`}
                              >
                                {allSelected && (
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-foreground">
                                    {group.sectionTitle}
                                  </span>
                                  {group.isCurrent && (
                                    <Badge variant="primary" size="sm">
                                      Chương hiện tại
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {group.videos.length} bài giảng video
                                  {selectedInGroup > 0 && !allSelected
                                    ? ` · Đang chọn ${selectedInGroup}/${group.videos.length}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-primary">
                              {allSelected ? "Bỏ chọn chương" : "Chọn cả chương"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Chế độ 1 bài hoặc Một vài bài: nhóm theo Chương */
                    <div className="mb-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                      {videoSections.map((group) => {
                        const groupIds = group.videos.map((v) => v.id);
                        const allGroupSelected =
                          groupIds.length > 0 &&
                          groupIds.every((id) => selectedLessonIds.includes(id));
                        return (
                          <div key={group.sectionId} className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {group.sectionTitle}
                                </span>
                                {group.isCurrent && (
                                  <Badge variant="primary" size="sm">
                                    Chương hiện tại
                                  </Badge>
                                )}
                              </div>
                              {aiScopeMode === "multiple" && group.videos.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSectionVideos(group)}
                                  className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                                >
                                  {allGroupSelected
                                    ? "Bỏ chọn chương này"
                                    : `Chọn cả chương (${group.videos.length})`}
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {group.videos.map((lesson) => {
                                const checked = selectedLessonIds.includes(lesson.id);
                                return (
                                  <label
                                    key={lesson.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                                      checked
                                        ? "border-primary bg-surface shadow-xs"
                                        : "border-border bg-surface/80 hover:border-primary-pastel"
                                    }`}
                                  >
                                    <input
                                      type={
                                        aiScopeMode === "single"
                                          ? "radio"
                                          : "checkbox"
                                      }
                                      name={
                                        aiScopeMode === "single"
                                          ? "ai-quiz-single-video"
                                          : undefined
                                      }
                                      checked={checked}
                                      onChange={() => handleToggleLesson(lesson.id)}
                                      className="h-4 w-4 cursor-pointer border-border text-primary focus:ring-primary"
                                    />
                                    <Video
                                      className="h-4 w-4 shrink-0 text-primary"
                                      aria-hidden="true"
                                    />
                                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                                      {lesson.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-primary-pastel/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex rounded-xl border border-primary-pastel bg-surface p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setAiApplyMode("append")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          aiApplyMode === "append"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Nối thêm vào bộ hiện tại
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiApplyMode("replace")}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                          aiApplyMode === "replace"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Thay thế bộ câu hỏi
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleGenerateQuizzesFromVideos}
                      disabled={isGeneratingQuizzes || selectedLessonIds.length === 0}
                      isLoading={isGeneratingQuizzes}
                      loadingText="AI đang soạn câu hỏi..."
                      leftIcon={<Bot className="h-4 w-4" aria-hidden="true" />}
                    >
                      Sinh câu hỏi ({selectedLessonIds.length} video)
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* KHỐI 1: THÔNG TIN CƠ BẢN (THU GỌN / MỞ RỘNG) */}
            <Card className="overflow-hidden border border-border bg-surface shadow-xs">
              <button
                type="button"
                onClick={() => setInfoExpanded((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-primary-light/25"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground sm:text-base">
                      Thông tin bài học Trắc nghiệm
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {stats.hasTitle && stats.hasDesc
                        ? "Đã điền đầy đủ tiêu đề và mô tả bài học"
                        : "Cần nhập tiêu đề và mô tả ngắn cho bài học"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={stats.hasTitle && stats.hasDesc ? "success" : "warning"}
                    size="sm"
                  >
                    {stats.hasTitle && stats.hasDesc ? "Đầy đủ" : "Cần bổ sung"}
                  </Badge>
                  {infoExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </button>

              {infoExpanded && (
                <div className="space-y-5 border-t border-border px-5 py-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-foreground">
                        Tiêu đề bài học <span className="text-destructive">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleGenerateTitle}
                        disabled={isGeneratingTitle || !formData.title.trim()}
                        isLoading={isGeneratingTitle}
                        loadingText="Đang tối ưu..."
                        leftIcon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        AI tối ưu tiêu đề
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        onFormDataChange((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Ví dụ: Kiểm tra nhanh — Cực trị hàm số bậc ba"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-foreground">
                        Mô tả &amp; hướng dẫn làm bài{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={
                          isGeneratingDescription ||
                          !formData.title.trim() ||
                          !sectionName
                        }
                        isLoading={isGeneratingDescription}
                        loadingText="Đang tạo..."
                        leftIcon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        AI tạo mô tả
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                      <TiptapEditor
                        value={formData.description}
                        onChange={(markdown) =>
                          onFormDataChange((prev) => ({
                            ...prev,
                            description: markdown,
                          }))
                        }
                        placeholder="Mô tả mục tiêu kiểm tra, kiến thức trọng tâm hoặc lưu ý trước khi làm bài..."
                        minHeight="140px"
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* KHỐI 3: DẢI ĐIỀU HƯỚNG CÂU HỎI (QUESTION STRIP) */}
            <Card className="border border-border bg-surface p-4 shadow-xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-foreground">
                    Danh sách câu hỏi ({quizzes.length})
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    · {stats.validCount}/{stats.total} câu hợp lệ
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuiz(-1)}
                    disabled={activeQuizIndex <= 0}
                    aria-label="Chuyển câu hỏi lên trước"
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveQuiz(1)}
                    disabled={activeQuizIndex >= quizzes.length - 1}
                    aria-label="Chuyển câu hỏi ra sau"
                    className="h-8 px-2"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicateQuiz}
                    disabled={!currentQuiz}
                    leftIcon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    className="h-8"
                  >
                    Nhân bản
                  </Button>
                  <Button
                    type="button"
                    variant="pastel"
                    size="sm"
                    onClick={handleAddQuiz}
                    leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    className="h-8"
                  >
                    Thêm câu
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quizzes.map((quiz, idx) => {
                  const isActive = idx === activeQuizIndex;
                  const isValid = stats.issuesByIndex[idx]?.length === 0;
                  const diff =
                    DIFFICULTY_META[quiz.difficulty_level || 1] ||
                    DIFFICULTY_META[1];
                  return (
                    <button
                      key={quiz.uid}
                      type="button"
                      onClick={() => setActiveQuizIndex(idx)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : isValid
                            ? "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/40"
                            : "border-warning-border bg-warning-bg/70 text-warning-foreground hover:bg-warning-bg"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? "bg-white"
                            : isValid
                              ? diff.dotClass
                              : "bg-warning"
                        }`}
                        aria-hidden="true"
                      />
                      <span>Câu {idx + 1}</span>
                      {!isValid && (
                        <AlertCircle
                          className={`h-3.5 w-3.5 ${
                            isActive ? "text-white/90" : "text-warning-foreground"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* KHỐI 4: TRÌNH SOẠN CÂU HỎI HIỆN TẠI */}
            {currentQuiz && (
              <Card className="border border-border bg-surface p-5 shadow-xs sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
                      {activeQuizIndex + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Biên tập Câu hỏi {activeQuizIndex + 1}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {currentIssues.length === 0
                          ? "Câu hỏi đã đầy đủ nội dung và đáp án đúng"
                          : currentIssues.join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl border border-border bg-background p-1">
                      {[1, 2, 3].map((level) => {
                        const meta = DIFFICULTY_META[level];
                        const active = (currentQuiz.difficulty_level || 1) === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              updateCurrentQuiz((q) => ({
                                ...q,
                                difficulty_level: level,
                              }))
                            }
                            className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                              active
                                ? "bg-surface text-primary shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {meta.short}
                          </button>
                        );
                      })}
                    </div>

                    {quizzes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveQuiz}
                        aria-label={`Xóa câu hỏi ${activeQuizIndex + 1}`}
                        className="h-8 px-2.5 text-destructive-foreground hover:bg-destructive-bg"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Nội dung câu hỏi */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Nội dung câu hỏi <span className="text-destructive">*</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <TiptapEditor
                      key={`question-${currentQuiz.uid}`}
                      value={currentQuiz.question}
                      onChange={(markdown) =>
                        updateCurrentQuiz((q) => ({ ...q, question: markdown }))
                      }
                      placeholder="Nhập nội dung câu hỏi trắc nghiệm (hỗ trợ Markdown, định dạng công thức)..."
                      minHeight="130px"
                    />
                  </div>
                </div>

                {/* Các phương án trả lời A–D */}
                <div className="mb-6">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Các phương án trả lời{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (Nhấn chữ cái A/B/C/D để chọn đáp án đúng)
                      </span>
                    </label>
                    {currentQuiz.options.length < 4 && (
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleAddOption}
                        leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        className="h-8"
                      >
                        Thêm phương án
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {currentQuiz.options.map((opt, optIdx) => {
                      const letter = OPTION_LETTERS[optIdx] ?? `${optIdx + 1}`;
                      const fbKey = `${currentQuiz.uid}_${optIdx}`;
                      const fbOpen =
                        openFeedbackMap[fbKey] || opt.feedback.trim().length > 0;
                      return (
                        <div
                          key={fbKey}
                          className={`rounded-xl border p-3.5 transition-all ${
                            opt.is_correct
                              ? "border-success-border bg-success-bg/45"
                              : "border-border bg-background/50 hover:border-primary-pastel"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOptionChange(optIdx, "is_correct", true)
                              }
                              title="Đánh dấu là đáp án đúng"
                              aria-label={`Chọn phương án ${letter} là đáp án đúng`}
                              className={`mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                                opt.is_correct
                                  ? "border-success-border bg-success text-white shadow-xs"
                                  : "border-border bg-surface text-foreground hover:border-primary hover:text-primary"
                              }`}
                            >
                              {opt.is_correct ? (
                                <Check className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                letter
                              )}
                            </button>

                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) =>
                                  handleOptionChange(optIdx, "text", e.target.value)
                                }
                                placeholder={`Nhập nội dung phương án ${letter}...`}
                                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />

                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {opt.is_correct && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
                                      <CheckCircle2
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      Đáp án đúng ({letter})
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenFeedbackMap((prev) => ({
                                        ...prev,
                                        [fbKey]: !fbOpen,
                                      }))
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                                  >
                                    <MessageSquare
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                    {fbOpen
                                      ? "Ẩn phản hồi riêng"
                                      : "Thêm phản hồi riêng"}
                                  </button>
                                </div>

                                {currentQuiz.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(optIdx)}
                                    className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-destructive-foreground"
                                  >
                                    Xóa phương án
                                  </button>
                                )}
                              </div>

                              {fbOpen && (
                                <input
                                  type="text"
                                  value={opt.feedback}
                                  onChange={(e) =>
                                    handleOptionChange(
                                      optIdx,
                                      "feedback",
                                      e.target.value
                                    )
                                  }
                                  placeholder={`Gợi ý / phản hồi khi học viên chọn phương án ${letter}...`}
                                  className="w-full rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Giải thích đáp án */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Giải thích đáp án{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (Hiển thị cho học viên sau khi trả lời)
                    </span>
                  </label>
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <TiptapEditor
                      key={`explanation-${currentQuiz.uid}`}
                      value={currentQuiz.explanation}
                      onChange={(markdown) =>
                        updateCurrentQuiz((q) => ({
                          ...q,
                          explanation: markdown,
                        }))
                      }
                      placeholder="Giải thích ngắn gọn lý do đáp án đúng và các lỗi sai thường gặp..."
                      minHeight="110px"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* ── CỘT PHẢI (4/12, STICKY): LIVE PREVIEW HỌC VIÊN + SỨC KHỎE BỘ ĐỀ ── */}
          <div className="space-y-5 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-20">
              {/* 1. XEM TRƯỚC TƯƠNG TÁC DƯỚI GÓC NHÌN HỌC VIÊN */}
              <Card className="overflow-hidden border border-border bg-surface shadow-xs">
                <div className="flex items-center justify-between border-b border-border bg-primary-light/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Xem trước Học viên
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {previewSelectedIdx !== null && (
                      <button
                        type="button"
                        onClick={() => setPreviewSelectedIdx(null)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-foreground hover:border-primary-pastel"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        Thử lại
                      </button>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${currentDiff.badgeClass}`}
                    >
                      {currentDiff.short}
                    </span>
                  </div>
                </div>

                {currentQuiz ? (
                  <div className="space-y-4 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Câu {activeQuizIndex + 1} / {quizzes.length}
                    </div>

                    {stripMarkdownText(currentQuiz.question) ? (
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{
                          __html: renderLearningContent(currentQuiz.question),
                        }}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
                        Nội dung câu hỏi sẽ hiển thị trực tiếp tại đây khi bạn nhập...
                      </div>
                    )}

                    <div className="space-y-2">
                      {currentQuiz.options.map((opt, idx) => {
                        const letter = OPTION_LETTERS[idx] ?? `${idx + 1}`;
                        const isPicked = previewSelectedIdx === idx;
                        const hasPicked = previewSelectedIdx !== null;
                        const showCorrect = hasPicked && opt.is_correct;
                        const showWrong = isPicked && !opt.is_correct;

                        return (
                          <button
                            key={`preview_${currentQuiz.uid}_${idx}`}
                            type="button"
                            onClick={() => setPreviewSelectedIdx(idx)}
                            className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                              showCorrect
                                ? "border-success-border bg-success-bg text-success-foreground"
                                : showWrong
                                  ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                                  : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/30"
                            }`}
                          >
                            <span
                              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                                showCorrect
                                  ? "bg-success text-white"
                                  : showWrong
                                    ? "bg-destructive text-white"
                                    : "bg-primary-light text-primary"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1 leading-relaxed">
                              {opt.text.trim() || (
                                <span className="italic text-muted-foreground">
                                  (Chưa nhập phương án {letter})
                                </span>
                              )}
                            </span>
                            {showCorrect && (
                              <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground"
                                aria-hidden="true"
                              />
                            )}
                            {showWrong && (
                              <XCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {previewSelectedIdx !== null && (
                      <div className="space-y-2 rounded-xl border border-primary-pastel bg-primary-light/35 p-3 text-xs">
                        {currentQuiz.options[previewSelectedIdx]?.feedback?.trim() && (
                          <p className="font-medium text-foreground">
                            Phản hồi:{" "}
                            {currentQuiz.options[previewSelectedIdx].feedback}
                          </p>
                        )}
                        {stripMarkdownText(currentQuiz.explanation) ? (
                          <div>
                            <p className="mb-1 font-bold text-primary">
                              Giải thích đáp án:
                            </p>
                            <div
                              className="prose prose-xs max-w-none text-foreground"
                              dangerouslySetInnerHTML={{
                                __html: renderLearningContent(
                                  currentQuiz.explanation
                                ),
                              }}
                            />
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Chưa có giải thích đáp án cho câu hỏi này.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Chưa có câu hỏi nào để xem trước.
                  </div>
                )}
              </Card>

              {/* 2. BẢNG SỨC KHỎE BỘ ĐỀ (READINESS RING + PHÂN BỐ ĐỘ KHÓ) */}
              <Card className="border border-border bg-surface p-4 shadow-xs">
                <div className="mb-4 flex items-center gap-3.5">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-primary-light"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={ringRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        className={
                          stats.readinessPercent >= 85
                            ? "text-success transition-all duration-500"
                            : "text-primary transition-all duration-500"
                        }
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-foreground">
                      {stats.readinessPercent}%
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Sức khỏe Bộ đề
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {stats.validCount}/{stats.total} câu sẵn sàng ·{" "}
                      {stats.withExplanationCount} câu có giải thích
                    </p>
                  </div>
                </div>

                {/* Thanh phân bố độ khó */}
                {stats.total > 0 && (
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Phân bố độ khó</span>
                      <span>
                        Dễ {stats.easyCount} · TB {stats.mediumCount} · Khó{" "}
                        {stats.hardCount}
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-primary-light">
                      {stats.easyCount > 0 && (
                        <div
                          className="h-full bg-success transition-all"
                          style={{
                            width: `${(stats.easyCount / stats.total) * 100}%`,
                          }}
                        />
                      )}
                      {stats.mediumCount > 0 && (
                        <div
                          className="h-full bg-warning transition-all"
                          style={{
                            width: `${(stats.mediumCount / stats.total) * 100}%`,
                          }}
                        />
                      )}
                      {stats.hardCount > 0 && (
                        <div
                          className="h-full bg-secondary-foreground/80 transition-all"
                          style={{
                            width: `${(stats.hardCount / stats.total) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Checklist 4 tiêu chí */}
                <ul className="space-y-2 text-xs">
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {stats.hasTitle && stats.hasDesc ? (
                        <CheckCircle2
                          className="h-4 w-4 text-success-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <HelpCircle
                          className="h-4 w-4 text-warning-foreground"
                          aria-hidden="true"
                        />
                      )}
                      Tiêu đề &amp; mô tả bài học
                    </span>
                    {!(stats.hasTitle && stats.hasDesc) && (
                      <button
                        type="button"
                        onClick={() => setInfoExpanded(true)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Điền ngay
                      </button>
                    )}
                  </li>

                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {stats.allQuizzesValid ? (
                        <CheckCircle2
                          className="h-4 w-4 text-success-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertCircle
                          className="h-4 w-4 text-warning-foreground"
                          aria-hidden="true"
                        />
                      )}
                      Tất cả câu hỏi hợp lệ ({stats.validCount}/{stats.total})
                    </span>
                    {stats.firstInvalidIndex !== -1 && (
                      <button
                        type="button"
                        onClick={() => setActiveQuizIndex(stats.firstInvalidIndex)}
                        className="cursor-pointer font-semibold text-primary hover:underline"
                      >
                        Tới câu {stats.firstInvalidIndex + 1}
                      </button>
                    )}
                  </li>

                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-foreground">
                      {stats.hasExplanations ? (
                        <CheckCircle2
                          className="h-4 w-4 text-success-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <HelpCircle
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      Giải thích đáp án ({stats.withExplanationCount}/
                      {stats.total})
                    </span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
