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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Quiz: {lessonTitle}</h3>
            {!isCompleted && (
              <p className="text-sm text-teal-100 mt-1 flex items-center">
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
              <div className="text-3xl font-bold text-teal-700 mb-3">
                {quizScore}/{quizzes.length}
              </div>
              <p className="text-gray-600 mb-4">
                {Math.round((quizScore / quizzes.length) * 100)}%
              </p>

              {!isCompleted &&
                Math.round((quizScore / quizzes.length) * 100) < 85 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center text-green-700 mb-2">
                      <span className="mr-2">🎉</span>
                      <span className="font-semibold">Chúc mừng!</span>
                    </div>
                    <p className="text-sm text-green-600">
                      Bạn đã hoàn thành bài học thành công!
                    </p>
                  </div>
                )}

              <button
                onClick={onResetQuiz}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg mr-2 cursor-pointer"
              >
                Làm lại
              </button>
              <button
                onClick={onCloseQuiz}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Câu {currentQuestionIndex + 1}/{quizzes.length}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round(
                    ((currentQuestionIndex + 1) / quizzes.length) * 100
                  )}
                  % hoàn thành
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      ((currentQuestionIndex + 1) / quizzes.length) * 100
                    }%`,
                  }}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">
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
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isAnswered
                            ? isCorrect
                              ? "border-green-500 bg-green-50"
                              : isWrong
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 bg-gray-50"
                            : isSelected
                            ? "border-teal-500 bg-teal-50 shadow-md"
                            : "border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-3 text-xs font-bold ${
                              isAnswered
                                ? isCorrect
                                  ? "border-green-500 bg-green-500 text-white"
                                  : isWrong
                                  ? "border-red-500 bg-red-500 text-white"
                                  : "border-gray-300 bg-gray-300 text-gray-600"
                                : isSelected
                                ? "border-teal-500 bg-teal-500 text-white"
                                : "border-gray-300 text-gray-600"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-sm font-medium">
                            {option.text}
                          </span>
                        </div>
                      </button>

                      {isAnswered && (isSelected || isCorrect) && (
                        <div
                          className={`ml-8 mt-2 p-3 rounded-lg text-sm ${
                            isCorrect
                              ? "bg-green-50 border border-green-200 text-green-800"
                              : isWrong
                              ? "bg-red-50 border border-red-200 text-red-800"
                              : "bg-gray-50 border border-gray-200 text-gray-700"
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
                  className={`px-4 py-2 rounded-lg font-medium ${
                    currentQuestionIndex === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <HiArrowLeft className="w-4 h-4 inline mr-1" />
                  Trước
                </button>
                <button
                  onClick={onNextQuestion}
                  disabled={selectedAnswer === undefined}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    selectedAnswer !== undefined
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
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
