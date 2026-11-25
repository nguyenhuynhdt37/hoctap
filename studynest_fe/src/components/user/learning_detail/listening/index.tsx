"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import {
  ActiveLessonListening,
  ActiveLessonListeningLine,
  ActiveLessonQuiz,
  ActiveLessonResponse,
} from "@/types/user/activeLesson";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Star,
  Volume2,
  XCircle,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ListeningLessonProps {
  lesson: ActiveLessonResponse;
  listening?: ActiveLessonListening | null;
  quizzes?: ActiveLessonQuiz[];
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  previewMode?: boolean;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

// Chiều cao tương đối (28 thanh) tạo hình sóng âm tự nhiên, mềm mại
const WAVEFORM_BARS = [
  28, 42, 65, 48, 82, 95, 58, 40, 74, 88, 52, 36, 68, 92, 78, 44, 62, 85, 54,
  38, 76, 96, 64, 46, 70, 56, 40, 30,
];

const SPEAKER_THEMES = [
  {
    avatar: "bg-primary text-primary-foreground",
    ring: "ring-primary/35 border-primary bg-primary-light/85",
    bubble: "bg-primary-light/55 border-primary-pastel/80",
    activeBubble:
      "bg-surface border-primary shadow-[0_12px_32px_-8px_rgba(53,111,167,0.25)] ring-2 ring-primary/20",
    nameText: "text-primary",
  },
  {
    avatar: "bg-[#D16B8F] text-white",
    ring: "ring-[#D16B8F]/35 border-[#D16B8F] bg-secondary-light/85",
    bubble: "bg-secondary-light/55 border-secondary-pastel/80",
    activeBubble:
      "bg-surface border-[#D16B8F] shadow-[0_12px_32px_-8px_rgba(209,107,143,0.22)] ring-2 ring-[#D16B8F]/20",
    nameText: "text-secondary-foreground",
  },
  {
    avatar: "bg-[#7E57C2] text-white",
    ring: "ring-[#7E57C2]/35 border-[#7E57C2] bg-accent/85",
    bubble: "bg-accent/55 border-accent-border/80",
    activeBubble:
      "bg-surface border-[#7E57C2] shadow-[0_12px_32px_-8px_rgba(126,87,194,0.22)] ring-2 ring-[#7E57C2]/20",
    nameText: "text-accent-foreground",
  },
  {
    avatar: "bg-[#C98A2C] text-white",
    ring: "ring-[#C98A2C]/35 border-[#C98A2C] bg-accent-vanilla/85",
    bubble: "bg-accent-vanilla/55 border-accent-vanilla-border/80",
    activeBubble:
      "bg-surface border-[#C98A2C] shadow-[0_12px_32px_-8px_rgba(201,138,44,0.2)] ring-2 ring-[#C98A2C]/20",
    nameText: "text-accent-vanilla-foreground",
  },
];

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

export default function ListeningLesson({
  lesson,
  listening: listeningProp,
  quizzes: quizzesProp,
  onMarkCompleted,
  completedLessons,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  previewMode = false,
}: ListeningLessonProps) {
  const listening = listeningProp ?? lesson.listening ?? null;
  const quizzes = quizzesProp ?? lesson.quizzes ?? [];

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(
    listening?.duration_seconds || 0
  );
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playCount, setPlayCount] = useState(0);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

  const isCompleted =
    lesson.is_completed || Boolean(completedLessons?.has(lesson.id));
  const maxPlays = listening?.max_plays || 0;
  const passPercent = listening?.pass_percent || 70;
  const isPlayLocked = !submitted && maxPlays > 0 && playCount >= maxPlays;
  const canViewTranscript =
    submitted || Boolean(listening?.show_transcript_before_submit);

  const speakers = useMemo(
    () => listening?.speakers || [],
    [listening?.speakers]
  );
  const scriptLines = useMemo(
    () => listening?.script_lines || [],
    [listening?.script_lines]
  );

  const speakerMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; role?: string | null; idx: number }
    >();
    speakers.forEach((s, idx) =>
      map.set(s.id, { name: s.name, role: s.role, idx })
    );
    return map;
  }, [speakers]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const currentTimeMs = Math.floor(currentTimeSec * 1000);

  const activeLine = useMemo(() => {
    if (!isPlaying && currentTimeMs <= 0) return null;
    return (
      scriptLines.find(
        (l) =>
          l.end_ms > l.start_ms &&
          currentTimeMs >= l.start_ms &&
          currentTimeMs <= l.end_ms + 120
      ) || null
    );
  }, [scriptLines, currentTimeMs, isPlaying]);

  const activeLineId = activeLine?.id || null;
  const activeSpeakerId = isPlaying ? activeLine?.speaker_id || null : null;

  // Tự cuộn mượt câu Karaoke đang đọc vào tầm mắt
  useEffect(() => {
    if (activeLineId && canViewTranscript && isPlaying) {
      lineRefs.current[activeLineId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeLineId, canViewTranscript, isPlaying]);

  const progressRatio =
    durationSec > 0 ? Math.min(1, Math.max(0, currentTimeSec / durationSec)) : 0;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !listening?.audio_url || isPlayLocked) return;
    if (el.paused) {
      el.playbackRate = playbackRate;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const skipSeconds = (delta: number) => {
    const el = audioRef.current;
    if (!el || isPlayLocked) return;
    const next = Math.min(
      Math.max(0, el.currentTime + delta),
      el.duration || durationSec || 0
    );
    el.currentTime = next;
    setCurrentTimeSec(next);
  };

  const seekByRatio = (ratio: number) => {
    const el = audioRef.current;
    if (!el || isPlayLocked || durationSec <= 0) return;
    const next = Math.min(durationSec, Math.max(0, ratio * durationSec));
    el.currentTime = next;
    setCurrentTimeSec(next);
  };

  const seekToLine = (line: ActiveLessonListeningLine) => {
    const el = audioRef.current;
    if (!el || !listening?.audio_url || isPlayLocked) return;
    const targetSec = Math.max(0, (line.start_ms || 0) / 1000);
    el.currentTime = targetSec;
    setCurrentTimeSec(targetSec);
    el.playbackRate = playbackRate;
    el.play().catch(() => {});
  };

  const normalizedQuizzes = useMemo(() => {
    return quizzes.map((q) => {
      const sortedOpts = [...(q.options || [])].sort(
        (a, b) => a.position - b.position
      );
      const correctIdx = sortedOpts.findIndex((o) => o.is_correct);
      return {
        id: q.id,
        question: q.question,
        explanation: q.explanation,
        options: sortedOpts,
        correctIdx: correctIdx >= 0 ? correctIdx : 0,
      };
    });
  }, [quizzes]);

  const answeredCount = Object.keys(selectedAnswers).length;

  const scoreStats = useMemo(() => {
    if (!submitted || normalizedQuizzes.length === 0) {
      return {
        correct: 0,
        total: normalizedQuizzes.length,
        percent: 0,
        passed: false,
      };
    }
    let correct = 0;
    for (const q of normalizedQuizzes) {
      if (selectedAnswers[q.id] === q.correctIdx) correct += 1;
    }
    const percent = Math.round((correct / normalizedQuizzes.length) * 100);
    return {
      correct,
      total: normalizedQuizzes.length,
      percent,
      passed: percent >= passPercent,
    };
  }, [submitted, normalizedQuizzes, selectedAnswers, passPercent]);

  const handleSubmit = () => {
    setSubmitted(true);
    if (normalizedQuizzes.length === 0) {
      if (!previewMode && onMarkCompleted && !isCompleted) {
        onMarkCompleted(lesson.id);
      }
      return;
    }
    let correct = 0;
    for (const q of normalizedQuizzes) {
      if (selectedAnswers[q.id] === q.correctIdx) correct += 1;
    }
    const percent = Math.round((correct / normalizedQuizzes.length) * 100);
    if (percent >= passPercent) {
      triggerPerfectConfetti();
      playSound(percent === 100 ? "perfect" : "complete");
      if (!previewMode && onMarkCompleted && !isCompleted) {
        onMarkCompleted(lesson.id);
      }
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setPlayCount(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTimeSec(0);
    setIsPlaying(false);
  };

  if (!listening) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-12 text-center shadow-[0_20px_40px_-14px_rgba(53,111,167,0.12)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-primary-pastel bg-primary-light text-primary">
          <Headphones className="h-8 w-8" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Nội dung bài Luyện Nghe đang được cập nhật
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Giảng viên chưa hoàn tất tệp âm thanh hoặc kịch bản cho bài học này.
        </p>
      </div>
    );
  }

  // Tham số vòng điểm SVG
  const ringR = 34;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (scoreStats.percent / 100) * ringC;

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. COMPACT EDITORIAL PODCAST PLAYER (CLOUDY BLUE)
         ============================================================ */}
      <section className="relative overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-accent/35 p-5 shadow-[0_20px_44px_-16px_rgba(53,111,167,0.16)] sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/80 blur-3xl"
        />

        {listening.audio_url && (
          <audio
            ref={audioRef}
            src={listening.audio_url}
            preload="metadata"
            onLoadedMetadata={(e) => {
              if (Number.isFinite(e.currentTarget.duration)) {
                setDurationSec(e.currentTarget.duration);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setPlayCount((c) => c + 1);
              if (
                normalizedQuizzes.length === 0 &&
                !previewMode &&
                onMarkCompleted &&
                !isCompleted
              ) {
                triggerPerfectConfetti();
                playSound("complete");
                onMarkCompleted(lesson.id);
              }
            }}
            onTimeUpdate={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
          />
        )}

        <div className="relative grid grid-cols-1 items-center gap-5 md:grid-cols-12">
          {/* TRÁI: BÌA ĐĨA PODCAST TƯƠNG TÁC + NÚT PLAY TRUNG TÂM */}
          <div className="flex items-center gap-4 md:col-span-4 md:flex-col md:items-stretch">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/90 bg-gradient-to-br from-primary-light via-surface to-secondary-light/60 shadow-[0_14px_30px_-10px_rgba(53,111,167,0.22)] md:h-36 md:w-full">
              {/* Vòng đĩa vinyl pastel xoay nhẹ khi đang phát */}
              <div
                aria-hidden="true"
                className={`absolute h-24 w-24 rounded-full border-2 border-dashed border-primary-pastel/90 md:h-28 md:w-28 ${
                  isPlaying ? "animate-[spin_10s_linear_infinite]" : ""
                }`}
              />
              <div
                aria-hidden="true"
                className="absolute h-16 w-16 rounded-full border border-primary-pastel/60 bg-white/70 md:h-20 md:w-20"
              />

              <button
                type="button"
                disabled={!listening.audio_url || isPlayLocked}
                onClick={togglePlay}
                className={`relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_24px_-6px_rgba(53,111,167,0.55)] transition hover:scale-105 hover:bg-primary-hover active:scale-95 disabled:opacity-45 ${
                  isPlaying ? "ring-4 ring-primary-pastel" : ""
                }`}
                aria-label={isPlaying ? "Tạm dừng" : "Phát bài nghe"}
              >
                {isPlayLocked ? (
                  <Lock className="h-5 w-5" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="ml-0.5 h-6 w-6" />
                )}
              </button>

              <span className="absolute bottom-2 right-2.5 rounded-full bg-surface/90 px-2 py-0.5 font-mono text-[10px] font-bold text-primary shadow-2xs">
                {formatSeconds(durationSec)}
              </span>
            </div>

            {/* Nhân vật hội thoại gọn 1 hàng */}
            {speakers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 md:justify-center">
                {speakers.map((s, idx) => {
                  const theme = SPEAKER_THEMES[idx % SPEAKER_THEMES.length];
                  const speakingNow = activeSpeakerId === s.id;
                  return (
                    <span
                      key={s.id}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
                        speakingNow
                          ? `${theme.ring} scale-[1.03] shadow-xs`
                          : "border-border/80 bg-surface/85 text-foreground"
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${theme.avatar}`}
                      >
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>{s.name}</span>
                      {speakingNow && (
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* PHẢI: TIÊU ĐỀ, BỐI CẢNH & THANH ĐIỀU KHIỂN PODCAST MƯỢT */}
          <div className="min-w-0 space-y-3.5 md:col-span-8">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 font-bold text-primary">
                <Headphones className="h-3.5 w-3.5" />
                Luyện Nghe · {listening.lang_code}
              </span>
              {maxPlays > 0 ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${
                    isPlayLocked
                      ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                      : "border-warning-border bg-warning-bg text-warning-foreground"
                  }`}
                >
                  {submitted ? "Nghe tự do" : `Lượt nghe: ${playCount}/${maxPlays}`}
                </span>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  · Nghe không giới hạn
                </span>
              )}
              {isCompleted && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 font-semibold text-success-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Hoàn thành
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                {lesson.title}
              </h1>
              {listening.scenario && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {listening.scenario}
                </p>
              )}
            </div>

            {/* Thanh Scrubber mượt có mốc từng câu thoại */}
            {listening.audio_url ? (
              <div className="space-y-2.5 rounded-2xl border border-white/90 bg-surface/90 p-3.5 shadow-2xs backdrop-blur-sm">
                <div className="space-y-1.5">
                  <div className="relative flex h-5 items-center">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary-light">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4A85BF] to-[#356FA7] transition-[width] duration-150"
                        style={{ width: `${progressRatio * 100}%` }}
                      />
                      {/* Mốc câu thoại nhỏ trên thanh tiến độ */}
                      {durationSec > 0 &&
                        scriptLines.slice(1).map((ln) => {
                          const leftPct = Math.min(
                            99,
                            Math.max(1, ((ln.start_ms || 0) / 1000 / durationSec) * 100)
                          );
                          return (
                            <span
                              key={ln.id}
                              aria-hidden="true"
                              style={{ left: `${leftPct}%` }}
                              className="pointer-events-none absolute top-0 h-full w-0.5 bg-surface/90"
                            />
                          );
                        })}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(durationSec, 1)}
                      step={0.1}
                      disabled={isPlayLocked}
                      value={Math.min(currentTimeSec, Math.max(durationSec, 1))}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        if (durationSec > 0) seekByRatio(t / durationSec);
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      aria-label="Tiến độ bài nghe"
                    />
                  </div>

                  <div className="flex items-center justify-between font-mono text-[11px] font-semibold">
                    <span className="text-primary">
                      {formatSeconds(currentTimeSec)}
                    </span>
                    <span className="truncate px-2 font-sans text-[11px] font-medium text-muted-foreground">
                      {isPlayLocked
                        ? "Đã hết lượt nghe — nộp bài để mở khóa"
                        : activeLine
                          ? `Đang nói: ${speakerMap.get(activeLine.speaker_id)?.name || "Nhân vật"}`
                          : "Kéo thanh tiến độ để tua chính xác"}
                    </span>
                    <span className="text-muted-foreground">
                      {formatSeconds(durationSec)}
                    </span>
                  </div>
                </div>

                {/* Hàng nút điều khiển phụ gọn gàng */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPlayLocked}
                      onClick={() => skipSeconds(-5)}
                      className="rounded-xl border border-border bg-background px-3 py-1 text-xs font-bold text-foreground transition hover:border-primary hover:bg-primary-light hover:text-primary disabled:opacity-40"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      disabled={isPlayLocked}
                      onClick={() => skipSeconds(5)}
                      className="rounded-xl border border-border bg-background px-3 py-1 text-xs font-bold text-foreground transition hover:border-primary hover:bg-primary-light hover:text-primary disabled:opacity-40"
                    >
                      +5s
                    </button>
                  </div>

                  <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-0.5">
                    {[0.75, 1, 1.25].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setPlaybackRate(rate)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          playbackRate === rate
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning-foreground">
                Bài học này chưa có file audio ghép sẵn.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          2. KẾT QUẢ CHẤM ĐIỂM (SCORE RING SVG)
         ============================================================ */}
      {submitted && normalizedQuizzes.length > 0 && (
        <div
          className={`flex flex-col items-center justify-between gap-5 rounded-[28px] border p-6 shadow-xs sm:flex-row ${
            scoreStats.passed
              ? "border-success-border bg-gradient-to-r from-success-bg/85 via-surface to-primary-light/40"
              : "border-warning-border bg-gradient-to-r from-warning-bg/85 via-surface to-secondary-light/35"
          }`}
        >
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={ringR}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-border/60"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={ringR}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  className={
                    scoreStats.passed
                      ? "text-success-foreground transition-all duration-700"
                      : "text-warning-foreground transition-all duration-700"
                  }
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-foreground">
                {scoreStats.percent}%
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {scoreStats.passed ? (
                  <Star className="h-5 w-5 text-success-foreground" />
                ) : (
                  <XCircle className="h-5 w-5 text-warning-foreground" />
                )}
                <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">
                  {scoreStats.passed
                    ? "Tuyệt vời! Bạn đã chinh phục bài nghe"
                    : "Gần đạt rồi! Nghe lại cùng phụ đề Karaoke nhé"}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Chính xác{" "}
                <strong className="text-foreground">
                  {scoreStats.correct}/{scoreStats.total}
                </strong>{" "}
                câu hỏi · Yêu cầu tối thiểu {passPercent}%.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            className="shrink-0 gap-2 rounded-2xl bg-surface px-5"
          >
            <RotateCcw className="h-4 w-4" />
            Luyện lại bài nghe
          </Button>
        </div>
      )}

      {/* ============================================================
          3. KHÔNG GIAN LÀM BÀI & APPLE-STYLE KARAOKE LYRICS
         ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (7 CỘT): CÂU HỎI NGHE-HIỂU */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-[28px] border border-border bg-surface p-5 shadow-[0_16px_40px_-16px_rgba(53,111,167,0.1)] sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  Câu hỏi Nghe-Hiểu
                </h2>
                <p className="text-xs text-muted-foreground">
                  Lắng nghe hội thoại và chọn phương án đúng nhất.
                </p>
              </div>
              {normalizedQuizzes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {normalizedQuizzes.map((q, idx) => {
                    const picked = selectedAnswers[q.id];
                    const isRight = submitted && picked === q.correctIdx;
                    const isWrong = submitted && picked !== q.correctIdx;
                    return (
                      <span
                        key={q.id}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                          isRight
                            ? "bg-success-bg text-success-foreground border border-success-border"
                            : isWrong
                              ? "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                              : typeof picked === "number"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground border border-border"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {normalizedQuizzes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/50 p-8 text-center text-sm text-muted-foreground">
                Bài nghe này không có câu hỏi trắc nghiệm — bạn chỉ cần nghe hết đoạn hội thoại để hoàn thành.
              </div>
            ) : (
              <div className="space-y-5">
                {normalizedQuizzes.map((q, qIdx) => {
                  const chosenIdx = selectedAnswers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="space-y-3 rounded-[22px] border border-border/80 bg-background/45 p-4 sm:p-5"
                    >
                      <p className="flex items-start gap-2.5 text-sm font-bold leading-relaxed text-foreground sm:text-base">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-primary-light text-xs font-bold text-primary">
                          {qIdx + 1}
                        </span>
                        <span>{q.question}</span>
                      </p>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = chosenIdx === optIdx;
                          const isCorrectOpt = optIdx === q.correctIdx;

                          let cls =
                            "border-border bg-surface text-foreground hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-xs";
                          if (submitted) {
                            if (isCorrectOpt) {
                              cls =
                                "border-success-border bg-success-bg text-success-foreground font-semibold";
                            } else if (isSelected && !isCorrectOpt) {
                              cls =
                                "border-destructive-border bg-destructive-bg text-destructive-foreground";
                            } else {
                              cls =
                                "border-border/60 bg-surface/60 text-muted-foreground opacity-75";
                            }
                          } else if (isSelected) {
                            cls =
                              "border-primary bg-primary-light/85 text-primary font-semibold shadow-xs ring-2 ring-primary/15";
                          }

                          return (
                            <button
                              key={opt.id || optIdx}
                              type="button"
                              disabled={submitted}
                              onClick={() =>
                                setSelectedAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: optIdx,
                                }))
                              }
                              className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all ${cls}`}
                            >
                              <span
                                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  isSelected && !submitted
                                    ? "bg-primary text-primary-foreground"
                                    : "border border-current/25 bg-surface/80"
                                }`}
                              >
                                {OPTION_LETTERS[optIdx] || optIdx + 1}
                              </span>
                              <span className="leading-relaxed">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {submitted && q.explanation && (
                        <div className="rounded-2xl border border-primary-pastel/80 bg-primary-light/45 px-4 py-3 text-xs leading-relaxed text-foreground">
                          <span className="font-bold text-primary">
                            Giải thích:{" "}
                          </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!submitted && normalizedQuizzes.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-5">
                <span className="text-xs font-medium text-muted-foreground">
                  Đã chọn {answeredCount}/{normalizedQuizzes.length} câu hỏi
                </span>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={answeredCount < normalizedQuizzes.length}
                  className="gap-2 rounded-2xl px-6"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Nộp bài &amp; Mở phụ đề Karaoke
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): APPLE-STYLE KARAOKE LYRICS */}
        <div className="lg:col-span-5">
          <div className="sticky top-4 flex max-h-[80vh] flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_16px_40px_-16px_rgba(53,111,167,0.12)]">
            <div className="flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-primary-light/45 to-surface px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Phụ đề Karaoke
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {canViewTranscript
                      ? "Chạm vào bất kỳ câu nào để nghe lại"
                      : "Mở khóa tự động sau khi nộp bài"}
                  </p>
                </div>
              </div>

              {canViewTranscript && (
                <button
                  type="button"
                  onClick={() => setShowTranslation((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {showTranslation ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Ẩn dịch
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Song ngữ
                    </>
                  )}
                </button>
              )}
            </div>

            {!canViewTranscript ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-primary-pastel bg-primary-light/70 text-primary shadow-xs">
                  <Lock className="h-7 w-7" />
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  Chế độ Tập Trung Luyện Nghe
                </p>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Phụ đề Karaoke đang tạm ẩn để đôi tai bạn làm quen tốc độ bản xứ. Hãy hoàn thành các câu hỏi bên cạnh và bấm <strong>Nộp bài</strong> để mở khóa toàn bộ lời thoại &amp; bản dịch!
                </p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto bg-background/35 p-4">
                {scriptLines.map((line) => {
                  const spk = speakerMap.get(line.speaker_id);
                  const idx = spk?.idx ?? 0;
                  const theme = SPEAKER_THEMES[idx % SPEAKER_THEMES.length];
                  const isRight = idx % 2 === 1;
                  const isActive = activeLineId === line.id;

                  return (
                    <div
                      key={line.id}
                      className={`flex ${isRight ? "justify-end" : "justify-start"}`}
                    >
                      <button
                        ref={(el) => {
                          lineRefs.current[line.id] = el;
                        }}
                        type="button"
                        onClick={() => seekToLine(line)}
                        className={`w-[92%] rounded-[22px] border p-3.5 text-left transition-all duration-300 ${
                          isActive
                            ? `${theme.activeBubble} scale-[1.02]`
                            : `${theme.bubble} ${
                                activeLineId ? "opacity-75 hover:opacity-100" : ""
                              }`
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${theme.nameText}`}
                          >
                            {spk?.name || "Người nói"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                            <Volume2 className="h-3 w-3 text-primary" />
                            {formatSeconds((line.start_ms || 0) / 1000)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-relaxed text-foreground">
                          {line.text}
                        </p>
                        {showTranslation && line.translation && (
                          <p className="mt-1.5 border-t border-border/50 pt-1.5 text-xs italic leading-relaxed text-muted-foreground">
                            {line.translation}
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
