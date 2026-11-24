"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HEATMAP_BUCKETS,
  LessonMasteryDeck,
  PASS_MASTERY_SCORE,
  PASS_QUIZ_MIN_PERCENT,
} from "./lesson-mastery-deck";
import QuizModal from "./quiz-modal";
import VideoOverlays from "./video-overlays";
import YouTubePlayer from "./youtube-player";
import { useLearningAgent, useAgentAction, useAgentSnapshot } from "../agent/agent-context";
import { numberArg, waitForState } from "../agent/action-registry";
import { submitQuizAttempt } from "../quiz/submit-attempt";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoLessonProps {
  lesson: ActiveLessonResponse;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  onSeekToTime?: (timeSeconds: number) => void;
}

interface StoredMastery {
  watched: number[];
  quizBestPercent: number;
}

function getMasteryStorageKey(lessonId: string): string {
  return `maymay:lesson-mastery:v2:${lessonId}`;
}

function loadStoredMastery(lessonId: string): StoredMastery {
  if (typeof window === "undefined" || !lessonId) {
    return { watched: [], quizBestPercent: 0 };
  }
  try {
    const raw = window.localStorage.getItem(getMasteryStorageKey(lessonId));
    if (!raw) return { watched: [], quizBestPercent: 0 };
    const parsed = JSON.parse(raw) as Partial<StoredMastery>;
    const watched = Array.isArray(parsed.watched)
      ? parsed.watched.filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0)
      : [];
    const quizBestPercent =
      typeof parsed.quizBestPercent === "number" && Number.isFinite(parsed.quizBestPercent)
        ? Math.max(0, Math.min(100, Math.round(parsed.quizBestPercent)))
        : 0;
    return { watched, quizBestPercent };
  } catch {
    return { watched: [], quizBestPercent: 0 };
  }
}

function saveStoredMastery(lessonId: string, watchedSet: Set<number>, quizBestPercent: number) {
  if (typeof window === "undefined" || !lessonId) return;
  try {
    const payload: StoredMastery = {
      watched: Array.from(watchedSet),
      quizBestPercent,
    };
    window.localStorage.setItem(getMasteryStorageKey(lessonId), JSON.stringify(payload));
  } catch {
    // Bỏ qua nếu trình duyệt đầy bộ nhớ cục bộ
  }
}

function computeHeatmap(watchedSet: Set<number>, totalSeconds: number): number[] {
  const safeDuration = Math.max(1, Math.floor(totalSeconds));
  const buckets = new Array<number>(HEATMAP_BUCKETS).fill(0);
  const counts = new Array<number>(HEATMAP_BUCKETS).fill(0);

  for (let s = 0; s < safeDuration; s += 1) {
    const idx = Math.min(HEATMAP_BUCKETS - 1, Math.floor((s / safeDuration) * HEATMAP_BUCKETS));
    counts[idx] += 1;
    if (watchedSet.has(s)) buckets[idx] += 1;
  }

  return buckets.map((hit, idx) => (counts[idx] > 0 ? hit / counts[idx] : 0));
}

export default function VideoLesson({
  lesson,
  onMarkCompleted,
  completedLessons,
}: VideoLessonProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

  const playerRef = useRef<any>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fastForwardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchedSecondsRef = useRef<Set<number>>(new Set());
  const previousTimeRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());
  const persistTickRef = useRef<number>(0);
  const completedTriggeredRef = useRef<boolean>(false);

  const [effectiveDuration, setEffectiveDuration] = useState<number>(
    Math.max(1, Math.floor(lesson.duration || 180)),
  );
  const effectiveDurationRef = useRef<number>(Math.max(1, Math.floor(lesson.duration || 180)));
  const [watchedCount, setWatchedCount] = useState<number>(0);
  const [heatmap, setHeatmap] = useState<number[]>(() =>
    new Array<number>(HEATMAP_BUCKETS).fill(0),
  );
  const [quizBestPercent, setQuizBestPercent] = useState<number>(0);
  const quizBestPercentRef = useRef<number>(0);

  useEffect(() => {
    effectiveDurationRef.current = effectiveDuration;
  }, [effectiveDuration]);

  useEffect(() => {
    quizBestPercentRef.current = quizBestPercent;
  }, [quizBestPercent]);
  const [isPaused, setIsPaused] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [quizSaveError, setQuizSaveError] = useState("");
  const quizAttemptKey = useRef("");
  const quizSubmitting = useRef(false);

  const isCompleted =
    completedLessons?.has(lesson.id || "") || lesson.is_completed || false;
  const quizzes = lesson.quizzes || [];
  const hasQuizzes = quizzes.length > 0;

  // Khôi phục tiến độ xem & điểm Quiz từ localStorage khi chuyển bài học
  useEffect(() => {
    const initialDur = Math.max(1, Math.floor(lesson.duration || 180));
    const stored = loadStoredMastery(lesson.id);
    const clampedSet = new Set(stored.watched.filter((s) => s >= 0 && s < initialDur));

    watchedSecondsRef.current = clampedSet;
    previousTimeRef.current = null;
    lastCheckTimeRef.current = Date.now();
    completedTriggeredRef.current = false;

    setEffectiveDuration(initialDur);
    setWatchedCount(clampedSet.size);
    setHeatmap(computeHeatmap(clampedSet, initialDur));
    setQuizBestPercent(stored.quizBestPercent);
    setIsReady(false);
    setIsPaused(false);
    setIsFastForwarding(false);

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    if (fastForwardTimeoutRef.current) {
      clearTimeout(fastForwardTimeoutRef.current);
      fastForwardTimeoutRef.current = null;
    }

    return () => {
      saveStoredMastery(lesson.id, watchedSecondsRef.current, stored.quizBestPercent);
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      if (fastForwardTimeoutRef.current) {
        clearTimeout(fastForwardTimeoutRef.current);
        fastForwardTimeoutRef.current = null;
      }
    };
  }, [lesson.id, lesson.duration]);

  // Tính toán điểm qua bài minh bạch trên thang 100 điểm
  const { watchCoveragePercent, watchPoints, quizPoints, totalMasteryScore, meetsPassRule } =
    useMemo(() => {
      const coverage = Math.min(
        100,
        Math.round((watchedCount / Math.max(1, effectiveDuration)) * 100),
      );
      if (!hasQuizzes) {
        return {
          watchCoveragePercent: coverage,
          watchPoints: coverage,
          quizPoints: 0,
          totalMasteryScore: coverage,
          meetsPassRule: coverage >= PASS_MASTERY_SCORE,
        };
      }
      // Video có Quiz: đạt >= 50% câu hỏi Quiz là đủ điều kiện qua bài ngay
      const wPoints = Math.min(40, Math.round((Math.min(coverage, 80) / 80) * 40));
      const qPoints = Math.round((quizBestPercent / 100) * 60);
      const passedQuiz = quizBestPercent >= PASS_QUIZ_MIN_PERCENT;
      const total = passedQuiz ? Math.max(PASS_MASTERY_SCORE, Math.min(100, wPoints + qPoints)) : Math.min(100, wPoints + qPoints);
      return {
        watchCoveragePercent: coverage,
        watchPoints: wPoints,
        quizPoints: qPoints,
        totalMasteryScore: total,
        meetsPassRule: passedQuiz,
      };
    }, [watchedCount, effectiveDuration, hasQuizzes, quizBestPercent]);

  const playSuccessSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + 0.48);
      });
    } catch {
      // Bỏ qua nếu trình duyệt chặn autoplay AudioContext
    }
  }, []);

  // Tự động đánh dấu hoàn thành bài học ngay khi đạt chuẩn qua bài
  useEffect(() => {
    if (isCompleted || !meetsPassRule || completedTriggeredRef.current) return;
    completedTriggeredRef.current = true;
    playSuccessSound();
    triggerCelebration(3, 2);
    confetti({
      particleCount: 140,
      spread: 115,
      origin: { y: 0.6 },
      colors: ["#356FA7", "#7BAFD4", "#BFD7ED", "#F7C9D9", "#E3D5F5", "#F8E9C9"],
      shapes: ["star", "circle"],
      scalar: 1.15,
    });
    onMarkCompleted?.(lesson.id);
  }, [isCompleted, meetsPassRule, lesson.id, onMarkCompleted, playSuccessSound]);

  // ── AGENT HOOKS (GIỮ NGUYÊN 100%) ──
  const agent = useLearningAgent();
  const readVideo = () => {
    const player = playerRef.current;
    if (!player?.getCurrentTime || !isReady) throw new Error("Trình phát video chưa sẵn sàng.");
    return {
      current_time: Number(player.getCurrentTime()),
      duration: Number(player.getDuration()),
      is_playing: player.getPlayerState() === 1,
      player_state: Number(player.getPlayerState()),
      playback_rate: Number(player.getPlaybackRate()),
      lesson_id: lesson.id,
    };
  };
  useAgentSnapshot("video", () => {
    try {
      const { lesson_id: _lesson, player_state: _state, ...video } = readVideo();
      return { video };
    } catch {
      return {};
    }
  });
  useEffect(() => {
    agent?.changed();
  }, [isReady, agent?.changed]);
  useAgentAction("video.get_state", {
    execute: async () => readVideo(),
    verify: (result) => Number.isFinite((result as { current_time: number }).current_time),
  });
  useAgentAction("video.seek", {
    execute: async (args, signal) => {
      const state = readVideo();
      const seconds = numberArg(
        { timestamp_seconds: args.timestamp_seconds ?? args.seconds ?? args.current_time },
        "timestamp_seconds",
        0,
        state.duration,
      );
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      playerRef.current.seekTo(seconds, true);
      await waitForState(() => Math.abs(readVideo().current_time - seconds) < 1.5, signal);
      return { ...readVideo(), requested_timestamp: seconds, verified: true };
    },
    verify: (result) => Boolean((result as { verified?: boolean }).verified),
  });
  useAgentAction("video.play", {
    execute: async (_args, signal) => {
      readVideo();
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      playerRef.current.playVideo();
      await waitForState(() => readVideo().is_playing, signal);
      return { ...readVideo(), verified: true };
    },
    verify: (result) => Boolean((result as { is_playing: boolean }).is_playing),
  });
  useAgentAction("video.pause", {
    execute: async (_args, signal) => {
      readVideo();
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      playerRef.current.pauseVideo();
      await waitForState(() => [-1, 0, 2, 5].includes(readVideo().player_state), signal);
      return { ...readVideo(), verified: true };
    },
    verify: (result) => (result as { is_playing: boolean }).is_playing === false,
  });
  useAgentAction("video.set_playback_rate", {
    execute: async (args, signal) => {
      readVideo();
      const rate = numberArg(
        { playback_rate: args.playback_rate ?? args.rate },
        "playback_rate",
        0.25,
        2,
      );
      const allowed = playerRef.current.getAvailablePlaybackRates();
      if (!allowed.includes(rate)) throw new Error("Video không hỗ trợ tốc độ này.");
      if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
      playerRef.current.setPlaybackRate(rate);
      await waitForState(() => readVideo().playback_rate === rate, signal);
      return { ...readVideo(), verified: true };
    },
    verify: (result) => Boolean((result as { verified?: boolean }).verified),
  });

  // ── YOUTUBE PLAYER TRACKING (UNIQUE WATCHED SEGMENTS) ──
  const handlePlayerReady = useCallback((event: any) => {
    setIsReady(true);
    playerRef.current = event.target;
    const ytDur = Number(event.target?.getDuration?.() || 0);
    if (ytDur > 0) {
      setEffectiveDuration(Math.floor(ytDur));
    }
    previousTimeRef.current = Number(event.target?.getCurrentTime?.() || 0);
    lastCheckTimeRef.current = Date.now();
  }, []);

  const handleVideoLoaded = useCallback(() => {}, []);

  const handlePlayerStateChange = useCallback(
    (event: any) => {
      const player = playerRef.current;
      if (!player) return;

      if (event.data === 1) {
        // Playing
        setIsPaused(false);
        const ytDur = Number(player.getDuration?.() || 0);
        const currentDur = ytDur > 0 ? Math.floor(ytDur) : effectiveDurationRef.current;
        if (ytDur > 0 && Math.floor(ytDur) !== effectiveDurationRef.current) {
          effectiveDurationRef.current = Math.floor(ytDur);
          setEffectiveDuration(Math.floor(ytDur));
        }

        previousTimeRef.current = Number(player.getCurrentTime?.() || 0);
        lastCheckTimeRef.current = Date.now();

        if (trackingIntervalRef.current) {
          clearInterval(trackingIntervalRef.current);
        }

        trackingIntervalRef.current = setInterval(() => {
          if (!player?.getCurrentTime) return;
          try {
            const now = Date.now();
            const currentTime = Number(player.getCurrentTime());
            if (!Number.isFinite(currentTime) || currentTime < 0) return;

            const prev = previousTimeRef.current;
            const elapsedWallSec = Math.max(0.1, (now - lastCheckTimeRef.current) / 1000);
            const playbackRate = Math.max(1, Number(player.getPlaybackRate?.() || 1));

            if (prev !== null) {
              const delta = currentTime - prev;
              // Cho phép xem bình thường và xem nhanh tới 2x, nhưng chặn tua nhảy cóc > 3.5s
              const maxAllowedJump = Math.max(3.5, elapsedWallSec * playbackRate * 1.6 + 1.2);

              if (delta >= 0 && delta <= maxAllowedJump) {
                const startSec = Math.max(0, Math.floor(prev));
                const endSec = Math.min(currentDur - 1, Math.floor(currentTime));
                let added = false;
                for (let s = startSec; s <= endSec; s += 1) {
                  if (!watchedSecondsRef.current.has(s)) {
                    watchedSecondsRef.current.add(s);
                    added = true;
                  }
                }
                if (added) {
                  setWatchedCount(watchedSecondsRef.current.size);
                  setHeatmap(computeHeatmap(watchedSecondsRef.current, currentDur));
                }
                persistTickRef.current += 1;
                if (persistTickRef.current % 4 === 0) {
                  saveStoredMastery(lesson.id, watchedSecondsRef.current, quizBestPercentRef.current);
                }
              } else if (delta > maxAllowedJump) {
                // Phát hiện tua nhảy cóc tới trước → không cộng giây bị bỏ qua
                setIsFastForwarding(true);
                if (fastForwardTimeoutRef.current) {
                  clearTimeout(fastForwardTimeoutRef.current);
                }
                fastForwardTimeoutRef.current = setTimeout(() => {
                  setIsFastForwarding(false);
                }, 3500);
              }
            }

            previousTimeRef.current = currentTime;
            lastCheckTimeRef.current = now;
          } catch {
            // Bỏ qua lỗi đọc player tạm thời
          }
        }, 500);
      }

      if (event.data === 2 || event.data === 0) {
        // Paused or Ended
        setIsPaused(true);
        if (trackingIntervalRef.current) {
          clearInterval(trackingIntervalRef.current);
          trackingIntervalRef.current = null;
        }
        saveStoredMastery(lesson.id, watchedSecondsRef.current, quizBestPercentRef.current);
      }
    },
    [lesson.id],
  );

  // Đăng ký window helpers cho NotesTab & Seek từ Heatmap
  const seekToSeconds = useCallback((timeSeconds: number) => {
    if (playerRef.current?.seekTo) {
      try {
        previousTimeRef.current = timeSeconds;
        lastCheckTimeRef.current = Date.now();
        playerRef.current.seekTo(timeSeconds, true);
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    (window as any)[`seekVideo_${lesson.id}`] = seekToSeconds;
    (window as any)[`getCurrentTime_${lesson.id}`] = (): number => {
      try {
        return Math.floor(Number(playerRef.current?.getCurrentTime?.() || 0));
      } catch {
        return 0;
      }
    };
    (window as any)[`pauseVideo_${lesson.id}`] = () => {
      try {
        playerRef.current?.pauseVideo?.();
      } catch {
        // Ignore
      }
    };

    return () => {
      delete (window as any)[`seekVideo_${lesson.id}`];
      delete (window as any)[`getCurrentTime_${lesson.id}`];
      delete (window as any)[`pauseVideo_${lesson.id}`];
    };
  }, [lesson.id, isReady, seekToSeconds]);

  // ── QUIZ HANDLERS ──
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  const fireQuizPassCelebration = useCallback(() => {
    playSuccessSound();
    triggerCelebration(3, 2);
    const colors = ["#356FA7", "#7BAFD4", "#BFD7ED", "#F7C9D9", "#E3D5F5", "#F8E9C9"];
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      zIndex: 200,
    });
    window.setTimeout(() => {
      confetti({
        particleCount: 70,
        angle: 60,
        spread: 65,
        origin: { x: 0.15, y: 0.65 },
        colors,
        zIndex: 200,
      });
      confetti({
        particleCount: 70,
        angle: 120,
        spread: 65,
        origin: { x: 0.85, y: 0.65 },
        colors,
        zIndex: 200,
      });
    }, 220);
  }, [playSuccessSound]);

  const handleQuizComplete = async () => {
    if (quizSubmitting.current) return;
    quizSubmitting.current = true;
    setIsSubmittingQuiz(true);
    setQuizSaveError("");
    if (!quizAttemptKey.current) quizAttemptKey.current = safeUUID();

    // Tính trước điểm phía client để đảm bảo phản hồi mượt ngay cả khi API lưu điểm chậm/lỗi
    let localCorrect = 0;
    const answers = quizzes.map((quiz) => {
      const idx = selectedAnswers[quiz.id];
      const chosen = idx !== undefined ? quiz.options[idx] : undefined;
      if (chosen?.is_correct) localCorrect += 1;
      return {
        question_id: quiz.id,
        option_id: chosen?.id || "",
      };
    });

    if (answers.some((answer) => !answer.option_id)) {
      setQuizSaveError("Hãy trả lời đầy đủ câu hỏi trước khi nộp bài.");
      quizSubmitting.current = false;
      setIsSubmittingQuiz(false);
      return;
    }

    let finalCorrect = localCorrect;
    let finalPercent = Math.round((localCorrect / Math.max(1, quizzes.length)) * 100);

    try {
      const verified = await submitQuizAttempt(lesson.id, answers, quizAttemptKey.current);
      finalCorrect = verified.correct;
      finalPercent = Math.round(verified.score_percent);
    } catch {
      // Vẫn hiển thị kết quả và cho qua bài nếu đạt >= 50%, không làm treo modal
      setQuizSaveError("");
    } finally {
      setQuizScore(finalCorrect);
      setShowResults(true);
      const nextBest = Math.max(quizBestPercentRef.current, finalPercent);
      quizBestPercentRef.current = nextBest;
      setQuizBestPercent(nextBest);
      saveStoredMastery(lesson.id, watchedSecondsRef.current, nextBest);

      if (finalPercent >= PASS_QUIZ_MIN_PERCENT) {
        fireQuizPassCelebration();
        if (!isCompleted && !completedTriggeredRef.current) {
          completedTriggeredRef.current = true;
          onMarkCompleted?.(lesson.id);
        }
      }

      quizSubmitting.current = false;
      setIsSubmittingQuiz(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (quizSubmitting.current) return;
    quizAttemptKey.current = "";
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    setAnsweredQuestions((prev) => new Set([...prev, questionId]));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex === quizzes.length - 1) {
      void handleQuizComplete();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((p) => p - 1);
  };

  const resetQuiz = () => {
    quizAttemptKey.current = "";
    setQuizSaveError("");
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizScore(0);
    setAnsweredQuestions(new Set());
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    resetQuiz();
  };

  if (!lesson.file_id) {
    return (
      <div className="flex h-[70vh] items-center justify-center border-b border-border bg-background font-medium text-muted-foreground">
        Không có video để phát...
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-surface">
      <div className="relative bg-background">
        <YouTubePlayer
          lesson={lesson}
          onPlayerReady={handlePlayerReady}
          onPlayerStateChange={handlePlayerStateChange}
          onVideoLoaded={handleVideoLoaded}
        />

        <VideoOverlays
          isCompleted={isCompleted}
          isPaused={isPaused}
          isFastForwarding={isFastForwarding}
        />
      </div>

      {/* ── CLOUDY MASTERY DECK: THANG ĐIỂM QUA BÀI 100Đ & HEATMAP ── */}
      <LessonMasteryDeck
        hasQuizzes={hasQuizzes}
        quizzesCount={quizzes.length}
        isCompleted={isCompleted}
        isFastForwarding={isFastForwarding}
        watchedSecondsCount={watchedCount}
        duration={effectiveDuration}
        watchCoveragePercent={watchCoveragePercent}
        watchPoints={watchPoints}
        quizPoints={quizPoints}
        quizBestPercent={quizBestPercent}
        totalScore={totalMasteryScore}
        heatmap={heatmap}
        onOpenQuiz={() => setShowQuiz(true)}
        onSeekToSegment={seekToSeconds}
      />

      {quizSaveError && (
        <p
          role="alert"
          className="m-3 rounded-xl border border-warning-border bg-warning-bg p-3 text-sm text-warning-foreground"
        >
          {quizSaveError}
        </p>
      )}

      {showQuiz && hasQuizzes && (
        <QuizModal
          lessonTitle={lesson.title}
          quizzes={quizzes}
          isCompleted={isCompleted}
          showResults={showResults}
          isSubmitting={isSubmittingQuiz}
          currentQuestionIndex={currentQuestionIndex}
          selectedAnswers={selectedAnswers}
          answeredQuestions={answeredQuestions}
          quizScore={quizScore}
          onAnswerSelect={handleAnswerSelect}
          onNextQuestion={handleNextQuestion}
          onPrevQuestion={handlePrevQuestion}
          onResetQuiz={resetQuiz}
          onCloseQuiz={closeQuiz}
        />
      )}
    </div>
  );
}
