"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
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
  RefreshCw,
  Video,
  Volume2,
} from "pulsoicon-react";
import { renderLearningContent } from "@/components/shared/markdown-renderer/safe-html";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { AdminLessonPreviewPayload } from "@/types/admin/course";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

function resolveMediaUrl(
  rawUrl?: string | null,
  fileId?: string | null,
): string | null {
  if (rawUrl && rawUrl.trim()) {
    const u = rawUrl.trim();
    if (
      u.startsWith("http://") ||
      u.startsWith("https://") ||
      u.startsWith("/api/")
    ) {
      return u;
    }
    return getImageUrl(u);
  }
  if (fileId?.startsWith("r2:")) {
    return `/api/storage/files/${fileId.slice(3)}`;
  }
  return null;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getLessonTypeMeta(type: string) {
  switch (type) {
    case "video":
      return { label: "Video bài giảng", icon: Video };
    case "quiz":
      return { label: "Trắc nghiệm (Quiz)", icon: ListChecks };
    case "code":
      return { label: "Thực hành Code", icon: Code2 };
    case "flashcard":
      return { label: "Thẻ ghi nhớ (Flashcard)", icon: Layers };
    case "listening":
      return { label: "Luyện nghe (Listening)", icon: Headphones };
    case "fill_blank":
      return { label: "Điền vào chỗ trống", icon: FileText };
    case "speaking":
      return { label: "Luyện nói AI (Speaking)", icon: Mic };
    case "resource":
      return { label: "Tài liệu học tập", icon: FolderOpen };
    default:
      return { label: "Bài đọc / Tự luận", icon: BookOpen };
  }
}

interface AdminLessonPreviewPaneProps {
  courseId: string;
  lessonId: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function AdminLessonPreviewPane({
  courseId,
  lessonId,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: AdminLessonPreviewPaneProps) {
  const [quizMode, setQuizMode] = useState<"audit" | "try">("audit");
  const [pickedQuiz, setPickedQuiz] = useState<Record<string, number>>({});
  const [codeRoleTab, setCodeRoleTab] = useState<"starter" | "solution">(
    "solution",
  );
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [showTranscript, setShowTranscript] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<AdminLessonPreviewPayload>(
    lessonId
      ? `/admin/courses/${courseId}/lessons/${lessonId}/preview`
      : null,
    async (url: string) => (await api.get(url)).data,
    { revalidateOnFocus: false },
  );

  if (!lessonId) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface/90 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Eye size={22} animated={false} />
        </div>
        <p className="mt-3 text-sm font-bold text-foreground">
          Chọn một bài học ở cột bên trái để xem trước toàn bộ nội dung
        </p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Admin có toàn quyền xem trước Video, kịch bản, đáp án Quiz, lời giải
          Code và các bài tập AI mà không bị giới hạn quyền học viên.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-3xl border border-primary-pastel/60 bg-surface p-6">
        <div className="h-8 w-2/3 animate-pulse rounded-xl bg-primary-light/60" />
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-background" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-background" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-destructive-border bg-destructive-bg p-6 text-sm text-destructive-foreground">
        <p className="font-semibold">Không tải được nội dung bài học này.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void mutate()}
        >
          <RefreshCw size={14} />
          Thử tải lại
        </Button>
      </div>
    );
  }

  const meta = getLessonTypeMeta(data.lesson_type);
  const TypeIcon = meta.icon;

  const ytId =
    extractYouTubeId(data.video?.file_id) ||
    extractYouTubeId(data.video?.video_url);
  const directVideoUrl = !ytId
    ? resolveMediaUrl(data.video?.video_url, data.video?.file_id)
    : null;

  return (
    <div className="space-y-5 rounded-3xl border border-primary-pastel/65 bg-surface/95 p-5 shadow-[0_16px_42px_-18px_rgba(53,111,167,0.16)] sm:p-6">
      {/* Lesson Header & Prev/Next Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-0.5 font-bold text-primary">
              <TypeIcon size={13} animated={false} />
              {meta.label}
            </span>
            {data.section_title && (
              <span className="text-muted-foreground">
                Chương:{" "}
                <strong className="text-foreground">
                  {data.section_title}
                </strong>
              </span>
            )}
            {data.is_preview && (
              <span className="rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
                Cho phép Học thử
              </span>
            )}
          </div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {data.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={onPrev}
          >
            <ChevronLeft size={14} />
            Bài trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={onNext}
          >
            Bài tiếp
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* 1. VIDEO PLAYER */}
      {(data.lesson_type === "video" || data.video) && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <div className="aspect-video w-full">
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={data.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : directVideoUrl ? (
                <video
                  key={directVideoUrl}
                  src={directVideoUrl}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-warning-bg/90 p-6 text-center text-warning-foreground">
                  <AlertTriangle size={28} animated={false} />
                  <p className="text-sm font-bold">
                    Bài giảng Video này chưa được tải tệp video hoặc gắn liên
                    kết YouTube
                  </p>
                  <p className="text-xs opacity-85">
                    Bạn có thể bấm “Yêu cầu chỉnh sửa” để nhắc Giảng viên bổ
                    sung video cho bài học.
                  </p>
                </div>
              )}
            </div>
          </div>

          {data.video?.transcript && (
            <div className="rounded-2xl border border-border bg-background/60 p-3.5">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-bold text-foreground"
              >
                <span>Phụ đề / Transcript bài giảng</span>
                <span className="text-primary">
                  {showTranscript ? "Thu gọn" : "Xem toàn văn"}
                </span>
              </button>
              {showTranscript && (
                <p className="mt-2.5 max-h-56 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {data.video.transcript}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. DESCRIPTION / ARTICLE CONTENT */}
      {data.description && data.description.trim() && (
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Nội dung / Mô tả bài học
          </p>
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{
              __html: renderLearningContent(data.description),
            }}
          />
        </div>
      )}

      {/* 3. QUIZZES (TRẮC NGHIỆM) */}
      {(data.lesson_type === "quiz" || data.quizzes.length > 0) && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <ListChecks size={16} animated={false} className="text-primary" />
              Bộ câu hỏi Trắc nghiệm ({data.quizzes.length} câu)
            </h3>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setQuizMode("audit")}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  quizMode === "audit"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Xem đáp án chuẩn
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickedQuiz({});
                  setQuizMode("try");
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold ${
                  quizMode === "try"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Làm thử như HV
              </button>
            </div>
          </div>

          {data.quizzes.length === 0 ? (
            <div className="rounded-2xl border border-warning-border bg-warning-bg/70 p-4 text-xs font-medium text-warning-foreground">
              Bài trắc nghiệm này chưa có câu hỏi nào.
            </div>
          ) : (
            <div className="space-y-3">
              {data.quizzes.map((q, qi) => {
                const pickedIdx = pickedQuiz[q.id];
                const reveal =
                  quizMode === "audit" || typeof pickedIdx === "number";
                return (
                  <div
                    key={q.id}
                    className="space-y-2.5 rounded-2xl border border-border bg-background/60 p-4"
                  >
                    <p className="text-sm font-bold text-foreground">
                      Câu {qi + 1}: {q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => {
                        const isPicked = pickedIdx === oi;
                        let style =
                          "border-border bg-surface text-foreground hover:border-primary-pastel";
                        if (reveal) {
                          if (opt.is_correct) {
                            style =
                              "border-success-border bg-success-bg font-semibold text-success-foreground";
                          } else if (isPicked && !opt.is_correct) {
                            style =
                              "border-destructive-border bg-destructive-bg text-destructive-foreground";
                          }
                        }
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={quizMode === "audit"}
                            onClick={() =>
                              setPickedQuiz((prev) => ({
                                ...prev,
                                [q.id]: oi,
                              }))
                            }
                            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${style}`}
                          >
                            <span className="font-bold">
                              {OPTION_LETTERS[oi] || oi + 1}.
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {reveal && opt.is_correct && (
                              <CheckCircle2
                                size={14}
                                animated={false}
                                className="shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {reveal && q.explanation && (
                      <p className="rounded-xl border border-info-border/60 bg-info-bg/50 px-3 py-2 text-xs text-info-foreground">
                        <strong>Giải thích:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. CODE EXERCISES (THỰC HÀNH LẬP TRÌNH) */}
      {(data.lesson_type === "code" || data.codes.length > 0) && (
        <div className="space-y-4">
          {data.codes.length === 0 ? (
            <div className="rounded-2xl border border-warning-border bg-warning-bg/70 p-4 text-xs font-medium text-warning-foreground">
              Bài thực hành lập trình chưa cấu hình đề bài hoặc testcases.
            </div>
          ) : (
            data.codes.map((code) => {
              const filteredFiles = code.files.filter(
                (f) => f.role === codeRoleTab,
              );
              const displayFiles =
                filteredFiles.length > 0 ? filteredFiles : code.files;
              return (
                <div
                  key={code.id}
                  className="space-y-3 rounded-2xl border border-border bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {code.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Ngôn ngữ:{" "}
                        <strong>
                          {code.language?.name || "Đa ngôn ngữ"}{" "}
                          {code.language?.version || ""}
                        </strong>{" "}
                        · Độ khó: <strong>{code.difficulty}</strong> · Giới hạn:{" "}
                        {code.time_limit ?? 2}s
                      </p>
                    </div>
                    <div className="flex rounded-xl border border-border bg-surface p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setCodeRoleTab("solution")}
                        className={`rounded-lg px-2.5 py-1 font-semibold ${
                          codeRoleTab === "solution"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Lời giải chuẩn (Solution)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeRoleTab("starter")}
                        className={`rounded-lg px-2.5 py-1 font-semibold ${
                          codeRoleTab === "starter"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        Code khung (Starter)
                      </button>
                    </div>
                  </div>

                  {code.description && (
                    <div
                      className="prose prose-sm max-w-none rounded-xl border border-border/70 bg-surface p-3 text-xs text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: renderLearningContent(code.description),
                      }}
                    />
                  )}

                  {displayFiles.map((f) => (
                    <div
                      key={f.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="flex items-center justify-between border-b border-border bg-primary-light/50 px-3 py-1.5 text-xs font-semibold text-foreground">
                        <span className="font-mono">{f.filename}</span>
                        <span className="uppercase text-primary">{f.role}</span>
                      </div>
                      <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed text-foreground">
                        <code>{f.content}</code>
                      </pre>
                    </div>
                  ))}

                  {code.testcases.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-foreground">
                        Bộ kiểm thử ({code.testcases.length} Testcases)
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {code.testcases.map((tc, idx) => (
                          <div
                            key={tc.id}
                            className="rounded-xl border border-border bg-surface p-2.5 text-xs"
                          >
                            <div className="flex justify-between font-semibold">
                              <span>Test #{idx + 1}</span>
                              <span className="text-[10px] text-primary">
                                {tc.is_sample ? "Mẫu công khai" : "Test ẩn"}
                              </span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                              In: {tc.input || "(trống)"} → Out:{" "}
                              <strong className="text-foreground">
                                {tc.expected_output || "(trống)"}
                              </strong>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. FLASHCARDS */}
      {(data.lesson_type === "flashcard" || data.flashcards.length > 0) && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Layers size={16} animated={false} className="text-primary" />
            Bộ thẻ Flashcard ({data.flashcards.length} thẻ — bấm vào thẻ để lật)
          </h3>
          {data.flashcards.length === 0 ? (
            <div className="rounded-2xl border border-warning-border bg-warning-bg/70 p-4 text-xs font-medium text-warning-foreground">
              Bài học Flashcard chưa có thẻ từ nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.flashcards.map((fc) => {
                const flipped = Boolean(flippedCards[fc.id]);
                const audioSrc = resolveMediaUrl(fc.audio_url);
                return (
                  <div
                    key={fc.id}
                    onClick={() =>
                      setFlippedCards((prev) => ({
                        ...prev,
                        [fc.id]: !prev[fc.id],
                      }))
                    }
                    className="cursor-pointer rounded-2xl border border-primary-pastel/80 bg-gradient-to-br from-primary-light/50 via-surface to-accent-vanilla/35 p-4 transition-all hover:border-primary"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{flipped ? "Mặt sau (Nghĩa)" : "Mặt trước"}</span>
                      {fc.part_of_speech && (
                        <span className="rounded-full bg-surface px-2 py-0.5 font-semibold text-primary">
                          {fc.part_of_speech}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-bold text-foreground">
                      {flipped ? fc.back_text : fc.front_text}
                    </p>
                    {!flipped && fc.phonetic && (
                      <p className="text-xs text-muted-foreground">
                        {fc.phonetic}
                      </p>
                    )}
                    {fc.example_sentence && (
                      <p className="mt-2 border-t border-border/60 pt-2 text-xs italic text-muted-foreground">
                        “{fc.example_sentence}”
                      </p>
                    )}
                    {audioSrc && (
                      <div
                        className="mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <audio controls src={audioSrc} className="h-8 w-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. LISTENING */}
      {(data.lesson_type === "listening" || data.listening) && (
        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Headphones size={16} animated={false} className="text-primary" />
              Bài luyện nghe tương tác ({data.listening?.lang_code || "en"})
            </h3>
            {data.listening && (
              <span className="text-xs text-muted-foreground">
                Điểm đạt: <strong>{data.listening.pass_percent}%</strong> · Lượt
                nghe tối đa:{" "}
                <strong>
                  {data.listening.max_plays === 0
                    ? "Không giới hạn"
                    : data.listening.max_plays}
                </strong>
              </span>
            )}
          </div>

          {!data.listening ? (
            <p className="text-xs text-warning-foreground">
              Chưa cấu hình dữ liệu bài nghe.
            </p>
          ) : (
            <>
              {data.listening.scenario && (
                <p className="text-xs text-muted-foreground">
                  <strong>Bối cảnh:</strong> {data.listening.scenario}
                </p>
              )}
              {resolveMediaUrl(data.listening.audio_url) && (
                <audio
                  controls
                  src={resolveMediaUrl(data.listening.audio_url) || undefined}
                  className="w-full"
                />
              )}
              <div className="space-y-2">
                {data.listening.script_lines.map((line, idx) => (
                  <div
                    key={line.id || idx}
                    className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs"
                  >
                    <p className="font-bold text-primary">
                      {line.speaker || `Thoại #${idx + 1}`}
                    </p>
                    <p className="mt-0.5 text-foreground">{line.text}</p>
                    {line.translation && (
                      <p className="mt-0.5 italic text-muted-foreground">
                        {line.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 7. FILL IN THE BLANK */}
      {(data.lesson_type === "fill_blank" || data.fill_blank) && (
        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <FileText size={16} animated={false} className="text-primary" />
              Bài tập Điền từ ({data.fill_blank?.mode || "typing"})
            </h3>
            {data.fill_blank && (
              <span className="text-xs text-muted-foreground">
                Điểm đạt: <strong>{data.fill_blank.pass_percent}%</strong>
              </span>
            )}
          </div>

          {!data.fill_blank ? (
            <p className="text-xs text-warning-foreground">
              Chưa cấu hình bài tập điền từ.
            </p>
          ) : (
            <>
              {resolveMediaUrl(data.fill_blank.audio_url) && (
                <audio
                  controls
                  src={resolveMediaUrl(data.fill_blank.audio_url) || undefined}
                  className="w-full"
                />
              )}
              <div className="rounded-xl border border-border bg-surface p-3.5 text-sm leading-relaxed text-foreground">
                {data.fill_blank.prompt_text || "(Chưa có đoạn văn gốc)"}
              </div>
              {data.fill_blank.translation && (
                <p className="text-xs italic text-muted-foreground">
                  Dịch nghĩa: {data.fill_blank.translation}
                </p>
              )}
              {data.fill_blank.blanks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.fill_blank.blanks.map((b, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-xl border border-success-border bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-foreground"
                    >
                      Ô #{(b.index ?? idx) + 1}:{" "}
                      <strong>{b.answer || "—"}</strong>
                    </span>
                  ))}
                </div>
              )}
              {data.fill_blank.distractors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <strong>Từ gây nhiễu:</strong>{" "}
                  {data.fill_blank.distractors.join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* 8. SPEAKING ROLEPLAY */}
      {(data.lesson_type === "speaking" || data.speaking) && (
        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Mic size={16} animated={false} className="text-primary" />
              Kịch bản Luyện nói AI Roleplay
            </h3>
            {data.speaking && (
              <span className="text-xs text-muted-foreground">
                Trình độ: <strong>{data.speaking.level}</strong> · Tối đa{" "}
                <strong>{data.speaking.max_turns} lượt thoại</strong>
              </span>
            )}
          </div>

          {!data.speaking ? (
            <p className="text-xs text-warning-foreground">
              Chưa cấu hình kịch bản luyện nói AI.
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="font-bold text-foreground">Tình huống:</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  {data.speaking.scenario}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                  <span>
                    Vai học viên:{" "}
                    <strong className="text-primary">
                      {data.speaking.student_role || "Người học"}
                    </strong>
                  </span>
                  {data.speaking.ai_persona?.name && (
                    <span>
                      Vai AI:{" "}
                      <strong className="text-foreground">
                        {data.speaking.ai_persona.name} (
                        {data.speaking.ai_persona.role || "AI Partner"})
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {data.speaking.missions.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="font-bold text-foreground">
                    Nhiệm vụ hội thoại ({data.speaking.missions.length}):
                  </p>
                  <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                    {data.speaking.missions.map((m, idx) => (
                      <li key={idx}>
                        {typeof m === "string"
                          ? m
                          : m.title || m.text || JSON.stringify(m)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.speaking.sample_phrases.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="font-bold text-foreground">Mẫu câu gợi ý:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {data.speaking.sample_phrases.map((sp, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-primary-pastel bg-primary-light/60 px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        {typeof sp === "string"
                          ? sp
                          : sp.phrase || sp.text || ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 9. ATTACHED RESOURCES */}
      {data.resources.length > 0 && (
        <div className="space-y-2.5 border-t border-border/70 pt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <FolderOpen size={14} animated={false} className="text-primary" />
            Tài liệu đính kèm ({data.resources.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.resources.map((res) => {
              const href = resolveMediaUrl(res.url) || res.url;
              return (
                <a
                  key={res.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-xs transition-colors hover:border-primary hover:bg-primary-light/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {res.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {res.resource_type || res.mime_type || "Tệp đính kèm"}
                      {res.file_size ? ` · ${formatBytes(res.file_size)}` : ""}
                    </p>
                  </div>
                  <ExternalLink
                    size={13}
                    animated={false}
                    className="shrink-0 text-primary"
                  />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta Footer */}
      {(data.outcomes.length > 0 || data.prerequisites.length > 0) && (
        <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-4 text-xs sm:grid-cols-2">
          {data.outcomes.length > 0 && (
            <div>
              <p className="font-bold text-foreground">Mục tiêu bài học:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                {data.outcomes.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {data.prerequisites.length > 0 && (
            <div>
              <p className="font-bold text-foreground">Kiến thức cần có:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                {data.prerequisites.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
