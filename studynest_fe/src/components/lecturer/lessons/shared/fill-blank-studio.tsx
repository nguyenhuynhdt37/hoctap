"use client";

import { LISTENING_LANGUAGES } from "@/components/lecturer/lessons/shared/listening-studio";
import { StudioVideoSectionGroup } from "@/components/lecturer/lessons/shared/quiz-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { FillBlankItem, FillBlankMode } from "@/types/lecturer/fill-blank";
import { TtsVoiceOption } from "@/types/lecturer/flashcard";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Eye,
  FileText,
  Headphones,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Volume2,
  X,
} from "pulsoicon-react";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";

// ============================================
// HELPERS
// ============================================

export function createFillBlankUid(prefix = "fb"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Chuẩn hóa lại thứ tự {{1}}..{{n}} theo đúng thứ tự xuất hiện trong promptText
 * để đảm bảo không bao giờ bị lệch index khi thêm/xóa chỗ trống.
 */
export function reindexFillBlanks(
  promptText: string,
  blanks: FillBlankItem[]
): { promptText: string; blanks: FillBlankItem[] } {
  const byOldIndex = new Map<number, FillBlankItem>();
  for (const b of blanks) {
    byOldIndex.set(b.index, b);
  }

  const orderMap = new Map<number, number>();
  const newBlanks: FillBlankItem[] = [];
  let nextIdx = 1;

  const updatedPrompt = promptText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, numStr) => {
    const oldIdx = Number(numStr);
    if (!orderMap.has(oldIdx)) {
      orderMap.set(oldIdx, nextIdx);
      const existing = byOldIndex.get(oldIdx);
      newBlanks.push(
        existing
          ? { ...existing, index: nextIdx }
          : {
              id: createFillBlankUid(`b${nextIdx}`),
              index: nextIdx,
              answers: [""],
              hint: "",
              explanation: "",
              part_of_speech: "",
            }
      );
      nextIdx += 1;
    }
    return `{{${orderMap.get(oldIdx)}}}`;
  });

  return { promptText: updatedPrompt, blanks: newBlanks };
}

export interface FillBlankStudioState {
  lessonTitle: string;
  langCode: string;
  mode: FillBlankMode;
  promptText: string;
  translation: string;
  blanks: FillBlankItem[];
  distractors: string[];
  voiceId: string;
  audioUrl: string;
  durationSeconds: number;
  caseSensitive: boolean;
  allowHint: boolean;
  passPercent: number;
}

interface FillBlankStudioProps {
  mode: "create" | "edit";
  sectionName?: string;
  videoSections: StudioVideoSectionGroup[];
  state: FillBlankStudioState;
  onChange: (
    updater: (prev: FillBlankStudioState) => FillBlankStudioState
  ) => void;
  onSave: (autoRenderAudio: boolean) => Promise<void>;
  onBack: () => void;
  onPreview?: () => void;
  isSubmitting: boolean;
  error?: string | null;
  savedBanner?: string | null;
}

// ============================================
// COMPONENT
// ============================================

export function FillBlankStudio({
  mode,
  sectionName,
  videoSections,
  state,
  onChange,
  onSave,
  onBack,
  onPreview,
  isSubmitting,
  error,
  savedBanner,
}: FillBlankStudioProps) {
  const [activeStep, setActiveStep] = useState<
    "editor" | "blanks" | "settings"
  >("editor");
  const [aiPanelOpen, setAiPanelOpen] = useState(
    () => mode === "create" && !state.promptText.trim()
  );

  // Audio render state
  const [isRenderingAudio, setIsRenderingAudio] = useState(false);
  const [audioDirty, setAudioDirty] = useState(false);

  // Selection ref cho nút "Biến thành chỗ trống"
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [newDistractor, setNewDistractor] = useState("");

  // AI Generator state
  const [aiSourceMode, setAiSourceMode] = useState<"topic" | "video">("topic");
  const [aiTopic, setAiTopic] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [aiBlankCount, setAiBlankCount] = useState<number>(6);
  const [autoAudioAfterAi, setAutoAudioAfterAi] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { data: voicesRes } = useSWR<{ voices: TtsVoiceOption[] }>(
    "/lecturer/lessons/flashcards/voices",
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const voices = useMemo(() => voicesRes?.voices || [], [voicesRes]);

  const filteredVoices = useMemo(() => {
    if (!voices.length) return [];
    const prefix = state.langCode.split("-")[0].toLowerCase();
    const sameLang = voices.filter((v) =>
      v.lang_code.toLowerCase().startsWith(prefix)
    );
    return sameLang.length > 0 ? sameLang : voices;
  }, [voices, state.langCode]);

  const blankByIndex = useMemo(() => {
    const m = new Map<number, FillBlankItem>();
    for (const b of state.blanks) m.set(b.index, b);
    return m;
  }, [state.blanks]);

  // Bôi đen từ trong textarea -> biến thành chỗ trống {{n}}
  const handleMakeBlankFromSelection = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      showToast.error(
        "Hãy bôi đen 1 từ hoặc cụm từ trong đoạn văn trước khi bấm nút này."
      );
      return;
    }
    const selected = state.promptText.slice(start, end).trim();
    if (!selected || /\{\{\s*\d+\s*\}\}/.test(selected)) {
      showToast.error("Vùng chọn không hợp lệ hoặc đã chứa chỗ trống.");
      return;
    }

    const tempIdx =
      Math.max(0, ...state.blanks.map((b) => b.index)) + 1;
    const rawPrompt =
      state.promptText.slice(0, start) +
      `{{${tempIdx}}}` +
      state.promptText.slice(end);
    const nextBlank: FillBlankItem = {
      id: createFillBlankUid("b"),
      index: tempIdx,
      answers: [selected],
      hint: "",
      explanation: "",
      part_of_speech: "",
    };

    const reindexed = reindexFillBlanks(rawPrompt, [...state.blanks, nextBlank]);
    onChange((prev) => ({
      ...prev,
      promptText: reindexed.promptText,
      blanks: reindexed.blanks,
    }));
    setAudioDirty(true);
    showToast.success(`Đã tạo chỗ trống cho "${selected}".`);
  };

  // Xóa 1 chỗ trống -> trả lại từ gốc vào đoạn văn
  const handleRestoreBlankToText = (indexToRestore: number) => {
    const target = blankByIndex.get(indexToRestore);
    const originalWord = target?.answers?.[0] || "";
    const regex = new RegExp(`\\{\\{\\s*${indexToRestore}\\s*\\}\\}`, "g");
    const replacedPrompt = state.promptText.replace(regex, originalWord);
    const remaining = state.blanks.filter((b) => b.index !== indexToRestore);
    const reindexed = reindexFillBlanks(replacedPrompt, remaining);
    onChange((prev) => ({
      ...prev,
      promptText: reindexed.promptText,
      blanks: reindexed.blanks,
    }));
  };

  const handleUpdateBlank = (
    index: number,
    patch: Partial<FillBlankItem>
  ) => {
    onChange((prev) => ({
      ...prev,
      blanks: prev.blanks.map((b) =>
        b.index === index ? { ...b, ...patch } : b
      ),
    }));
    if (patch.answers) setAudioDirty(true);
  };

  // Tạo Audio đọc toàn đoạn văn bản đã điền đáp án chuẩn
  const renderAudioForPayload = async (
    promptText: string,
    blanks: FillBlankItem[],
    langCode: string,
    voiceId?: string
  ) => {
    if (!promptText.trim()) {
      showToast.error("Hãy nhập đoạn văn trước khi tạo giọng đọc.");
      return;
    }
    setIsRenderingAudio(true);
    try {
      const res = await api.post(
        "/lecturer/lessons/fill-blank/render-audio",
        {
          prompt_text: promptText,
          blanks,
          lang_code: langCode,
          voice_id: voiceId || null,
        },
        { timeout: 120_000 }
      );
      onChange((prev) => ({
        ...prev,
        audioUrl: res.data?.audio_url || prev.audioUrl,
        voiceId: res.data?.voice_id || prev.voiceId,
      }));
      setAudioDirty(false);
      showToast.success("Đã tạo giọng đọc bản xứ cho bài điền từ!");
    } catch (err) {
      showToast.error(
        formatApiError(err, "Không thể tạo giọng đọc cho đoạn văn.")
      );
    } finally {
      setIsRenderingAudio(false);
    }
  };

  // AI sinh trọn bộ bài Điền từ
  const handleGenerateWithAi = async () => {
    if (aiSourceMode === "topic" && !aiTopic.trim()) {
      showToast.error("Hãy nhập chủ đề hoặc điểm ngữ pháp để AI biên soạn.");
      return;
    }
    if (aiSourceMode === "video" && selectedVideoIds.length === 0) {
      showToast.error("Hãy chọn ít nhất 1 bài giảng Video.");
      return;
    }
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const res = await api.post(
        "/lecturers/chat/lesson/fill-blank",
        {
          topic: aiSourceMode === "topic" ? aiTopic.trim() : "",
          lesson_ids: aiSourceMode === "video" ? selectedVideoIds : [],
          lang_code: state.langCode,
          blank_count: aiBlankCount,
          mode: state.mode,
        },
        { timeout: 150_000 }
      );
      const data = res.data;
      const nextPrompt = String(data.prompt_text || "").trim();
      const nextBlanks: FillBlankItem[] = Array.isArray(data.blanks)
        ? data.blanks.map((b: FillBlankItem, idx: number) => ({
            id: b.id || createFillBlankUid(`b${idx + 1}`),
            index: Number(b.index || idx + 1),
            answers: Array.isArray(b.answers) && b.answers.length > 0 ? b.answers : [""],
            hint: b.hint || "",
            explanation: b.explanation || "",
            part_of_speech: b.part_of_speech || "",
          }))
        : [];
      const reindexed = reindexFillBlanks(nextPrompt, nextBlanks);
      const nextVoiceId = data.voice_id || state.voiceId || "";

      onChange((prev) => ({
        ...prev,
        lessonTitle: prev.lessonTitle.trim()
          ? prev.lessonTitle
          : data.title || prev.lessonTitle,
        promptText: reindexed.promptText,
        translation: data.translation || prev.translation,
        blanks: reindexed.blanks,
        distractors: Array.isArray(data.distractors) ? data.distractors : [],
        voiceId: nextVoiceId,
        audioUrl: "",
      }));
      setAudioDirty(true);

      if (autoAudioAfterAi && reindexed.promptText) {
        await renderAudioForPayload(
          reindexed.promptText,
          reindexed.blanks,
          state.langCode,
          nextVoiceId
        );
      } else {
        showToast.success(
          `AI đã tạo đoạn văn với ${reindexed.blanks.length} chỗ trống!`
        );
      }
      setAiPanelOpen(false);
    } catch (err) {
      const msg = formatApiError(
        err,
        "AI không thể tạo bài Điền từ lúc này."
      );
      setAiError(msg);
      showToast.error(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddDistractor = () => {
    const val = newDistractor.trim();
    if (!val) return;
    if (state.distractors.includes(val)) {
      setNewDistractor("");
      return;
    }
    onChange((prev) => ({
      ...prev,
      distractors: [...prev.distractors, val],
    }));
    setNewDistractor("");
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  // Render Live Preview của đoạn văn với chip chỗ trống inline
  const previewSegments = useMemo(() => {
    const parts: Array<
      { type: "text"; content: string } | { type: "blank"; index: number }
    > = [];
    const regex = /\{\{\s*(\d+)\s*\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(state.promptText)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: state.promptText.slice(lastIndex, match.index),
        });
      }
      parts.push({ type: "blank", index: Number(match[1]) });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < state.promptText.length) {
      parts.push({
        type: "text",
        content: state.promptText.slice(lastIndex),
      });
    }
    return parts;
  }, [state.promptText]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1. TOP BAR GỌN */}
      <div className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent text-accent-foreground">
                <Pencil className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {state.lessonTitle.trim() ||
                    (mode === "create"
                      ? "Bài Điền từ vào chỗ trống mới"
                      : "Chỉnh sửa bài Điền từ")}
                </p>
                {sectionName && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {sectionName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiPanelOpen((v) => !v)}
              className={`gap-1.5 ${
                aiPanelOpen
                  ? "border-primary bg-primary-light text-primary"
                  : ""
              }`}
            >
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Tạo bằng AI</span>
            </Button>
            {onPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreview}
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Xem trước</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() =>
                onSave(
                  state.mode === "dictation" && (audioDirty || !state.audioUrl)
                )
              }
              disabled={isSubmitting || isRenderingAudio || isGeneratingAi}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting
                ? "Đang lưu..."
                : mode === "create"
                  ? "Tạo bài học"
                  : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. WORKSPACE TOÀN CHIỀU RỘNG */}
      <div className="mx-auto max-w-6xl space-y-5 px-4 pt-6 sm:px-6">
        {error && (
          <Alert variant="destructive" title="Có lỗi xảy ra">
            {error}
          </Alert>
        )}
        {savedBanner && (
          <Alert variant="success" title="Đã lưu thành công">
            {savedBanner}
          </Alert>
        )}

        {/* Tên bài + Ngôn ngữ */}
        <Card className="border-border bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-8">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tên bài Điền từ <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={state.lessonTitle}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, lessonTitle: e.target.value }))
                }
                placeholder="VD: Luyện thì Hiện tại Hoàn thành qua email công việc"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Ngôn ngữ bài tập
              </label>
              <select
                value={state.langCode}
                onChange={(e) => {
                  onChange((prev) => ({ ...prev, langCode: e.target.value }));
                  setAudioDirty(true);
                }}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary"
              >
                {LISTENING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* BẢNG TRỢ LÝ AI */}
        {aiPanelOpen && (
          <Card className="border-primary-pastel bg-gradient-to-br from-primary-light/60 via-surface to-accent/30 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    AI tạo bài Điền từ tự động
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tự động viết đoạn văn, đục lỗ chỗ trống, sinh gợi ý, giải thích và từ nhiễu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiPanelOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
                aria-label="Đóng bảng AI"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="space-y-3 md:col-span-8">
                <div className="inline-flex rounded-xl border border-border bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setAiSourceMode("topic")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      aiSourceMode === "topic"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Nhập chủ đề / ngữ pháp
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSourceMode("video")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      aiSourceMode === "video"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Lấy từ Video khóa học
                  </button>
                </div>

                {aiSourceMode === "topic" ? (
                  <textarea
                    rows={4}
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="VD: Đoạn văn ngắn về du lịch mùa hè, kiểm tra giới từ in/on/at và thì quá khứ đơn (trình độ A2-B1)..."
                    className="min-h-[108px] w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                  />
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3.5">
                    {videoSections.length === 0 ? (
                      <p className="py-3 text-center text-xs text-muted-foreground">
                        Chưa có bài Video nào đã phân tích AI trong khóa học này.
                      </p>
                    ) : (
                      videoSections.map((group) => (
                        <div key={group.sectionId} className="space-y-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {group.sectionTitle}
                          </p>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {group.videos.map((v) => (
                              <label
                                key={v.id}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-primary-light/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedVideoIds.includes(v.id)}
                                  onChange={() => toggleVideoSelection(v.id)}
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                <span className="truncate text-foreground">
                                  {v.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 md:col-span-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Số chỗ trống cần tạo
                  </label>
                  <select
                    value={aiBlankCount}
                    onChange={(e) => setAiBlankCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground outline-none"
                  >
                    {[4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} chỗ trống
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={autoAudioAfterAi}
                    onChange={(e) => setAutoAudioAfterAi(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>Tự tạo giọng đọc bản xứ kèm theo</span>
                </label>

                <Button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={isGeneratingAi || isRenderingAudio}
                  className="w-full gap-2"
                >
                  {isGeneratingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {isGeneratingAi
                    ? "AI đang biên soạn..."
                    : "Bắt đầu tạo bằng AI"}
                </Button>
              </div>
            </div>

            {aiError && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive">
                {aiError}
              </p>
            )}
          </Card>
        )}

        {/* 3. THANH 3 BƯỚC */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStep("editor")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "editor"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              1. Đoạn văn &amp; Chỗ trống
              <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground">
                {state.blanks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("blanks")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "blanks"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              2. Đáp án &amp; Từ nhiễu
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("settings")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "settings"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              3. Chế độ làm bài
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary-pastel bg-primary-light/60 text-primary"
            >
              {state.mode === "typing"
                ? "Gõ trực tiếp"
                : state.mode === "word_bank"
                  ? "Ngân hàng từ"
                  : "Nghe & Điền từ"}
            </Badge>
            {state.audioUrl && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Có Audio
              </span>
            )}
          </div>
        </div>

        {/* =========================================
            BƯỚC 1: SOẠN ĐOẠN VĂN & ĐỤC LỖ CHỖ TRỐNG
           ========================================= */}
        {activeStep === "editor" && (
          <div className="space-y-4">
            <Card className="space-y-3 border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Nội dung đoạn văn / câu hỏi
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Bôi đen bất kỳ từ hoặc cụm từ nào rồi bấm <strong>&quot;Biến thành chỗ trống&quot;</strong> để tự đánh dấu <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>...
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMakeBlankFromSelection}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Biến thành chỗ trống
                </Button>
              </div>

              <textarea
                ref={textareaRef}
                rows={10}
                value={state.promptText}
                onChange={(e) => {
                  onChange((prev) => ({ ...prev, promptText: e.target.value }));
                  setAudioDirty(true);
                }}
                placeholder="Nhập đoạn văn bản ngoại ngữ vào đây, sau đó bôi đen từ cần kiểm tra và bấm 'Biến thành chỗ trống'..."
                className="min-h-[240px] w-full resize-y rounded-xl border border-border bg-background p-4 text-base leading-relaxed text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />

              {/* Live Preview trực quan */}
              {state.promptText.trim() && (
                <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/25 p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Xem trước chỗ trống ({state.blanks.length} ô)
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-8 text-foreground">
                    {previewSegments.map((seg, i) => {
                      if (seg.type === "text") {
                        return <span key={i}>{seg.content}</span>;
                      }
                      const b = blankByIndex.get(seg.index);
                      const ans = b?.answers?.[0] || "???";
                      return (
                        <span
                          key={i}
                          className="mx-1 inline-flex items-center gap-1 rounded-lg border border-primary bg-surface px-2 py-0.5 text-xs font-semibold text-primary shadow-xs"
                        >
                          <span className="rounded bg-primary-light px-1 text-[10px]">
                            {seg.index}
                          </span>
                          <span>{ans}</span>
                          <button
                            type="button"
                            onClick={() => handleRestoreBlankToText(seg.index)}
                            className="ml-0.5 text-muted-foreground hover:text-destructive"
                            title="Khôi phục lại thành chữ thường"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bản dịch tiếng Việt */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Bản dịch tiếng Việt toàn đoạn (hiển thị sau khi học viên nộp bài)
                </label>
                <textarea
                  rows={5}
                  value={state.translation}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      translation: e.target.value,
                    }))
                  }
                  placeholder="Nhập bản dịch tiếng Việt..."
                  className="min-h-[128px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                />
              </div>
            </Card>

            {/* Khối Giọng đọc bản xứ (dùng cho Nghe & Điền từ hoặc nghe kiểm tra) */}
            <Card className="border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                    <Volume2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Giọng đọc bản xứ (cho chế độ Nghe &amp; Điền từ)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tự động đọc toàn đoạn văn với đầy đủ đáp án chuẩn.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={state.voiceId}
                    onChange={(e) => {
                      onChange((prev) => ({ ...prev, voiceId: e.target.value }));
                      setAudioDirty(true);
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Giọng mặc định theo ngôn ngữ</option>
                    {filteredVoices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.label} ({v.badge})
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRenderingAudio || !state.promptText.trim()}
                    onClick={() =>
                      renderAudioForPayload(
                        state.promptText,
                        state.blanks,
                        state.langCode,
                        state.voiceId
                      )
                    }
                    className="gap-1.5"
                  >
                    {isRenderingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {state.audioUrl ? "Tạo lại Audio" : "Tạo Audio"}
                  </Button>
                </div>
              </div>

              {state.audioUrl && (
                <div className="mt-3 rounded-xl border border-border bg-background px-3 py-1.5">
                  <audio src={state.audioUrl} controls className="h-9 w-full" />
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================
            BƯỚC 2: ĐÁP ÁN, GỢI Ý & TỪ NHIỄU
           ========================================= */}
        {activeStep === "blanks" && (
          <div className="space-y-5">
            <Card className="space-y-4 border-border bg-surface p-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Chi tiết đáp án từng chỗ trống ({state.blanks.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Nếu chấp nhận nhiều cách viết đúng, hãy ngăn cách bằng dấu <code>|</code> (VD: <code>don&apos;t | do not</code>).
                </p>
              </div>

              {state.blanks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 p-8 text-center text-sm text-muted-foreground">
                  Chưa có chỗ trống nào. Quay lại <strong>Bước 1</strong> để bôi đen từ cần đục lỗ hoặc dùng AI tạo nhanh.
                </div>
              ) : (
                <div className="space-y-3">
                  {state.blanks.map((blank) => (
                    <div
                      key={blank.id}
                      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-background/60 p-4 md:grid-cols-12"
                    >
                      <div className="flex items-center justify-between md:col-span-12">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                            {blank.index}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            Chỗ trống {`{{${blank.index}}}`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreBlankToText(blank.index)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Bỏ chỗ trống
                        </button>
                      </div>

                      <div className="md:col-span-6">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Đáp án đúng (nhiều đáp án cách nhau bằng |)
                        </label>
                        <input
                          type="text"
                          value={blank.answers.join(" | ")}
                          onChange={(e) => {
                            const parts = e.target.value
                              .split("|")
                              .map((s) => s.trim());
                            handleUpdateBlank(blank.index, {
                              answers: parts.length > 0 ? parts : [""],
                            });
                          }}
                          placeholder="VD: have been | 've been"
                          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                        />
                      </div>

                      <div className="md:col-span-6">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Loại từ / Gợi ý ngắn
                        </label>
                        <input
                          type="text"
                          value={blank.hint || ""}
                          onChange={(e) =>
                            handleUpdateBlank(blank.index, {
                              hint: e.target.value,
                            })
                          }
                          placeholder="VD: động từ quá khứ"
                          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                        />
                      </div>

                      <div className="md:col-span-12">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Giải thích sau khi nộp bài
                        </label>
                        <textarea
                          rows={2}
                          value={blank.explanation || ""}
                          onChange={(e) =>
                            handleUpdateBlank(blank.index, {
                              explanation: e.target.value,
                            })
                          }
                          placeholder="VD: Dùng thì hiện tại hoàn thành vì có 'since'..."
                          className="min-h-[64px] w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Từ nhiễu cho chế độ Word Bank */}
            <Card className="space-y-3 border-border bg-surface p-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Từ nhiễu (dùng khi bật chế độ Ngân hàng từ — Word Bank)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Các từ này sẽ được trộn ngẫu nhiên cùng đáp án đúng để tăng độ thử thách.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {state.distractors.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-secondary-light px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          distractors: prev.distractors.filter((d) => d !== word),
                        }))
                      }
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex max-w-md items-center gap-2">
                <input
                  type="text"
                  value={newDistractor}
                  onChange={(e) => setNewDistractor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDistractor();
                    }
                  }}
                  placeholder="Nhập từ nhiễu rồi bấm Enter..."
                  className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDistractor}
                >
                  Thêm
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================
            BƯỚC 3: CHẾ ĐỘ LÀM BÀI & CÀI ĐẶT
           ========================================= */}
        {activeStep === "settings" && (
          <Card className="mx-auto max-w-3xl space-y-6 border-border bg-surface p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Chọn chế độ làm bài cho học viên
              </h2>
              <p className="text-xs text-muted-foreground">
                Cùng một đoạn văn có thể chọn 1 trong 3 hình thức luyện tập khác nhau.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  id: "typing" as FillBlankMode,
                  title: "Gõ trực tiếp",
                  desc: "Học viên tự gõ từ còn thiếu vào ô trống (luyện chính tả & ngữ pháp).",
                  Icon: Pencil,
                },
                {
                  id: "word_bank" as FillBlankMode,
                  title: "Ngân hàng từ",
                  desc: "Chọn từ trong kho từ vựng có sẵn (trộn kèm từ nhiễu), phù hợp người mới.",
                  Icon: HelpCircle,
                },
                {
                  id: "dictation" as FillBlankMode,
                  title: "Nghe & Điền từ",
                  desc: "Nghe giọng đọc bản xứ toàn đoạn rồi điền từ nghe được (Dictation).",
                  Icon: Headphones,
                },
              ].map((item) => {
                const Icon = item.Icon;
                const active = state.mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChange((prev) => ({ ...prev, mode: item.id }))
                    }
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-primary bg-primary-light/65 text-primary shadow-xs"
                        : "border-border bg-background/60 text-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Điểm tối thiểu để hoàn thành bài học
                </label>
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
                  {state.passPercent}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={10}
                value={state.passPercent}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    passPercent: Number(e.target.value),
                  }))
                }
                className="w-full cursor-pointer accent-primary"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background/60 p-3.5">
                <input
                  type="checkbox"
                  checked={state.allowHint}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      allowHint: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    Cho phép dùng gợi ý
                  </p>
                  <p className="text-muted-foreground">
                    Học viên có thể bấm xem gợi ý nghĩa hoặc chữ cái đầu.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background/60 p-3.5">
                <input
                  type="checkbox"
                  checked={state.caseSensitive}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      caseSensitive: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    Phân biệt chữ HOA / thường
                  </p>
                  <p className="text-muted-foreground">
                    Mặc định tắt để học viên không bị chấm sai vì viết hoa đầu câu.
                  </p>
                </div>
              </label>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
