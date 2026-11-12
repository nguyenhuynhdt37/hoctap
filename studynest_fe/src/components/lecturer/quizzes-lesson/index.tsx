"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  CreateBulkQuizzesRequest,
  CreateBulkQuizzesResponse,
  CreateQuizData,
  CreateQuizOption,
  LessonQuiz,
} from "@/types/lecturer/quiz";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  GraduationCap,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/states";

const QuizzesLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson_id");
  const courseId = searchParams.get("course_id");

  const [quizzes, setQuizzes] = useState<CreateQuizData[]>([
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<LessonQuiz | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Fetch quizzes
  const {
    data: quizzesData,
    error,
    isLoading,
    mutate,
  } = useSWR<LessonQuiz[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/video/quizzes` : null,
    async (url: string) => {
      const response = await api.get<LessonQuiz[]>(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      keepPreviousData: true,
      revalidateIfStale: false,
    }
  );

  // Handle quiz form
  const handleQuizChange = (
    quizIndex: number,
    field: keyof CreateQuizData,
    value: string | number
  ) => {
    setQuizzes((prev) =>
      prev.map((quiz, i) =>
        i === quizIndex ? { ...quiz, [field]: value } : quiz
      )
    );
  };

  const handleOptionChange = (
    quizIndex: number,
    optionIndex: number,
    field: keyof CreateQuizOption,
    value: string | boolean | number
  ) => {
    setQuizzes((prev) =>
      prev.map((quiz, i) => {
        if (i === quizIndex) {
          // Nếu chọn đáp án đúng, bỏ chọn tất cả đáp án khác
          if (field === "is_correct" && value === true) {
            return {
              ...quiz,
              options: quiz.options.map((opt, oi) =>
                oi === optionIndex
                  ? { ...opt, [field]: value }
                  : { ...opt, is_correct: false }
              ),
            };
          }
          return {
            ...quiz,
            options: quiz.options.map((opt, oi) =>
              oi === optionIndex ? { ...opt, [field]: value } : opt
            ),
          };
        }
        return quiz;
      })
    );
  };

  const addQuiz = () => {
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
  };

  const removeQuiz = (index: number) => {
    setQuizzes((prev) => prev.filter((_, i) => i !== index));
  };

  const addOption = (quizIndex: number) => {
    setQuizzes((prev) =>
      prev.map((quiz, i) => {
        if (i === quizIndex) {
          // Giới hạn tối đa 4 đáp án
          if (quiz.options.length >= 4) {
            showToast.error("Mỗi quiz chỉ có tối đa 4 phương án!");
            return quiz;
          }
          return {
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
          };
        }
        return quiz;
      })
    );
  };

  const removeOption = (quizIndex: number, optionIndex: number) => {
    setQuizzes((prev) =>
      prev.map((quiz, i) => {
        if (i === quizIndex) {
          // Giới hạn tối thiểu 2 đáp án
          if (quiz.options.length <= 2) {
            showToast.error("Mỗi quiz phải có ít nhất 2 phương án!");
            return quiz;
          }
          return {
            ...quiz,
            options: quiz.options
              .filter((_, oi) => oi !== optionIndex)
              .map((opt, oi) => ({ ...opt, position: oi })),
          };
        }
        return quiz;
      })
    );
  };

  const handleSubmit = async () => {
    // Validate quizzes
    for (const quiz of quizzes) {
      if (!quiz.question.trim()) {
        showToast.error("Vui lòng nhập câu hỏi cho tất cả quiz!");
        return;
      }
      if (quiz.options.length < 2) {
        showToast.error("Mỗi quiz phải có ít nhất 2 phương án!");
        return;
      }
      if (quiz.options.length > 4) {
        showToast.error("Mỗi quiz chỉ có tối đa 4 phương án!");
        return;
      }
      const correctCount = quiz.options.filter((opt) => opt.is_correct).length;
      if (correctCount === 0) {
        showToast.error("Mỗi quiz phải có đúng 1 phương án đúng!");
        return;
      }
      if (correctCount > 1) {
        showToast.error("Mỗi quiz chỉ được có 1 phương án đúng!");
        return;
      }
      for (const option of quiz.options) {
        if (!option.text.trim()) {
          showToast.error("Vui lòng nhập nội dung cho tất cả phương án!");
          return;
        }
      }
    }

    if (!lessonId || !courseId) {
      showToast.error("Thiếu thông tin lesson_id hoặc course_id!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateBulkQuizzesRequest = {
        lesson_id: lessonId,
        created_by: "lecturer",
        course_id: courseId,
        quizzes: quizzes,
      };

      const response = await api.post<CreateBulkQuizzesResponse>(
        "/lecturer/lessons/video/quizzes/bulk",
        payload
      );

      showToast.success(response.data.message || "Đã tạo quiz thành công!");
      setQuizzes([
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
      setShowCreateForm(false);
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi tạo quiz!";
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyLabel = (level: number): string => {
    switch (level) {
      case 1:
        return "Dễ";
      case 2:
        return "Trung bình";
      case 3:
        return "Khó";
      default:
        return `Mức ${level}`;
    }
  };

  const getDifficultyVariant = (
    level: number
  ): "success" | "warning" | "destructive" | "neutral" => {
    switch (level) {
      case 1:
        return "success";
      case 2:
        return "warning";
      case 3:
        return "destructive";
      default:
        return "neutral";
    }
  };

  // TODO: Thêm API sau
  const handleEditQuiz = (quiz: LessonQuiz) => {
    setEditingQuiz(quiz);
    // Chuyển quiz sang form chỉnh sửa
    setQuizzes([
      {
        question: quiz.question,
        explanation: quiz.explanation,
        difficulty_level: quiz.difficulty_level,
        options: quiz.options.map((opt) => ({
          text: opt.text,
          is_correct: opt.is_correct,
          feedback: opt.feedback,
          position: opt.position,
        })),
      },
    ]);
    setShowCreateForm(true);
    // Scroll lên đầu trang và focus vào form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // TODO: Thêm API sau
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quiz này?")) {
      return;
    }
    setDeletingQuiz(quizId);
    try {
      const response = await api.delete<{
        status: string;
        message: string;
      }>(`/lecturer/lessons/quizzes/video/${quizId}`);

      showToast.success(response.data.message || "Đã xóa quiz thành công!");
      mutate();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Có lỗi xảy ra khi xóa quiz!";
      showToast.error(errorMessage);
    } finally {
      setDeletingQuiz(null);
    }
  };

  const handleGenerateQuizzesWithAI = async (mode: "new" | "append") => {
    if (!lessonId) {
      showToast.error("Thiếu thông tin lesson_id!");
      return;
    }

    setIsGeneratingAI(true);
    setShowAiModal(false);

    try {
      const response = await api.post<CreateQuizData[]>(
        `/lecturers/chat/lesson/${lessonId}/video/quizzes`
      );

      const generatedQuizzes = response.data;

      if (!generatedQuizzes || generatedQuizzes.length === 0) {
        showToast.error("AI không tạo được quiz nào. Vui lòng thử lại!");
        return;
      }

      if (mode === "new") {
        // Tạo mới hoàn toàn: thay thế toàn bộ
        setQuizzes(generatedQuizzes);
      } else {
        // Tạo thêm: thêm vào danh sách hiện tại
        setQuizzes((prev) => [...prev, ...generatedQuizzes]);
      }

      if (!showCreateForm) {
        setShowCreateForm(true);
        setTimeout(() => {
          formRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }

      showToast.success(
        `Đã tạo ${generatedQuizzes.length} quiz bằng AI thành công!`
      );
    } catch (error: any) {
      // Xử lý các lỗi cụ thể từ API
      const status = error.response?.status;
      const errorDetail =
        error.response?.data?.detail || error.response?.data?.message;

      let errorMessage = "Có lỗi xảy ra khi tạo quiz bằng AI!";

      if (status === 404) {
        // Không tìm thấy bài học, khóa học, hoặc không có nội dung
        if (errorDetail) {
          if (errorDetail.includes("Không tìm thấy bài học")) {
            errorMessage = "Không tìm thấy bài học";
          } else if (errorDetail.includes("Không tìm thấy khóa học")) {
            errorMessage = "Không tìm thấy khóa học";
          } else if (errorDetail.includes("chưa có nội dung để tạo quiz")) {
            errorMessage =
              "Bài học chưa có nội dung để tạo quiz. Vui lòng đảm bảo bài học đã có video và nội dung.";
          } else if (
            errorDetail.includes("Nội dung bài học trống") ||
            errorDetail.includes("quá ngắn")
          ) {
            errorMessage =
              "Nội dung bài học trống hoặc quá ngắn để tạo quiz. Vui lòng kiểm tra lại nội dung bài học.";
          } else {
            errorMessage = errorDetail;
          }
        } else {
          errorMessage = "Không tìm thấy dữ liệu bài học";
        }
      } else if (status === 403) {
        // Không có quyền truy cập
        errorMessage = "Bạn không có quyền truy cập khóa học này";
      } else if (status === 401) {
        errorMessage = "Bạn cần đăng nhập lại để tiếp tục";
      } else if (status === 500) {
        errorMessage = "Lỗi server. Vui lòng thử lại sau!";
      } else if (errorDetail) {
        errorMessage = errorDetail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast.error(errorMessage);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            Quay lại
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">
                Quản lý Quiz
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Thêm và quản lý câu hỏi quiz cho bài học
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="mb-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) {
                setTimeout(() => {
                  formRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 100);
              }
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {showCreateForm ? "Ẩn form" : "Tạo quiz mới"}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card
            ref={formRef}
            className="border border-border bg-surface shadow-xs mb-6 overflow-hidden"
          >
            {/* Form Header */}
            <div className="bg-primary-light/50 border-b border-border px-5 py-3.5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold font-display text-foreground">
                    {editingQuiz ? "Chỉnh sửa quiz" : "Tạo quiz mới"}
                  </h2>
                </div>
                {!editingQuiz && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAiModal(true)}
                      disabled={isGeneratingAI || !lessonId}
                      isLoading={isGeneratingAI}
                      loadingText="Đang tạo..."
                      leftIcon={<Sparkles className="h-4 w-4" />}
                      title="Tạo quiz bằng AI"
                    >
                      Tạo bằng AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addQuiz}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Thêm quiz
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-4">
                {quizzes.map((quiz, quizIndex) => (
                  <Card
                    key={quizIndex}
                    variant="muted"
                    className="p-5 border border-border"
                  >
                    {/* Quiz Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center">
                          {quizIndex + 1}
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          Quiz {quizIndex + 1}
                        </h3>
                      </div>
                      {quizzes.length > 1 && (
                        <button
                          onClick={() => removeQuiz(quizIndex)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors"
                          title="Xóa quiz"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Question and Explanation - Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Question */}
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Câu hỏi <span className="text-destructive">*</span>
                          </label>
                          <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all bg-surface">
                            <TiptapEditor
                              value={quiz.question || ""}
                              onChange={(markdown) =>
                                handleQuizChange(
                                  quizIndex,
                                  "question",
                                  markdown
                                )
                              }
                              placeholder="Nhập câu hỏi..."
                              maxHeight="400px"
                              minHeight="400px"
                            />
                          </div>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Giải thích
                          </label>
                          <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all bg-surface">
                            <TiptapEditor
                              value={quiz.explanation || ""}
                              onChange={(markdown) =>
                                handleQuizChange(
                                  quizIndex,
                                  "explanation",
                                  markdown
                                )
                              }
                              placeholder="Nhập giải thích (tùy chọn)..."
                              maxHeight="400px"
                              minHeight="400px"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Difficulty Level */}
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Độ khó <span className="text-destructive">*</span>
                        </label>
                        <select
                          value={quiz.difficulty_level}
                          onChange={(e) =>
                            handleQuizChange(
                              quizIndex,
                              "difficulty_level",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-surface text-foreground text-sm"
                        >
                          <option value={1}>Dễ</option>
                          <option value={2}>Trung bình</option>
                          <option value={3}>Khó</option>
                        </select>
                      </div>

                      {/* Options */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-foreground">
                            Phương án trả lời * ({quiz.options.length}/4)
                            <span className="text-xs text-muted-foreground ml-2 font-normal">
                              (Tối thiểu 2, tối đa 4, chỉ 1 đáp án đúng)
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(quizIndex)}
                            disabled={quiz.options.length >= 4}
                            leftIcon={<Plus className="h-4 w-4" />}
                          >
                            Thêm
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {quiz.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-3.5 rounded-xl border transition-all ${
                                option.is_correct
                                  ? "bg-success-bg/50 border-success-border"
                                  : "bg-surface border-border"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Radio Button */}
                                <div className="mt-1">
                                  <input
                                    type="radio"
                                    name={`quiz-${quizIndex}-correct`}
                                    checked={option.is_correct}
                                    onChange={(e) =>
                                      handleOptionChange(
                                        quizIndex,
                                        optionIndex,
                                        "is_correct",
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 text-primary border-border focus:ring-primary cursor-pointer"
                                  />
                                </div>

                                {/* Input Fields */}
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                      Nội dung phương án *
                                    </label>
                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          quizIndex,
                                          optionIndex,
                                          "text",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Nhập nội dung phương án..."
                                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                      Phản hồi (tùy chọn)
                                    </label>
                                    <input
                                      type="text"
                                      value={option.feedback}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          quizIndex,
                                          optionIndex,
                                          "feedback",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Nhập phản hồi..."
                                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                                    />
                                  </div>
                                </div>

                                {/* Remove Button */}
                                {quiz.options.length > 2 && (
                                  <button
                                    onClick={() =>
                                      removeOption(quizIndex, optionIndex)
                                    }
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors flex-shrink-0"
                                    title="Xóa phương án"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                              {/* Correct Answer Badge */}
                              {option.is_correct && (
                                <div className="mt-2">
                                  <Badge variant="success" size="sm">
                                    <Check className="h-3 w-3 mr-1 inline" />
                                    Đáp án đúng
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="p-5 border-t border-border flex gap-3 bg-surface-muted/30">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText={editingQuiz ? "Đang cập nhật..." : "Đang tạo..."}
                leftIcon={<Check className="h-4 w-4" />}
                className="flex-1"
              >
                {editingQuiz ? "Cập nhật quiz" : "Tạo quiz"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingQuiz(null);
                  setQuizzes([
                    {
                      question: "",
                      explanation: "",
                      difficulty_level: 1,
                      options: [
                        {
                          text: "",
                          is_correct: false,
                          feedback: "",
                          position: 0,
                        },
                        {
                          text: "",
                          is_correct: false,
                          feedback: "",
                          position: 1,
                        },
                      ],
                    },
                  ]);
                }}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
            </div>
          </Card>
        )}

        {/* AI Modal */}
        {showAiModal && (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <Card className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary-light text-secondary-foreground rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">
                  Tạo quiz bằng AI
                </h3>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                AI sẽ phân tích video bài học và tạo các câu hỏi quiz tự động.
                Chọn cách bạn muốn thêm quiz:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleGenerateQuizzesWithAI("new")}
                  disabled={isGeneratingAI}
                  className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left"
                >
                  <Zap className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold">Tạo mới hoàn toàn</div>
                    <div className="text-xs opacity-90">
                      Thay thế tất cả quiz hiện tại
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateQuizzesWithAI("append")}
                  disabled={isGeneratingAI}
                  className="w-full px-4 py-3 bg-primary-light hover:bg-primary-pastel/50 text-primary font-semibold rounded-xl transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left"
                >
                  <Plus className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold">Tạo thêm</div>
                    <div className="text-xs text-muted-foreground">
                      Thêm quiz mới vào danh sách hiện tại
                    </div>
                  </div>
                </button>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowAiModal(false)}
                disabled={isGeneratingAI}
                className="mt-4 w-full"
              >
                Hủy
              </Button>
            </Card>
          </div>
        )}

        {/* Quizzes List */}
        <Card className="border border-border bg-surface shadow-xs overflow-hidden">
          {/* List Header */}
          <div className="bg-surface-muted/50 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-display text-foreground">
                Danh sách quiz ({quizzesData?.length || 0})
              </h2>
            </div>
          </div>

          <div className="p-5">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-3"></div>
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="text-center">
                <p className="text-sm font-medium mb-3">
                  Không thể tải danh sách quiz
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => mutate()}
                >
                  Thử lại
                </Button>
              </Alert>
            )}

            {/* Quizzes List */}
            {!isLoading && !error && (
              <>
                {quizzesData && quizzesData.length > 0 ? (
                  <div className="space-y-4">
                    {quizzesData.map((quiz, index) => (
                      <Card
                        key={quiz.id}
                        variant="muted"
                        className="p-5 border border-border hover:border-primary-pastel transition-colors"
                      >
                        {/* Quiz Header */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-border">
                          <div className="flex-1">
                            <div className="flex items-start gap-2.5 mb-2">
                              <div className="w-6 h-6 bg-primary text-white text-xs font-bold rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="mb-2">
                                  <MarkdownRenderer
                                    content={quiz.question || ""}
                                    isHtml={false}
                                    className="prose prose-sm max-w-none text-foreground font-semibold"
                                  />
                                </div>
                                <Badge
                                  variant={getDifficultyVariant(
                                    quiz.difficulty_level
                                  )}
                                  size="sm"
                                >
                                  {getDifficultyLabel(quiz.difficulty_level)}
                                </Badge>
                              </div>
                            </div>
                            {quiz.explanation && (
                              <div className="ml-8 mt-2 p-3 bg-info-bg/50 border-l-2 border-info-border rounded-r-lg text-xs">
                                <p className="font-semibold text-info-foreground mb-1">
                                  Giải thích:
                                </p>
                                <MarkdownRenderer
                                  content={quiz.explanation}
                                  isHtml={false}
                                  className="prose prose-xs max-w-none text-foreground"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-1 ml-2">
                            <button
                              onClick={() => handleEditQuiz(quiz)}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary-light/50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              disabled={deletingQuiz === quiz.id}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors disabled:opacity-50"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {/* Options */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 ml-8">
                            Phương án ({quiz.options.length}):
                          </p>
                          {quiz.options.map((option, index) => (
                            <div
                              key={option.id || index}
                              className={`p-3 rounded-xl border transition-colors ml-8 ${
                                option.is_correct
                                  ? "bg-success-bg/50 border-success-border"
                                  : "bg-surface border-border"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    option.is_correct
                                      ? "bg-success-foreground text-white"
                                      : "bg-surface-muted text-muted-foreground border border-border"
                                  }`}
                                >
                                  {option.is_correct ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-medium ${
                                      option.is_correct
                                        ? "text-success-foreground"
                                        : "text-foreground"
                                    }`}
                                  >
                                    {option.text}
                                  </p>
                                  {option.feedback && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <span className="font-medium text-foreground">
                                        Phản hồi:{" "}
                                      </span>
                                      {option.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<GraduationCap className="h-8 w-8" />}
                    title="Chưa có quiz nào"
                    description="Hãy tạo quiz mới để bắt đầu"
                  />
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QuizzesLesson;
