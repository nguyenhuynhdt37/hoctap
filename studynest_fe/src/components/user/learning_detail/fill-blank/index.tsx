"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import {
  ActiveLessonFillBlank,
  ActiveLessonFillBlankItem,
  ActiveLessonResponse,
} from "@/types/user/activeLesson";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Lightbulb,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Star,
  Volume2,
  X,
  XCircle,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface FillBlankLessonProps {
  lesson: ActiveLessonResponse;
  fillBlank?: ActiveLessonFillBlank | null;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  previewMode?: boolean;
}

function normalizeAnswer(val: string, caseSensitive: boolean): string {
  const cleaned = val.trim().replace(/\s+/g, " ");
  return caseSensitive ? cleaned : cleaned.toLowerCase();
}

function deterministicShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const mins = Math.floor(sec / 60);
  const rem = Math.floor(sec % 60);
  return `${mins}:${rem.toString().padStart(2, "0")}`;
}

export default function FillBlankLesson({
  lesson,
  fillBlank: fillBlankProp,
  onMarkCompleted,
  completedLessons,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  previewMode = false,
}: FillBlankLessonProps) {
  const fillBlank = fillBlankProp ?? lesson.fill_blank ?? null;
  const blanks = useMemo(
    () => [...(fillBlank?.blanks || [])].sort((a, b) => a.index - b.index),
    [fillBlank?.blanks]
  );

  const [values, setValues] = useState<Record<number, string>>({});
  const [activeBlankIdx, setActiveBlankIdx] = useState<number>(
    () => blanks[0]?.index ?? 1
  );
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(
    fillBlank?.duration_seconds || 0
  );
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const isCompleted =
    lesson.is_completed || Boolean(completedLessons?.has(lesson.id));
  const mode = fillBlank?.mode || "typing";
  const caseSensitive = Boolean(fillBlank?.case_sensitive);
  const allowHint = fillBlank?.allow_hint ?? true;
  const passPercent = fillBlank?.pass_percent || 70;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const blankByIndex = useMemo(() => {
    const m = new Map<number, ActiveLessonFillBlankItem>();
    for (const b of blanks) m.set(b.index, b);
    return m;
  }, [blanks]);

  const wordBankItems = useMemo(() => {
    if (mode !== "word_bank") return [];
    const correctWords = blanks
      .map((b) => (b.answers?.[0] || "").trim())
      .filter(Boolean);
    const distractors = (fillBlank?.distractors || [])
      .map((d) => d.trim())
      .filter(Boolean);
    const all = [...correctWords, ...distractors].map((word, idx) => ({
      key: `wb-${idx}-${word}`,
      word,
    }));
    return deterministicShuffle(all, lesson.id || "fill-blank");
  }, [mode, blanks, fillBlank?.distractors, lesson.id]);

  const usedWordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const val of Object.values(values)) {
      const w = (val || "").trim();
      if (!w) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    return counts;
  }, [values]);

  const segments = useMemo(() => {
    const text = fillBlank?.prompt_text || "";
    const parts: Array<
      { type: "text"; content: string } | { type: "blank"; index: number }
    > = [];
    const regex = /\{\{\s*(\d+)\s*\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }
      parts.push({ type: "blank", index: Number(match[1]) });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }
    return parts;
  }, [fillBlank?.prompt_text]);

  const checkBlankCorrect = (index: number): boolean => {
    const blank = blankByIndex.get(index);
    if (!blank) return false;
    const userVal = normalizeAnswer(values[index] || "", caseSensitive);
    if (!userVal) return false;
    return (blank.answers || []).some(
      (ans) => normalizeAnswer(ans, caseSensitive) === userVal
    );
  };

  const filledCount = blanks.filter((b) => (values[b.index] || "").trim()).length;

  const scoreStats = useMemo(() => {
    if (!submitted || blanks.length === 0) {
      return { correct: 0, total: blanks.length, percent: 0, passed: false };
    }
    let correct = 0;
    for (const b of blanks) {
      if (checkBlankCorrect(b.index)) correct += 1;
    }
    const percent = Math.round((correct / blanks.length) * 100);
    return {
      correct,
      total: blanks.length,
      percent,
      passed: percent >= passPercent,
    };
  }, [submitted, blanks, values, caseSensitive, passPercent]);

  const handleSubmit = () => {
    setSubmitted(true);
    if (blanks.length === 0) return;
    let correct = 0;
    for (const b of blanks) {
      if (checkBlankCorrect(b.index)) correct += 1;
    }
    const percent = Math.round((correct / blanks.length) * 100);
    if (percent >= passPercent) {
      triggerPerfectConfetti();
      playSound(percent === 100 ? "perfect" : "complete");
      if (!previewMode && onMarkCompleted && !isCompleted) {
        onMarkCompleted(lesson.id);
      }
    }
  };

  const handleRetry = () => {
    setValues({});
    setRevealedHints({});
    setSubmitted(false);
    setActiveBlankIdx(blanks[0]?.index ?? 1);
  };

  const handlePickWordBank = (word: string) => {
    if (submitted) return;
    let targetIdx = activeBlankIdx;
    if (!blankByIndex.has(targetIdx) || (values[targetIdx] || "").trim()) {
      const firstEmpty = blanks.find((b) => !(values[b.index] || "").trim());
      if (firstEmpty) targetIdx = firstEmpty.index;
    }
    setValues((prev) => ({ ...prev, [targetIdx]: word }));
    const nextEmpty = blanks.find(
      (b) => b.index !== targetIdx && !(values[b.index] || "").trim()
    );
    if (nextEmpty) {
      setActiveBlankIdx(nextEmpty.index);
    }
  };

  const handleRevealHint = () => {
    if (!allowHint || submitted) return;
    const target =
      blankByIndex.get(activeBlankIdx) ||
      blanks.find((b) => !(values[b.index] || "").trim()) ||
      blanks[0];
    if (!target) return;
    setRevealedHints((prev) => ({ ...prev, [target.index]: true }));
    if (mode !== "word_bank" && !(values[target.index] || "").trim()) {
      const firstChar = (target.answers?.[0] || "").slice(0, 1);
      if (firstChar) {
        setValues((prev) => ({ ...prev, [target.index]: firstChar }));
      }
      inputRefs.current[target.index]?.focus();
    }
  };

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el || !fillBlank?.audio_url) return;
    if (el.paused) {
      el.playbackRate = playbackRate;
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const skipAudio = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.min(
      Math.max(0, el.currentTime + delta),
      el.duration || durationSec || 0
    );
    el.currentTime = next;
    setCurrentTimeSec(next);
  };

  if (!fillBlank) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-12 text-center shadow-[0_20px_40px_-14px_rgba(53,111,167,0.12)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-accent-border bg-accent text-accent-foreground">
          <Pencil className="h-8 w-8" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Nội dung bài Điền từ đang được cập nhật
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Giảng viên chưa hoàn tất đoạn văn và chỗ trống cho bài học này.
        </p>
      </div>
    );
  }

  const activeBlankObj = blankByIndex.get(activeBlankIdx);
  const ringR = 34;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (scoreStats.percent / 100) * ringC;

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. COMPACT EDITORIAL HEADER + SLIM AUDIO BAR
         ============================================================ */}
      <section className="relative overflow-hidden rounded-[28px] border border-accent-border/80 bg-gradient-to-br from-accent/65 via-surface to-primary-light/50 p-5 shadow-[0_20px_44px_-16px_rgba(89,62,122,0.13)] sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/80 blur-3xl"
        />

        <div className="relative space-y-4">
          {/* Hàng 1: Meta gọn + Nút gợi ý + Thanh tiến độ mượt */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-surface/90 px-3 py-1 font-bold text-accent-foreground">
                {mode === "dictation" ? (
                  <Headphones className="h-3.5 w-3.5" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
                {mode === "typing"
                  ? "Điền từ · Gõ trực tiếp"
                  : mode === "word_bank"
                    ? "Điền từ · Chọn từ"
                    : "Nghe & Điền từ"}
              </span>
              <span className="font-semibold text-muted-foreground">
                {fillBlank.lang_code} · {blanks.length} chỗ trống
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 font-semibold text-success-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Hoàn thành
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Thanh tiến độ nhỏ gọn thay cho dãy số 1..12 rối mắt */}
              {blanks.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-white/80 bg-surface/90 px-3 py-1 text-xs font-bold text-primary shadow-2xs">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-primary-light">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.round((filledCount / blanks.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>
                    {filledCount}/{blanks.length}
                  </span>
                </div>
              )}

              {allowHint && !submitted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevealHint}
                  className="h-8 gap-1.5 rounded-full border-accent-vanilla-border bg-accent-vanilla/85 px-3 text-xs font-bold text-accent-vanilla-foreground hover:bg-accent-vanilla"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Gợi ý #{activeBlankIdx}
                </Button>
              )}
            </div>
          </div>

          {/* Hàng 2: Tiêu đề + 1 dòng hướng dẫn */}
          <div className="space-y-1">
            <h1 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
              {lesson.title}
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {mode === "word_bank"
                ? "Bấm chọn từ trong khay bên dưới để lắp vào các ô trống phù hợp."
                : mode === "dictation"
                  ? "Nghe giọng đọc bản xứ và điền chính xác các từ còn thiếu."
                  : "Đọc mạch văn và điền từ còn thiếu (nhấn Enter để nhảy sang ô tiếp theo)."}
            </p>
          </div>

          {/* Hàng 3: Thanh Audio siêu gọn 1 hàng (nếu bài có giọng đọc) */}
          {fillBlank.audio_url && (
            <div className="rounded-2xl border border-white/90 bg-surface/90 px-3.5 py-2.5 shadow-2xs backdrop-blur-sm">
              <audio
                ref={audioRef}
                src={fillBlank.audio_url}
                preload="metadata"
                onLoadedMetadata={(e) => {
                  if (Number.isFinite(e.currentTarget.duration)) {
                    setDurationSec(e.currentTarget.duration);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={(e) =>
                  setCurrentTimeSec(e.currentTarget.currentTime)
                }
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition hover:scale-105 hover:bg-primary-hover"
                  aria-label={isPlaying ? "Tạm dừng" : "Phát giọng đọc"}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" />
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => skipAudio(-5)}
                    className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => skipAudio(5)}
                    className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
                  >
                    +5s
                  </button>
                </div>

                {/* Scrubber bar mượt thay thế input range thô */}
                <div className="flex min-w-[150px] flex-1 items-center gap-2.5">
                  <span className="w-9 text-right font-mono text-[11px] font-semibold text-primary">
                    {formatSeconds(currentTimeSec)}
                  </span>
                  <div className="relative flex h-5 flex-1 items-center">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-primary-light">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4A85BF] to-[#356FA7] transition-[width] duration-150"
                        style={{
                          width: `${
                            durationSec > 0
                              ? Math.min(100, (currentTimeSec / durationSec) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(durationSec, 1)}
                      step={0.1}
                      value={Math.min(currentTimeSec, Math.max(durationSec, 1))}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        if (audioRef.current) audioRef.current.currentTime = t;
                        setCurrentTimeSec(t);
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Tiến độ audio"
                    />
                  </div>
                  <span className="w-9 font-mono text-[11px] font-semibold text-muted-foreground">
                    {formatSeconds(durationSec)}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 rounded-xl border border-border bg-background p-0.5">
                  {[0.75, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                        playbackRate === rate
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          2. KẾT QUẢ CHẤM ĐIỂM (SCORE RING SVG)
         ============================================================ */}
      {submitted && (
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
                    ? "Xuất sắc! Bạn đã hoàn thành bài Điền từ"
                    : "Thử lại lần nữa sau khi xem giải thích nhé!"}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Đúng{" "}
                <strong className="text-foreground">
                  {scoreStats.correct}/{scoreStats.total}
                </strong>{" "}
                chỗ trống · Ngưỡng đạt {passPercent}%.
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
            Làm lại bài tập
          </Button>
        </div>
      )}

      {/* ============================================================
          3. KHAY TỪ NAM CHÂM (MAGNETIC WORD TILES — WORD BANK)
         ============================================================ */}
      {mode === "word_bank" && !submitted && wordBankItems.length > 0 && (
        <div className="rounded-[26px] border border-primary-pastel bg-gradient-to-br from-primary-light/65 via-surface to-accent/25 p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {activeBlankIdx}
              </span>
              <p className="text-xs font-bold text-primary">
                Ngân hàng từ · Chọn thẻ để điền vào ô #{activeBlankIdx}
              </p>
            </div>
            {filledCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setValues({});
                  setActiveBlankIdx(blanks[0]?.index ?? 1);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-destructive-border hover:text-destructive-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Xóa tất cả
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {(() => {
              const remaining = new Map(usedWordCounts);
              return wordBankItems.map((item) => {
                const usedCount = remaining.get(item.word) || 0;
                const isUsed = usedCount > 0;
                if (isUsed) remaining.set(item.word, usedCount - 1);
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isUsed}
                    onClick={() => handlePickWordBank(item.word)}
                    className={`rounded-2xl border border-b-[3px] px-4 py-2 text-sm font-semibold transition-all ${
                      isUsed
                        ? "cursor-not-allowed border-border/50 bg-background/60 text-muted-foreground/40 line-through"
                        : "border-primary-pastel bg-surface text-foreground shadow-xs hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light hover:text-primary active:translate-y-0"
                    }`}
                  >
                    {item.word}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Thẻ gợi ý nổi cho ô đang chọn */}
      {!submitted &&
        allowHint &&
        activeBlankObj &&
        revealedHints[activeBlankObj.index] && (
          <div className="flex items-center gap-3 rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/75 px-5 py-3 text-sm text-accent-vanilla-foreground shadow-xs">
            <Lightbulb className="h-5 w-5 shrink-0" />
            <span>
              <strong>Gợi ý ô #{activeBlankObj.index}:</strong>{" "}
              {activeBlankObj.hint ||
                `Từ bắt đầu bằng "${(activeBlankObj.answers?.[0] || "").slice(0, 1)}" (${(activeBlankObj.answers?.[0] || "").length} ký tự)`}
              {activeBlankObj.part_of_speech
                ? ` · ${activeBlankObj.part_of_speech}`
                : ""}
            </span>
          </div>
        )}

      {/* ============================================================
          4. TỜ GIẤY BIÊN TẬP (EDITORIAL READING SHEET)
         ============================================================ */}
      <div className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_20px_48px_-16px_rgba(53,111,167,0.12)] sm:p-10">
        <div className="whitespace-pre-wrap text-[17px] leading-[2.7] text-foreground sm:text-[19px] sm:leading-[2.85]">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return <span key={i}>{seg.content}</span>;
            }
            const b = blankByIndex.get(seg.index);
            const val = values[seg.index] || "";
            const isCorrect = submitted ? checkBlankCorrect(seg.index) : false;
            const expectedLen = Math.max(
              10,
              Math.min(28, (b?.answers?.[0]?.length || 10) + 4)
            );

            if (mode === "word_bank") {
              return (
                <span
                  key={i}
                  className="mx-1.5 inline-flex items-center gap-1.5 align-baseline"
                >
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => {
                      if (val) {
                        setValues((prev) => ({ ...prev, [seg.index]: "" }));
                        setActiveBlankIdx(seg.index);
                      } else {
                        setActiveBlankIdx(seg.index);
                      }
                    }}
                    className={`inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-2xl border-2 border-b-[3px] px-3.5 py-0.5 text-base font-bold transition-all ${
                      submitted
                        ? isCorrect
                          ? "border-success-border bg-success-bg text-success-foreground"
                          : "border-destructive-border bg-destructive-bg text-destructive-foreground line-through"
                        : activeBlankIdx === seg.index
                          ? "border-primary bg-primary-light/85 text-primary ring-4 ring-primary-pastel/70"
                          : val
                            ? "border-primary-pastel bg-primary-light/40 text-foreground hover:border-primary"
                            : "border-dashed border-primary-pastel bg-background/80 text-muted-foreground hover:border-primary"
                    }`}
                  >
                    <span className="text-[11px] opacity-60">{seg.index}</span>
                    <span>{val || "______"}</span>
                  </button>
                  {submitted && !isCorrect && b?.answers?.[0] && (
                    <span className="rounded-xl border border-success-border bg-success-bg px-2.5 py-0.5 text-sm font-bold text-success-foreground">
                      {b.answers[0]}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <span
                key={i}
                className="mx-1.5 inline-flex items-center gap-1.5 align-baseline"
              >
                <span className="relative inline-flex items-center">
                  <span className="pointer-events-none absolute -top-2.5 left-2 rounded-full bg-primary-light px-1.5 text-[10px] font-bold leading-4 text-primary">
                    {seg.index}
                  </span>
                  <input
                    ref={(el) => {
                      inputRefs.current[seg.index] = el;
                    }}
                    type="text"
                    value={val}
                    disabled={submitted}
                    onFocus={() => setActiveBlankIdx(seg.index)}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [seg.index]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const pos = blanks.findIndex(
                          (x) => x.index === seg.index
                        );
                        const next = blanks[pos + 1];
                        if (next) inputRefs.current[next.index]?.focus();
                      }
                    }}
                    placeholder="······"
                    style={{ width: `${expectedLen}ch` }}
                    className={`rounded-2xl border-2 px-3 py-1 text-center text-base font-bold outline-none transition-all ${
                      submitted
                        ? isCorrect
                          ? "border-success-border bg-success-bg text-success-foreground"
                          : "border-destructive-border bg-destructive-bg text-destructive-foreground"
                        : activeBlankIdx === seg.index
                          ? "border-primary bg-primary-light/45 text-foreground ring-4 ring-primary-pastel/70"
                          : "border-border bg-background/70 text-foreground hover:border-primary/60"
                    }`}
                  />
                </span>
                {submitted && !isCorrect && b?.answers?.[0] && (
                  <span className="rounded-xl border border-success-border bg-success-bg px-2.5 py-0.5 text-sm font-bold text-success-foreground">
                    {b.answers[0]}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Footer hành động */}
        {!submitted && blanks.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-5">
            <span className="text-xs font-medium text-muted-foreground">
              Đã điền{" "}
              <strong className="text-foreground">
                {filledCount}/{blanks.length}
              </strong>{" "}
              chỗ trống
            </span>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={filledCount === 0}
              className="gap-2 rounded-2xl px-7"
            >
              <CheckCircle2 className="h-4 w-4" />
              Kiểm tra &amp; Chấm điểm
            </Button>
          </div>
        )}
      </div>

      {/* ============================================================
          5. BẢN DỊCH SONG HÀNH & GIẢI THÍCH CHI TIẾT
         ============================================================ */}
      {submitted && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {fillBlank.translation && (
            <div className="space-y-3 rounded-[26px] border border-primary-pastel bg-gradient-to-br from-primary-light/60 via-surface to-surface p-6 lg:col-span-5">
              <div className="flex items-center gap-2 text-primary">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light">
                  <BookOpen className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold">Bản dịch tiếng Việt</h2>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                {fillBlank.translation}
              </p>
            </div>
          )}

          <div
            className={`space-y-4 rounded-[26px] border border-border bg-surface p-6 ${
              fillBlank.translation ? "lg:col-span-7" : "lg:col-span-12"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Volume2 className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-bold text-foreground">
                Phân tích đáp án từng chỗ trống
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {blanks.map((b) => {
                const ok = checkBlankCorrect(b.index);
                return (
                  <div
                    key={b.id}
                    className={`rounded-2xl border p-4 text-xs transition ${
                      ok
                        ? "border-success-border bg-success-bg/45"
                        : "border-destructive-border/70 bg-destructive-bg/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface font-bold text-primary shadow-xs">
                        {b.index}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {b.answers.join(" / ")}
                      </span>
                      {b.part_of_speech && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {b.part_of_speech}
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1.5 font-semibold ${
                        ok
                          ? "text-success-foreground"
                          : "text-destructive-foreground"
                      }`}
                    >
                      {ok
                        ? "✓ Chính xác"
                        : `✗ Bạn điền: "${values[b.index] || "(chưa điền)"}"`}
                    </p>
                    {b.explanation && (
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">
                        {b.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
