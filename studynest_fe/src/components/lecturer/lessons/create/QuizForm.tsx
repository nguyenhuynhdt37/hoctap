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
  HelpCircle,
  Plus,
  Sparkles,
  Timer,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/states";

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
          <div className="w-12 h-12 bg-primary-light text-primary rounded-2xl flex items-center justify-center shadow-xs">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">
              Tạo câu hỏi Quiz
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Sử dụng AI để tạo câu hỏi hoặc tạo thủ công
            </p>
          </div>
        </div>

        {/* AI Generate Quiz Section */}
        <Card variant="pastel-blue" className="p-6 mb-6 border border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  AI Tổng hợp câu hỏi
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Chọn các bài học để AI tự động tạo câu hỏi quiz
                </p>
              </div>
            </div>
          </div>

          {/* Lesson Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Chọn bài học để tạo quiz <span className="text-destructive">*</span>
            </label>

            {isLoadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-muted-foreground">
                  Đang tải danh sách bài học...
                </span>
              </div>
            ) : availableLessons.length === 0 ? (
              <Alert variant="warning" title="Chưa có bài học">
                Không có bài học nào trong chương này. Vui lòng chọn chương
                học khác hoặc tạo bài học trước.
              </Alert>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-xl p-3 bg-surface">
                {availableLessons.map((lesson) => (
                  <label
                    key={lesson.id}
                    className="flex items-start gap-3 p-3 hover:bg-primary-light/40 rounded-lg cursor-pointer transition-colors"
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
                      className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded border-border cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lesson.lesson_type} • {lesson.chunk_count} chunk
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {hasSelectedLessons && (
              <p className="text-xs text-muted-foreground mt-2">
                Đã chọn {selectedLessonIds.length} bài học
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="mb-4">
            <Alert
              variant="info"
              icon={<Clock className="h-5 w-5" />}
              title="Lưu ý về thời gian xử lý"
            >
              AI sẽ mất từ 1-5 phút để tổng hợp câu hỏi từ các bài học đã chọn.
              Vui lòng kiên nhẫn chờ đợi.
            </Alert>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => generateQuizzesWithAI("new")}
              disabled={!canGenerate}
              isLoading={isGeneratingQuiz}
              loadingText="Đang tạo..."
              leftIcon={<Sparkles className="h-4 w-4" />}
              className="flex-1"
            >
              Tạo mới
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => generateQuizzesWithAI("append")}
              disabled={!canGenerate}
              isLoading={isGeneratingQuiz}
              loadingText="Đang tạo..."
              leftIcon={<Sparkles className="h-4 w-4" />}
              className="flex-1 border-primary text-primary hover:bg-primary-light/50"
            >
              Tạo tiếp
            </Button>
          </div>

          {/* Countdown Timer */}
          {quizCooldownSeconds > 0 && (
            <div className="mt-4">
              <Alert variant="warning" icon={<Timer className="h-5 w-5" />}>
                Vui lòng chờ {cooldownMinutes} phút {cooldownSeconds} giây trước
                khi tạo thêm quiz
              </Alert>
            </div>
          )}

          {/* Error Message */}
          {(errors.description || error) && (
            <div className="mt-4">
              <Alert variant="destructive">
                {errors.description || error}
              </Alert>
            </div>
          )}
        </Card>

        {/* Quiz List */}
        <div className="space-y-4">
          {quizzes.length === 0 ? (
            <EmptyState
              icon={<HelpCircle className="h-8 w-8" />}
              title="Chưa có câu hỏi nào"
              description="Sử dụng AI để tạo câu hỏi hoặc thêm câu hỏi thủ công"
            />
          ) : (
            quizzes.map((quiz, quizIndex) => (
              <Card
                key={quizIndex}
                className="p-6 space-y-4 border border-border bg-surface"
              >
                {/* Quiz Header */}
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-bold text-foreground">
                    Câu hỏi {quizIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeQuiz(quizIndex)}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive-bg transition-colors"
                    aria-label="Xóa câu hỏi"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Question */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Câu hỏi <span className="text-destructive">*</span>
                  </label>
                  <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
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
                  <label className="block text-sm font-semibold text-foreground">
                    Đáp án <span className="text-destructive">*</span>
                  </label>
                  {quiz.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex items-start gap-3 p-3 bg-surface-muted rounded-xl border border-border"
                    >
                      <input
                        type="radio"
                        name={`quiz-${quizIndex}`}
                        checked={option.is_correct}
                        onChange={() =>
                          setCorrectAnswer(quizIndex, optionIndex)
                        }
                        className="mt-1 w-4 h-4 text-primary focus:ring-primary cursor-pointer"
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
                          className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground"
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
                          className="w-full px-3 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm text-muted-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      {quiz.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeQuizOption(quizIndex, optionIndex)
                          }
                          className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive-bg transition-colors"
                          aria-label="Xóa đáp án"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addQuizOption(quizIndex)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Thêm đáp án
                  </Button>
                </div>

                {/* Code Block (if exists) */}
                {quiz.code_block && (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Code Block
                    </label>
                    <pre className="w-full px-4 py-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-sm font-mono border border-slate-800">
                      <code>{quiz.code_block}</code>
                    </pre>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Giải thích (tùy chọn)
                  </label>
                  <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
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
              </Card>
            ))
          )}

          {/* Add Quiz Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addQuiz}
            className="w-full py-4 border-2 border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
            leftIcon={<Plus className="h-5 w-5" />}
          >
            Thêm câu hỏi thủ công
          </Button>
        </div>

        {errors.lesson_type && (
          <p className="text-destructive text-sm mt-2">{errors.lesson_type}</p>
        )}
      </div>
    );
  }
);

QuizForm.displayName = "QuizForm";

export default QuizForm;
