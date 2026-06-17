"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { CreateQuizData, CreateQuizOption } from "@/types/lecturer/quiz";
import { QuizFormData } from "@/types/lecturer/lesson-api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiPlus,
  HiSparkles,
  HiTrash,
  HiVideoCamera,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";

const CreateQuizLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [currentStep, setCurrentStep] = useState(0);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingQuizzes, setIsGeneratingQuizzes] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuizFormData>({
    title: "",
    description: "",
  });

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

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    quizzes?: string;
  }>({});

  const totalSteps = 3;

  // Fetch chapters to get section name
  const { data: chaptersData } = useSWR(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Get section name from section_id
  const sectionName =
    chaptersData?.sections?.find(
      (section: any) => section.section_id === sectionId
    )?.section_title || "";

  // Fetch video lessons from section
  const { data: videoLessonsData } = useSWR(
    sectionId ? `/lecturer/lessons/${sectionId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Filter only video lessons
  const videoLessons =
    videoLessonsData?.filter((lesson: any) => lesson.lesson_type === "video") ||
    [];

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: {
      title?: string;
      description?: string;
      quizzes?: string;
    } = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          newErrors.title = "Vui lòng nhập tiêu đề bài học";
        }
        const descriptionText = formData.description
          .replace(/#{1,6}\s+/g, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
          .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
          .replace(/^\s*[-*+]\s+/gm, "")
          .replace(/^\s*\d+\.\s+/gm, "")
          .trim();
        if (!descriptionText) {
          newErrors.description = "Vui lòng nhập mô tả bài học";
        }
        break;
      case 1: // Create Quizzes
        if (quizzes.length === 0) {
          newErrors.quizzes = "Vui lòng tạo ít nhất một câu hỏi";
        } else {
          for (let i = 0; i < quizzes.length; i++) {
            const quiz = quizzes[i];
            // Check if question has actual content (strip markdown formatting)
            const questionText = quiz.question
              .replace(/#{1,6}\s+/g, "")
              .replace(/\*\*([^*]+)\*\*/g, "$1")
              .replace(/\*([^*]+)\*/g, "$1")
              .replace(/`([^`]+)`/g, "$1")
              .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
              .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
              .replace(/^\s*[-*+]\s+/gm, "")
              .replace(/^\s*\d+\.\s+/gm, "")
              .trim();
            if (!questionText) {
              newErrors.quizzes = `Câu hỏi ${
                i + 1
              }: Vui lòng nhập nội dung câu hỏi`;
              break;
            }
            if (quiz.options.length < 2) {
              newErrors.quizzes = `Câu hỏi ${
                i + 1
              }: Cần ít nhất 2 phương án trả lời`;
              break;
            }
            const hasCorrectAnswer = quiz.options.some((opt) => opt.is_correct);
            if (!hasCorrectAnswer) {
              newErrors.quizzes = `Câu hỏi ${
                i + 1
              }: Cần chọn ít nhất một đáp án đúng`;
              break;
            }
            for (let j = 0; j < quiz.options.length; j++) {
              const option = quiz.options[j];
              if (!option.text.trim()) {
                newErrors.quizzes = `Câu hỏi ${i + 1}, Phương án ${
                  j + 1
                }: Vui lòng nhập nội dung`;
                break;
              }
            }
          }
        }
        break;
      case 2: // Review
        // No validation needed, just review
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGenerateTitle = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }

    setIsGeneratingTitle(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/lesson/rewrite_the_title",
        {
          title: formData.title.trim(),
        }
      );

      // API trả về text thuần trực tiếp
      const generatedTitle = response.data;

      if (generatedTitle && typeof generatedTitle === "string") {
        setFormData((prev) => ({
          ...prev,
          title: generatedTitle,
        }));
      } else {
        setError("Không thể tạo tiêu đề tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo tiêu đề tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }

    if (!sectionName) {
      setError("Đang tải thông tin section. Vui lòng đợi...");
      return;
    }

    setIsGeneratingDescription(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/lesson/create_description",
        {
          title: formData.title.trim(),
          section_name: sectionName,
        }
      );

      // API trả về markdown string trực tiếp
      const generatedDescription = response.data;

      if (generatedDescription && typeof generatedDescription === "string") {
        setFormData((prev) => ({
          ...prev,
          description: generatedDescription,
        }));
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo mô tả tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

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
          if (quiz.options.length >= 4) {
            setError("Mỗi quiz chỉ có tối đa 4 phương án!");
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
          if (quiz.options.length <= 2) {
            setError("Mỗi quiz cần ít nhất 2 phương án!");
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

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleGenerateQuizzesFromVideos = async () => {
    if (selectedLessonIds.length === 0) {
      setError("Vui lòng chọn ít nhất một bài học video");
      return;
    }

    setIsGeneratingQuizzes(true);
    setError(null);

    try {
      const response = await api.post("/lecturers/chat/lesson/quizzes", {
        lesson_ids: selectedLessonIds,
      });

      // API trả về Quiz[] trực tiếp
      const generatedQuizzes = Array.isArray(response.data)
        ? response.data
        : [];

      if (generatedQuizzes.length > 0) {
        // Map API response to CreateQuizData format
        const formattedQuizzes: CreateQuizData[] = generatedQuizzes.map(
          (quiz: any) => ({
            question: quiz.question || "",
            explanation: quiz.explanation || "",
            difficulty_level: quiz.difficulty_level || 1,
            options: (quiz.options || []).map((opt: any, idx: number) => ({
              text: opt.text || "",
              is_correct: opt.is_correct || false,
              feedback: opt.feedback || "",
              position: idx,
            })),
          })
        );

        setQuizzes(formattedQuizzes);
        setActiveQuizIndex(0); // Reset to first quiz
        setSuccessMessage(
          `✅ Đã tạo ${formattedQuizzes.length} câu hỏi quiz tự động từ ${selectedLessonIds.length} bài học video!`
        );
        // Clear selection after success
        setSelectedLessonIds([]);
      } else {
        setError("Không thể tạo quiz tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo quiz tự động";
      setError(errorMessage);
    } finally {
      setIsGeneratingQuizzes(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (!sectionId || !courseId) {
      setError("Thiếu thông tin section_id hoặc course_id");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Step 1: Create lesson
      const createResponse = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        lesson_type: "quiz",
      });

      const lessonId = createResponse.data?.id;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ server");
      }

      setCreatedLessonId(lessonId);
      setSuccessMessage("✅ Tạo bài học thành công! Đang tạo quiz...");

      // Step 2: Create quizzes
      const quizzesPayload = quizzes.map((quiz) => ({
        question: quiz.question.trim(),
        explanation: quiz.explanation.trim(),
        difficulty_level: quiz.difficulty_level,
        options: quiz.options.map((opt, idx) => ({
          text: opt.text.trim(),
          is_correct: opt.is_correct,
          feedback: opt.feedback.trim(),
          position: idx,
        })),
      }));

      await api.post("/lecturer/lessons/quizzes/bulk", {
        lesson_id: lessonId,
        created_by: "lecturer",
        section_id: sectionId,
        course_id: courseId,
        quizzes: quizzesPayload,
      } as any);

      setSuccessMessage("✅ Tạo bài học quiz thành công! Đang chuyển hướng...");

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/lecturer/chapters?course_id=${courseId}`);
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tạo bài học quiz";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  if (!sectionId || !courseId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium">
              Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang
              trước.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() =>
              router.push(`/lecturer/chapters?course_id=${courseId}`)
            }
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            <span className="font-medium">Quay lại danh sách bài học</span>
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Tạo bài học Quiz
          </h1>
          <p className="text-gray-600">
            Tạo bài học quiz với các câu hỏi trắc nghiệm
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">
              Bước {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-semibold text-green-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span
              className={currentStep >= 0 ? "text-green-600 font-medium" : ""}
            >
              Thông tin cơ bản
            </span>
            <span
              className={currentStep >= 1 ? "text-green-600 font-medium" : ""}
            >
              Tạo câu hỏi
            </span>
            <span
              className={currentStep >= 2 ? "text-green-600 font-medium" : ""}
            >
              Xem lại
            </span>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 mb-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <HiCheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-900 mb-1">
                  Thành công!
                </h3>
                <p className="text-sm text-green-800 font-medium leading-relaxed">
                  {successMessage}
                </p>
                {successMessage.includes("chuyển hướng") && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang chuyển hướng về trang quản lý bài học...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <HiXCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thông tin cơ bản về bài học
                </h2>
                <p className="text-gray-600">
                  Nhập thông tin cơ bản để mô tả bài học quiz của bạn
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Tiêu đề bài học <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle || !formData.title.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
                      title="Tự động tạo tiêu đề từ AI"
                    >
                      {isGeneratingTitle ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Tạo tiêu đề tự động
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Quiz kiểm tra kiến thức Python"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Nhập tiêu đề và nhấn "Tạo tiêu đề tự động" để AI tối ưu
                    tiêu đề cho bạn
                  </p>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Mô tả bài học <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={
                        isGeneratingDescription ||
                        !formData.title.trim() ||
                        !sectionName
                      }
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
                      title="Tự động tạo mô tả từ AI"
                    >
                      {isGeneratingDescription ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          Tạo mô tả tự động
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    className={`rounded-lg overflow-hidden ${
                      errors.description
                        ? "border-2 border-red-300"
                        : "border border-gray-300"
                    }`}
                  >
                    <TiptapEditor
                      value={formData.description}
                      onChange={(markdown) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: markdown,
                        }))
                      }
                      placeholder="Mô tả chi tiết về nội dung bài học quiz này..."
                      minHeight="200px"
                    />
                  </div>
                  {errors.description && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Nhập tiêu đề và nhấn "Tạo mô tả tự động" để AI tạo mô tả
                    chi tiết cho bạn
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Create Quizzes */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Tạo câu hỏi quiz
                </h2>
                <p className="text-gray-600">
                  Tạo các câu hỏi trắc nghiệm cho bài học. Chọn tab để chuyển
                  đổi giữa các câu hỏi
                </p>
              </div>

              {/* AI Generate Quizzes from Videos */}
              {videoLessons.length > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-4 gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <HiSparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-green-900 mb-1">
                            Tạo quiz tự động từ bài học video
                          </h3>
                          <p className="text-sm text-green-800">
                            Chọn một hoặc nhiều bài học video để AI tự động tạo
                            câu hỏi quiz dựa trên nội dung video
                          </p>
                        </div>
                      </div>

                      {/* Video Lessons List */}
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        {videoLessons.map((lesson: any) => (
                          <label
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLessonIds.includes(lesson.id)}
                              onChange={() => handleToggleLesson(lesson.id)}
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <HiVideoCamera className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {lesson.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {lesson.chunk_count} phần nội dung
                                </p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateQuizzesFromVideos}
                        disabled={
                          isGeneratingQuizzes || selectedLessonIds.length === 0
                        }
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isGeneratingQuizzes ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang tạo quiz từ AI...
                          </>
                        ) : (
                          <>
                            <HiSparkles className="h-5 w-5" />
                            Tạo quiz tự động từ {selectedLessonIds.length}{" "}
                            {selectedLessonIds.length === 1
                              ? "bài học"
                              : "bài học"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {errors.quizzes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium">
                    {errors.quizzes}
                  </p>
                </div>
              )}

              {/* Quiz Tabs Navigation */}
              <div className="mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {quizzes.map((quiz, quizIndex) => {
                    const hasCorrectAnswer = quiz.options.some(
                      (opt) => opt.is_correct
                    );
                    const questionText = quiz.question
                      .replace(/#{1,6}\s+/g, "")
                      .replace(/\*\*([^*]+)\*\*/g, "$1")
                      .replace(/\*([^*]+)\*/g, "$1")
                      .replace(/`([^`]+)`/g, "$1")
                      .trim();
                    const hasQuestion = questionText.length > 0;
                    return (
                      <button
                        key={quizIndex}
                        type="button"
                        onClick={() => setActiveQuizIndex(quizIndex)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                          activeQuizIndex === quizIndex
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span className="font-bold">{quizIndex + 1}</span>
                        <div className="flex items-center gap-1">
                          {hasQuestion && (
                            <div
                              className={`w-2 h-2 rounded-full ${
                                activeQuizIndex === quizIndex
                                  ? "bg-white"
                                  : "bg-green-500"
                              }`}
                            />
                          )}
                          {hasCorrectAnswer && (
                            <HiCheckCircle
                              className={`h-4 w-4 ${
                                activeQuizIndex === quizIndex
                                  ? "text-white"
                                  : "text-green-600"
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addQuiz}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all whitespace-nowrap flex-shrink-0"
                    title="Thêm câu hỏi mới"
                  >
                    <HiPlus className="h-5 w-5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Active Quiz Content */}
              {quizzes.length > 0 && (
                <div className="border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {activeQuizIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Câu hỏi {activeQuizIndex + 1}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {quizzes[activeQuizIndex].options.filter(
                            (opt) => opt.is_correct
                          ).length > 0
                            ? "Đã có đáp án đúng"
                            : "Chưa chọn đáp án đúng"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {quizzes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            removeQuiz(activeQuizIndex);
                            if (activeQuizIndex >= quizzes.length - 1) {
                              setActiveQuizIndex(
                                Math.max(0, activeQuizIndex - 1)
                              );
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <HiTrash className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const quiz = quizzes[activeQuizIndex];
                    return (
                      <div className="space-y-4">
                        {/* Question */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nội dung câu hỏi{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="rounded-lg overflow-hidden border border-gray-300">
                            <TiptapEditor
                              value={quiz.question}
                              onChange={(markdown) =>
                                handleQuizChange(
                                  activeQuizIndex,
                                  "question",
                                  markdown
                                )
                              }
                              placeholder="Nhập nội dung câu hỏi..."
                              minHeight="250px"
                              maxHeight="400px"
                            />
                          </div>
                        </div>

                        {/* Difficulty Level */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Độ khó
                          </label>
                          <select
                            value={quiz.difficulty_level}
                            onChange={(e) =>
                              handleQuizChange(
                                activeQuizIndex,
                                "difficulty_level",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          >
                            <option value={1}>Dễ</option>
                            <option value={2}>Trung bình</option>
                            <option value={3}>Khó</option>
                          </select>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Giải thích
                          </label>
                          <div className="rounded-lg overflow-hidden border border-gray-300">
                            <TiptapEditor
                              value={quiz.explanation}
                              onChange={(markdown) =>
                                handleQuizChange(
                                  activeQuizIndex,
                                  "explanation",
                                  markdown
                                )
                              }
                              placeholder="Giải thích cho câu trả lời đúng..."
                              minHeight="250px"
                              maxHeight="400px"
                            />
                          </div>
                        </div>

                        {/* Options */}
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-semibold text-gray-700">
                              Phương án trả lời{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            {quiz.options.length < 4 && (
                              <button
                                type="button"
                                onClick={() => addOption(activeQuizIndex)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors font-medium border border-green-200"
                              >
                                <HiPlus className="h-4 w-4" />
                                Thêm phương án
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {quiz.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className={`p-4 rounded-lg border-2 transition-all ${
                                  option.is_correct
                                    ? "bg-green-50 border-green-400 shadow-sm"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex-shrink-0">
                                    <input
                                      type="radio"
                                      name={`quiz-${activeQuizIndex}-correct`}
                                      checked={option.is_correct}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          activeQuizIndex,
                                          optionIndex,
                                          "is_correct",
                                          e.target.checked
                                        )
                                      }
                                      className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                        {String.fromCharCode(65 + optionIndex)}
                                      </span>
                                      <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) =>
                                          handleOptionChange(
                                            activeQuizIndex,
                                            optionIndex,
                                            "text",
                                            e.target.value
                                          )
                                        }
                                        placeholder={`Nhập nội dung phương án ${
                                          optionIndex + 1
                                        }...`}
                                        className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                          option.is_correct
                                            ? "border-green-300 focus:ring-green-500 bg-white"
                                            : "border-gray-300 focus:ring-green-500"
                                        }`}
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      value={option.feedback}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          activeQuizIndex,
                                          optionIndex,
                                          "feedback",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Phản hồi khi chọn phương án này (tùy chọn)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm bg-white"
                                    />
                                  </div>
                                  {quiz.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeOption(
                                          activeQuizIndex,
                                          optionIndex
                                        )
                                      }
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 flex-shrink-0"
                                      title="Xóa phương án"
                                    >
                                      <HiXCircle className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                                {option.is_correct && (
                                  <div className="mt-3 flex items-center gap-2 text-xs text-green-700 font-medium bg-green-100 px-3 py-1.5 rounded-lg">
                                    <HiCheckCircle className="h-4 w-4" />
                                    <span>Đây là đáp án đúng</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Navigation between quizzes */}
              {quizzes.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuizIndex(
                        activeQuizIndex > 0
                          ? activeQuizIndex - 1
                          : quizzes.length - 1
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HiChevronLeft className="h-5 w-5" />
                    Câu trước
                  </button>
                  <span className="text-sm text-gray-500">
                    {activeQuizIndex + 1} / {quizzes.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuizIndex(
                        activeQuizIndex < quizzes.length - 1
                          ? activeQuizIndex + 1
                          : 0
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Câu sau
                    <HiChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Xem lại và hoàn tất
                </h2>
                <p className="text-gray-600">
                  Kiểm tra lại thông tin trước khi tạo bài học quiz
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Info Review */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Thông tin cơ bản
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">
                        Tiêu đề:
                      </span>
                      <p className="text-sm text-gray-900 mt-1">
                        {formData.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-700">
                        Mô tả:
                      </span>
                      <div className="text-sm text-gray-900 mt-1 prose max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formData.description
                              .replace(/\n/g, "<br />")
                              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                              .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quizzes Review */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Câu hỏi ({quizzes.length})
                  </h3>
                  <div className="space-y-4">
                    {quizzes.map((quiz, quizIndex) => (
                      <div
                        key={quizIndex}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {quizIndex + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-2">
                              {quiz.question}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-700">
                                {quiz.difficulty_level === 1
                                  ? "Dễ"
                                  : quiz.difficulty_level === 2
                                  ? "Trung bình"
                                  : "Khó"}
                              </span>
                            </div>
                            {quiz.explanation && (
                              <p className="text-sm text-gray-600 mb-3">
                                <span className="font-medium">
                                  Giải thích:{" "}
                                </span>
                                {quiz.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 ml-11">
                          {quiz.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded border ${
                                option.is_correct
                                  ? "bg-green-50 border-green-300"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {option.is_correct && (
                                  <HiCheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                <p
                                  className={`text-sm ${
                                    option.is_correct
                                      ? "text-green-900 font-medium"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {option.text}
                                </p>
                              </div>
                              {option.feedback && (
                                <p className="text-xs text-gray-600 mt-1 ml-6">
                                  Phản hồi: {option.feedback}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            Quay lại
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Tiếp theo
              <HiChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <HiCheckCircle className="h-5 w-5" />
                  Hoàn tất
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateQuizLesson;
