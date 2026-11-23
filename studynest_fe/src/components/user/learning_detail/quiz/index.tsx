"use client";

import { safeUUID } from "@/lib/utils/uuid";
import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { QuizQuestion } from "@/types/user/learning";
import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "pulsoicon-react";
import InfoPanel from "./info-panel";
import QuestionDisplay from "./question-display";
import QuizNavigation from "./quiz-navigation";
import QuizResults from "./quiz-results";
import { submitQuizAttempt, type VerifiedQuizAttempt } from "./submit-attempt";
import { useLearningAgent, useAgentSnapshot } from "../agent/agent-context";

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
  const [infoTab, setInfoTab] = useState<"info" | "qa">("info");
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

    if (scorePercentage >= 80) {
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

  if (quizQuestions.length === 0) {
    return (
      <div className="w-full h-full bg-surface border border-border rounded-2xl shadow-xs p-8 text-center flex items-center justify-center">
        <div className="text-muted-foreground">
          <p>Không có câu hỏi nào trong bài học này</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-background to-primary-pastel/30">
      <div className="flex min-h-full min-w-0 flex-col gap-4 p-3 sm:p-6">
        {attemptError && <p role="alert" className="rounded-xl border border-warning-border bg-warning-bg p-3 text-sm text-warning-foreground">{attemptError}</p>}
        {submitting && <p role="status" className="text-sm text-primary">Đang lưu và kiểm tra bài làm…</p>}
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Cột trái: Thông tin bài học */}
          <div data-learning-info className="flex min-h-[220px] min-w-0 flex-col lg:min-h-0">
            <InfoPanel
              lesson={lesson}
              infoTab={infoTab}
              setInfoTab={setInfoTab}
              quizQuestionsCount={quizQuestions.length}
              selectedAnswersCount={Object.keys(selectedAnswers).length}
              correctCount={correctCount}
              lessonAuthorId={lessonAuthorId}
            />
          </div>

          {/* Cột phải: Quiz Questions */}
          <div data-learning-quiz-questions className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6 lg:min-h-0 lg:p-8">
            {showResults ? (
              <QuizResults
                scorePercentage={scorePercentage}
                correctCount={correctCount}
                totalQuestions={quizQuestions.length}
                answeredCount={answeredCount}
                allQuestionsAnswered={allQuestionsAnswered}
                onRetry={handleRetryQuiz}
                onComplete={handleComplete}
              />
            ) : (
              <>
                {/* Quiz Header */}
                <div className="mb-6 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-foreground">
                      Luyện tập
                    </h2>
                    <span className="text-sm text-primary bg-primary-pastel/60 px-3 py-1 rounded-full border border-primary-light/50 font-medium">
                      Câu {currentQuestionIndex + 1}/{quizQuestions.length}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ((currentQuestionIndex + 1) / quizQuestions.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Đã trả lời đúng: {correctCount}/{quizQuestions.length}
                  </div>
                </div>

                {/* Question Display */}
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

                {/* Navigation */}
                <QuizNavigation
                  isFirstQuestion={isFirstQuestion}
                  isLastQuestion={isLastQuestion}
                  isAnswered={isAnswered}
                  onPrev={handlePrevQuestion}
                  onNext={handleNextQuestion}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-[4.75rem] left-3 z-30 sm:left-6">
        <button
          type="button"
          onClick={() => setInfoTab("qa")}
          disabled={infoTab === "qa"}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 shadow-lg transition-colors ${
            infoTab === "qa"
              ? "cursor-default bg-border text-muted-foreground"
              : "bg-primary text-white hover:bg-primary-hover"
          }`}
        >
          <MessageSquareText className="w-5 h-5" />
          <span>Hỏi đáp</span>
        </button>
      </div>
    </div>
  );
}
