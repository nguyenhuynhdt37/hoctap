"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { playSound, triggerPerfectConfetti } from "@/lib/utils/helpers/effects";
import {
  ActiveLessonFlashcard,
  ActiveLessonResponse,
} from "@/types/user/activeLesson";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Layers,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Star,
  Volume2,
  XCircle,
} from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FlashcardLessonProps {
  lesson: Pick<
    ActiveLessonResponse,
    "id" | "title" | "description" | "is_completed" | "is_locked"
  >;
  flashcards: ActiveLessonFlashcard[];
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  isPreviewMode?: boolean;
}

type StageMode = "flip" | "review";

interface ReviewQuestion {
  card: ActiveLessonFlashcard;
  prompt: string;
  phonetic?: string | null;
  audioUrl?: string | null;
  correctAnswer: string;
  options: string[];
}

const PASS_THRESHOLD_PERCENT = 60;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildReviewQuestions(
  cards: ActiveLessonFlashcard[],
  reverseSide: boolean
): ReviewQuestion[] {
  if (cards.length === 0) return [];
  const shuffled = shuffleArray(cards);
  return shuffled.map((card) => {
    const prompt = reverseSide ? card.back_text : card.front_text;
    const correctAnswer = reverseSide ? card.front_text : card.back_text;
    const pool = cards
      .filter((c) => c.id !== card.id)
      .map((c) => (reverseSide ? c.front_text : c.back_text))
      .filter((txt) => txt && txt.trim() !== correctAnswer.trim());

    const uniquePool = Array.from(new Set(pool));
    const distractors = shuffleArray(uniquePool).slice(0, 3);
    const options = shuffleArray([correctAnswer, ...distractors]);

    return {
      card,
      prompt,
      phonetic: reverseSide ? null : card.phonetic,
      audioUrl: reverseSide ? null : card.audio_url,
      correctAnswer,
      options,
    };
  });
}

export default function FlashcardLesson({
  lesson,
  flashcards,
  onMarkCompleted,
  completedLessons,
  isPreviewMode = false,
}: FlashcardLessonProps) {
  const [stage, setStage] = useState<StageMode>("flip");
  const [deck, setDeck] = useState<ActiveLessonFlashcard[]>(() => flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set());
  const [reverseSide, setReverseSide] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1 | 1.25>(1);
  const [showHint, setShowHint] = useState(false);

  // Trạng thái Vòng Ôn Câu Hỏi (đạt >= 60% để qua bài)
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [reviewAnswers, setReviewAnswers] = useState<
    Array<{ cardId: string; correct: boolean; picked: string; expected: string; prompt: string }>
  >([]);
  const [reviewFinished, setReviewFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setDeck(flashcards);
    setStage("flip");
    setCurrentIndex(0);
    setFlipped(false);
    setFlippedIds(new Set());
    setShowHint(false);
    setReviewQuestions([]);
    setReviewIdx(0);
    setPickedOption(null);
    setReviewAnswers([]);
    setReviewFinished(false);
  }, [lesson.id, flashcards]);

  const currentCard = deck[currentIndex] ?? null;
  const isCompleted =
    completedLessons?.has(lesson.id) || lesson.is_completed || false;

  const allFlipped = deck.length > 0 && flippedIds.size >= deck.length;

  const playAudio = useCallback(
    (url?: string | null, customRate?: number) => {
      if (!url) return;
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(url);
        audio.playbackRate = customRate ?? playbackRate;
        audioRef.current = audio;
        void audio.play().catch(() => {});
      } catch {
        // Ignore browser autoplay block
      }
    },
    [playbackRate]
  );

  // Lật thẻ bài & ghi nhận thẻ đã xem
  const handleToggleFlip = useCallback(() => {
    setFlipped((prev) => {
      const next = !prev;
      if (next && currentCard) {
        setFlippedIds((old) => {
          if (old.has(currentCard.id)) return old;
          const cloned = new Set(old);
          cloned.add(currentCard.id);
          return cloned;
        });
      }
      return next;
    });
  }, [currentCard]);

  const handleGoCard = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= deck.length) return;
      setFlipped(false);
      setShowHint(false);
      setCurrentIndex(nextIndex);
    },
    [deck.length]
  );

  const handleShuffleDeck = () => {
    setDeck((prev) => shuffleArray(prev));
    setCurrentIndex(0);
    setFlipped(false);
    setShowHint(false);
  };

  // Bắt đầu vòng ôn câu hỏi kiểm tra (đạt >= 60% qua bài)
  const startReviewQuiz = useCallback(() => {
    const qs = buildReviewQuestions(flashcards, reverseSide);
    setReviewQuestions(qs);
    setReviewIdx(0);
    setPickedOption(null);
    setReviewAnswers([]);
    setReviewFinished(false);
    setStage("review");
  }, [flashcards, reverseSide]);

  // Chọn đáp án trong vòng ôn câu hỏi
  const handlePickReviewOption = (opt: string) => {
    if (pickedOption !== null) return;
    const q = reviewQuestions[reviewIdx];
    if (!q) return;
    const isCorrect = opt === q.correctAnswer;
    setPickedOption(opt);
    setReviewAnswers((prev) => [
      ...prev,
      {
        cardId: q.card.id,
        correct: isCorrect,
        picked: opt,
        expected: q.correctAnswer,
        prompt: q.prompt,
      },
    ]);
  };

  const handleNextReviewQuestion = () => {
    if (reviewIdx + 1 < reviewQuestions.length) {
      setReviewIdx((i) => i + 1);
      setPickedOption(null);
    } else {
      // Hoàn tất vòng ôn -> tính điểm và đánh dấu hoàn thành nếu >= 60%
      setReviewFinished(true);
      const total = reviewQuestions.length;
      const correct = reviewAnswers.filter((a) => a.correct).length;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      if (pct >= PASS_THRESHOLD_PERCENT) {
        triggerPerfectConfetti();
        playSound(pct === 100 ? "perfect" : "complete");
        if (!isPreviewMode && onMarkCompleted && !isCompleted) {
          onMarkCompleted(lesson.id);
        }
      }
    }
  };

  // Phím tắt Space (lật bài), mũi tên trái/phải (chuyển bài), A (nghe)
  useEffect(() => {
    if (stage !== "flip" || deck.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleToggleFlip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleGoCard(currentIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleGoCard(currentIndex - 1);
      } else if (e.key.toLowerCase() === "a" && currentCard?.audio_url) {
        e.preventDefault();
        playAudio(currentCard.audio_url);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    stage,
    deck.length,
    currentIndex,
    currentCard?.audio_url,
    handleToggleFlip,
    handleGoCard,
    playAudio,
  ]);

  const reviewStats = useMemo(() => {
    const total = reviewQuestions.length;
    const correct = reviewAnswers.filter((a) => a.correct).length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return {
      total,
      correct,
      percent,
      passed: percent >= PASS_THRESHOLD_PERCENT,
    };
  }, [reviewQuestions.length, reviewAnswers]);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="rounded-[28px] border border-border bg-surface p-10 shadow-xs">
        <EmptyState
          title="Bộ thẻ ghi nhớ đang được cập nhật"
          description="Giảng viên chưa thêm thẻ Flashcard nào cho bài học này."
        />
      </div>
    );
  }

  const frontMain = currentCard
    ? reverseSide
      ? currentCard.back_text
      : currentCard.front_text
    : "";
  const backMain = currentCard
    ? reverseSide
      ? currentCard.front_text
      : currentCard.back_text
    : "";

  const currentQuestion = reviewQuestions[reviewIdx] ?? null;
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (reviewStats.percent / 100) * ringC;

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. CLOUDY BLUE HERO & CHUYỂN GIAI ĐOẠN (LẬT THẺ -> ÔN CÂU HỎI)
         ============================================================ */}
      <section className="relative overflow-hidden rounded-[32px] border border-secondary-pastel/80 bg-gradient-to-br from-secondary-light/70 via-surface to-primary-light/60 p-6 shadow-[0_24px_48px_-14px_rgba(53,111,167,0.14)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/80 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-secondary-pastel/35 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-secondary-foreground shadow-xs">
                <Layers className="h-3.5 w-3.5" />
                Flashcard 3D
              </span>
              <Badge variant="outline" className="bg-surface/85 text-xs">
                {deck.length} thẻ ghi nhớ
              </Badge>
              <Badge variant="outline" className="bg-surface/85 text-xs">
                Đã lật {flippedIds.size}/{deck.length}
              </Badge>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-xs font-semibold text-success-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã hoàn thành
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {lesson.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Lật hết bộ thẻ bài để ghi nhớ, sau đó làm vòng ôn câu hỏi đạt từ{" "}
              <strong className="text-foreground">
                {PASS_THRESHOLD_PERCENT}%
              </strong>{" "}
              trở lên để hoàn thành bài học.
            </p>
          </div>

          {/* 2 Nút chuyển giai đoạn rõ ràng */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/80 bg-surface/90 p-1.5 shadow-xs backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setStage("flip")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                stage === "flip"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              1. Lật thẻ bài
            </button>
            <button
              type="button"
              onClick={startReviewQuiz}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                stage === "review"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              2. Ôn câu hỏi (≥ {PASS_THRESHOLD_PERCENT}%)
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. GIAI ĐOẠN 1: CỖ BÀI LẬT 3D CHÂN THỰC
         ============================================================ */}
      {stage === "flip" && currentCard && (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Thanh công cụ phụ trợ gọn nhẹ */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShuffleDeck}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Trộn bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setReverseSide((v) => !v);
                  setFlipped(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {reverseSide ? "Mặt Việt trước" : "Mặt Ngoại ngữ trước"}
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-0.5">
              {([0.75, 1, 1.25] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPlaybackRate(r)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                    playbackRate === r
                      ? "bg-primary-light text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* SÂN KHẤU LÁ BÀI 3D CÓ HIỆU ỨNG XẾP CHỒNG */}
          <div className="relative mx-auto pb-5 pt-1">
            {/* 2 lá bài xếp chồng phía sau tạo cảm giác bộ bài thật */}
            {deck.length > 2 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 bottom-0 top-6 rounded-[32px] border border-primary-pastel/45 bg-surface/55 shadow-xs"
              />
            )}
            {deck.length > 1 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 bottom-2.5 top-3 rounded-[32px] border border-primary-pastel/70 bg-surface/80 shadow-sm"
              />
            )}

            {/* Lá bài chính lật 3D (perspective + rotateY 180deg) */}
            <div
              onClick={handleToggleFlip}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleToggleFlip();
              }}
              aria-label="Bấm để lật thẻ bài"
              className="relative h-[380px] w-full cursor-pointer select-none sm:h-[410px]"
              style={{ perspective: "1400px" }}
            >
              <div
                className="relative h-full w-full transition-transform duration-600"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {/* MẶT TRƯỚC LÁ BÀI */}
                <div
                  className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[32px] border-2 border-primary-pastel bg-gradient-to-br from-surface via-surface to-primary-light/55 p-6 shadow-[0_24px_48px_-14px_rgba(53,111,167,0.18)] sm:p-8"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {/* Header góc lá bài kiểu thẻ bài */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-xl bg-primary-light px-2 text-xs font-extrabold text-primary">
                        #{currentIndex + 1}
                      </span>
                      {currentCard.part_of_speech && (
                        <Badge variant="outline" className="bg-surface text-xs">
                          {currentCard.part_of_speech}
                        </Badge>
                      )}
                    </div>

                    {currentCard.audio_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(currentCard.audio_url);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary-pastel bg-primary-light text-primary shadow-xs transition hover:scale-105 hover:bg-primary hover:text-primary-foreground"
                        title="Nghe phát âm (phím A)"
                        aria-label="Nghe phát âm"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Nội dung chính giữa lá bài */}
                  <div className="flex flex-1 flex-col items-center justify-center space-y-3 px-4 text-center">
                    <p className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                      {frontMain}
                    </p>
                    {!reverseSide && currentCard.phonetic && (
                      <p className="rounded-full bg-primary-light/70 px-3.5 py-1 font-mono text-sm font-medium text-primary">
                        {currentCard.phonetic}
                      </p>
                    )}
                    {currentCard.hint && (
                      <div className="pt-2">
                        {showHint ? (
                          <p className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/75 px-4 py-1.5 text-xs font-medium text-accent-vanilla-foreground">
                            💡 {currentCard.hint}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHint(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                            Xem gợi ý
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer hướng dẫn lật */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Mặt trước</span>
                    <span className="font-semibold text-primary">
                      Chạm thẻ hoặc nhấn Space để lật ↻
                    </span>
                  </div>
                </div>

                {/* MẶT SAU LÁ BÀI (XOAY 180 ĐỘ) */}
                <div
                  className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[32px] border-2 border-secondary-pastel bg-gradient-to-br from-surface via-surface to-secondary-light/55 p-6 shadow-[0_24px_48px_-14px_rgba(209,107,143,0.18)] sm:p-8"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-secondary-light px-3 py-1 text-xs font-bold text-secondary-foreground">
                      Đáp án · #{currentIndex + 1}
                    </span>
                    {currentCard.example_audio_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(currentCard.example_audio_url);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-secondary-pastel bg-surface px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary-light"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe ví dụ
                      </button>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center space-y-4 px-4 text-center">
                    <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                      {backMain}
                    </p>
                    {currentCard.example_sentence && (
                      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-surface/90 p-4 text-left shadow-xs">
                        <p className="text-sm font-semibold text-foreground">
                          &ldquo;{currentCard.example_sentence}&rdquo;
                        </p>
                        {currentCard.example_translation && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            {currentCard.example_translation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Mặt sau</span>
                    <span className="font-semibold text-secondary-foreground">
                      Chạm để lật lại ↺
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Điều hướng lá bài + Chấm tiến độ */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => handleGoCard(currentIndex - 1)}
              className="gap-1.5 rounded-2xl bg-surface px-5"
            >
              <ChevronLeft className="h-4 w-4" />
              Thẻ trước
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {deck.map((c, idx) => {
                const seen = flippedIds.has(c.id);
                const isCur = idx === currentIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleGoCard(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      isCur
                        ? "w-7 bg-primary"
                        : seen
                          ? "w-2.5 bg-[#4A9B6D]"
                          : "w-2.5 bg-primary-pastel/70 hover:bg-primary/50"
                    }`}
                    aria-label={`Chuyển đến thẻ ${idx + 1}`}
                  />
                );
              })}
            </div>

            {currentIndex < deck.length - 1 ? (
              <Button
                type="button"
                onClick={() => handleGoCard(currentIndex + 1)}
                className="gap-1.5 rounded-2xl px-5"
              >
                Thẻ tiếp
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={startReviewQuiz}
                className="gap-1.5 rounded-2xl px-5"
              >
                Ôn câu hỏi qua bài
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Banner nổi bật khi đã lật hết toàn bộ cỗ bài */}
          {allFlipped && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-[26px] border border-success-border bg-gradient-to-r from-success-bg/80 via-surface to-primary-light/45 p-5 shadow-xs sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success-bg text-success-foreground border border-success-border">
                  <Star className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Bạn đã lật xong toàn bộ {deck.length} thẻ ghi nhớ!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Làm nhanh vòng ôn câu hỏi đạt từ{" "}
                    <strong>{PASS_THRESHOLD_PERCENT}%</strong> để hoàn thành bài học nhé.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={startReviewQuiz}
                className="shrink-0 gap-2 rounded-2xl px-6"
              >
                <HelpCircle className="h-4 w-4" />
                Làm bài ôn ngay
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          3. GIAI ĐOẠN 2: VÒNG ÔN CÂU HỎI (ĐẠT >= 60% QUA BÀI)
         ============================================================ */}
      {stage === "review" && (
        <div className="mx-auto max-w-3xl space-y-6">
          {!reviewFinished && currentQuestion ? (
            <div className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_20px_48px_-16px_rgba(53,111,167,0.14)] sm:p-8">
              {/* Tiến độ vòng ôn */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-primary">
                    Câu hỏi ôn tập {reviewIdx + 1} / {reviewQuestions.length}
                  </span>
                  <span className="text-muted-foreground">
                    Cần đạt ≥ {PASS_THRESHOLD_PERCENT}% để hoàn thành
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${((reviewIdx + 1) / reviewQuestions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Đề câu hỏi */}
              <div className="mb-6 flex flex-col items-center space-y-3 rounded-[24px] border border-primary-pastel/70 bg-gradient-to-br from-primary-light/60 via-surface to-accent/25 px-5 py-7 text-center">
                <span className="text-xs font-semibold text-muted-foreground">
                  {reverseSide
                    ? "Chọn từ ngoại ngữ tương ứng với nghĩa sau:"
                    : "Chọn nghĩa đúng của từ / cụm từ sau:"}
                </span>
                <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {currentQuestion.prompt}
                </p>
                <div className="flex items-center gap-2">
                  {currentQuestion.phonetic && (
                    <span className="rounded-full bg-surface px-3 py-0.5 font-mono text-xs font-medium text-primary">
                      {currentQuestion.phonetic}
                    </span>
                  )}
                  {currentQuestion.audioUrl && (
                    <button
                      type="button"
                      onClick={() => playAudio(currentQuestion.audioUrl)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-light"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Nghe phát âm
                    </button>
                  )}
                </div>
              </div>

              {/* Các lựa chọn trắc nghiệm */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isPicked = pickedOption === opt;
                  const isCorrectOpt = opt === currentQuestion.correctAnswer;
                  const answered = pickedOption !== null;

                  let cls =
                    "border-border bg-background/50 text-foreground hover:-translate-y-0.5 hover:border-primary hover:bg-primary-light/40";
                  if (answered) {
                    if (isCorrectOpt) {
                      cls =
                        "border-success-border bg-success-bg text-success-foreground font-bold";
                    } else if (isPicked && !isCorrectOpt) {
                      cls =
                        "border-destructive-border bg-destructive-bg text-destructive-foreground";
                    } else {
                      cls = "border-border/50 bg-background/30 text-muted-foreground opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => handlePickReviewOption(opt)}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition-all ${cls}`}
                    >
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/25 bg-surface text-xs font-bold">
                        {OPTION_LETTERS[idx] || idx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {pickedOption !== null && (
                <div className="mt-6 flex items-center justify-between border-t border-border/80 pt-5">
                  <span
                    className={`text-sm font-bold ${
                      pickedOption === currentQuestion.correctAnswer
                        ? "text-success-foreground"
                        : "text-destructive-foreground"
                    }`}
                  >
                    {pickedOption === currentQuestion.correctAnswer
                      ? "✓ Chính xác!"
                      : `✗ Đáp án đúng: ${currentQuestion.correctAnswer}`}
                  </span>
                  <Button
                    type="button"
                    onClick={handleNextReviewQuestion}
                    className="gap-1.5 rounded-2xl px-6"
                  >
                    {reviewIdx + 1 < reviewQuestions.length
                      ? "Câu tiếp theo"
                      : "Xem kết quả"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* KẾT QUẢ VÒNG ÔN CÂU HỎI (SCORE RING SVG) */
            <div
              className={`space-y-6 rounded-[30px] border p-6 shadow-[0_20px_48px_-16px_rgba(53,111,167,0.14)] sm:p-8 ${
                reviewStats.passed
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
                        strokeDashoffset={ringOffset}
                        className={
                          reviewStats.passed
                            ? "text-success-foreground transition-all duration-700"
                            : "text-warning-foreground transition-all duration-700"
                        }
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">
                      {reviewStats.percent}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {reviewStats.passed ? (
                        <CheckCircle2 className="h-6 w-6 text-success-foreground" />
                      ) : (
                        <XCircle className="h-6 w-6 text-warning-foreground" />
                      )}
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {reviewStats.passed
                          ? "Chúc mừng! Bạn đã hoàn thành bài Flashcard"
                          : `Chưa đạt ${PASS_THRESHOLD_PERCENT}% — ôn thêm chút nhé!`}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trả lời đúng{" "}
                      <strong className="text-foreground">
                        {reviewStats.correct}/{reviewStats.total}
                      </strong>{" "}
                      câu hỏi · Yêu cầu tối thiểu {PASS_THRESHOLD_PERCENT}% để qua bài.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStage("flip");
                      setCurrentIndex(0);
                      setFlipped(false);
                    }}
                    className="gap-1.5 rounded-2xl bg-surface"
                  >
                    <Layers className="h-4 w-4" />
                    Lật lại thẻ
                  </Button>
                  <Button
                    type="button"
                    onClick={startReviewQuiz}
                    className="gap-1.5 rounded-2xl"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Làm lại vòng ôn
                  </Button>
                </div>
              </div>

              {/* Tóm tắt các câu đã trả lời */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {reviewAnswers.map((item, idx) => (
                  <div
                    key={`${item.cardId}-${idx}`}
                    className={`rounded-2xl border p-3.5 text-xs ${
                      item.correct
                        ? "border-success-border bg-surface/90"
                        : "border-destructive-border bg-surface/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">
                        {item.prompt}
                      </span>
                      <span
                        className={`font-bold ${
                          item.correct
                            ? "text-success-foreground"
                            : "text-destructive-foreground"
                        }`}
                      >
                        {item.correct ? "✓ Đúng" : "✗ Sai"}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Đáp án:{" "}
                      <strong className="text-foreground">
                        {item.expected}
                      </strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
