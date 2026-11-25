"use client";

import { renderLearningContent } from "@/components/shared/markdown-renderer/safe-html";
import FillBlankLesson from "@/components/user/learning_detail/fill-blank";
import FlashcardLesson from "@/components/user/learning_detail/flashcard";
import ListeningLesson from "@/components/user/learning_detail/listening";
import SpeakingLesson from "@/components/user/learning_detail/speaking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/states";
import api from "@/lib/utils/fetcher/client/axios";
import { LessonDetail } from "@/types/lecturer/lesson-api";
import { LessonQuiz } from "@/types/lecturer/quiz";
import { FillBlankLessonPayload } from "@/types/lecturer/fill-blank";
import { ListeningLessonPayload } from "@/types/lecturer/listening";
import { SpeakingLessonPayload } from "@/types/lecturer/speaking";
import { ActiveLessonFlashcard } from "@/types/user/activeLesson";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Headphones,
  Layers,
  ListChecks,
  Mic,
  Pencil,
  RefreshCw,
  Video,
  XCircle,
} from "pulsoicon-react";
import { useMemo, useState } from "react";
import useSWR from "swr";

// ============================================
// TYPES & HELPERS
// ============================================

interface LessonVideoPreview {
  video_url?: string | null;
  file_id?: string | null;
  duration?: number | null;
  source_type?: string | null;
}

interface LessonResourcePreview {
  id: string;
  title?: string | null;
  resource_type?: string | null;
  url?: string | null;
  file_size?: number | null;
}

interface LessonCodeItem {
  id?: string;
  title?: string;
  description?: string;
  difficulty?: string;
  language?: { name?: string; version?: string };
  files?: Array<{
    id?: string;
    filename?: string;
    content?: string;
    role?: string;
  }>;
  testcases?: Array<{
    id?: string;
    input?: string;
    expected_output?: string;
    is_sample?: boolean;
    hidden?: boolean;
  }>;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const DIFFICULTY_LABEL: Record<number, { text: string; cls: string }> = {
  1: {
    text: "Dễ",
    cls: "bg-success-bg text-success-foreground border-success-border",
  },
  2: {
    text: "Trung bình",
    cls: "bg-warning-bg text-warning-foreground border-warning-border",
  },
  3: {
    text: "Khó",
    cls: "bg-secondary-light text-secondary-foreground border-secondary-pastel",
  },
};

function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "Chưa rõ";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================
// MAIN PREVIEW COMPONENT
// ============================================

export default function LecturerLessonPreview() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id as string | undefined;

  // Trạng thái làm thử Quiz
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // Trạng thái tab xem bài Code
  const [activeCodeIdx, setActiveCodeIdx] = useState(0);
  const [codeRoleTab, setCodeRoleTab] = useState<"starter" | "solution">("starter");

  const {
    data: lessonDetail,
    error: detailError,
    isLoading: isLoadingDetail,
    mutate: mutateDetail,
  } = useSWR<LessonDetail>(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const lessonType = lessonDetail?.lesson_type || "video";

  const { data: videoData } = useSWR<LessonVideoPreview | null>(
    lessonId && lessonType === "video" ? `/lecturer/lessons/${lessonId}/video` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: quizzesData } = useSWR<LessonQuiz[]>(
    lessonId && (lessonType === "quiz" || lessonType === "video")
      ? `/lecturer/lessons/${lessonId}/quizzes`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: codeData } = useSWR<LessonCodeItem[]>(
    lessonId && lessonType === "code" ? `/lecturer/lessons/${lessonId}/code` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        if (Array.isArray(res.data)) return res.data;
        if (res.data && typeof res.data === "object") return [res.data];
        return [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: flashcardsData } = useSWR<ActiveLessonFlashcard[]>(
    lessonId && lessonType === "flashcard"
      ? `/lecturer/lessons/${lessonId}/flashcards`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: listeningData } = useSWR<ListeningLessonPayload | null>(
    lessonId && lessonType === "listening"
      ? `/lecturer/lessons/${lessonId}/listening`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: fillBlankData } = useSWR<FillBlankLessonPayload | null>(
    lessonId && lessonType === "fill_blank"
      ? `/lecturer/lessons/${lessonId}/fill-blank`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: speakingData } = useSWR<SpeakingLessonPayload | null>(
    lessonId && lessonType === "speaking"
      ? `/lecturer/lessons/${lessonId}/speaking`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: resourcesData } = useSWR<LessonResourcePreview[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/resources` : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: chaptersData } = useSWR(
    lessonDetail?.course_id
      ? `/lecturer/chapters/${lessonDetail.course_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const currentSection = useMemo(() => {
    const sections = Array.isArray(chaptersData?.sections)
      ? chaptersData.sections
      : [];
    return sections.find(
      (s: { section_id?: string }) => s.section_id === lessonDetail?.section_id
    );
  }, [chaptersData, lessonDetail?.section_id]);

  const siblingLessons = useMemo<
    Array<{ id: string; title: string; lesson_type: string }>
  >(() => {
    const list = Array.isArray(currentSection?.lessons)
      ? currentSection.lessons
      : [];
    return list.map(
      (l: { lesson_id?: string; id?: string; lesson_title?: string; title?: string; lesson_type?: string }) => ({
        id: l.lesson_id || l.id || "",
        title: l.lesson_title || l.title || "Bài học",
        lesson_type: l.lesson_type || "video",
      })
    );
  }, [currentSection]);

  const currentSiblingIndex = siblingLessons.findIndex((l) => l.id === lessonId);
  const prevLesson =
    currentSiblingIndex > 0 ? siblingLessons[currentSiblingIndex - 1] : null;
  const nextLesson =
    currentSiblingIndex >= 0 && currentSiblingIndex < siblingLessons.length - 1
      ? siblingLessons[currentSiblingIndex + 1]
      : null;

  const quizzes = quizzesData || [];
  const resources = resourcesData || [];
  const codeItems = codeData || [];

  const quizStats = useMemo(() => {
    const total = quizzes.length;
    let answered = 0;
    let correct = 0;
    for (const q of quizzes) {
      const sorted = [...(q.options || [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
      );
      const picked = selectedAnswers[q.id];
      if (typeof picked === "number") {
        answered += 1;
        if (sorted[picked]?.is_correct) correct += 1;
      }
    }
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, percent };
  }, [quizzes, selectedAnswers]);

  const handleResetQuizPreview = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
  };

  if (detailError && !lessonDetail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Alert variant="destructive" title="Không thể tải bản xem trước bài học">
          <p className="text-sm">
            Bài học không tồn tại, bạn không có quyền truy cập hoặc máy chủ đang tạm gián đoạn.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button type="button" size="sm" onClick={() => mutateDetail()}>
              Thử lại
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/lecturer/courses")}
            >
              Về danh sách khóa học
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isLoadingDetail || !lessonDetail) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
            <div className="space-y-4 lg:col-span-4">
              <Skeleton className="h-56 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Xác định nguồn phát video (YouTube hoặc R2)
  const ytId =
    extractYouTubeId(videoData?.file_id) ||
    extractYouTubeId(videoData?.video_url);
  const directVideoUrl = !ytId
    ? videoData?.video_url ||
      (videoData?.file_id?.startsWith("r2:")
        ? `/api/storage/files/${videoData.file_id.slice(3)}`
        : null)
    : null;

  const typeBadge =
    lessonType === "quiz"
      ? { label: "Trắc nghiệm", icon: ListChecks }
      : lessonType === "code"
        ? { label: "Lập trình", icon: Code2 }
        : lessonType === "flashcard"
          ? { label: "Flashcard & Giọng đọc", icon: Layers }
          : lessonType === "listening"
            ? { label: "Luyện Nghe Hội Thoại", icon: Headphones }
            : lessonType === "fill_blank"
              ? { label: "Điền từ vào chỗ trống", icon: Pencil }
              : lessonType === "speaking"
                ? { label: "Giao tiếp AI (Roleplay)", icon: Mic }
                : lessonType === "video"
                  ? { label: "Video bài giảng", icon: Video }
                  : { label: "Bài đọc", icon: BookOpen };
  const TypeIcon = typeBadge.icon;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── THANH ĐIỀU KHIỂN XEM TRƯỚC (CLOUDY BLUE PASTEL) ── */}
      <div className="border-b border-border bg-gradient-to-b from-primary-light/65 via-surface to-surface">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    lessonDetail.course_id
                      ? `/lecturer/chapters?course_id=${lessonDetail.course_id}`
                      : "/lecturer/chapters"
                  )
                }
                className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Quay lại Chương &amp; bài học
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Eye className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                  {lessonDetail.title}
                </h1>
                <Badge variant="primary" size="sm">
                  <TypeIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {typeBadge.label}
                </Badge>
                <Badge variant="lavender" size="sm">
                  Chế độ Xem trước Học viên
                </Badge>
              </div>
              {currentSection?.section_title && (
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                  Thuộc chương: <strong className="text-foreground">{currentSection.section_title}</strong>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {prevLesson && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/lecturer/lessons/${prevLesson.id}/preview`)}
                  leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  Bài trước
                </Button>
              )}
              {nextLesson && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/lecturer/lessons/${nextLesson.id}/preview`)}
                  rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                >
                  Bài tiếp
                </Button>
              )}
              <Button
                type="button"
                variant="pastel"
                size="sm"
                onClick={() => router.push(`/lecturer/resources?lesson_id=${lessonDetail.id}`)}
                leftIcon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
              >
                Tài nguyên ({resources.length})
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push(`/lecturer/lessons/${lessonDetail.id}/edit`)}
                leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Chỉnh sửa bài học
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── NỘI DUNG XEM TRƯỚC 2 CỘT ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI (8/12): KHUNG HIỂN THỊ BÀI HỌC */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. XEM TRƯỚC VIDEO */}
            {lessonType === "video" && (
              <Card className="overflow-hidden border border-border bg-surface shadow-xs">
                <div className="aspect-video w-full bg-black">
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={lessonDetail.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : directVideoUrl ? (
                    <video
                      src={directVideoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-primary-light/30 p-6 text-center text-muted-foreground">
                      <Video className="h-10 w-10 text-primary" aria-hidden="true" />
                      <p className="text-sm font-medium text-foreground">
                        Bài học này chưa có tệp video hoặc liên kết YouTube
                      </p>
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={() =>
                          router.push(`/lecturer/lessons/${lessonDetail.id}/edit`)
                        }
                      >
                        Thêm video ngay
                      </Button>
                    </div>
                  )}
                </div>

                {lessonDetail.description?.trim() && (
                  <div className="border-t border-border p-6">
                    <h2 className="mb-3 text-base font-bold text-foreground">
                      Mô tả bài giảng
                    </h2>
                    <div
                      className="prose prose-sm max-w-none text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: renderLearningContent(lessonDetail.description),
                      }}
                    />
                  </div>
                )}
              </Card>
            )}

            {/* 2. XEM TRƯỚC TRẮC NGHIỆM (LÀM THỬ TƯƠNG TÁC + BẬT ĐÁP ÁN GIẢNG VIÊN) */}
            {(lessonType === "quiz" ||
              (lessonType === "video" && quizzes.length > 0)) && (
              <div className="space-y-4">
                {lessonType === "quiz" && lessonDetail.description?.trim() && (
                  <Card className="border border-border bg-surface p-5 shadow-xs">
                    <h2 className="mb-2 text-sm font-bold text-foreground">
                      Hướng dẫn &amp; mô tả bài trắc nghiệm
                    </h2>
                    <div
                      className="prose prose-sm max-w-none text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: renderLearningContent(lessonDetail.description),
                      }}
                    />
                  </Card>
                )}

                {/* Thanh công cụ làm thử */}
                <Card
                  variant="pastel-blue"
                  className="flex flex-wrap items-center justify-between gap-3 border border-primary-pastel p-4 shadow-xs"
                >
                  <div>
                    <h2 className="text-sm font-bold text-foreground sm:text-base">
                      {lessonType === "quiz"
                        ? `Bộ câu hỏi trắc nghiệm (${quizzes.length} câu)`
                        : `Câu hỏi ôn tập đi kèm video (${quizzes.length} câu)`}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {quizSubmitted
                        ? `Kết quả làm thử: Đúng ${quizStats.correct}/${quizStats.total} câu (${quizStats.percent}%)`
                        : `Đã chọn ${quizStats.answered}/${quizStats.total} câu — chấm điểm trực tiếp tại chỗ, không lưu vào dữ liệu học viên.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={showAnswerKey ? "primary" : "outline"}
                      size="sm"
                      onClick={() => setShowAnswerKey((v) => !v)}
                      leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    >
                      {showAnswerKey ? "Đang hiện đáp án" : "Hiện đáp án đúng"}
                    </Button>
                    {quizSubmitted ? (
                      <Button
                        type="button"
                        variant="pastel"
                        size="sm"
                        onClick={handleResetQuizPreview}
                        leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                      >
                        Làm lại
                      </Button>
                    ) : (
                      quizzes.length > 0 && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => setQuizSubmitted(true)}
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Chấm điểm thử
                        </Button>
                      )
                    )}
                  </div>
                </Card>

                {quizzes.length === 0 ? (
                  <Card className="border border-border bg-surface p-8">
                    <EmptyState
                      title="Chưa có câu hỏi trắc nghiệm nào"
                      description="Bấm Chỉnh sửa bài học để thêm câu hỏi hoặc dùng AI sinh câu hỏi tự động từ video."
                    />
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {quizzes.map((quiz, qIdx) => {
                      const sortedOptions = [...(quiz.options || [])].sort(
                        (a, b) => (a.position ?? 0) - (b.position ?? 0)
                      );
                      const pickedIdx = selectedAnswers[quiz.id];
                      const reveal = quizSubmitted || showAnswerKey;
                      const diff =
                        DIFFICULTY_LABEL[quiz.difficulty_level || 1] ||
                        DIFFICULTY_LABEL[1];

                      return (
                        <Card
                          key={quiz.id || qIdx}
                          className="border border-border bg-surface p-5 shadow-xs"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-primary">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light">
                                {qIdx + 1}
                              </span>
                              Câu hỏi {qIdx + 1}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${diff.cls}`}
                            >
                              {diff.text}
                            </span>
                          </div>

                          <div
                            className="prose prose-sm mb-4 max-w-none text-foreground"
                            dangerouslySetInnerHTML={{
                              __html: renderLearningContent(quiz.question || ""),
                            }}
                          />

                          <div className="space-y-2.5">
                            {sortedOptions.map((opt, optIdx) => {
                              const letter = OPTION_LETTERS[optIdx] ?? `${optIdx + 1}`;
                              const isPicked = pickedIdx === optIdx;
                              const isCorrect = Boolean(opt.is_correct);
                              const showRight = reveal && isCorrect;
                              const showWrong = quizSubmitted && isPicked && !isCorrect;

                              return (
                                <button
                                  key={opt.id || `${quiz.id}_${optIdx}`}
                                  type="button"
                                  onClick={() => {
                                    if (quizSubmitted) return;
                                    setSelectedAnswers((prev) => ({
                                      ...prev,
                                      [quiz.id]: optIdx,
                                    }));
                                  }}
                                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all ${
                                    showRight
                                      ? "border-success-border bg-success-bg text-success-foreground"
                                      : showWrong
                                        ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                                        : isPicked
                                          ? "border-primary bg-primary-light/50 text-foreground"
                                          : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/25"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                      showRight
                                        ? "bg-success text-white"
                                        : showWrong
                                          ? "bg-destructive text-white"
                                          : isPicked
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-primary-light text-primary"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <div className="flex-1">
                                    <p className="leading-relaxed">{opt.text}</p>
                                    {reveal && opt.feedback?.trim() && (isPicked || showAnswerKey) && (
                                      <p className="mt-1 text-xs opacity-85">
                                        Phản hồi: {opt.feedback}
                                      </p>
                                    )}
                                  </div>
                                  {showRight && (
                                    <CheckCircle2
                                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-success-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {showWrong && (
                                    <XCircle
                                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-destructive-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {reveal && quiz.explanation?.trim() && (
                            <div className="mt-4 rounded-xl border border-primary-pastel bg-primary-light/35 p-3.5 text-xs">
                              <p className="mb-1 font-bold text-primary">
                                Giải thích đáp án:
                              </p>
                              <div
                                className="prose prose-xs max-w-none text-foreground"
                                dangerouslySetInnerHTML={{
                                  __html: renderLearningContent(quiz.explanation),
                                }}
                              />
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. XEM TRƯỚC BÀI LẬP TRÌNH (CODE) */}
            {lessonType === "code" && (
              <div className="space-y-4">
                {codeItems.length === 0 ? (
                  <Card className="border border-border bg-surface p-8">
                    <EmptyState
                      title="Chưa có bài tập lập trình"
                      description="Bấm Chỉnh sửa bài học để cấu hình đề bài, tệp code mẫu và bộ test case."
                    />
                  </Card>
                ) : (
                  <>
                    {codeItems.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {codeItems.map((item, idx) => (
                          <button
                            key={item.id || idx}
                            type="button"
                            onClick={() => setActiveCodeIdx(idx)}
                            className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                              activeCodeIdx === idx
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-surface text-foreground hover:border-primary-pastel"
                            }`}
                          >
                            Bài {idx + 1}: {item.title || "Thực hành"}
                          </button>
                        ))}
                      </div>
                    )}

                    {codeItems[activeCodeIdx] && (
                      <Card className="space-y-5 border border-border bg-surface p-6 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                          <h2 className="text-lg font-bold text-foreground">
                            {codeItems[activeCodeIdx].title || lessonDetail.title}
                          </h2>
                          <div className="flex items-center gap-2">
                            {codeItems[activeCodeIdx].language?.name && (
                              <Badge variant="primary" size="sm">
                                {codeItems[activeCodeIdx].language?.name}
                              </Badge>
                            )}
                            {codeItems[activeCodeIdx].difficulty && (
                              <Badge variant="vanilla" size="sm">
                                {codeItems[activeCodeIdx].difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {codeItems[activeCodeIdx].description && (
                          <div
                            className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{
                              __html: renderLearningContent(
                                codeItems[activeCodeIdx].description || ""
                              ),
                            }}
                          />
                        )}

                        {Array.isArray(codeItems[activeCodeIdx].files) &&
                          codeItems[activeCodeIdx].files!.length > 0 && (
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground">
                                  Tệp mã nguồn
                                </h3>
                                <div className="inline-flex rounded-xl border border-border bg-background p-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setCodeRoleTab("starter")}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold ${
                                      codeRoleTab === "starter"
                                        ? "bg-surface text-primary shadow-xs"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    Code khởi đầu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCodeRoleTab("solution")}
                                    className={`cursor-pointer rounded-lg px-2.5 py-1 font-semibold ${
                                      codeRoleTab === "solution"
                                        ? "bg-surface text-primary shadow-xs"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    Lời giải mẫu
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {codeItems[activeCodeIdx]
                                  .files!.filter((f) => f.role === codeRoleTab)
                                  .map((file, fIdx) => (
                                    <div
                                      key={file.id || fIdx}
                                      className="overflow-hidden rounded-xl border border-border"
                                    >
                                      <div className="border-b border-border bg-primary-light/35 px-3.5 py-1.5 text-xs font-semibold text-foreground">
                                        {file.filename || "main"}
                                      </div>
                                      <pre className="overflow-x-auto bg-background p-4 text-xs text-foreground">
                                        <code>{file.content || ""}</code>
                                      </pre>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {Array.isArray(codeItems[activeCodeIdx].testcases) &&
                          codeItems[activeCodeIdx].testcases!.length > 0 && (
                            <div>
                              <h3 className="mb-2 text-sm font-bold text-foreground">
                                Bộ kiểm thử ({codeItems[activeCodeIdx].testcases!.length})
                              </h3>
                              <div className="space-y-2">
                                {codeItems[activeCodeIdx].testcases!.map((tc, tIdx) => (
                                  <div
                                    key={tc.id || tIdx}
                                    className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs sm:grid-cols-2"
                                  >
                                    <div>
                                      <span className="font-semibold text-muted-foreground">
                                        Input #{tIdx + 1}
                                        {tc.hidden ? " (Ẩn)" : " (Mẫu)"}:
                                      </span>
                                      <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-surface p-2 text-foreground">
                                        {tc.input || "(trống)"}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-muted-foreground">
                                        Expected Output:
                                      </span>
                                      <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-surface p-2 text-foreground">
                                        {tc.expected_output || "(trống)"}
                                      </pre>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 4. XEM TRƯỚC FLASHCARD 3D + LUYỆN NGHE */}
            {lessonType === "flashcard" && (
              <FlashcardLesson
                lesson={{
                  id: lessonDetail.id,
                  title: lessonDetail.title,
                  description: lessonDetail.description,
                  is_completed: false,
                  is_locked: false,
                }}
                flashcards={flashcardsData || []}
                isPreviewMode
              />
            )}

            {/* 5. XEM TRƯỚC LUYỆN NGHE HỘI THOẠI */}
            {lessonType === "listening" && (
              <ListeningLesson
                lesson={{
                  id: lessonDetail.id,
                  title: lessonDetail.title,
                  description: lessonDetail.description,
                  lesson_type: "listening",
                  duration: Math.round(listeningData?.duration_seconds || 0),
                  file_id: null,
                  resources: [],
                  quizzes: (listeningData?.quizzes || []).map((q, idx) => ({
                    id: q.id || `q-${idx}`,
                    question: q.question,
                    difficulty_level: q.difficulty_level || 1,
                    explanation: q.explanation || "",
                    options: (q.options || []).map((o, oIdx) => ({
                      id: o.id || `opt-${idx}-${oIdx}`,
                      text: o.text,
                      is_correct: Boolean(o.is_correct),
                      feedback: o.feedback || "",
                      position: o.position ?? oIdx,
                    })),
                  })),
                  listening: listeningData
                    ? {
                        id: lessonDetail.id,
                        lang_code: listeningData.lang_code || "en-GB",
                        scenario: listeningData.scenario || "",
                        speakers: listeningData.speakers || [],
                        script_lines: (listeningData.script_lines || []).map(
                          (l) => ({
                            id: l.id,
                            speaker_id: l.speaker_id,
                            text: l.text,
                            translation: l.translation || "",
                            start_ms: l.start_ms || 0,
                            end_ms: l.end_ms || 0,
                          })
                        ),
                        audio_url: listeningData.audio_url || null,
                        duration_seconds: listeningData.duration_seconds || 0,
                        max_plays: listeningData.max_plays || 0,
                        show_transcript_before_submit: Boolean(
                          listeningData.show_transcript_before_submit
                        ),
                        pass_percent: listeningData.pass_percent || 70,
                      }
                    : null,
                  is_completed: false,
                  is_locked: false,
                }}
                previewMode
              />
            )}

            {/* 6. XEM TRƯỚC ĐIỀN TỪ VÀO CHỖ TRỐNG */}
            {lessonType === "fill_blank" && (
              <FillBlankLesson
                lesson={{
                  id: lessonDetail.id,
                  title: lessonDetail.title,
                  description: lessonDetail.description,
                  lesson_type: "fill_blank",
                  duration: Math.round(fillBlankData?.duration_seconds || 0),
                  file_id: null,
                  resources: [],
                  quizzes: [],
                  fill_blank: fillBlankData
                    ? {
                        id: lessonDetail.id,
                        lang_code: fillBlankData.lang_code || "en-GB",
                        mode: fillBlankData.mode || "typing",
                        prompt_text: fillBlankData.prompt_text || "",
                        translation: fillBlankData.translation || "",
                        blanks: fillBlankData.blanks || [],
                        distractors: fillBlankData.distractors || [],
                        voice_id: fillBlankData.voice_id || null,
                        audio_url: fillBlankData.audio_url || null,
                        duration_seconds: fillBlankData.duration_seconds || 0,
                        case_sensitive: Boolean(fillBlankData.case_sensitive),
                        allow_hint: fillBlankData.allow_hint ?? true,
                        pass_percent: fillBlankData.pass_percent || 70,
                      }
                    : null,
                  is_completed: false,
                  is_locked: false,
                }}
                previewMode
              />
            )}

            {/* 7. XEM TRƯỚC GIAO TIẾP AI (ROLEPLAY) */}
            {lessonType === "speaking" && (
              <SpeakingLesson
                lesson={{
                  id: lessonDetail.id,
                  title: lessonDetail.title,
                  description: lessonDetail.description,
                  lesson_type: "speaking",
                  duration: 0,
                  file_id: null,
                  resources: [],
                  quizzes: [],
                  speaking: speakingData
                    ? {
                        id: lessonDetail.id,
                        lang_code: speakingData.lang_code || "en-GB",
                        level: speakingData.level || "B1",
                        scenario: speakingData.scenario || "",
                        student_role: speakingData.student_role || "",
                        ai_persona: speakingData.ai_persona || {},
                        missions: speakingData.missions || [],
                        sample_phrases: speakingData.sample_phrases || [],
                        max_turns: speakingData.max_turns || 8,
                        pass_percent: speakingData.pass_percent || 70,
                        allow_translation: speakingData.allow_translation ?? true,
                        allow_suggestion: speakingData.allow_suggestion ?? true,
                      }
                    : null,
                  is_completed: false,
                  is_locked: false,
                }}
                previewMode
              />
            )}

            {/* 8. BÀI ĐỌC / LOẠI KHÁC */}
            {lessonType !== "video" &&
              lessonType !== "quiz" &&
              lessonType !== "code" &&
              lessonType !== "flashcard" &&
              lessonType !== "listening" &&
              lessonType !== "fill_blank" &&
              lessonType !== "speaking" && (
                <Card className="border border-border bg-surface p-6 shadow-xs">
                  <div
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: renderLearningContent(
                        lessonDetail.description || "Nội dung đang được cập nhật."
                      ),
                    }}
                  />
                </Card>
              )}
          </div>

          {/* CỘT PHẢI (4/12, STICKY): THÔNG TIN NHANH + TÀI NGUYÊN + BÀI CÙNG CHƯƠNG */}
          <div className="space-y-5 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-20">
              {/* Thông tin bài học */}
              <Card className="border border-border bg-surface p-4 shadow-xs">
                <h3 className="mb-3 text-sm font-bold text-foreground">
                  Thông tin tổng quan
                </h3>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Định dạng</dt>
                    <dd className="font-semibold text-foreground">{typeBadge.label}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Cho phép học thử</dt>
                    <dd>
                      <Badge
                        variant={lessonDetail.is_preview ? "success" : "default"}
                        size="sm"
                      >
                        {lessonDetail.is_preview ? "Miễn phí học thử" : "Cần đăng ký"}
                      </Badge>
                    </dd>
                  </div>
                  {lessonType === "video" && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Thời lượng
                      </dt>
                      <dd className="font-semibold text-foreground">
                        {formatDuration(videoData?.duration)}
                      </dd>
                    </div>
                  )}
                  {(lessonType === "quiz" || quizzes.length > 0) && (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">Số câu trắc nghiệm</dt>
                      <dd className="font-semibold text-foreground">
                        {quizzes.length} câu
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Tài nguyên đính kèm</dt>
                    <dd className="font-semibold text-foreground">
                      {resources.length} mục
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* Tài nguyên đính kèm */}
              <Card className="border border-border bg-surface p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    Tài nguyên bài học ({resources.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/lecturer/resources?lesson_id=${lessonDetail.id}`)
                    }
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                  >
                    Quản lý
                  </button>
                </div>

                {resources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có tệp tài liệu hay liên kết đính kèm cho bài học này.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {resources.map((res) => (
                      <li
                        key={res.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {res.title || "Tài liệu đính kèm"}
                            </p>
                            {res.file_size ? (
                              <p className="text-[11px] text-muted-foreground">
                                {formatFileSize(res.file_size)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            Mở
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Bài học khác trong cùng chương */}
              {siblingLessons.length > 1 && (
                <Card className="border border-border bg-surface p-4 shadow-xs">
                  <h3 className="mb-3 text-sm font-bold text-foreground">
                    Bài học trong chương ({siblingLessons.length})
                  </h3>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {siblingLessons.map((item, idx) => {
                      const active = item.id === lessonId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            router.push(`/lecturer/lessons/${item.id}/preview`)
                          }
                          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                            active
                              ? "border-primary bg-primary-light/60 font-semibold text-primary"
                              : "border-border bg-surface text-foreground hover:border-primary-pastel"
                          }`}
                        >
                          <span className="w-5 shrink-0 text-center text-[11px] text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="flex-1 truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
