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
  HiAcademicCap,
  HiCheck,
  HiChevronLeft,
  HiLightningBolt,
  HiPencil,
  HiPlus,
  HiSparkles,
  HiTrash,
  HiX,
} from "react-icons/hi";
import useSWR from "swr";

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

  const getDifficultyColor = (level: number): string => {
    switch (level) {
      case 1:
        return "bg-green-100 text-green-700";
      case 2:
        return "bg-amber-100 text-amber-700";
      case 3:
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2 transition-colors"
          >
            <HiChevronLeft className="h-5 w-5" />
            <span>Quay lại</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <HiAcademicCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Quiz</h1>
              <p className="text-sm text-gray-600 mt-1">
                Thêm và quản lý câu hỏi quiz cho bài học
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="mb-4">
          <button
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
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <HiPlus className="h-4 w-4" />
            {showCreateForm ? "Ẩn form" : "Tạo quiz mới"}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div
            ref={formRef}
            className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6"
          >
            {/* Form Header */}
            <div className="bg-green-500 px-4 py-3 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiAcademicCap className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold text-white">
                    {editingQuiz ? "Chỉnh sửa quiz" : "Tạo quiz mới"}
                  </h2>
                </div>
                {!editingQuiz && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAiModal(true)}
                      disabled={isGeneratingAI || !lessonId}
                      className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Tạo quiz bằng AI"
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Đang tạo...</span>
                        </>
                      ) : (
                        <>
                          <HiSparkles className="h-4 w-4" />
                          <span>Tạo bằng AI</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={addQuiz}
                      className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <HiPlus className="h-4 w-4" />
                      Thêm quiz
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {quizzes.map((quiz, quizIndex) => (
                  <div
                    key={quizIndex}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {/* Quiz Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 text-white text-xs font-bold rounded flex items-center justify-center">
                          {quizIndex + 1}
                        </div>
                        <h3 className="text-base font-bold text-gray-900">
                          Quiz {quizIndex + 1}
                        </h3>
                      </div>
                      {quizzes.length > 1 && (
                        <button
                          onClick={() => removeQuiz(quizIndex)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Xóa quiz"
                        >
                          <HiTrash className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Question and Explanation - Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Question */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Câu hỏi *
                          </label>
                          <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
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
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Giải thích
                          </label>
                          <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
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
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Độ khó *
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-sm"
                        >
                          <option value={1}>Dễ</option>
                          <option value={2}>Trung bình</option>
                          <option value={3}>Khó</option>
                        </select>
                      </div>

                      {/* Options */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-700">
                            Phương án trả lời * ({quiz.options.length}/4)
                            <span className="text-xs text-gray-500 ml-2 font-normal">
                              (Tối thiểu 2, tối đa 4, chỉ 1 đáp án đúng)
                            </span>
                          </label>
                          <button
                            onClick={() => addOption(quizIndex)}
                            disabled={quiz.options.length >= 4}
                            className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <HiPlus className="h-4 w-4" />
                            Thêm
                          </button>
                        </div>

                        <div className="space-y-3">
                          {quiz.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg border transition-all ${
                                option.is_correct
                                  ? "bg-green-50 border-green-300"
                                  : "bg-white border-gray-200"
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
                                    className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                                  />
                                </div>

                                {/* Input Fields */}
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
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
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
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
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
                                    />
                                  </div>
                                </div>

                                {/* Remove Button */}
                                {quiz.options.length > 2 && (
                                  <button
                                    onClick={() =>
                                      removeOption(quizIndex, optionIndex)
                                    }
                                    className="p-1.5 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                    title="Xóa phương án"
                                  >
                                    <HiX className="h-4 w-4 text-red-600" />
                                  </button>
                                )}
                              </div>

                              {/* Correct Answer Badge */}
                              {option.is_correct && (
                                <div className="mt-2 flex items-center gap-1 text-green-700 text-xs font-semibold">
                                  <HiCheck className="h-3 w-3" />
                                  <span>Đáp án đúng</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-4 p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <HiCheck className="h-4 w-4" />
                {isSubmitting
                  ? editingQuiz
                    ? "Đang cập nhật..."
                    : "Đang tạo..."
                  : editingQuiz
                  ? "Cập nhật quiz"
                  : "Tạo quiz"}
              </button>
              <button
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-sm"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* AI Modal */}
        {showAiModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <HiSparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Tạo quiz bằng AI
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                AI sẽ phân tích video bài học và tạo các câu hỏi quiz tự động.
                Chọn cách bạn muốn thêm quiz:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleGenerateQuizzesWithAI("new")}
                  disabled={isGeneratingAI}
                  className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiLightningBolt className="h-5 w-5" />
                  <div className="text-left flex-1">
                    <div className="font-bold">Tạo mới hoàn toàn</div>
                    <div className="text-xs text-purple-100">
                      Thay thế tất cả quiz hiện tại
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleGenerateQuizzesWithAI("append")}
                  disabled={isGeneratingAI}
                  className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <HiPlus className="h-5 w-5" />
                  <div className="text-left flex-1">
                    <div className="font-bold">Tạo thêm</div>
                    <div className="text-xs text-purple-600">
                      Thêm quiz mới vào danh sách hiện tại
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowAiModal(false)}
                disabled={isGeneratingAI}
                className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Quizzes List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* List Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <HiAcademicCap className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">
                Danh sách quiz ({quizzesData?.length || 0})
              </h2>
            </div>
          </div>

          <div className="p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mb-3"></div>
                <p className="text-sm text-gray-600">Đang tải...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-700 text-sm font-medium mb-3">
                  Không thể tải danh sách quiz
                </p>
                <button
                  onClick={() => mutate()}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Quizzes List */}
            {!isLoading && !error && (
              <>
                {quizzesData && quizzesData.length > 0 ? (
                  <div className="space-y-3">
                    {quizzesData.map((quiz, index) => (
                      <div
                        key={quiz.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                      >
                        {/* Quiz Header */}
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-5 h-5 bg-green-500 text-white text-xs font-bold rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="mb-2">
                                  <MarkdownRenderer
                                    content={quiz.question || ""}
                                    isHtml={false}
                                    className="prose prose-sm max-w-none text-gray-900 font-semibold"
                                  />
                                </div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getDifficultyColor(
                                    quiz.difficulty_level
                                  )}`}
                                >
                                  {getDifficultyLabel(quiz.difficulty_level)}
                                </span>
                              </div>
                            </div>
                            {quiz.explanation && (
                              <div className="ml-7 mt-2 p-2 bg-blue-50 border-l-2 border-blue-400 rounded text-xs">
                                <p className="font-semibold text-blue-700 mb-1">
                                  Giải thích:
                                </p>
                                <MarkdownRenderer
                                  content={quiz.explanation}
                                  isHtml={false}
                                  className="prose prose-xs max-w-none text-gray-700"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-1 ml-2">
                            <button
                              onClick={() => handleEditQuiz(quiz)}
                              className="p-2 hover:bg-blue-50 rounded transition-colors text-blue-600"
                              title="Chỉnh sửa"
                            >
                              <HiPencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              disabled={deletingQuiz === quiz.id}
                              className="p-2 hover:bg-red-50 rounded transition-colors text-red-600 disabled:opacity-50"
                              title="Xóa"
                            >
                              <HiTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {/* Options */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 mb-2 ml-7">
                            Phương án ({quiz.options.length}):
                          </p>
                          {quiz.options.map((option, index) => (
                            <div
                              key={option.id || index}
                              className={`p-2 rounded border transition-colors ml-7 ${
                                option.is_correct
                                  ? "bg-green-50 border-green-300"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    option.is_correct
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-300 text-gray-600"
                                  }`}
                                >
                                  {option.is_correct ? (
                                    <HiCheck className="h-3 w-3" />
                                  ) : (
                                    <HiX className="h-3 w-3" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-medium ${
                                      option.is_correct
                                        ? "text-green-900"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {option.text}
                                  </p>
                                  {option.feedback && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      <span className="font-medium">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <HiAcademicCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium text-sm">
                      Chưa có quiz nào
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hãy tạo quiz mới để bắt đầu
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizzesLesson;
