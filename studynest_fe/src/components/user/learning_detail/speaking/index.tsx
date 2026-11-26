"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  ActiveLessonResponse,
  ActiveLessonSpeaking,
} from "@/types/user/activeLesson";
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RotateCcw,
  Star,
  Target,
  Volume2,
  XCircle,
} from "pulsoicon-react";
import { useMemo, useState } from "react";
import { useSpeakingRealtime } from "./use-speaking-realtime";

interface SpeakingLessonProps {
  lesson: ActiveLessonResponse;
  speaking?: ActiveLessonSpeaking | null;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  previewMode?: boolean;
}

interface SpeakingEvalResult {
  mission_score: number;
  grammar_score: number;
  fluency_score: number;
  overall_score: number;
  pass_percent: number;
  passed: boolean;
  completed_mission_ids: string[];
  summary: string;
  strengths: string[];
  improvements: Array<{
    original: string;
    better: string;
    note: string;
  }>;
}

export default function SpeakingLesson({
  lesson,
  speaking: speakingProp,
  onMarkCompleted,
  completedLessons,
  previewMode = false,
}: SpeakingLessonProps) {
  const speaking = speakingProp ?? lesson.speaking ?? null;
  const persona = speaking?.ai_persona || {};
  const missions = useMemo(() => speaking?.missions || [], [speaking?.missions]);
  const samplePhrases = useMemo(
    () => speaking?.sample_phrases || [],
    [speaking?.sample_phrases]
  );

  const isCompleted =
    lesson.is_completed || Boolean(completedLessons?.has(lesson.id));

  const [showTranslation, setShowTranslation] = useState(
    () => speaking?.allow_translation ?? true
  );
  const [showTranscriptLog, setShowTranscriptLog] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [typedFallback, setTypedFallback] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<SpeakingEvalResult | null>(null);

  const realtime = useSpeakingRealtime(lesson.id, speaking);
  const {
    callStarted,
    callState,
    muted,
    micAvailable,
    audioLevel,
    error: callError,
    messages,
    completedMissions,
    setCompletedMissions,
    liveUserSubtitle,
    liveAiSubtitle,
    isAnalyzingTurn,
    startCall,
    stopCall,
    toggleMute,
    sendTextTurn,
    replayTurnAudio,
  } = realtime;

  const isConnected =
    callState === "connecting" ||
    callState === "speaking" ||
    callState === "listening";
  const isAiSpeaking = callState === "speaking";
  const isListeningLive = callState === "listening" && !muted && micAvailable;

  const userTurnCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages]
  );
  const maxTurns = speaking?.max_turns || 8;
  const allMissionsDone =
    missions.length > 0 && completedMissions.length >= missions.length;
  const missionPct =
    missions.length > 0
      ? Math.round((completedMissions.length / missions.length) * 100)
      : 0;

  const lastAiMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const lastUserMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i];
    }
    return null;
  }, [messages]);

  const handleStartNewCall = () => {
    setEvalResult(null);
    void startCall();
  };

  const handleSendTypedFallback = (e: React.FormEvent) => {
    e.preventDefault();
    const text = typedFallback.trim();
    if (!text || evalResult) return;
    if (sendTextTurn(text)) {
      setTypedFallback("");
    } else {
      showToast.error("Cuộc gọi chưa kết nối. Hãy bấm Gọi lại để tiếp tục nhé.");
    }
  };

  const handleEvaluate = async () => {
    if (userTurnCount === 0 || isEvaluating) {
      showToast.error("Hãy trò chuyện ít nhất 1 lượt trước khi kết thúc & chấm điểm.");
      return;
    }
    stopCall();
    setIsEvaluating(true);
    try {
      const res = await api.post(
        `/learning/speaking/${lesson.id}/evaluate`,
        {
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          completed_mission_ids: completedMissions,
        },
        { timeout: 60_000 }
      );
      const result = res.data as SpeakingEvalResult;
      setEvalResult(result);
      if (Array.isArray(result.completed_mission_ids)) {
        setCompletedMissions(result.completed_mission_ids);
      }
      if (result.passed) {
        triggerPerfectConfetti();
        playSound(result.overall_score >= 95 ? "perfect" : "complete");
        if (!previewMode && onMarkCompleted && !isCompleted) {
          onMarkCompleted(lesson.id);
          showToast.success("Chúc mừng! Bạn đã vượt qua bài Giao tiếp AI!");
        }
      }
    } catch (err) {
      showToast.error(
        formatApiError(err, "Không thể chấm điểm lúc này. Vui lòng thử lại.")
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!speaking) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-12 text-center shadow-xs">
        <Mic className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <p className="font-display text-lg font-bold text-foreground">
          Nội dung bài Giao tiếp AI đang được cập nhật
        </p>
      </div>
    );
  }

  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const evalOffset = evalResult
    ? ringC - (evalResult.overall_score / 100) * ringC
    : ringC;
  const orbScale = 1 + Math.min(0.18, audioLevel * 0.22);

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. PHIẾU ĐIỂM SAU KHI KẾT THÚC CUỘC GỌI
         ============================================================ */}
      {evalResult && (
        <div
          className={`space-y-5 rounded-[30px] border p-6 shadow-[0_20px_48px_-16px_rgba(53,111,167,0.14)] sm:p-7 ${
            evalResult.passed
              ? "border-success-border bg-gradient-to-br from-success-bg/80 via-surface to-primary-light/40"
              : "border-warning-border bg-gradient-to-br from-warning-bg/80 via-surface to-secondary-light/35"
          }`}
        >
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 92 92">
                  <circle
                    cx="46"
                    cy="46"
                    r={ringR}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-border/60"
                  />
                  <circle
                    cx="46"
                    cy="46"
                    r={ringR}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={evalOffset}
                    className={
                      evalResult.passed
                        ? "text-success-foreground transition-all duration-700"
                        : "text-warning-foreground transition-all duration-700"
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground">
                    {evalResult.overall_score}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {evalResult.passed ? (
                    <Star className="h-5 w-5 text-success-foreground" />
                  ) : (
                    <XCircle className="h-5 w-5 text-warning-foreground" />
                  )}
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {evalResult.passed
                      ? "Chúc mừng! Bạn đã vượt qua bài Giao tiếp AI"
                      : `Chưa đạt ngưỡng ${evalResult.pass_percent}% — gọi lại nhé!`}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {evalResult.summary}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleStartNewCall}
              className="shrink-0 gap-2 rounded-2xl bg-surface px-5"
            >
              <RotateCcw className="h-4 w-4" />
              Gọi lại từ đầu
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Hoàn thành nhiệm vụ",
                score: evalResult.mission_score,
                bar: "bg-primary",
              },
              {
                label: "Ngữ pháp & Từ vựng",
                score: evalResult.grammar_score,
                bar: "bg-[#7E57C2]",
              },
              {
                label: "Độ tự nhiên giao tiếp",
                score: evalResult.fluency_score,
                bar: "bg-[#4A9B6D]",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-surface/90 p-4"
              >
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-primary">{item.score}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className={`h-full rounded-full ${item.bar}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {evalResult.improvements.length > 0 && (
            <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Gợi ý diễn đạt tự nhiên hơn
              </p>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {evalResult.improvements.map((imp, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs"
                  >
                    {imp.original && (
                      <p className="text-muted-foreground line-through">
                        {imp.original}
                      </p>
                    )}
                    <p className="mt-0.5 text-sm font-bold text-success-foreground">
                      → {imp.better}
                    </p>
                    {imp.note && (
                      <p className="mt-1 text-muted-foreground">{imp.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          2. SÂN KHẤU ĐÀM THOẠI Qwen 3.8 Omni Flash Realtime (0 TTS)
         ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (8 CỘT): VOICE STAGE */}
        <div className="lg:col-span-8">
          <div className="relative flex min-h-[540px] flex-col justify-between overflow-hidden rounded-[32px] border border-primary-pastel/80 bg-gradient-to-b from-primary-light/70 via-surface to-accent/30 p-6 shadow-[0_24px_54px_-16px_rgba(53,111,167,0.18)] sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/80 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 left-1/4 h-52 w-52 rounded-full bg-primary-pastel/35 blur-3xl"
            />

            {/* Thanh đỉnh sân khấu */}
            <div className="relative flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-surface/90 px-3 py-1 font-bold text-success-foreground">
                  <Mic className="h-3.5 w-3.5" />
                  Qwen 3.8 Omni Realtime · {speaking.lang_code} · {speaking.level}
                </span>
                <Badge variant="outline" className="bg-surface/85 text-xs">
                  Lượt {userTurnCount}/{maxTurns}
                </Badge>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 font-semibold text-success-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã qua bài
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {speaking.allow_translation && (
                  <button
                    type="button"
                    onClick={() => setShowTranslation((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {showTranslation ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {showTranslation ? "Ẩn dịch" : "Song ngữ"}
                  </button>
                )}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTranscriptLog((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      showTranscriptLog
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface/90 text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Lịch sử ({messages.length})
                  </button>
                )}
              </div>
            </div>

            {/* TRUNG TÂM: VOICE ORB & PHỤ ĐỀ TRỰC TIẾP */}
            {!callStarted ? (
              <div className="relative my-auto flex flex-col items-center space-y-5 py-10 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary-pastel bg-surface shadow-[0_16px_36px_-10px_rgba(53,111,167,0.22)]">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <div className="max-w-lg space-y-2">
                  <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    {lesson.title}
                  </h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {speaking.scenario}
                  </p>
                  <p className="text-xs font-semibold text-primary">
                    Bạn ({speaking.student_role || "Học viên"}) ↔{" "}
                    {persona.name || "AI"}
                    {persona.role ? ` (${persona.role})` : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleStartNewCall}
                  className="h-13 gap-2.5 rounded-full px-8 text-base shadow-[0_14px_28px_-8px_rgba(53,111,167,0.45)]"
                >
                  <Phone className="h-5 w-5" />
                  Bắt đầu đàm thoại trực tiếp với {persona.name || "AI"}
                </Button>
              </div>
            ) : (
              <div className="relative my-auto flex flex-col items-center space-y-6 py-6 text-center">
                {/* Quả cầu sóng âm trung tâm phản hồi theo giọng thật */}
                <div className="relative flex h-32 w-32 items-center justify-center">
                  {(isAiSpeaking || isListeningLive || callState === "connecting") && (
                    <>
                      <span
                        className={`absolute inset-0 animate-ping rounded-full opacity-30 ${
                          isListeningLive
                            ? "bg-secondary-pastel"
                            : "bg-primary-pastel"
                        }`}
                      />
                      <span
                        className={`absolute -inset-3 animate-pulse rounded-full opacity-25 ${
                          isListeningLive
                            ? "bg-secondary-light"
                            : "bg-primary-light"
                        }`}
                      />
                    </>
                  )}
                  <div
                    style={{ transform: `scale(${orbScale.toFixed(3)})` }}
                    className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 shadow-[0_16px_40px_-10px_rgba(53,111,167,0.28)] transition-transform duration-100 ${
                      isListeningLive
                        ? "border-[#D16B8F] bg-[#D16B8F] text-white"
                        : isAiSpeaking
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary-pastel bg-surface text-primary"
                    }`}
                  >
                    {callState === "connecting" ? (
                      <Loader2 className="h-10 w-10 animate-spin" />
                    ) : isListeningLive ? (
                      <Mic className="h-10 w-10" />
                    ) : (
                      <Bot className="h-10 w-10" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    {persona.name || "AI"}
                    {persona.role ? ` · ${persona.role}` : ""}
                  </p>
                  <p className="text-xs font-semibold text-primary">
                    {callState === "connecting"
                      ? `Đang kết nối giọng nói trực tiếp với ${persona.name || "AI"}...`
                      : isAiSpeaking
                        ? `${persona.name || "AI"} đang nói trực tiếp (bạn có thể nói để ngắt lời tự nhiên)...`
                        : isListeningLive
                          ? "Micro đang mở trực tiếp — hãy nói tự nhiên, AI sẽ đáp lại ngay!"
                          : muted && isConnected
                            ? "Micro đang tạm tắt — bấm biểu tượng Micro để tiếp tục nói"
                            : "Cuộc gọi đã tạm dừng"}
                  </p>
                </div>

                {/* KHUNG PHỤ ĐỀ TRỰC TIẾP (LIVE SUBTITLE) */}
                <div className="w-full max-w-2xl space-y-3">
                  {/* Phụ đề câu AI đang nói hoặc vừa nói */}
                  {(liveAiSubtitle || lastAiMsg) && (
                    <div className="rounded-[24px] border border-white/90 bg-surface/92 px-6 py-4 shadow-[0_12px_32px_-12px_rgba(53,111,167,0.16)] backdrop-blur-md">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-primary">
                          {persona.name || "AI"}
                        </span>
                        {!liveAiSubtitle && lastAiMsg?.hasAudioCache && (
                          <button
                            type="button"
                            onClick={() => void replayTurnAudio(lastAiMsg.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Volume2 className="h-3 w-3" />
                            Nghe lại
                          </button>
                        )}
                      </div>
                      <p className="font-display text-lg font-bold leading-relaxed text-foreground sm:text-xl">
                        &ldquo;{liveAiSubtitle || lastAiMsg?.content}&rdquo;
                      </p>
                      {!liveAiSubtitle &&
                        showTranslation &&
                        lastAiMsg?.translation && (
                          <p className="mt-2 border-t border-border/60 pt-2 text-xs italic text-muted-foreground sm:text-sm">
                            {lastAiMsg.translation}
                          </p>
                        )}
                      {!liveAiSubtitle && lastAiMsg?.feedbackTip && (
                        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-primary">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                          <span>{lastAiMsg.feedbackTip}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Phụ đề trực tiếp những gì học viên đang nói / vừa nói */}
                  {(liveUserSubtitle || lastUserMsg) && (
                    <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/55 px-4 py-2.5 text-sm">
                      <span className="mr-2 text-xs font-bold text-secondary-foreground">
                        {liveUserSubtitle ? "Bạn đang nói:" : "Bạn vừa nói:"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {liveUserSubtitle || lastUserMsg?.content}
                      </span>
                      {!liveUserSubtitle && lastUserMsg?.grammarCorrection && (
                        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-accent-vanilla-foreground">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
                          <span>Gợi ý nói hay hơn: {lastUserMsg.grammarCorrection}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bàn điều khiển Gọi thoại Realtime */}
                {!evalResult && (
                  <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                    {isConnected ? (
                      userTurnCount < maxTurns && (
                        <button
                          type="button"
                          onClick={toggleMute}
                          disabled={callState === "connecting"}
                          className={`inline-flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_14px_30px_-8px_rgba(53,111,167,0.45)] transition-all disabled:opacity-45 ${
                            !muted && micAvailable
                              ? "scale-105 border-[#D16B8F] bg-[#D16B8F] text-white ring-4 ring-secondary-pastel"
                              : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                          aria-label={
                            !muted && micAvailable ? "Tạm tắt Micro" : "Bật Micro"
                          }
                          title={
                            !muted && micAvailable
                              ? "Micro đang bật trực tiếp — Bấm để tạm tắt"
                              : "Bấm để bật lại Micro"
                          }
                        >
                          {!muted && micAvailable ? (
                            <Mic className="h-7 w-7" />
                          ) : (
                            <MicOff className="h-7 w-7" />
                          )}
                        </button>
                      )
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartNewCall}
                        className="h-12 gap-2 rounded-full bg-surface px-5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Kết nối lại cuộc gọi
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowTextFallback((v) => !v)}
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
                      title="Gõ lời nói nếu thiết bị không có Micro"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {showTextFallback ? "Ẩn nhập lời" : "Nhập lời nói"}
                    </button>

                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={userTurnCount === 0 || isEvaluating}
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-destructive-border bg-destructive-bg px-5 text-xs font-bold text-destructive-foreground transition hover:bg-destructive hover:text-white disabled:opacity-40"
                    >
                      {isEvaluating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PhoneOff className="h-4 w-4" />
                      )}
                      {isEvaluating ? "Đang chấm..." : "Kết thúc & Chấm điểm"}
                    </button>
                  </div>
                )}

                {callError && (
                  <p className="max-w-xl rounded-2xl border border-warning-border bg-warning-bg px-4 py-2.5 text-xs leading-relaxed text-warning-foreground">
                    {callError}
                  </p>
                )}

                {showTextFallback && !evalResult && (
                  <form
                    onSubmit={handleSendTypedFallback}
                    className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-primary-pastel bg-surface/95 p-2 shadow-sm"
                  >
                    <input
                      type="text"
                      value={typedFallback}
                      onChange={(e) => setTypedFallback(e.target.value)}
                      disabled={!isConnected}
                      placeholder="Nhập câu bạn muốn nói rồi nhấn Enter (Qwen 3.8 Omni vẫn đáp lại bằng giọng nói thật)..."
                      className="h-10 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!isConnected || !typedFallback.trim()}
                    >
                      Gửi lời
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Ngăn kéo Lịch sử phụ đề */}
            {showTranscriptLog && messages.length > 0 && (
              <div className="relative mt-4 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-border bg-surface/95 p-4 text-left text-xs">
                <p className="font-bold text-muted-foreground">
                  Lịch sử phụ đề cuộc gọi
                </p>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-border/60 bg-background/60 px-3 py-2"
                  >
                    <span className="font-bold text-primary">
                      {m.role === "assistant" ? persona.name || "AI" : "Bạn"}:{" "}
                    </span>
                    <span className="text-foreground">{m.content}</span>
                    {showTranslation && m.translation && (
                      <p className="mt-0.5 italic text-muted-foreground">
                        {m.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (4 CỘT): MISSION CHECKLIST + MẪU CÂU ĐỌC THEO */}
        <div className="space-y-4 lg:col-span-4">
          <div className="sticky top-4 space-y-4 rounded-[28px] border border-border bg-surface p-5 shadow-[0_16px_40px_-16px_rgba(53,111,167,0.12)]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Target className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Nhiệm vụ cần nói
                    </h2>
                    {isAnalyzingTurn && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang chấm đáp án vừa nói...
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    allMissionsDone
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : "border-primary-pastel bg-primary-light text-primary"
                  }`}
                >
                  {completedMissions.length}/{missions.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allMissionsDone ? "bg-[#4A9B6D]" : "bg-primary"
                  }`}
                  style={{ width: `${missionPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {missions.map((m, idx) => {
                const done = completedMissions.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-3.5 transition-all ${
                      done
                        ? "border-success-border bg-success-bg/70"
                        : "border-border/80 bg-background/55"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-success-foreground text-white"
                            : "border border-border bg-surface text-muted-foreground"
                        }`}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <div className="min-w-0 text-xs">
                        <p
                          className={`font-bold leading-snug ${
                            done
                              ? "text-success-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {m.title}
                        </p>
                        {!done && m.hint && (
                          <p className="mt-1 text-[11px] italic text-muted-foreground">
                            Gợi ý: {m.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {speaking.allow_suggestion && samplePhrases.length > 0 && (
              <div className="space-y-2 border-t border-border/80 pt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-warning-foreground" />
                  Mẫu câu gợi ý để đọc theo
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {samplePhrases.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-foreground">
                        {p.phrase}
                      </p>
                      {p.translation && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {p.translation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
