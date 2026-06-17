"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LessonOption,
  QuizFormOption,
  QuizForm as QuizFormType,
} from "@/types/lecturer/lesson";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiLightningBolt,
  HiPlus,
  HiQuestionMarkCircle,
  HiX,
} from "react-icons/hi";

const QUIZ_COOLDOWN_TIME = 180;

// Validation function
export const validateQuiz = (
  quizzes: QuizFormType[]
): { lesson_type?: string } => {
  if (!quizzes || quizzes.length === 0) {
    return { lesson_type: "Vui lòng tạo ít nhất một câu hỏi quiz" };
  }
  return {};
};

// Error message extractor
export const extractErrorMessage = (
  error: any,
  defaultMessage: string
): string => {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      return detail
        .map((err: any) => {
          const loc = err.loc ? err.loc.join(".") : "";
          return loc ? `${loc}: ${err.msg}` : err.msg;
        })
        .join("\n");
    }
    if (typeof detail === "string") return detail;
    if (typeof detail === "object") return JSON.stringify(detail);
  }
  if (error?.response?.data?.message) {
    const message = error.response.data.message;
    if (typeof message === "string") return message;
    if (typeof message === "object") return JSON.stringify(message);
  }
  if (error?.message && typeof error.message === "string") {
    return error.message;
  }
  return defaultMessage;
};

interface QuizFormProps {
  sectionId: string;
  onQuizzesChange: (quizzes: QuizFormType[]) => void;
  errors: {
    description?: string;
    lesson_type?: string;
  };
}

const QuizForm = memo(
  ({ sectionId, onQuizzesChange, errors }: QuizFormProps) => {
    const [quizzes, setQuizzes] = useState<QuizFormType[]>([]);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizCooldownSeconds, setQuizCooldownSeconds] = useState(0);
    const quizCooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [availableLessons, setAvailableLessons] = useState<LessonOption[]>(
      []
    );
    const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync quizzes với parent - memoized callback
    const handleQuizzesChange = useCallback(
      (newQuizzes: QuizFormType[]) => {
        onQuizzesChange(newQuizzes);
      },
      [onQuizzesChange]
    );

    useEffect(() => {
      handleQuizzesChange(quizzes);
    }, [quizzes, handleQuizzesChange]);

    // Fetch available lessons
    useEffect(() => {
      if (!sectionId) {
        setAvailableLessons([]);
        return;
      }

      setIsLoadingLessons(true);
      api
        .get<LessonOption[]>(`/lecturer/lessons/${sectionId}`)
        .then((response) => {
          setAvailableLessons(response.data || []);
        })
        .catch((error: any) => {
          console.error("Error fetching lessons:", error);
          setAvailableLessons([]);
        })
        .finally(() => {
          setIsLoadingLessons(false);
        });
    }, [sectionId]);

    // Quiz handlers - memoized
    const addQuiz = useCallback(() => {
      setQuizzes((prev) => [
        ...prev,
        {
          question: "",
          explanation: "",
          difficulty_level: 1,
          options: [
            { text: "", is_correct: false, feedback: "", position: 0 },
            { text: "", is_correct: false, feedback: "", position: 1 },
          ],
        },
      ]);
    }, []);

    const removeQuiz = useCallback((index: number) => {
      setQuizzes((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateQuiz = useCallback(
      (index: number, field: keyof QuizFormType, value: any) => {
        setQuizzes((prev) =>
          prev.map((quiz, i) =>
            i === index ? { ...quiz, [field]: value } : quiz
          )
        );
      },
      []
    );

    const addQuizOption = useCallback((quizIndex: number) => {
      setQuizzes((prev) =>
        prev.map((quiz, i) =>
          i === quizIndex
            ? {
                ...quiz,
                options: [
                  ...quiz.options,
                  {
                    text: "",
                    is_correct: false,
                    feedback: "",
                    position: quiz.options.length,
                  },
                ],
              }
            : quiz
        )
      );
    }, []);

    const removeQuizOption = useCallback(
      (quizIndex: number, optionIndex: number) => {
        setQuizzes((prev) =>
          prev.map((quiz, i) =>
            i === quizIndex
              ? {
                  ...quiz,
                  options: quiz.options.filter(
                    (_, optIdx) => optIdx !== optionIndex
                  ),
                }
              : quiz
          )
        );
      },
      []
    );

    const updateQuizOption = useCallback(
      (
        quizIndex: number,
        optionIndex: number,
        field: keyof QuizFormOption,
        value: any
      ) => {
        setQuizzes((prev) =>
          prev.map((quiz, i) =>
            i === quizIndex
              ? {
                  ...quiz,
                  options: quiz.options.map((opt, optIdx) =>
                    optIdx === optionIndex ? { ...opt, [field]: value } : opt
                  ),
                }
              : quiz
          )
        );
      },
      []
    );

    const setCorrectAnswer = useCallback(
      (quizIndex: number, optionIndex: number) => {
        setQuizzes((prev) =>
          prev.map((quiz, i) =>
            i === quizIndex
              ? {
                  ...quiz,
                  options: quiz.options.map((opt, optIdx) => ({
                    ...opt,
                    is_correct: optIdx === optionIndex,
                  })),
                }
              : quiz
          )
        );
      },
      []
    );

    // Generate quiz bằng AI
    const generateQuizzesWithAI = useCallback(
      async (mode: "new" | "append") => {
        if (selectedLessonIds.length === 0) {
          setError("Vui lòng chọn ít nhất một bài học để tạo quiz");
          return;
        }

        if (quizCooldownSeconds > 0) return;

        setIsGeneratingQuiz(true);
        setError(null);

        try {
          const response = await api.post<QuizFormType[]>(
            `/lecturers/chat/lesson/quizzes`,
            {
              lesson_ids: selectedLessonIds,
            }
          );

          const generatedQuizzes = response.data;

          if (!generatedQuizzes || generatedQuizzes.length === 0) {
            setError("AI không tạo được quiz nào. Vui lòng thử lại!");
            return;
          }

          if (mode === "new") {
            setQuizzes(generatedQuizzes);
          } else {
            setQuizzes((prev) => [...prev, ...generatedQuizzes]);
          }

          setQuizCooldownSeconds(QUIZ_COOLDOWN_TIME);
        } catch (error: any) {
          console.error("Error generating quizzes with AI:", error);
          const errorMessage = extractErrorMessage(
            error,
            "Đã xảy ra lỗi khi tạo quiz bằng AI"
          );
          setError(errorMessage);
        } finally {
          setIsGeneratingQuiz(false);
        }
      },
      [selectedLessonIds, quizCooldownSeconds]
    );

    // Countdown timer
    useEffect(() => {
      if (quizCooldownSeconds > 0) {
        quizCooldownIntervalRef.current = setInterval(() => {
          setQuizCooldownSeconds((prev) => {
            if (prev <= 1) {
              if (quizCooldownIntervalRef.current) {
                clearInterval(quizCooldownIntervalRef.current);
                quizCooldownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (quizCooldownIntervalRef.current) {
          clearInterval(quizCooldownIntervalRef.current);
          quizCooldownIntervalRef.current = null;
        }
      }

      return () => {
        if (quizCooldownIntervalRef.current) {
          clearInterval(quizCooldownIntervalRef.current);
          quizCooldownIntervalRef.current = null;
        }
      };
    }, [quizCooldownSeconds]);

    // Memoized computed values
    const hasSelectedLessons = useMemo(
      () => selectedLessonIds.length > 0,
      [selectedLessonIds.length]
    );

    const canGenerate = useMemo(
      () =>
        !isGeneratingQuiz && quizCooldownSeconds === 0 && hasSelectedLessons,
      [isGeneratingQuiz, quizCooldownSeconds, hasSelectedLessons]
    );

    const cooldownMinutes = useMemo(
      () => Math.floor(quizCooldownSeconds / 60),
      [quizCooldownSeconds]
    );

    const cooldownSeconds = useMemo(
      () => quizCooldownSeconds % 60,
      [quizCooldownSeconds]
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
            <HiQuestionMarkCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Tạo câu hỏi Quiz
            </h2>
            <p className="text-gray-600 mt-1">
              Sử dụng AI để tạo câu hỏi hoặc tạo thủ công
            </p>
          </div>
        </div>

        {/* AI Generate Quiz Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                <HiLightningBolt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  AI Tổng hợp câu hỏi
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Chọn các bài học để AI tự động tạo câu hỏi quiz
                </p>
              </div>
            </div>
          </div>

          {/* Lesson Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Chọn bài học để tạo quiz <span className="text-red-500">*</span>
            </label>

            {isLoadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Đang tải danh sách bài học...
                </span>
              </div>
            ) : availableLessons.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Không có bài học nào trong chương này. Vui lòng chọn chương
                  học khác hoặc tạo bài học trước.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                {availableLessons.map((lesson) => (
                  <label
                    key={lesson.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLessonIds.includes(lesson.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLessonIds((prev) => [...prev, lesson.id]);
                        } else {
                          setSelectedLessonIds((prev) =>
                            prev.filter((id) => id !== lesson.id)
                          );
                        }
                      }}
                      className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 rounded cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {lesson.lesson_type} • {lesson.chunk_count} chunk
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {hasSelectedLessons && (
              <p className="text-xs text-gray-600 mt-2">
                Đã chọn {selectedLessonIds.length} bài học
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-green-600">⏳</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Lưu ý về thời gian xử lý
                </p>
                <p className="text-xs text-green-700 mt-1">
                  AI sẽ mất từ 1-5 phút để tổng hợp câu hỏi từ các bài học đã
                  chọn. Vui lòng kiên nhẫn chờ đợi.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => generateQuizzesWithAI("new")}
              disabled={!canGenerate}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isGeneratingQuiz ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <HiLightningBolt className="h-5 w-5" />
                  <span>Tạo mới</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => generateQuizzesWithAI("append")}
              disabled={!canGenerate}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-green-500 hover:bg-green-50 text-green-600 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isGeneratingQuiz ? (
                <>
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <HiLightningBolt className="h-5 w-5" />
                  <span>Tạo tiếp</span>
                </>
              )}
            </button>
          </div>

          {/* Countdown Timer */}
          {quizCooldownSeconds > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <span>⏱️</span>
                <span className="text-sm font-medium">
                  Vui lòng chờ {cooldownMinutes} phút {cooldownSeconds} giây
                  trước khi tạo thêm quiz
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(errors.description || error) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                {errors.description || error}
              </p>
            </div>
          )}
        </div>

        {/* Quiz List */}
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <HiQuestionMarkCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Chưa có câu hỏi nào</p>
              <p className="text-sm text-gray-500 mt-1">
                Sử dụng AI để tạo câu hỏi hoặc thêm câu hỏi thủ công
              </p>
            </div>
          ) : (
            quizzes.map((quiz, quizIndex) => (
              <div
                key={quizIndex}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4"
              >
                {/* Quiz Header */}
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-bold text-gray-900">
                    Câu hỏi {quizIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeQuiz(quizIndex)}
                    className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                </div>

                {/* Question */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Câu hỏi <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-all">
                    <TiptapEditor
                      value={quiz.question}
                      onChange={(content) =>
                        updateQuiz(quizIndex, "question", content)
                      }
                      placeholder="Nhập câu hỏi..."
                      minHeight="350px"
                      maxHeight="350px"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Đáp án <span className="text-red-500">*</span>
                  </label>
                  {quiz.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <input
                        type="radio"
                        name={`quiz-${quizIndex}`}
                        checked={option.is_correct}
                        onChange={() =>
                          setCorrectAnswer(quizIndex, optionIndex)
                        }
                        className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                      />
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) =>
                            updateQuizOption(
                              quizIndex,
                              optionIndex,
                              "text",
                              e.target.value
                            )
                          }
                          placeholder={`Đáp án ${optionIndex + 1}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-900"
                        />
                        <input
                          type="text"
                          value={option.feedback}
                          onChange={(e) =>
                            updateQuizOption(
                              quizIndex,
                              optionIndex,
                              "feedback",
                              e.target.value
                            )
                          }
                          placeholder="Phản hồi (tùy chọn)..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-gray-500"
                        />
                      </div>
                      {quiz.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeQuizOption(quizIndex, optionIndex)
                          }
                          className="text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                        >
                          <HiX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addQuizOption(quizIndex)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <HiPlus className="h-4 w-4" />
                    Thêm đáp án
                  </button>
                </div>

                {/* Code Block (if exists) */}
                {quiz.code_block && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Code Block
                    </label>
                    <pre className="w-full px-4 py-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono border border-gray-700">
                      <code>{quiz.code_block}</code>
                    </pre>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giải thích (tùy chọn)
                  </label>
                  <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-all">
                    <TiptapEditor
                      value={quiz.explanation}
                      onChange={(content) =>
                        updateQuiz(quizIndex, "explanation", content)
                      }
                      placeholder="Nhập giải thích cho câu hỏi..."
                      minHeight="350px"
                      maxHeight="350px"
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add Quiz Button */}
          <button
            type="button"
            onClick={addQuiz}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 hover:border-green-500 text-gray-600 hover:text-green-600 font-medium rounded-lg transition-colors"
          >
            <HiPlus className="h-5 w-5" />
            Thêm câu hỏi thủ công
          </button>
        </div>

        {errors.lesson_type && (
          <p className="text-red-600 text-sm mt-2">{errors.lesson_type}</p>
        )}
      </div>
    );
  }
);

QuizForm.displayName = "QuizForm";

export default QuizForm;
