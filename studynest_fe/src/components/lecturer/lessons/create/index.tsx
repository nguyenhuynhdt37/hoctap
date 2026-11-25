"use client";

import { Alert, Button, Card } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { ApiSectionsResponse } from "@/types/lecturer/chapter";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Clock,
  Code,
  FileText,
  Headphones,
  HelpCircle,
  Layers,
  Lightbulb,
  Mic,
  Paperclip,
  Pencil,
  Play,
  Settings,
  Video,
} from "pulsoicon-react";
import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";

interface CourseBrief {
  id: string;
  title?: string;
}

type LessonOptionId =
  | "video"
  | "quiz"
  | "code"
  | "flashcard"
  | "listening"
  | "fill_blank"
  | "speaking";

const LessonsCreate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  // Fetch ngữ cảnh khóa học & chương học để hiển thị trực quan và gợi ý định dạng phù hợp
  const { data: courseBrief } = useSWR<CourseBrief | null>(
    courseId ? `/lecturer/courses/${courseId}` : null,
    async (url: string) => {
      try {
        const res = await api.get<CourseBrief>(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: chaptersData } = useSWR<ApiSectionsResponse | null>(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      try {
        const res = await api.get<ApiSectionsResponse>(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const sectionContext = useMemo(() => {
    if (!chaptersData?.sections || !sectionId) return null;
    const sorted = [...chaptersData.sections].sort(
      (a, b) => a.position - b.position
    );
    const idx = sorted.findIndex((s) => s.section_id === sectionId);
    if (idx === -1) return null;
    const sec = sorted[idx];
    const lessons = sec.lessons || [];
    const videoCount = lessons.filter(
      (l) => !l.lesson_type || l.lesson_type === "video"
    ).length;
    const quizCount = lessons.filter((l) => l.lesson_type === "quiz").length;
    const codeCount = lessons.filter((l) => l.lesson_type === "code").length;

    let recommended: LessonOptionId = "video";
    let recommendReason =
      "Bắt đầu chương bằng 1 Video bài giảng giúp học viên dễ tiếp cận kiến thức mới.";
    if (videoCount >= 2 && quizCount === 0 && codeCount === 0) {
      recommended = "quiz";
      recommendReason =
        "Chương này đã có nhiều bài Video — thêm 1 bài Trắc nghiệm sẽ giúp học viên củng cố ngay kiến thức.";
    }

    return {
      orderNumber: idx + 1,
      title: sec.section_title,
      totalLessons: lessons.length,
      videoCount,
      quizCount,
      codeCount,
      recommended,
      recommendReason,
    };
  }, [chaptersData, sectionId]);

  const handleSelectType = useCallback(
    (type: LessonOptionId) => {
      const params = new URLSearchParams();
      if (sectionId) params.set("section_id", sectionId);
      if (courseId) params.set("course_id", courseId);

      if (type === "video") {
        router.push(`/lecturer/lessons/create/video?${params.toString()}`);
      } else if (type === "code") {
        router.push(`/lecturer/lessons/create/code?${params.toString()}`);
      } else if (type === "quiz") {
        router.push(`/lecturer/lessons/create/quizzes?${params.toString()}`);
      } else if (type === "flashcard") {
        router.push(`/lecturer/lessons/create/flashcards?${params.toString()}`);
      } else if (type === "listening") {
        router.push(`/lecturer/lessons/create/listening?${params.toString()}`);
      } else if (type === "fill_blank") {
        router.push(`/lecturer/lessons/create/fill-blank?${params.toString()}`);
      } else if (type === "speaking") {
        router.push(`/lecturer/lessons/create/speaking?${params.toString()}`);
      }
    },
    [courseId, router, sectionId]
  );

  // Phím tắt 1 / 2 / 3 để mở nhanh loại bài học
  useEffect(() => {
    if (!sectionId || !courseId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "1") handleSelectType("video");
      else if (e.key === "2") handleSelectType("quiz");
      else if (e.key === "3") handleSelectType("code");
      else if (e.key === "4") handleSelectType("flashcard");
      else if (e.key === "5") handleSelectType("listening");
      else if (e.key === "6") handleSelectType("fill_blank");
      else if (e.key === "7") handleSelectType("speaking");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [courseId, handleSelectType, sectionId]);

  const lessonTypes: Array<{
    id: LessonOptionId;
    shortcut: string;
    title: string;
    subtitle: string;
    description: string;
    icon: typeof Video;
    cardHoverBorder: string;
    iconBoxClass: string;
    pillClass: string;
    previewBg: string;
    highlights: string[];
    ctaLabel: string;
  }> = [
    {
      id: "video",
      shortcut: "1",
      title: "Bài học Video",
      subtitle: "Truyền đạt trực quan",
      description:
        "Tải lên tệp video bài giảng hoặc nhúng YouTube, kết hợp tài liệu đính kèm và câu hỏi tương tác.",
      icon: Video,
      cardHoverBorder: "hover:border-primary",
      iconBoxClass:
        "bg-primary-light border border-primary-pastel text-primary",
      pillClass: "bg-primary-light text-primary border-primary-pastel",
      previewBg: "from-primary-light/80 via-surface to-info-bg/70",
      highlights: [
        "Hỗ trợ tải video trực tiếp & liên kết YouTube",
        "Đính kèm slide, bài tập PDF ngay dưới video",
        "Gắn câu hỏi trắc nghiệm kiểm tra nhanh",
      ],
      ctaLabel: "Tạo bài học Video",
    },
    {
      id: "quiz",
      shortcut: "2",
      title: "Bài học Trắc nghiệm",
      subtitle: "Ôn tập & đánh giá",
      description:
        "Xây dựng bộ câu hỏi trắc nghiệm chấm điểm tự động kèm giải thích chi tiết từng đáp án.",
      icon: HelpCircle,
      cardHoverBorder: "hover:border-[#C98A2C]",
      iconBoxClass:
        "bg-warning-bg border border-warning-border text-warning-foreground",
      pillClass: "bg-warning-bg text-warning-foreground border-warning-border",
      previewBg: "from-warning-bg/80 via-surface to-accent-vanilla/60",
      highlights: [
        "Tự động chấm điểm & giải thích đáp án",
        "Hỗ trợ Trợ lý AI sinh nhanh bộ câu hỏi",
        "Tăng tỷ lệ ghi nhớ kiến thức cho học viên",
      ],
      ctaLabel: "Tạo bài Trắc nghiệm",
    },
    {
      id: "code",
      shortcut: "3",
      title: "Bài học Lập trình",
      subtitle: "Thực hành tương tác",
      description:
        "Tạo bài tập lập trình với trình soạn thảo mã nguồn và hệ thống chấm test case tự động.",
      icon: Code,
      cardHoverBorder: "hover:border-[#7E57C2]",
      iconBoxClass:
        "bg-accent border border-accent-border text-accent-foreground",
      pillClass: "bg-accent text-accent-foreground border-accent-border",
      previewBg: "from-accent/70 via-surface to-primary-light/50",
      highlights: [
        "Trình soạn thảo mã nguồn chạy ngay trên web",
        "Bộ test case kiểm thử & chấm điểm tự động",
        "Phù hợp môn Tin học & tư duy thuật toán",
      ],
      ctaLabel: "Tạo bài Lập trình",
    },
    {
      id: "flashcard",
      shortcut: "4",
      title: "Thẻ ghi nhớ & Giọng đọc",
      subtitle: "Flashcard 3D + Luyện nghe",
      description:
        "Tạo bộ thẻ lật 2 mặt kèm phiên âm IPA/Pinyin, câu ví dụ và giọng đọc bản xứ chuẩn Anh-Mỹ, Anh-Anh, Trung, Việt...",
      icon: Layers,
      cardHoverBorder: "hover:border-secondary-pastel",
      iconBoxClass:
        "bg-secondary-light border border-secondary-pastel text-secondary-foreground",
      pillClass:
        "bg-secondary-light text-secondary-foreground border-secondary-pastel",
      previewBg: "from-secondary-light/75 via-surface to-primary-light/50",
      highlights: [
        "Giọng đọc bản xứ chuẩn đa ngôn ngữ (9Router + R2)",
        "AI sinh bộ thẻ tự động từ bài giảng Video",
        "Học viên học lật thẻ 3D, Luyện nghe & Gõ chính tả",
      ],
      ctaLabel: "Tạo bài Flashcard",
    },
    {
      id: "listening",
      shortcut: "5",
      title: "Luyện Nghe Hội Thoại",
      subtitle: "Audio đa nhân vật & Nghe-Hiểu",
      description:
        "Tạo hội thoại 2–4 nhân vật với giọng đọc bản xứ tự động ghép thành 1 file audio, kèm phụ đề Karaoke và câu hỏi nghe-hiểu.",
      icon: Headphones,
      cardHoverBorder: "hover:border-primary/60",
      iconBoxClass:
        "bg-primary-light border border-primary-pastel text-primary",
      pillClass:
        "bg-primary-light text-primary border-primary-pastel",
      previewBg: "from-primary-light/75 via-surface to-accent/45",
      highlights: [
        "AI biên soạn hội thoại & câu hỏi theo chủ đề hoặc Video",
        "Tự động ghép giọng Nam/Nữ chuẩn bản xứ có mốc thời gian",
        "Chế độ phòng thi (giới hạn lượt nghe) + Karaoke Transcript",
      ],
      ctaLabel: "Tạo bài Luyện Nghe",
    },
    {
      id: "fill_blank",
      shortcut: "6",
      title: "Điền từ vào chỗ trống",
      subtitle: "Cloze Test, Ngân hàng từ & Dictation",
      description:
        "Bôi đen từ để tạo chỗ trống tức thì, hỗ trợ 3 chế độ làm bài (Gõ trực tiếp, Ngân hàng từ, Nghe & Điền từ) và AI biên soạn tự động.",
      icon: Pencil,
      cardHoverBorder: "hover:border-accent-border",
      iconBoxClass:
        "bg-accent border border-accent-border text-accent-foreground",
      pillClass:
        "bg-accent text-accent-foreground border-accent-border",
      previewBg: "from-accent/70 via-surface to-primary-light/45",
      highlights: [
        "Bôi đen từ trong đoạn văn để biến thành chỗ trống 1 chạm",
        "Chấp nhận nhiều đáp án đúng, kèm gợi ý & giải thích chi tiết",
        "3 chế độ: Gõ trực tiếp, Chọn từ Word Bank, Nghe & Điền từ",
      ],
      ctaLabel: "Tạo bài Điền từ",
    },
    {
      id: "speaking",
      shortcut: "7",
      title: "Giao tiếp AI (Roleplay)",
      subtitle: "Đóng vai nói chuyện để qua bài",
      description:
        "Học viên nói chuyện trực tiếp bằng Micro hoặc gõ chữ với nhân vật AI có giọng bản xứ, hoàn thành nhiệm vụ giao tiếp và chấm điểm qua bài.",
      icon: Mic,
      cardHoverBorder: "hover:border-success-border",
      iconBoxClass:
        "bg-success-bg border border-success-border text-success-foreground",
      pillClass:
        "bg-success-bg text-success-foreground border-success-border",
      previewBg: "from-success-bg/75 via-surface to-primary-light/45",
      highlights: [
        "AI tự thiết kế tình huống, nhân vật và danh sách nhiệm vụ",
        "Nói qua Micro (Web Speech API) + AI phản hồi giọng bản xứ",
        "Tích xanh Mission real-time & chấm điểm 3 tiêu chí qua bài",
      ],
      ctaLabel: "Tạo bài Giao tiếp AI",
    },
  ];

  if (!sectionId || !courseId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Alert variant="destructive" title="Thiếu thông tin chương hoặc khóa học">
            <p className="text-sm">
              Không tìm thấy <code>section_id</code> hoặc <code>course_id</code>.
              Vui lòng quay lại danh sách khóa học để chọn đúng chương cần thêm
              bài giảng.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/lecturer/courses")}
            >
              Về danh sách khóa học
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1220px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar điều hướng 1 chạm */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/lecturer/chapters?course_id=${courseId}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Chương & bài học</span>
          </Link>

          <Link
            href={`/lecturer/courses/${courseId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Thông tin khóa học</span>
          </Link>
        </div>

        {/* Cloudy Blue Studio Hero */}
        <section className="relative mb-7 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/75 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-primary-pastel/35 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Trạm khởi tạo bài giảng</span>
                </span>
                {sectionContext && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-1 text-xs font-semibold text-foreground">
                    <span>
                      Chương {String(sectionContext.orderNumber).padStart(2, "0")}:
                    </span>
                    <span className="max-w-[220px] truncate text-primary">
                      {sectionContext.title}
                    </span>
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Chọn định dạng bài học mới
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {courseBrief?.title ? (
                  <>
                    Đang thêm nội dung cho khóa học{" "}
                    <strong className="font-semibold text-foreground">
                      {courseBrief.title}
                    </strong>
                    . Chọn 1 trong 3 định dạng bên dưới hoặc nhấn phím{" "}
                    <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      1
                    </kbd>{" "}
                    <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      2
                    </kbd>{" "}
                    <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                      3
                    </kbd>{" "}
                    để mở nhanh.
                  </>
                ) : (
                  "Chọn định dạng phù hợp nhất với nội dung bạn muốn truyền đạt — có thể kết hợp linh hoạt nhiều định dạng trong cùng một chương."
                )}
              </p>
            </div>

            {/* Thẻ trạng thái chương hiện tại */}
            {sectionContext && (
              <div className="rounded-2xl border border-primary-pastel/70 bg-surface/90 p-4 shadow-sm backdrop-blur-xs lg:min-w-[300px] lg:max-w-[340px]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Hiện trạng chương này
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-primary-light/70 px-2 py-2">
                    <p className="text-lg font-bold text-primary">
                      {sectionContext.videoCount}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Video
                    </p>
                  </div>
                  <div className="rounded-xl bg-warning-bg/80 px-2 py-2">
                    <p className="text-lg font-bold text-warning-foreground">
                      {sectionContext.quizCount}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Trắc nghiệm
                    </p>
                  </div>
                  <div className="rounded-xl bg-accent/70 px-2 py-2">
                    <p className="text-lg font-bold text-accent-foreground">
                      {sectionContext.codeCount}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Lập trình
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{sectionContext.recommendReason}</span>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 3 Thẻ định dạng bài học Studio */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {lessonTypes.map((type) => {
            const Icon = type.icon;
            const isRecommended = sectionContext?.recommended === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleSelectType(type.id)}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border-2 bg-surface text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-16px_rgba(53,111,167,0.22)] ${
                  isRecommended
                    ? "border-primary-pastel ring-2 ring-primary/15"
                    : "border-border"
                } ${type.cardHoverBorder}`}
              >
                {/* Khu vực Mini Visual Preview pastel */}
                <div
                  className={`relative border-b border-border/60 bg-gradient-to-br p-5 ${type.previewBg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-13 w-13 items-center justify-center rounded-2xl shadow-xs transition-transform duration-300 group-hover:scale-105 ${type.iconBoxClass}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRecommended && (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                          Gợi ý
                        </span>
                      )}
                      <kbd className="rounded-lg border border-border bg-surface/90 px-2 py-1 font-mono text-[11px] font-bold text-muted-foreground">
                        {type.shortcut}
                      </kbd>
                    </div>
                  </div>

                  {/* Mini UI Mockup đặc trưng cho từng loại bài */}
                  <div className="mt-4 rounded-2xl border border-white/80 bg-surface/85 p-3 shadow-xs backdrop-blur-xs">
                    {type.id === "video" && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          <Play animated={false} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="h-2 w-3/4 rounded-full bg-primary-pastel" />
                          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock animated={false} className="h-3 w-3" />
                              08:45
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Paperclip animated={false} className="h-3 w-3" />
                              Tài liệu PDF
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {type.id === "quiz" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-warning-foreground">
                          <span>Câu hỏi 01/10</span>
                          <span className="inline-flex items-center gap-1">
                            <Bot animated={false} className="h-3 w-3" />
                            Hỗ trợ AI
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="rounded-lg border border-warning-border bg-warning-bg/70 px-2 py-1 text-[10px] font-semibold text-warning-foreground">
                            A. Đáp án đúng
                          </div>
                          <div className="rounded-lg border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                            B. Phương án 2
                          </div>
                        </div>
                      </div>
                    )}
                    {type.id === "code" && (
                      <div className="space-y-1 font-mono text-[10px]">
                        <div className="flex items-center justify-between text-accent-foreground">
                          <span>solution.py</span>
                          <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[9px] font-bold text-success-foreground">
                            3/3 test đạt
                          </span>
                        </div>
                        <p className="truncate rounded-lg bg-background px-2 py-1 text-foreground">
                          def solve(n): return n * (n + 1) // 2
                        </p>
                      </div>
                    )}
                    {type.id === "listening" && (
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between text-primary">
                          <span className="font-semibold">Anna &amp; Ben · UK</span>
                          <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[9px] font-bold">
                            Karaoke + 5 câu
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-lg bg-primary-light px-2 py-0.5 text-primary">
                            Good morning!
                          </span>
                          <span className="rounded-lg bg-secondary-light px-2 py-0.5 text-secondary-foreground">
                            Table for two?
                          </span>
                        </div>
                      </div>
                    )}
                    {type.id === "fill_blank" && (
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-accent-foreground">
                          <span className="font-semibold">Cloze &amp; Dictation</span>
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold">
                            3 chế độ
                          </span>
                        </div>
                        <p className="truncate text-foreground">
                          She{" "}
                          <span className="rounded border border-primary bg-primary-light px-1 font-semibold text-primary">
                            has lived
                          </span>{" "}
                          in London since 2020.
                        </p>
                      </div>
                    )}
                    {type.id === "speaking" && (
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-success-foreground">
                          <span className="font-semibold">AI Roleplay · Mic</span>
                          <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[9px] font-bold">
                            3/4 Mission
                          </span>
                        </div>
                        <p className="truncate text-foreground">
                          Emma: &quot;Welcome! How may I help you today?&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nội dung chi tiết thẻ */}
                <div className="flex flex-1 flex-col p-6">
                  <span
                    className={`mb-2 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${type.pillClass}`}
                  >
                    {type.subtitle}
                  </span>

                  <h2 className="text-xl font-bold text-foreground">
                    {type.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {type.description}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
                    {type.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-xs text-foreground"
                      >
                        <Check
                          animated={false}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-5">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold text-primary transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <span>{type.ctaLabel}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dải mẹo thiết kế bài giảng hiệu quả */}
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-primary-pastel/70 bg-primary-light/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-xs">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Thời lượng vàng 5–12 phút
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Chia nhỏ mỗi video theo đúng 1 khái niệm giúp học sinh tập
                  trung cao hơn và dễ ôn tập lại.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-warning-border/70 bg-warning-bg/35 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-warning-foreground shadow-xs">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Xen kẽ lý thuyết & thực hành
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Sau 2–3 bài Video, hãy thêm 1 bài Trắc nghiệm hoặc Lập trình
                  để học viên kiểm tra mức độ hiểu bài.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-accent-border/70 bg-accent/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-foreground shadow-xs">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Kèm tài liệu & bài tập mẫu
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Bài học Video cho phép đính kèm slide PDF, đề cương và câu hỏi
                  ôn tập ngay sau khi tạo xong.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonsCreate;
