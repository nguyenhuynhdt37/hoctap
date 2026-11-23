"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import confetti from "canvas-confetti";
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function VideoLesson({
  lesson,
  onMarkCompleted,
  completedLessons,
  onSeekToTime,
}: VideoLessonProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: number;
  }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fastForwardCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFastForwardingRef = useRef(false);
  const previousTimeRef = useRef(0);
  const lastCheckTimeRef = useRef(Date.now());
  const [watchTime, setWatchTime] = useState(0);
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
  const duration = lesson.duration || 180;

  useEffect(() => {
    if (hasQuizzes || isCompleted) return;
    const requiredTime = Math.ceil(duration * 0.3);
    if (watchTime >= requiredTime && !isCompleted) {
      playSuccessSound();
      triggerCelebration(3, 2);
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.6 },
        colors: [
          "#356FA7",
          "#7BAFD4",
          "#BFD7ED",
          "#F7C9D9",
          "#E3D5F5",
          "#F8E9C9",
        ],
        shapes: ["star", "circle"],
        scalar: 1.2,
      });
      onMarkCompleted?.(lesson.id);
    }
  }, [
    watchTime,
    duration,
    hasQuizzes,
    isCompleted,
    onMarkCompleted,
    lesson.id,
  ]);

  const agent = useLearningAgent();
  const readVideo = () => {
    const player = playerRef.current;
    if (!player?.getCurrentTime || !isReady) throw new Error("Trình phát video chưa sẵn sàng.");
    return { current_time: Number(player.getCurrentTime()), duration: Number(player.getDuration()),
      is_playing: player.getPlayerState() === 1, player_state: Number(player.getPlayerState()), playback_rate: Number(player.getPlaybackRate()), lesson_id: lesson.id };
  };
  useAgentSnapshot("video", () => {
    try { const { lesson_id: _lesson, player_state: _state, ...video } = readVideo(); return { video }; } catch { return {}; }
  });
  useEffect(() => { agent?.changed(); }, [isReady, agent?.changed]);
  useAgentAction("video.get_state", { execute: async () => readVideo(), verify: result => Number.isFinite((result as { current_time: number }).current_time) });
  useAgentAction("video.seek", { execute: async (args, signal) => {
    const state = readVideo();
    const seconds = numberArg({ timestamp_seconds: args.timestamp_seconds ?? args.seconds ?? args.current_time }, "timestamp_seconds", 0, state.duration);
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    playerRef.current.seekTo(seconds, true);
    await waitForState(() => Math.abs(readVideo().current_time - seconds) < 1.5, signal);
    return { ...readVideo(), requested_timestamp: seconds, verified: true };
  }, verify: result => Boolean((result as { verified?: boolean }).verified) });
  useAgentAction("video.play", { execute: async (_args, signal) => {
    readVideo(); if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    playerRef.current.playVideo(); await waitForState(() => readVideo().is_playing, signal);
    return { ...readVideo(), verified: true };
  }, verify: result => Boolean((result as { is_playing: boolean }).is_playing) });
  useAgentAction("video.pause", { execute: async (_args, signal) => {
    readVideo(); if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    playerRef.current.pauseVideo(); await waitForState(() => [-1, 0, 2, 5].includes(readVideo().player_state), signal);
    return { ...readVideo(), verified: true };
  }, verify: result => (result as { is_playing: boolean }).is_playing === false });
  useAgentAction("video.set_playback_rate", { execute: async (args, signal) => {
    readVideo(); const rate = numberArg({ playback_rate: args.playback_rate ?? args.rate }, "playback_rate", 0.25, 2);
    const allowed = playerRef.current.getAvailablePlaybackRates();
    if (!allowed.includes(rate)) throw new Error("Video không hỗ trợ tốc độ này.");
    if (signal.aborted) throw new DOMException("Đã hủy", "AbortError");
    playerRef.current.setPlaybackRate(rate); await waitForState(() => readVideo().playback_rate === rate, signal);
    return { ...readVideo(), verified: true };
  }, verify: result => Boolean((result as { verified?: boolean }).verified) });

  const handlePlayerReady = useCallback((event: any) => {
    setIsReady(true);
    setVideoLoaded(true);
    const currentTime = event.target.getCurrentTime() || 0;
    previousTimeRef.current = currentTime;
    lastCheckTimeRef.current = Date.now();
    playerRef.current = event.target;
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoLoaded(true);
  }, []);

  const handleFastForwardDetection = useCallback((currentTime: number) => {
    const prevTime = previousTimeRef.current;
    const now = Date.now();
    const timePassed = (now - lastCheckTimeRef.current) / 1000;
    const timeDifference = currentTime - prevTime;

    if (timeDifference > 9 && prevTime > 0 && timePassed < 3) {
      setIsFastForwarding(true);
      isFastForwardingRef.current = true;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const newTimeoutId = setTimeout(() => {
        setIsFastForwarding(false);
        isFastForwardingRef.current = false;
      }, 5000);
      timeoutRef.current = newTimeoutId;

      previousTimeRef.current = currentTime;
      lastCheckTimeRef.current = now;
    } else if (timeDifference <= 20 && timeDifference >= -1) {
      previousTimeRef.current = currentTime;
      lastCheckTimeRef.current = now;

      if (isFastForwardingRef.current && timeDifference <= 20) {
        setIsFastForwarding(false);
        isFastForwardingRef.current = false;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    } else {
      previousTimeRef.current = currentTime;
      lastCheckTimeRef.current = now;
    }
  }, []);

  const handlePlayerStateChange = useCallback(
    (event: any) => {
      const player = playerRef.current;
      if (!player) return;

      if (event.data === 1) {
        setIsPaused(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        const initialTime = player.getCurrentTime() || 0;
        previousTimeRef.current = initialTime;
        lastCheckTimeRef.current = Date.now();

        if (fastForwardCheckIntervalRef.current) {
          clearInterval(fastForwardCheckIntervalRef.current);
        }

        const fastForwardCheckInterval = setInterval(() => {
          if (player && player.getCurrentTime) {
            try {
              const currentTime = player.getCurrentTime();
              if (
                currentTime !== undefined &&
                currentTime !== null &&
                !isNaN(currentTime)
              ) {
                handleFastForwardDetection(currentTime);
              }
            } catch (e) {
              console.warn("Error checking fast forward:", e);
            }
          }
        }, 500);
        fastForwardCheckIntervalRef.current = fastForwardCheckInterval;

        const newIntervalId = setInterval(() => {
          if (player && player.getCurrentTime) {
            try {
              const currentTime = player.getCurrentTime();
              if (
                currentTime !== undefined &&
                currentTime !== null &&
                !isNaN(currentTime)
              ) {
                if (!isFastForwardingRef.current) {
                  setWatchTime((prev) => prev + 1);
                  previousTimeRef.current = currentTime;
                  lastCheckTimeRef.current = Date.now();
                }
              }
            } catch (e) {
              console.warn("Error getting current time:", e);
            }
          }
        }, 1000);
        intervalRef.current = newIntervalId;
      }

      if (event.data === 2 || event.data === 0) {
        setIsPaused(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (fastForwardCheckIntervalRef.current) {
          clearInterval(fastForwardCheckIntervalRef.current);
          fastForwardCheckIntervalRef.current = null;
        }
      }
    },
    [handleFastForwardDetection]
  );

  useEffect(() => {
    (window as any)[`seekVideo_${lesson.id}`] = (timeSeconds: number) => {
      if (playerRef.current && playerRef.current.seekTo) {
        try {
          playerRef.current.seekTo(timeSeconds, true);
        } catch (e) {
          console.warn("Error seeking video:", e);
        }
      } else {
        setTimeout(() => {
          if (playerRef.current && playerRef.current.seekTo) {
            try {
              playerRef.current.seekTo(timeSeconds, true);
            } catch (e) {
              console.warn("Error seeking video (retry):", e);
            }
          }
        }, 500);
      }
    };

    (window as any)[`getCurrentTime_${lesson.id}`] = (): number => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          return Math.floor(currentTime || 0);
        } catch (e) {
          console.warn("Error getting current time:", e);
          return 0;
        }
      }
      return 0;
    };

    (window as any)[`pauseVideo_${lesson.id}`] = () => {
      if (playerRef.current && playerRef.current.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
        } catch (e) {
          console.warn("Error pausing video:", e);
        }
      }
    };

    return () => {
      if ((window as any)[`seekVideo_${lesson.id}`]) {
        delete (window as any)[`seekVideo_${lesson.id}`];
      }
      if ((window as any)[`getCurrentTime_${lesson.id}`]) {
        delete (window as any)[`getCurrentTime_${lesson.id}`];
      }
      if ((window as any)[`pauseVideo_${lesson.id}`]) {
        delete (window as any)[`pauseVideo_${lesson.id}`];
      }
    };
  }, [lesson.id, isReady]);

  useEffect(() => {
    setVideoLoaded(false);
    setIsReady(false);
    setWatchTime(0);
    setIsPaused(false);
    setIsFastForwarding(false);
    previousTimeRef.current = 0;
    lastCheckTimeRef.current = Date.now();
    isFastForwardingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (fastForwardCheckIntervalRef.current) {
      clearInterval(fastForwardCheckIntervalRef.current);
      fastForwardCheckIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [lesson.id]);

  useEffect(() => {
    if (!videoLoaded && !isCompleted) {
      const timeout = setTimeout(() => setVideoLoaded(true), 3000);
      return () => clearTimeout(timeout);
    }
  }, [videoLoaded, isCompleted]);

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + 0.5);
      });
    } catch (e) {
      console.log("🔇 Không phát được âm thanh:", e);
    }
  };

  const handleQuizComplete = async (_score: number, _total: number) => {
    if (quizSubmitting.current) return;
    quizSubmitting.current = true; setQuizSaveError("");
    if (!quizAttemptKey.current) quizAttemptKey.current = safeUUID();
    try {
      const answers = quizzes.map(quiz => ({ question_id: quiz.id, option_id: quiz.options[selectedAnswers[quiz.id]]?.id || "" }));
      if (answers.some(answer => !answer.option_id)) throw new Error("Hãy trả lời đầy đủ câu hỏi trước khi nộp bài.");
      const verified = await submitQuizAttempt(lesson.id, answers, quizAttemptKey.current);
      setQuizScore(verified.correct); setShowResults(true);
      if (verified.score_percent >= 70 && !isCompleted) { playSuccessSound(); triggerCelebration(3, 2); onMarkCompleted?.(lesson.id); }
    } catch { setQuizSaveError("Chưa lưu được bài làm. Hãy nộp lại; tiến độ chưa được xác nhận hoàn thành."); }
    finally { quizSubmitting.current = false; }
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (quizSubmitting.current) return;
    quizAttemptKey.current = "";
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
    setAnsweredQuestions((prev) => new Set([...prev, questionId]));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex === quizzes.length - 1) {
      let correct = 0;
      quizzes.forEach((quiz) => {
        const selectedAnswer = selectedAnswers[quiz.id];
        if (selectedAnswer !== undefined) {
          const selectedOption = quiz.options[selectedAnswer];
          if (selectedOption && selectedOption.is_correct) {
            correct++;
          }
        }
      });
      void handleQuizComplete(correct, quizzes.length);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((p) => p - 1);
  };

  const resetQuiz = () => {
    quizAttemptKey.current = ""; setQuizSaveError("");
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

  const handleVideoMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsHoveringVideo(true);
  };

  const handleVideoMouseLeave = () => {
    const t = setTimeout(() => setIsHoveringVideo(false), 500);
    setHoverTimeout(t);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  if (!lesson.file_id) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-background border-b border-border text-muted-foreground font-medium">
        Không có video để phát...
      </div>
    );
  }

  return (
    <div className="bg-surface overflow-hidden relative">
      <div className="relative bg-background">
        <div
          onMouseEnter={handleVideoMouseEnter}
          onMouseLeave={handleVideoMouseLeave}
        >
          <YouTubePlayer
            lesson={lesson}
            onPlayerReady={handlePlayerReady}
            onPlayerStateChange={handlePlayerStateChange}
            onVideoLoaded={handleVideoLoaded}
          />
        </div>

        <VideoOverlays
          hasQuizzes={hasQuizzes}
          isCompleted={isCompleted}
          isHoveringVideo={isHoveringVideo}
          isPaused={isPaused}
          watchTime={watchTime}
          duration={duration}
          isFastForwarding={isFastForwarding}
          quizzesCount={quizzes.length}
          onOpenQuiz={() => setShowQuiz(true)}
          onVideoMouseEnter={handleVideoMouseEnter}
          onVideoMouseLeave={handleVideoMouseLeave}
        />
      </div>

      {quizSaveError && <p role="alert" className="m-3 rounded-xl border border-warning-border bg-warning-bg p-3 text-sm text-warning-foreground">{quizSaveError}</p>}
      {showQuiz && hasQuizzes && (
        <QuizModal
          lessonTitle={lesson.title}
          quizzes={quizzes}
          isCompleted={isCompleted}
          showResults={showResults}
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
