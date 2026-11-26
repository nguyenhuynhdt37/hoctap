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
import {
  SpeakingMission,
  SpeakingPersona,
  SpeakingSamplePhrase,
} from "@/types/lecturer/speaking";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Eye,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  Save,
  SlidersHorizontal,
  Target,
  Trash2,
  User,
  X,
} from "pulsoicon-react";
import { useMemo, useState } from "react";

// ============================================
// HELPERS & TYPES
// ============================================

export function createSpeakingUid(prefix = "sp"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const SPEAKING_LEVELS = ["A1", "A2", "B1", "B2", "C1", "HSK2", "HSK3", "HSK4", "N4", "N3"] as const;

export const QWEN_OMNI_REALTIME_VOICES = [
  { voice_id: "Tina", label: "Tina (Nữ · Ấm áp, tự nhiên)" },
  { voice_id: "Serena", label: "Serena (Nữ · Dịu dàng, truyền cảm)" },
  { voice_id: "Mia", label: "Mia (Nữ · Trẻ trung, thân thiện)" },
  { voice_id: "Chloe", label: "Chloe (Nữ · Rõ ràng, thanh lịch)" },
  { voice_id: "Ryan", label: "Ryan (Nam · Trầm ấm, điềm đạm)" },
  { voice_id: "Aiden", label: "Aiden (Nam · Năng động, hiện đại)" },
] as const;

export interface SpeakingStudioState {
  lessonTitle: string;
  langCode: string;
  level: string;
  scenario: string;
  studentRole: string;
  aiPersona: SpeakingPersona;
  missions: SpeakingMission[];
  samplePhrases: SpeakingSamplePhrase[];
  maxTurns: number;
  passPercent: number;
  allowTranslation: boolean;
  allowSuggestion: boolean;
}

interface SpeakingStudioProps {
  mode: "create" | "edit";
  sectionName?: string;
  videoSections: StudioVideoSectionGroup[];
  state: SpeakingStudioState;
  onChange: (
    updater: (prev: SpeakingStudioState) => SpeakingStudioState
  ) => void;
  onSave: () => Promise<void>;
  onBack: () => void;
  onPreview?: () => void;
  isSubmitting: boolean;
  error?: string | null;
  savedBanner?: string | null;
}

// ============================================
// COMPONENT
// ============================================

export function SpeakingStudio({
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
}: SpeakingStudioProps) {
  const [activeStep, setActiveStep] = useState<
    "persona" | "missions" | "settings"
  >("persona");
  const [aiPanelOpen, setAiPanelOpen] = useState(
    () => mode === "create" && !state.scenario.trim()
  );

  // AI Generator state
  const [aiSourceMode, setAiSourceMode] = useState<"topic" | "video">("topic");
  const [aiTopic, setAiTopic] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [aiMissionCount, setAiMissionCount] = useState<number>(4);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateWithAi = async () => {
    if (aiSourceMode === "topic" && !aiTopic.trim()) {
      showToast.error("Hãy nhập tình huống đóng vai để AI thiết kế.");
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
        "/lecturers/chat/lesson/speaking",
        {
          topic: aiSourceMode === "topic" ? aiTopic.trim() : "",
          lesson_ids: aiSourceMode === "video" ? selectedVideoIds : [],
          lang_code: state.langCode,
          level: state.level,
          mission_count: aiMissionCount,
        },
        { timeout: 150_000 }
      );
      const data = res.data;
      onChange((prev) => ({
        ...prev,
        lessonTitle: prev.lessonTitle.trim()
          ? prev.lessonTitle
          : data.title || prev.lessonTitle,
        scenario: data.scenario || prev.scenario,
        studentRole: data.student_role || prev.studentRole,
        aiPersona: {
          name: data.ai_persona?.name || prev.aiPersona.name,
          role: data.ai_persona?.role || prev.aiPersona.role,
          personality: data.ai_persona?.personality || prev.aiPersona.personality,
          voice_id: data.ai_persona?.voice_id || prev.aiPersona.voice_id,
          opening_line:
            data.ai_persona?.opening_line || prev.aiPersona.opening_line,
          opening_translation:
            data.ai_persona?.opening_translation ||
            prev.aiPersona.opening_translation,
          opening_audio_url: "",
        },
        missions:
          Array.isArray(data.missions) && data.missions.length > 0
            ? data.missions
            : prev.missions,
        samplePhrases: Array.isArray(data.sample_phrases)
          ? data.sample_phrases
          : prev.samplePhrases,
      }));
      showToast.success(
        `AI đã thiết kế tình huống với ${(data.missions || []).length} nhiệm vụ qua bài!`
      );
      setAiPanelOpen(false);
    } catch (err) {
      const msg = formatApiError(
        err,
        "AI không thể thiết kế kịch bản giao tiếp lúc này."
      );
      setAiError(msg);
      showToast.error(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const handleAddMission = () => {
    onChange((prev) => ({
      ...prev,
      missions: [
        ...prev.missions,
        { id: createSpeakingUid("m"), title: "", hint: "" },
      ],
    }));
  };

  const handleAddPhrase = () => {
    onChange((prev) => ({
      ...prev,
      samplePhrases: [...prev.samplePhrases, { phrase: "", translation: "" }],
    }));
  };

  const validMissionCount = state.missions.filter((m) => m.title.trim()).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1. TOP BAR */}
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
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-success-border bg-success-bg text-success-foreground">
                <Mic className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {state.lessonTitle.trim() ||
                    (mode === "create"
                      ? "Bài Giao tiếp & Đóng vai AI mới"
                      : "Chỉnh sửa bài Giao tiếp AI")}
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
                <span className="hidden sm:inline">Xem trước &amp; Nói thử</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSubmitting || isGeneratingAi}
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

      {/* 2. WORKSPACE */}
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

        {/* Tên bài + Ngôn ngữ + Trình độ */}
        <Card className="border-border bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Tên bài Giao tiếp AI <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={state.lessonTitle}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, lessonTitle: e.target.value }))
                }
                placeholder="VD: Nhận phòng khách sạn tại London (Đóng vai)"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Ngôn ngữ giao tiếp
              </label>
              <select
                value={state.langCode}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, langCode: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
              >
                {LISTENING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Trình độ
              </label>
              <select
                value={state.level}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, level: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
              >
                {SPEAKING_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* BẢNG TRỢ LÝ AI */}
        {aiPanelOpen && (
          <Card className="border-primary-pastel bg-gradient-to-br from-success-bg/55 via-surface to-primary-light/45 p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    AI thiết kế tình huống đóng vai trọn gói
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tự động tạo nhân vật AI, câu mở màn, nhiệm vụ qua bài và mẫu câu gợi ý.
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
                    Nhập tình huống tự do
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
                    placeholder="VD: Phỏng vấn xin việc vị trí Frontend Developer bằng tiếng Anh; nhà tuyển dụng hỏi về kinh nghiệm dự án, điểm mạnh và mức lương mong muốn..."
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
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Số nhiệm vụ qua bài
                  </label>
                  <select
                    value={aiMissionCount}
                    onChange={(e) => setAiMissionCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground outline-none"
                  >
                    {[3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} nhiệm vụ
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={isGeneratingAi}
                  className="w-full gap-2"
                >
                  {isGeneratingAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                  {isGeneratingAi
                    ? "AI đang thiết kế kịch bản..."
                    : "Tạo kịch bản đóng vai"}
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
              onClick={() => setActiveStep("persona")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "persona"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              1. Bối cảnh &amp; Nhân vật AI
            </button>

            <button
              type="button"
              onClick={() => setActiveStep("missions")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeStep === "missions"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface text-muted-foreground hover:bg-primary-light/50 hover:text-foreground"
              }`}
            >
              <Target className="h-4 w-4" />
              2. Nhiệm vụ qua bài
              <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-bold text-foreground">
                {validMissionCount}
              </span>
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
              3. Quy chế chấm điểm
            </button>
          </div>

          <Badge
            variant="outline"
            className="border-success-border bg-success-bg/70 text-success-foreground"
          >
            Đạt từ {state.passPercent}% để qua bài
          </Badge>
        </div>

        {/* =========================================
            BƯỚC 1: BỐI CẢNH & NHÂN VẬT AI
           ========================================= */}
        {activeStep === "persona" && (
          <div className="space-y-5">
            <Card className="space-y-4 border-border bg-surface p-5">
              <h2 className="text-base font-semibold text-foreground">
                Tình huống đóng vai
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Mô tả bối cảnh cho học viên{" "}
                  <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  value={state.scenario}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, scenario: e.target.value }))
                  }
                  placeholder="VD: Bạn vừa hạ cánh xuống London và đến quầy lễ tân khách sạn May May để nhận phòng đã đặt trước..."
                  className="min-h-[108px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Vai trò của học viên
                </label>
                <input
                  type="text"
                  value={state.studentRole}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      studentRole: e.target.value,
                    }))
                  }
                  placeholder="VD: Khách du lịch đến nhận phòng khách sạn"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </Card>

            <Card className="space-y-4 border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Nhân vật AI &amp; Câu mở màn
                </h2>
                <Badge variant="outline" className="border-primary-pastel bg-primary-light/60 text-primary">
                  <Mic className="mr-1 h-3.5 w-3.5" />
                  Đàm thoại trực tiếp Qwen 3.8 Omni Realtime
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tên nhân vật AI
                  </label>
                  <input
                    type="text"
                    value={state.aiPersona.name}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        aiPersona: { ...prev.aiPersona, name: e.target.value },
                      }))
                    }
                    placeholder="VD: Emma"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Vai trò nhân vật AI
                  </label>
                  <input
                    type="text"
                    value={state.aiPersona.role}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        aiPersona: { ...prev.aiPersona, role: e.target.value },
                      }))
                    }
                    placeholder="VD: Lễ tân khách sạn"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Giọng nhân vật (Qwen 3.8 Omni Realtime)
                  </label>
                  <select
                    value={state.aiPersona.voice_id}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        aiPersona: {
                          ...prev.aiPersona,
                          voice_id: e.target.value,
                          opening_audio_url: "",
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Tự động chọn theo nhân vật</option>
                    {QWEN_OMNI_REALTIME_VOICES.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tính cách / Phong cách trò chuyện của AI
                </label>
                <input
                  type="text"
                  value={state.aiPersona.personality}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      aiPersona: {
                        ...prev.aiPersona,
                        personality: e.target.value,
                      },
                    }))
                  }
                  placeholder="VD: Thân thiện, lịch sự, nói chậm rãi và luôn gợi mở để học viên tự tin giao tiếp"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Câu mở màn của AI ({state.langCode}){" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={state.aiPersona.opening_line}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        aiPersona: {
                          ...prev.aiPersona,
                          opening_line: e.target.value,
                          opening_audio_url: "",
                        },
                      }))
                    }
                    placeholder="VD: Good afternoon! Welcome to May May Hotel. How may I assist you today?"
                    className="min-h-[84px] w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Bản dịch tiếng Việt câu mở màn
                  </label>
                  <textarea
                    rows={3}
                    value={state.aiPersona.opening_translation}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        aiPersona: {
                          ...prev.aiPersona,
                          opening_translation: e.target.value,
                        },
                      }))
                    }
                    placeholder="VD: Chào buổi chiều! Chào mừng quý khách đến khách sạn Mây Mây..."
                    className="min-h-[84px] w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================
            BƯỚC 2: NHIỆM VỤ QUA BÀI & MẪU CÂU GỢI Ý
           ========================================= */}
        {activeStep === "missions" && (
          <div className="space-y-5">
            <Card className="space-y-4 border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Danh sách Nhiệm vụ bắt buộc ({state.missions.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    AI sẽ theo dõi cuộc trò chuyện và tự động tích xanh từng nhiệm vụ khi học viên diễn đạt đúng ý.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMission}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Thêm nhiệm vụ
                </Button>
              </div>

              <div className="space-y-3">
                {state.missions.map((m, idx) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-background/60 p-4 md:grid-cols-12"
                  >
                    <div className="flex items-center justify-between md:col-span-12">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Nhiệm vụ #{idx + 1}
                      </span>
                      {state.missions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange((prev) => ({
                              ...prev,
                              missions: prev.missions.filter(
                                (item) => item.id !== m.id
                              ),
                            }))
                          }
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Xóa nhiệm vụ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="md:col-span-7">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Yêu cầu nhiệm vụ (tiếng Việt)
                      </label>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            missions: prev.missions.map((item) =>
                              item.id === m.id
                                ? { ...item, title: e.target.value }
                                : item
                            ),
                          }))
                        }
                        placeholder="VD: Hỏi giờ phục vụ bữa sáng tại khách sạn"
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Gợi ý cấu trúc / từ khóa ({state.langCode})
                      </label>
                      <input
                        type="text"
                        value={m.hint || ""}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            missions: prev.missions.map((item) =>
                              item.id === m.id
                                ? { ...item, hint: e.target.value }
                                : item
                            ),
                          }))
                        }
                        placeholder="VD: What time is breakfast served?"
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Mẫu câu gợi ý */}
            <Card className="space-y-4 border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Mẫu câu gợi ý cho học viên khi bí từ (
                    {state.samplePhrases.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Học viên có thể bấm xem và chèn mẫu câu hữu ích vào khung trò chuyện.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPhrase}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Thêm mẫu câu
                </Button>
              </div>

              <div className="space-y-2.5">
                {state.samplePhrases.map((p, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 items-center gap-2.5 rounded-xl border border-border bg-background/60 p-3 md:grid-cols-12"
                  >
                    <div className="md:col-span-6">
                      <input
                        type="text"
                        value={p.phrase}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            samplePhrases: prev.samplePhrases.map((item, i) =>
                              i === idx
                                ? { ...item, phrase: e.target.value }
                                : item
                            ),
                          }))
                        }
                        placeholder={`Mẫu câu (${state.langCode})...`}
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={p.translation || ""}
                        onChange={(e) =>
                          onChange((prev) => ({
                            ...prev,
                            samplePhrases: prev.samplePhrases.map((item, i) =>
                              i === idx
                                ? { ...item, translation: e.target.value }
                                : item
                            ),
                          }))
                        }
                        placeholder="Nghĩa tiếng Việt..."
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-muted-foreground outline-none focus:border-primary focus:text-foreground"
                      />
                    </div>
                    <div className="flex justify-end md:col-span-1">
                      <button
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            samplePhrases: prev.samplePhrases.filter(
                              (_, i) => i !== idx
                            ),
                          }))
                        }
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Xóa mẫu câu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* =========================================
            BƯỚC 3: QUY CHẾ CHẤM ĐIỂM
           ========================================= */}
        {activeStep === "settings" && (
          <Card className="mx-auto max-w-3xl space-y-6 border-border bg-surface p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Quy chế chấm điểm &amp; Qua bài
              </h2>
              <p className="text-xs text-muted-foreground">
                Cấu hình số lượt trao đổi tối đa và điểm đạt để hệ thống tự động công nhận hoàn thành bài học.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Số lượt nói tối đa của học viên
                </label>
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
                  {state.maxTurns} lượt
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                step={1}
                value={state.maxTurns}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    maxTurns: Number(e.target.value),
                  }))
                }
                className="w-full cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Điểm tối thiểu để qua bài
                </label>
                <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-bold text-success-foreground">
                  {state.passPercent}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
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
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background/60 p-4">
                <input
                  type="checkbox"
                  checked={state.allowTranslation}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      allowTranslation: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    Cho phép xem bản dịch câu AI nói
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Học viên có thể bật/tắt bản dịch tiếng Việt dưới mỗi tin nhắn của AI.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-background/60 p-4">
                <input
                  type="checkbox"
                  checked={state.allowSuggestion}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      allowSuggestion: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    Hiển thị Mẫu câu gợi ý
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Giúp học viên mới không bị khựng khi chưa biết diễn đạt thế nào.
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
