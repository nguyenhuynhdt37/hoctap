"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { CreateQuizData, CreateQuizOption } from "@/types/lecturer/quiz";
import { QuizFormData } from "@/types/lecturer/lesson-api";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  Video,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 border border-border text-center">
          <Alert variant="destructive" title="Thiếu thông tin cần thiết">
            Thiếu thông tin section_id hoặc course_id. Vui lòng quay lại trang trước.
          </Alert>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/lecturer/chapters?course_id=${courseId}`)
            }
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            Quay lại danh sách bài học
          </Button>
          <h1 className="text-3xl font-bold font-display text-foreground mb-2">
            Tạo bài học Quiz
          </h1>
          <p className="text-sm text-muted-foreground">
            Tạo bài học quiz với các câu hỏi trắc nghiệm
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 border border-border bg-surface shadow-xs mb-6">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="font-medium text-foreground">
              Bước {currentStep + 1} / {totalSteps}
            </span>
            <span className="font-semibold text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-primary-light/50 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-4 text-xs">
            <span
              className={
                currentStep >= 0
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }
            >
              Thông tin cơ bản
            </span>
            <span
              className={
                currentStep >= 1
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }
            >
              Tạo câu hỏi
            </span>
            <span
              className={
                currentStep >= 2
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }
            >
              Xem lại
            </span>
          </div>
        </Card>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6">
            <Alert variant="success" title="Thành công!">
              <p>{successMessage}</p>
              {successMessage.includes("chuyển hướng") && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang chuyển hướng về trang quản lý bài học...</span>
                </div>
              )}
            </Alert>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <Alert variant="destructive">{error}</Alert>
          </div>
        )}

        {/* Step Content */}
        <Card className="border border-border bg-surface shadow-xs p-8 mb-6">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-1">
                  Thông tin cơ bản về bài học
                </h2>
                <p className="text-sm text-muted-foreground">
                  Nhập thông tin cơ bản để mô tả bài học quiz của bạn
                </p>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Tiêu đề bài học <span className="text-destructive">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle || !formData.title.trim()}
                      isLoading={isGeneratingTitle}
                      loadingText="Đang tạo..."
                      leftIcon={<Sparkles className="h-4 w-4" />}
                      className="border-primary text-primary hover:bg-primary-light/50"
                    >
                      Tạo tiêu đề tự động
                    </Button>
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
                    className={`w-full px-4 py-3 border rounded-xl bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-primary focus:border-transparent"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-destructive text-sm mt-1">
                      {errors.title}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhập tiêu đề và nhấn &ldquo;Tạo tiêu đề tự động&rdquo; để AI tối ưu
                    tiêu đề cho bạn
                  </p>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Mô tả bài học <span className="text-destructive">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={
                        isGeneratingDescription ||
                        !formData.title.trim() ||
                        !sectionName
                      }
                      isLoading={isGeneratingDescription}
                      loadingText="Đang tạo..."
                      leftIcon={<Sparkles className="h-4 w-4" />}
                      className="border-primary text-primary hover:bg-primary-light/50"
                    >
                      Tạo mô tả tự động
                    </Button>
                  </div>
                  <div
                    className={`rounded-xl overflow-hidden ${
                      errors.description
                        ? "border-2 border-destructive"
                        : "border border-border"
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
                    <p className="text-destructive text-sm mt-1">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhập tiêu đề và nhấn &ldquo;Tạo mô tả tự động&rdquo; để AI tạo mô tả
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
                <h2 className="text-2xl font-bold font-display text-foreground mb-1">
                  Tạo câu hỏi quiz
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tạo các câu hỏi trắc nghiệm cho bài học. Chọn tab để chuyển
                  đổi giữa các câu hỏi
                </p>
              </div>

              {/* AI Generate Quizzes from Videos */}
              {videoLessons.length > 0 && (
                <Card variant="pastel-blue" className="p-6 border border-border">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-4 gap-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground mb-0.5">
                            Tạo quiz tự động từ bài học video
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Chọn một hoặc nhiều bài học video để AI tự động tạo
                            câu hỏi quiz dựa trên nội dung video
                          </p>
                        </div>
                      </div>

                      {/* Video Lessons List */}
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                        {videoLessons.map((lesson: any) => (
                          <label
                            key={lesson.id}
                            className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-primary-pastel hover:bg-primary-light/30 transition-all cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLessonIds.includes(lesson.id)}
                              onChange={() => handleToggleLesson(lesson.id)}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                            />
                            <div className="flex items-center gap-2.5 flex-1">
                              <Video className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {lesson.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.chunk_count} phần nội dung
                                </p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleGenerateQuizzesFromVideos}
                        disabled={
                          isGeneratingQuizzes || selectedLessonIds.length === 0
                        }
                        isLoading={isGeneratingQuizzes}
                        loadingText="Đang tạo quiz từ AI..."
                        leftIcon={<Sparkles className="h-4 w-4" />}
                        className="w-full"
                      >
                        Tạo quiz tự động từ {selectedLessonIds.length} bài học
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {errors.quizzes && (
                <Alert variant="destructive">{errors.quizzes}</Alert>
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
                    const isActive = activeQuizIndex === quizIndex;
                    return (
                      <button
                        key={quizIndex}
                        type="button"
                        onClick={() => setActiveQuizIndex(quizIndex)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap flex-shrink-0 cursor-pointer border ${
                          isActive
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-surface border-border text-foreground hover:bg-primary-light/40"
                        }`}
                      >
                        <span className="font-bold">{quizIndex + 1}</span>
                        <div className="flex items-center gap-1">
                          {hasQuestion && (
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isActive ? "bg-white" : "bg-primary"
                              }`}
                            />
                          )}
                          {hasCorrectAnswer && (
                            <CheckCircle2
                              className={`h-4 w-4 ${
                                isActive ? "text-white" : "text-success-foreground"
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addQuiz}
                    leftIcon={<Plus className="h-4 w-4" />}
                    className="whitespace-nowrap flex-shrink-0"
                    title="Thêm câu hỏi mới"
                  >
                    Thêm
                  </Button>
                </div>
              </div>

              {/* Active Quiz Content */}
              {quizzes.length > 0 && (
                <Card className="border border-border rounded-2xl p-6 bg-surface shadow-xs">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center font-bold text-lg">
                        {activeQuizIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          Câu hỏi {activeQuizIndex + 1}
                        </h3>
                        <p className="text-xs text-muted-foreground">
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
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="h-5 w-5" />
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
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Nội dung câu hỏi{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <div className="rounded-xl overflow-hidden border border-border">
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
                          <label className="block text-sm font-semibold text-foreground mb-2">
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
                            className="w-full px-4 py-3 border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          >
                            <option value={1}>Dễ</option>
                            <option value={2}>Trung bình</option>
                            <option value={3}>Khó</option>
                          </select>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Giải thích
                          </label>
                          <div className="rounded-xl overflow-hidden border border-border">
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
                            <label className="block text-sm font-semibold text-foreground">
                              Phương án trả lời{" "}
                              <span className="text-destructive">*</span>
                            </label>
                            {quiz.options.length < 4 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(activeQuizIndex)}
                                leftIcon={<Plus className="h-4 w-4" />}
                              >
                                Thêm phương án
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {quiz.options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                  option.is_correct
                                    ? "bg-success-bg/50 border-success-border shadow-xs"
                                    : "bg-surface-muted/50 border-border hover:border-primary-pastel"
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
                                      className="w-5 h-5 text-primary border-border focus:ring-primary cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-primary bg-primary-light px-2.5 py-1 rounded-md">
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
                                        className={`flex-1 px-3 py-2 border rounded-lg bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                                          option.is_correct
                                            ? "border-success-border focus:ring-primary"
                                            : "border-border focus:ring-primary"
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
                                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-surface text-foreground placeholder:text-muted-foreground"
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
                                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive-bg rounded-lg transition-colors mt-1 flex-shrink-0"
                                      title="Xóa phương án"
                                    >
                                      <XCircle className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                                {option.is_correct && (
                                  <div className="mt-3">
                                    <Badge variant="success" size="sm">
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                                      Đây là đáp án đúng
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              )}

              {/* Navigation between quizzes */}
              {quizzes.length > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveQuizIndex(
                        activeQuizIndex > 0
                          ? activeQuizIndex - 1
                          : quizzes.length - 1
                      )
                    }
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Câu trước
                  </Button>
                  <span className="text-sm text-muted-foreground font-medium">
                    {activeQuizIndex + 1} / {quizzes.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveQuizIndex(
                        activeQuizIndex < quizzes.length - 1
                          ? activeQuizIndex + 1
                          : 0
                      )
                    }
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Câu sau
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-1">
                  Xem lại và hoàn tất
                </h2>
                <p className="text-sm text-muted-foreground">
                  Kiểm tra lại thông tin trước khi tạo bài học quiz
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Info Review */}
                <Card variant="muted" className="border border-border p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    Thông tin cơ bản
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Tiêu đề:
                      </span>
                      <p className="text-sm text-foreground font-medium mt-1">
                        {formData.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground">
                        Mô tả:
                      </span>
                      <div className="text-sm text-foreground mt-1 prose max-w-none">
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
                </Card>

                {/* Quizzes Review */}
                <Card variant="muted" className="border border-border p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    Câu hỏi ({quizzes.length})
                  </h3>
                  <div className="space-y-4">
                    {quizzes.map((quiz, quizIndex) => (
                      <Card
                        key={quizIndex}
                        className="bg-surface border border-border p-4"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {quizIndex + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-2">
                              {quiz.question}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" size="sm">
                                {quiz.difficulty_level === 1
                                  ? "Dễ"
                                  : quiz.difficulty_level === 2
                                  ? "Trung bình"
                                  : "Khó"}
                              </Badge>
                            </div>
                            {quiz.explanation && (
                              <p className="text-sm text-muted-foreground mb-3">
                                <span className="font-medium text-foreground">
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
                              className={`p-3 rounded-lg border ${
                                option.is_correct
                                  ? "bg-success-bg/50 border-success-border"
                                  : "bg-surface-muted/50 border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {option.is_correct && (
                                  <CheckCircle2 className="h-4 w-4 text-success-foreground flex-shrink-0" />
                                )}
                                <p
                                  className={`text-sm ${
                                    option.is_correct
                                      ? "text-success-foreground font-medium"
                                      : "text-foreground"
                                  }`}
                                >
                                  {option.text}
                                </p>
                              </div>
                              {option.feedback && (
                                <p className="text-xs text-muted-foreground mt-1 ml-6">
                                  Phản hồi: {option.feedback}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <Card className="flex items-center justify-between border border-border bg-surface shadow-xs p-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Quay lại
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Tiếp theo
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Đang xử lý..."
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Hoàn tất
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreateQuizLesson;
