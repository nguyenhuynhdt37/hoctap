"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { QuizQuestion } from "@/types/user/learning";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  HelpCircle,
  Maximize2,
  MessageCircle,
  Minimize2,
} from "pulsoicon-react";
import { cn } from "@/lib/utils";
import QASection from "../qa";
import InfoPanel from "./info-panel";
import QuestionDisplay from "./question-display";
import QuizNavigation from "./quiz-navigation";
import QuizResults from "./quiz-results";
import { submitQuizAttempt, type VerifiedQuizAttempt } from "./submit-attempt";
import { useLearningAgent, useAgentAction, useAgentSnapshot } from "../agent/agent-context";
import { numberArg } from "../agent/action-registry";

interface QuizLessonProps {
  lesson: ActiveLessonResponse;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onMarkCompleted?: (lessonId: string) => void;
  completedLessons?: Set<string>;
  quizzes?: QuizQuestion[];
  accessToken?: string;
  lessonAuthorId?: string | null;
}

export default function QuizLesson({
  lesson,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onMarkCompleted,
  completedLessons,
  quizzes = [],
  lessonAuthorId,
}: QuizLessonProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: number;
  }>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [qaOpen, setQaOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);

  const [verifiedAttempt, setVerifiedAttempt] = useState<VerifiedQuizAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attemptError, setAttemptError] = useState("");
  const attemptKey = useRef("");
  const [stableLessonQuizzes, setStableLessonQuizzes] = useState(lesson.quizzes);
  useEffect(() => {
    setStableLessonQuizzes(lesson.quizzes);
  }, [lesson.id]);
  const agent = useLearningAgent();
  // Process quiz questions
  const quizQuestions =
    quizzes.length > 0
      ? quizzes.map((q) => {
          return {
            id: q.id,
            question: q.question,
            options: q.options.map((opt: any) =>
              typeof opt === "string" ? opt : opt.text
            ),
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
          };
        })
      : (stableLessonQuizzes || lesson.quizzes)?.map((q) => {
          const correctIndex = q.options.findIndex((opt) => opt.is_correct);

          if (correctIndex === -1) {
            console.warn(`Quiz ${q.id} không có đáp án đúng!`);
          }

          return {
            id: q.id,
            question: q.question,
            options: q.options.map((opt) => opt.text),
            correct_answer: correctIndex >= 0 ? correctIndex : 0,
            explanation: q.explanation || "",
          };
        }) || [];

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const currentAnswer = selectedAnswers[currentQuestion?.id || ""];
  const isAnswered = currentAnswer !== undefined;

  const answeredCount = Object.keys(selectedAnswers).length;
  const allQuestionsAnswered = answeredCount === quizQuestions.length;

  const rawCorrectCount = quizQuestions.filter((q) => {
    const answer = selectedAnswers[q.id];
    if (answer === undefined) {
      return false;
    }
    if (answer < 0 || answer >= q.options.length) {
      console.warn(
        `Invalid answer index ${answer} for question ${q.id}, options length: ${q.options.length}`
      );
      return false;
    }
    const isCorrect = Number(answer) === Number(q.correct_answer);
    return isCorrect;
  }).length;
  const correctCount = verifiedAttempt?.correct ?? rawCorrectCount;

  const scorePercentage = verifiedAttempt?.score_percent ?? (
    quizQuestions.length > 0
      ? Math.round((correctCount / quizQuestions.length) * 100)
      : 0);
  useAgentSnapshot("quiz", () => ({ quiz: { quiz_id: lesson.id, question_id: currentQuestion?.id, state: showResults ? "results" : submitting ? "submitting" : isAnswered ? "answered" : "answering" } }));
  useEffect(() => { agent?.changed(); }, [currentQuestion?.id, showResults, agent?.changed]);
  useAgentAction("quiz.get_state", {
    execute: async () => ({
      quiz_id: lesson.id,
      question_index: currentQuestionIndex,
      total_questions: quizQuestions.length,
      question_id: currentQuestion?.id,
      question: currentQuestion?.question || "",
      options: (currentQuestion?.options || []).map((text, index) => ({
        index,
        label: String.fromCharCode(65 + index),
        text,
      })),
      selected_index: currentAnswer !== undefined ? currentAnswer : null,
      state: showResults ? "results" : submitting ? "submitting" : isAnswered ? "answered" : "answering",
      verified: true,
    }),
    verify: (result) => Boolean((result as { verified?: boolean })?.verified),
  });
  useAgentAction("quiz.select_option", {
    execute: async (args) => {
      if (showResults || submitting || !currentQuestion) {
        throw new Error("Câu hỏi hiện không ở trạng thái chọn đáp án.");
      }
      const optionIndex = numberArg(
        { option_index: args.option_index ?? args.index },
        "option_index",
        0,
        Math.max(0, currentQuestion.options.length - 1),
      );
      handleAnswerSelect(currentQuestion.id, optionIndex);
      return {
        question_id: currentQuestion.id,
        selected_index: optionIndex,
        selected_label: String.fromCharCode(65 + optionIndex),
        selected_text: currentQuestion.options[optionIndex],
        submitted: false,
        verified: true,
      };
    },
    verify: (result) => Boolean((result as { verified?: boolean })?.verified),
  });

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

  useEffect(() => {
    if (
      !verifiedAttempt ||
      !showResults ||
      hasCompletedQuiz ||
      quizQuestions.length === 0 ||
      !lesson?.id
    )
      return;

    const isCompletedFromAPI = lesson.is_completed || false;
    const isCompletedFromSet = completedLessons?.has(lesson.id) || false;
    const isCompleted = isCompletedFromAPI || isCompletedFromSet;

    if (scorePercentage >= 60) {
      setHasCompletedQuiz(true);
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

      if (!isCompleted && onMarkCompleted) {
        onMarkCompleted(lesson.id);
      }
    }
  }, [
    showResults,
    verifiedAttempt,
    scorePercentage,
    hasCompletedQuiz,
    quizQuestions.length,
    onMarkCompleted,
    lesson?.id,
    lesson?.is_completed,
    completedLessons,
  ]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (submitting) return;
    attemptKey.current = "";
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
    setAnsweredQuestions((prev) => new Set([...prev, questionId]));
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      if (submitting) return;
      setSubmitting(true); setAttemptError("");
      if (!attemptKey.current) attemptKey.current = safeUUID();
      const sourceQuizzes = stableLessonQuizzes || lesson.quizzes;
      const answers = quizQuestions.map(question => {
        const original = sourceQuizzes?.find(item => item.id === question.id);
        const options = quizzes.length > 0 ? [...(original?.options || [])].sort((a, b) => a.position - b.position) : original?.options || [];
        return { question_id: question.id, option_id: options[selectedAnswers[question.id]]?.id || "" };
      });
      if (answers.some(answer => !answer.option_id)) { setAttemptError("Hãy trả lời đầy đủ câu hỏi trước khi nộp bài."); setSubmitting(false); return; }
      void submitQuizAttempt(lesson.id, answers, attemptKey.current).then(result => {
        setVerifiedAttempt(result); setShowResults(true);
      }).catch(() => setAttemptError("Chưa lưu được kết quả kiểm tra. Hãy thử nộp lại; tiến độ chưa được đánh dấu hoàn thành.")).finally(() => setSubmitting(false));
    } else if (!isLastQuestion && isAnswered) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleRetryQuiz = () => {
    setStableLessonQuizzes(lesson.quizzes);
    setShowResults(false); setVerifiedAttempt(null); setAttemptError(""); attemptKey.current = "";
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setHasCompletedQuiz(false);
  };

  const handlePrevQuestion = () => {
    if (submitting) return;
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setShowResults(false);
  };

  // Phím tắt 1-4 chọn đáp án và Enter chuyển câu kế tiếp
  useEffect(() => {
    if (qaOpen || showResults || submitting || !currentQuestion) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!isAnswered && ["1", "2", "3", "4"].includes(event.key)) {
        const idx = Number(event.key) - 1;
        if (idx >= 0 && idx < currentQuestion.options.length) {
          event.preventDefault();
          handleAnswerSelect(currentQuestion.id, idx);
        }
      } else if (isAnswered && event.key === "Enter") {
        event.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (quizQuestions.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center shadow-xs">
        <p className="text-sm text-muted-foreground">
          Không có câu hỏi nào trong bài học này
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto bg-background lg:overflow-hidden">
      <div className="flex min-h-full min-w-0 flex-col gap-3 p-3 pb-20 sm:p-4 sm:pb-20 lg:h-full lg:min-h-0 lg:pb-[4.75rem]">
        {attemptError && (
          <p
            role="alert"
            className="shrink-0 rounded-2xl border border-warning-border bg-warning-bg px-4 py-2.5 text-xs font-semibold text-warning-foreground"
          >
            {attemptError}
          </p>
        )}

        {/* Thanh Quiz Cockpit Bar đồng bộ với Cloud Code Atelier */}
        <div className="shrink-0 rounded-[22px] border border-primary-pastel/75 bg-gradient-to-r from-surface via-surface to-primary-light/45 p-2.5 shadow-xs sm:px-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Dải chọn nhanh câu hỏi 1..N */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-2.5 py-1 text-[11px] font-bold text-primary md:inline-flex">
                <HelpCircle aria-hidden="true" animated={false} className="size-3.5" />
                <span>Luyện tập</span>
              </span>

              {quizQuestions.map((q, idx) => {
                const ans = selectedAnswers[q.id];
                const answered = ans !== undefined;
                const correct = answered && Number(ans) === Number(q.correct_answer);
                const active = !showResults && idx === currentQuestionIndex;
                const canJump =
                  answered || idx <= currentQuestionIndex || answeredQuestions.has(q.id);

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={!canJump && !showResults}
                    onClick={() => {
                      if (showResults) setShowResults(false);
                      if (canJump || showResults) setCurrentQuestionIndex(idx);
                    }}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : answered
                          ? correct
                            ? "border-success-border bg-success-bg/85 text-success-foreground hover:bg-success-bg cursor-pointer"
                            : "border-destructive-border bg-destructive-bg/85 text-destructive-foreground hover:bg-destructive-bg cursor-pointer"
                          : canJump
                            ? "border-border bg-background text-foreground hover:border-primary-pastel hover:bg-primary-light cursor-pointer"
                            : "cursor-not-allowed border-border/60 bg-background/60 text-muted-foreground/50",
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Chỉ số đúng/sai + Hỏi đáp toàn màn hình + Tập trung */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-[11px] font-bold sm:flex">
                <span className="inline-flex items-center gap-1 text-success-foreground tabular-nums">
                  <CheckCircle2 aria-hidden="true" animated={false} className="size-3.5" />
                  {correctCount}
                </span>
                <span className="text-border">|</span>
                <span className="inline-flex items-center gap-1 text-destructive-foreground tabular-nums">
                  <CircleX aria-hidden="true" animated={false} className="size-3.5" />
                  {Math.max(0, answeredCount - correctCount)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQaOpen(true)}
                title="Mở phòng Hỏi đáp toàn màn hình"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/80 px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-light cursor-pointer"
              >
                <MessageCircle aria-hidden="true" animated={false} className="size-3.5" />
                <span>Hỏi đáp</span>
              </button>

              <button
                type="button"
                onClick={() => setFocusMode((prev) => !prev)}
                aria-pressed={focusMode}
                title={focusMode ? "Hiện lại tài liệu ôn tập" : "Tập trung làm bài"}
                className={cn(
                  "hidden min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors cursor-pointer lg:inline-flex",
                  focusMode
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:bg-primary-light/60 hover:text-primary",
                )}
              >
                {focusMode ? (
                  <>
                    <Minimize2 aria-hidden="true" animated={false} className="size-3.5" />
                    <span>Hiện lý thuyết</span>
                  </>
                ) : (
                  <>
                    <Maximize2 aria-hidden="true" animated={false} className="size-3.5" />
                    <span>Tập trung</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lưới 2 cột Fit 100% chiều cao */}
        <div
          className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 ${
            focusMode ? "lg:grid-cols-1" : "lg:grid-cols-12"
          }`}
        >
          {/* Cột trái: Tài liệu ôn tập (giữ nguyên data-learning-info) */}
          <div
            data-learning-info
            className={`min-h-[280px] min-w-0 flex-col lg:h-full lg:min-h-0 ${
              focusMode ? "hidden" : "flex lg:col-span-5"
            }`}
          >
            <InfoPanel
              lesson={lesson}
              quizQuestionsCount={quizQuestions.length}
              selectedAnswersCount={answeredCount}
              correctCount={correctCount}
              onOpenQa={() => setQaOpen(true)}
            />
          </div>

          {/* Cột phải: Khung câu hỏi trắc nghiệm (giữ nguyên data-learning-quiz-questions) */}
          <div
            data-learning-quiz-questions
            className={`flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs lg:h-full lg:min-h-0 ${
              focusMode ? "mx-auto w-full max-w-4xl lg:col-span-1" : "lg:col-span-7"
            }`}
          >
            {showResults ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <QuizResults
                  scorePercentage={scorePercentage}
                  correctCount={correctCount}
                  totalQuestions={quizQuestions.length}
                  answeredCount={answeredCount}
                  allQuestionsAnswered={allQuestionsAnswered}
                  onRetry={handleRetryQuiz}
                  onComplete={handleComplete}
                />
              </div>
            ) : (
              <>
                {/* Header Câu hỏi cố định */}
                <div className="shrink-0 border-b border-border bg-gradient-to-r from-primary-light/60 via-surface to-accent-vanilla/35 px-4 py-3 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground tabular-nums">
                        Câu {currentQuestionIndex + 1} / {quizQuestions.length}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        Đã đúng {correctCount}/{quizQuestions.length}
                      </span>
                    </div>
                    {submitting && (
                      <span role="status" className="text-xs font-bold text-primary">
                        Đang lưu kết quả…
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Vùng câu hỏi cuộn độc lập */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  {currentQuestion && (
                    <QuestionDisplay
                      question={currentQuestion}
                      selectedAnswer={currentAnswer}
                      isAnswered={isAnswered}
                      onSelectAnswer={(index) =>
                        handleAnswerSelect(currentQuestion.id, index)
                      }
                    />
                  )}
                </div>

                {/* Thanh điều hướng ghim sát đáy */}
                <QuizNavigation
                  isFirstQuestion={isFirstQuestion}
                  isLastQuestion={isLastQuestion}
                  isAnswered={isAnswered}
                  submitting={submitting}
                  onPrev={handlePrevQuestion}
                  onNext={handleNextQuestion}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Phòng Hỏi đáp Full màn hình 100vw × 100dvh */}
      {qaOpen && (
        <QASection
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          lessonAuthorId={lessonAuthorId}
          isModal
          fullScreen
          onClose={() => setQaOpen(false)}
        />
      )}
    </div>
  );
}
