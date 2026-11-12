"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Link as LinkIcon,
  Play,
  Video,
  XCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import useSWR from "swr";
import { VideoFormData, UploadProgress } from "@/types/lecturer/lesson-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";

const CreateVideoLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<VideoFormData>({
    title: "",
    description: "",
    is_preview: false,
    uploadMethod: "",
    video_url: "",
    video_file: null,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof VideoFormData, string>>
  >({});

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

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof VideoFormData, string>> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.title.trim()) {
          newErrors.title = "Vui lòng nhập tiêu đề bài học";
        }
        // Check if description has actual content (strip markdown formatting)
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
      case 1: // Upload Method
        if (!formData.uploadMethod) {
          newErrors.uploadMethod = "Vui lòng chọn phương thức upload";
        }
        break;
      case 2: // Upload Video
        if (formData.uploadMethod === "youtube") {
          if (!formData.video_url.trim()) {
            newErrors.video_url = "Vui lòng nhập URL video YouTube";
          } else if (
            !formData.video_url.includes("youtube.com") &&
            !formData.video_url.includes("youtu.be")
          ) {
            newErrors.video_url = "URL không hợp lệ. Vui lòng nhập URL YouTube";
          }
        } else if (formData.uploadMethod === "file") {
          if (!formData.video_file) {
            newErrors.video_file = "Vui lòng chọn file video";
          }
        }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        setErrors((prev) => ({
          ...prev,
          video_file: "File phải là định dạng video",
        }));
        return;
      }

      // Validate file size (max 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          video_file: "File video không được vượt quá 2GB",
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        video_file: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setErrors((prev) => ({ ...prev, video_file: undefined }));
    }
  };

  // Check upload progress
  const checkUploadProgress = useCallback(async () => {
    if (!createdLessonId) return;

    try {
      const response = await api.get<UploadProgress>(
        `/lecturer/lessons/${createdLessonId}/upload_progress`
      );
      const progress = response.data;
      setUploadProgress(progress);

      // Nếu upload hoàn thành
      if (progress.is_completed) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setSuccessMessage("✅ Video đã được upload và xử lý thành công!");

        // Redirect sau 3 giây
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
        redirectTimeoutRef.current = setTimeout(() => {
          if (courseId) {
            router.push(`/lecturer/chapters?course_id=${courseId}`);
          } else {
            router.push("/lecturer/chapters");
          }
        }, 3000);
      }
    } catch (error: any) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [createdLessonId, courseId, router]);

  const startProgressPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    checkUploadProgress();
    const interval = setInterval(() => {
      checkUploadProgress();
    }, 2000);
    pollingIntervalRef.current = interval;
  }, [checkUploadProgress]);

  const stopProgressPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup polling và timeout khi component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Handler để quay về khi upload đang chạy nền
  const handleBackToChapters = useCallback(() => {
    stopProgressPolling();
    // Clear timeout redirect nếu có
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    if (courseId) {
      router.push(`/lecturer/chapters?course_id=${courseId}`);
    } else {
      router.push("/lecturer/chapters");
    }
  }, [stopProgressPolling, courseId, router]);

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (!sectionId) {
      setError("Thiếu thông tin section_id");
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
        is_preview: formData.is_preview,
        lesson_type: "video",
      });

      const lessonId = createResponse.data?.id;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ server");
      }

      setCreatedLessonId(lessonId);
      setSuccessMessage("✅ Tạo bài học thành công! Đang upload video...");

      // Step 2: Upload video based on method
      setIsUploading(true);

      if (formData.uploadMethod === "youtube") {
        // Upload YouTube URL
        await api.post(`/lecturer/lessons/${lessonId}/create/video/url`, {
          video_url: formData.video_url.trim(),
        });

        setSuccessMessage(
          "✅ Tạo bài học video thành công! Video YouTube đã được liên kết. Đang chuyển hướng..."
        );
      } else if (formData.uploadMethod === "file" && formData.video_file) {
        // Upload video file
        const formDataUpload = new FormData();
        formDataUpload.append("video", formData.video_file);

        await api.post(
          `/lecturer/lessons/${lessonId}/create/video`,
          formDataUpload,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        // Hiển thị progress tracking
        setShowUploadProgress(true);
        setUploadProgress({
          task_id: lessonId,
          percent: 0,
          speed_mb_s: 0,
          uploaded_mb: 0,
          total_mb: 0,
          video_url: null,
          video_id: null,
          is_completed: false,
        });
        startProgressPolling();
        setIsUploading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Redirect after 3 seconds to give user time to see the message
      setTimeout(() => {
        if (courseId) {
          router.push(`/lecturer/chapters?course_id=${courseId}`);
        } else {
          router.push("/lecturer/chapters");
        }
      }, 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tạo bài học video";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
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
            Tạo bài học Video
          </h1>
          <p className="text-sm text-muted-foreground">
            Tạo bài học video từ YouTube hoặc upload file video
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
              Chọn phương thức
            </span>
            <span
              className={
                currentStep >= 2
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }
            >
              Upload video
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

        {/* Upload Progress */}
        {showUploadProgress && uploadProgress && (
          <Card variant="pastel-blue" className="p-6 mb-6 border border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-xs">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      Đang upload và xử lý video
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Video đang được upload và xử lý ở nền. Bạn có thể quay lại
                      sau.
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">
                      Tiến độ: {uploadProgress.percent.toFixed(1)}%
                    </span>
                    {uploadProgress.speed_mb_s > 0 && (
                      <span className="text-muted-foreground">
                        {uploadProgress.speed_mb_s.toFixed(2)} MB/s
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-primary-light/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  {uploadProgress.total_mb > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>
                        Đã upload: {uploadProgress.uploaded_mb.toFixed(2)} MB
                      </span>
                      <span>Tổng: {uploadProgress.total_mb.toFixed(2)} MB</span>
                    </div>
                  )}
                </div>

                {uploadProgress.is_completed && (
                  <div className="mb-4">
                    <Alert variant="success">
                      Video đã được upload và xử lý thành công!
                    </Alert>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleBackToChapters}
                  >
                    Quay về danh sách bài học
                  </Button>
                  {uploadProgress.is_completed ? (
                    <p className="text-xs text-success-foreground font-medium">
                      Upload hoàn tất. Đang chuyển hướng về danh sách bài học
                      trong 3 giây...
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Upload sẽ tiếp tục chạy ở nền. Bạn có thể quay lại bất cứ
                      lúc nào.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
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
                  Nhập thông tin cơ bản để mô tả bài học video của bạn
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
                    placeholder="Ví dụ: Giới thiệu về Python"
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
                    Nhập tiêu đề và nhấn &ldquo;Tạo tiêu đề tự động&rdquo; để AI
                    tối ưu tiêu đề cho bạn
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
                      placeholder="Mô tả chi tiết về nội dung bài học video này..."
                      minHeight="200px"
                    />
                  </div>
                  {errors.description && (
                    <p className="text-destructive text-sm mt-1">
                      {errors.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhập tiêu đề và nhấn &ldquo;Tạo mô tả tự động&rdquo; để AI tạo
                    mô tả chi tiết cho bạn
                  </p>
                </div>

                {/* Is Preview */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_preview"
                    checked={formData.is_preview}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_preview: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-primary border-border rounded focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="is_preview"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Cho phép xem trước bài học này (Preview)
                  </label>
                </div>
                <p className="text-xs text-muted-foreground ml-8">
                  Học viên có thể xem bài học này miễn phí mà không cần đăng ký
                  khóa học
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Upload Method */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-1">
                  Chọn phương thức upload video
                </h2>
                <p className="text-sm text-muted-foreground">
                  Bạn muốn sử dụng video từ YouTube hay upload file video?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* YouTube Option */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      uploadMethod: "youtube",
                    }))
                  }
                  className={`p-6 border-2 rounded-2xl transition-all text-left cursor-pointer ${
                    formData.uploadMethod === "youtube"
                      ? "border-primary bg-primary-light/40 shadow-xs"
                      : "border-border hover:border-primary-pastel hover:bg-surface-muted bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                        formData.uploadMethod === "youtube"
                          ? "bg-primary text-white"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">YouTube URL</h3>
                      <p className="text-sm text-muted-foreground">
                        Liên kết video từ YouTube
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dán link YouTube vào bước tiếp theo. Video sẽ được tự động
                    tải lên hệ thống.
                  </p>
                </button>

                {/* File Upload Option */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      uploadMethod: "file",
                    }))
                  }
                  className={`p-6 border-2 rounded-2xl transition-all text-left cursor-pointer ${
                    formData.uploadMethod === "file"
                      ? "border-primary bg-primary-light/40 shadow-xs"
                      : "border-border hover:border-primary-pastel hover:bg-surface-muted bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                        formData.uploadMethod === "file"
                          ? "bg-primary text-white"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Upload File</h3>
                      <p className="text-sm text-muted-foreground">
                        Tải video từ máy tính
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload file video trực tiếp. Hỗ trợ định dạng MP4, MOV, AVI
                    (tối đa 2GB).
                  </p>
                </button>
              </div>

              {errors.uploadMethod && (
                <p className="text-destructive text-sm mt-2">
                  {errors.uploadMethod}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Upload Video */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-1">
                  {formData.uploadMethod === "youtube"
                    ? "Nhập URL video YouTube"
                    : "Upload file video"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formData.uploadMethod === "youtube"
                    ? "Dán link video YouTube của bạn vào ô bên dưới"
                    : "Chọn file video từ máy tính của bạn"}
                </p>
              </div>

              {formData.uploadMethod === "youtube" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      URL Video YouTube <span className="text-destructive">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={formData.video_url}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              video_url: e.target.value,
                            }))
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                            errors.video_url
                              ? "border-destructive focus:ring-destructive"
                              : "border-border focus:ring-primary focus:border-transparent"
                          }`}
                        />
                      </div>
                    </div>
                    {errors.video_url && (
                      <p className="text-destructive text-sm mt-1">
                        {errors.video_url}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ hoặc
                      https://youtu.be/dQw4w9WgXcQ
                    </p>
                  </div>

                  {formData.video_url &&
                    !errors.video_url &&
                    (formData.video_url.includes("youtube.com") ||
                      formData.video_url.includes("youtu.be")) && (
                      <Alert variant="info" icon={<Video className="h-5 w-5" />}>
                        <p className="font-semibold text-foreground">
                          Video YouTube đã được nhận diện
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Video sẽ được tự động tải lên hệ thống sau khi bạn hoàn
                          tất
                        </p>
                      </Alert>
                    )}
                </div>
              )}

              {formData.uploadMethod === "file" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      File Video <span className="text-destructive">*</span>
                    </label>
                    <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-8 text-center bg-surface-muted/30 transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="video-file-input"
                      />
                      <label
                        htmlFor="video-file-input"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-3 shadow-xs">
                          <UploadCloud className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Click để chọn file video
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP4, MOV, AVI (tối đa 2GB)
                        </p>
                      </label>
                    </div>
                    {errors.video_file && (
                      <p className="text-destructive text-sm mt-2">
                        {errors.video_file}
                      </p>
                    )}
                  </div>

                  {formData.video_file && (
                    <div className="bg-surface-muted border border-border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                          <Play className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {formData.video_file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(
                              formData.video_file.size /
                              (1024 * 1024)
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            video_file: null,
                          }));
                          setVideoPreview(null);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive-bg transition-colors"
                        aria-label="Xóa video đã chọn"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <Card className="flex items-center justify-between p-6 border border-border bg-surface shadow-xs">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting || isUploading}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Quay lại
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={isSubmitting || isUploading}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Tiếp theo
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              isLoading={isSubmitting || isUploading}
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

export default CreateVideoLesson;
