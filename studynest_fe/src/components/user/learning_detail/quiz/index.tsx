"use client";

import { triggerCelebration } from "@/lib/utils/helpers/effects";
import { ActiveLessonResponse } from "@/types/user/activeLesson";
import { QuizQuestion } from "@/types/user/learning";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { HiChatAlt2 } from "react-icons/hi";
import InfoPanel from "./info-panel";
import QuestionDisplay from "./question-display";
import QuizNavigation from "./quiz-navigation";
import QuizResults from "./quiz-results";

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
  accessToken,
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
      : lesson.quizzes?.map((q) => {
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

  const correctCount = quizQuestions.filter((q) => {
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

  const scorePercentage =
    quizQuestions.length > 0
      ? Math.round((correctCount / quizQuestions.length) * 100)
      : 0;

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
          "#ff6b6b",
          "#4ecdc4",
          "#45b7d1",
          "#96ceb4",
          "#feca57",
          "#ff9ff3",
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
    scorePercentage,
    hasCompletedQuiz,
    quizQuestions.length,
    onMarkCompleted,
    lesson?.id,
    lesson?.is_completed,
    completedLessons,
  ]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
    setAnsweredQuestions((prev) => new Set([...prev, questionId]));
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      setShowResults(true);
    } else if (!isLastQuestion && isAnswered) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleRetryQuiz = () => {
    setShowResults(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setHasCompletedQuiz(false);
  };

  const handlePrevQuestion = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    setShowResults(false);
  };

  if (quizQuestions.length === 0) {
    return (
      <div className="w-full h-full bg-white rounded-xl shadow-lg p-8 text-center flex items-center justify-center">
        <div className="text-gray-500">
          <p>Không có câu hỏi nào trong bài học này</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-green-50 overflow-y-auto">
      <div className="w-full h-full p-6 flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Cột trái: Thông tin bài học */}
          <div className="flex flex-col min-h-0">
            <InfoPanel
              lesson={lesson}
              infoTab={infoTab}
              setInfoTab={setInfoTab}
              quizQuestionsCount={quizQuestions.length}
              selectedAnswersCount={Object.keys(selectedAnswers).length}
              correctCount={correctCount}
              accessToken={accessToken}
            />
          </div>

          {/* Cột phải: Quiz Questions */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 flex flex-col flex-1 min-h-0 overflow-y-auto">
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
                    <h2 className="text-2xl font-black text-gray-900">
                      Luyện tập
                    </h2>
                    <span className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                      Câu {currentQuestionIndex + 1}/{quizQuestions.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ((currentQuestionIndex + 1) / quizQuestions.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
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

      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setInfoTab("qa")}
          disabled={infoTab === "qa"}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-colors ${
            infoTab === "qa"
              ? "bg-gray-200 text-gray-500 cursor-default"
              : "bg-[#00bba7] text-white hover:bg-[#009b8a]"
          }`}
        >
          <HiChatAlt2 className="w-5 h-5" />
          <span>Hỏi đáp</span>
        </button>
      </div>
    </div>
  );
}
