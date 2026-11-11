"use client";

import { ActiveLessonQuiz } from "@/types/user/activeLesson";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";

interface QuizModalProps {
  lessonTitle: string;
  quizzes: ActiveLessonQuiz[];
  isCompleted: boolean;
  showResults: boolean;
  currentQuestionIndex: number;
  selectedAnswers: { [key: string]: number };
  answeredQuestions: Set<string>;
  quizScore: number;
  onAnswerSelect: (questionId: string, answerIndex: number) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onResetQuiz: () => void;
  onCloseQuiz: () => void;
}

export default function QuizModal({
  lessonTitle,
  quizzes,
  isCompleted,
  showResults,
  currentQuestionIndex,
  selectedAnswers,
  answeredQuestions,
  quizScore,
  onAnswerSelect,
  onNextQuestion,
  onPrevQuestion,
  onResetQuiz,
  onCloseQuiz,
}: QuizModalProps) {
  const currentQuiz = quizzes[currentQuestionIndex];
  const isAnswered = answeredQuestions.has(currentQuiz.id);
  const selectedAnswer = selectedAnswers[currentQuiz.id];

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="bg-primary px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Quiz: {lessonTitle}</h3>
            {!isCompleted && (
              <p className="text-sm text-primary-pastel mt-1 flex items-center">
                <span className="mr-2">🎯</span>
                Cần đạt 85% để hoàn thành bài học
              </p>
            )}
          </div>
          <button
            onClick={onCloseQuiz}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung quiz */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          {showResults ? (
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-3">
                {quizScore}/{quizzes.length}
              </div>
              <p className="text-muted-foreground mb-4">
                {Math.round((quizScore / quizzes.length) * 100)}%
              </p>

              {!isCompleted &&
                Math.round((quizScore / quizzes.length) * 100) < 85 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-center text-orange-700 mb-2">
                      <span className="mr-2">⚠️</span>
                      <span className="font-semibold">Chưa đạt yêu cầu!</span>
                    </div>
                    <p className="text-sm text-orange-600">
                      Bạn cần đạt ít nhất 85% để hoàn thành bài học này.
                    </p>
                  </div>
                )}

              {!isCompleted &&
                Math.round((quizScore / quizzes.length) * 100) >= 85 && (
                  <div className="bg-primary-pastel/70 border border-primary-light rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-center text-primary mb-2">
                      <span className="mr-2">🎉</span>
                      <span className="font-semibold">Chúc mừng!</span>
                    </div>
                    <p className="text-sm text-foreground">
                      Bạn đã hoàn thành bài học thành công!
                    </p>
                  </div>
                )}

              <button
                onClick={onResetQuiz}
                className="px-6 py-2 bg-background hover:bg-border border border-border rounded-xl mr-2 cursor-pointer text-foreground font-medium"
              >
                Làm lại
              </button>
              <button
                onClick={onCloseQuiz}
                className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover cursor-pointer font-medium"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Câu {currentQuestionIndex + 1}/{quizzes.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(
                    ((currentQuestionIndex + 1) / quizzes.length) * 100
                  )}
                  % hoàn thành
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((currentQuestionIndex + 1) / quizzes.length) * 100
                    }%`,
                  }}
                />
              </div>

              <div className="bg-background p-4 rounded-xl border border-border">
                <h4 className="text-lg font-medium text-foreground">
                  {currentQuiz.question}
                </h4>
              </div>

              <div className="space-y-3">
                {currentQuiz.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = option.is_correct;
                  const isWrong = isSelected && !isCorrect;

                  return (
                    <div key={option.id}>
                      <button
                        onClick={() =>
                          !isAnswered && onAnswerSelect(currentQuiz.id, index)
                        }
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isAnswered
                            ? isCorrect
                              ? "border-primary bg-primary-pastel/60"
                              : isWrong
                              ? "border-red-500 bg-red-50"
                              : "border-border bg-background"
                            : isSelected
                            ? "border-primary bg-primary-pastel/60 shadow-xs"
                            : "border-border hover:border-primary-light hover:bg-primary-pastel/30"
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-3 text-xs font-bold ${
                              isAnswered
                                ? isCorrect
                                  ? "border-primary bg-primary text-white"
                                  : isWrong
                                  ? "border-red-500 bg-red-500 text-white"
                                  : "border-border bg-border text-muted-foreground"
                                : isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {option.text}
                          </span>
                        </div>
                      </button>

                      {isAnswered && (isSelected || isCorrect) && (
                        <div
                          className={`ml-8 mt-2 p-3 rounded-xl text-sm ${
                            isCorrect
                              ? "bg-primary-pastel/60 border border-primary-light text-primary"
                              : isWrong
                              ? "bg-red-50 border border-red-200 text-red-800"
                              : "bg-background border border-border text-foreground"
                          }`}
                        >
                          {isCorrect
                            ? "✓ Đáp án đúng"
                            : isWrong
                            ? "✗ Đáp án sai"
                            : ""}
                          <div className="mt-1">{option.feedback}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={onPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    currentQuestionIndex === 0
                      ? "bg-background text-muted-foreground/50 cursor-not-allowed"
                      : "bg-background hover:bg-border text-foreground cursor-pointer"
                  }`}
                >
                  <HiArrowLeft className="w-4 h-4 inline mr-1" />
                  Trước
                </button>
                <button
                  onClick={onNextQuestion}
                  disabled={selectedAnswer === undefined}
                  className={`px-6 py-2 rounded-xl font-medium ${
                    selectedAnswer !== undefined
                      ? "bg-primary text-white hover:bg-primary-hover cursor-pointer"
                      : "bg-background text-muted-foreground/50 cursor-not-allowed"
                  }`}
                >
                  {currentQuestionIndex === quizzes.length - 1
                    ? "Hoàn thành"
                    : "Tiếp theo"}
                  <HiArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
