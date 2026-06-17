"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiCheckCircle,
  HiChevronLeft,
  HiChevronRight,
  HiCloudUpload,
  HiLink,
  HiPlay,
  HiVideoCamera,
  HiXCircle,
} from "react-icons/hi";
import useSWR from "swr";
import { VideoFormData, UploadProgress } from "@/types/lecturer/lesson-api";

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
            Tạo bài học Video
          </h1>
          <p className="text-gray-600">
            Tạo bài học video từ YouTube hoặc upload file video
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
              Chọn phương thức
            </span>
            <span
              className={currentStep >= 2 ? "text-green-600 font-medium" : ""}
            >
              Upload video
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

        {/* Upload Progress */}
        {showUploadProgress && uploadProgress && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <HiCloudUpload className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Đang upload và xử lý video
                    </h3>
                    <p className="text-sm text-gray-600">
                      Video đang được upload và xử lý ở nền. Bạn có thể quay lại
                      sau.
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="font-medium">
                      Tiến độ: {uploadProgress.percent.toFixed(1)}%
                    </span>
                    {uploadProgress.speed_mb_s > 0 && (
                      <span className="text-gray-500">
                        {uploadProgress.speed_mb_s.toFixed(2)} MB/s
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  {uploadProgress.total_mb > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        Đã upload: {uploadProgress.uploaded_mb.toFixed(2)} MB
                      </span>
                      <span>Tổng: {uploadProgress.total_mb.toFixed(2)} MB</span>
                    </div>
                  )}
                </div>

                {uploadProgress.is_completed && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <HiCheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        Video đã được upload và xử lý thành công!
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToChapters}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Quay về danh sách bài học
                  </button>
                  {uploadProgress.is_completed ? (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Upload hoàn tất. Đang chuyển hướng về danh sách bài học
                      trong 3 giây...
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      💡 Upload sẽ tiếp tục chạy ở nền. Bạn có thể quay lại bất
                      cứ lúc nào.
                    </p>
                  )}
                </div>
              </div>
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
                  Nhập thông tin cơ bản để mô tả bài học video của bạn
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
                    placeholder="Ví dụ: Giới thiệu về Python"
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
                      placeholder="Mô tả chi tiết về nội dung bài học video này..."
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

                {/* Is Preview */}
                <div className="flex items-center gap-3">
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
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label
                    htmlFor="is_preview"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Cho phép xem trước bài học này (Preview)
                  </label>
                </div>
                <p className="text-xs text-gray-500 -mt-3 ml-8">
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Chọn phương thức upload video
                </h2>
                <p className="text-gray-600">
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
                  className={`p-6 border-2 rounded-xl transition-all text-left ${
                    formData.uploadMethod === "youtube"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        formData.uploadMethod === "youtube"
                          ? "bg-green-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <HiVideoCamera
                        className={`h-6 w-6 ${
                          formData.uploadMethod === "youtube"
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">YouTube URL</h3>
                      <p className="text-sm text-gray-600">
                        Liên kết video từ YouTube
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
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
                  className={`p-6 border-2 rounded-xl transition-all text-left ${
                    formData.uploadMethod === "file"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        formData.uploadMethod === "file"
                          ? "bg-green-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <HiCloudUpload
                        className={`h-6 w-6 ${
                          formData.uploadMethod === "file"
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Upload File</h3>
                      <p className="text-sm text-gray-600">
                        Tải video từ máy tính
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Upload file video trực tiếp. Hỗ trợ định dạng MP4, MOV, AVI
                    (tối đa 2GB).
                  </p>
                </button>
              </div>

              {errors.uploadMethod && (
                <p className="text-red-600 text-sm mt-2">
                  {errors.uploadMethod}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Upload Video */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {formData.uploadMethod === "youtube"
                    ? "Nhập URL video YouTube"
                    : "Upload file video"}
                </h2>
                <p className="text-gray-600">
                  {formData.uploadMethod === "youtube"
                    ? "Dán link video YouTube của bạn vào ô bên dưới"
                    : "Chọn file video từ máy tính của bạn"}
                </p>
              </div>

              {formData.uploadMethod === "youtube" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      URL Video YouTube <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <HiLink className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                            errors.video_url
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-300 focus:ring-green-500 focus:border-transparent"
                          }`}
                        />
                      </div>
                    </div>
                    {errors.video_url && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.video_url}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ hoặc
                      https://youtu.be/dQw4w9WgXcQ
                    </p>
                  </div>

                  {formData.video_url &&
                    !errors.video_url &&
                    (formData.video_url.includes("youtube.com") ||
                      formData.video_url.includes("youtu.be")) && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <HiVideoCamera className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              Video YouTube đã được nhận diện
                            </p>
                            <p className="text-sm text-gray-600">
                              Video sẽ được tự động tải lên hệ thống sau khi bạn
                              hoàn tất
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {formData.uploadMethod === "file" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      File Video <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
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
                        <HiCloudUpload className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Click để chọn file video
                        </p>
                        <p className="text-xs text-gray-500">
                          MP4, MOV, AVI (tối đa 2GB)
                        </p>
                      </label>
                    </div>
                    {errors.video_file && (
                      <p className="text-red-600 text-sm mt-2">
                        {errors.video_file}
                      </p>
                    )}
                  </div>

                  {formData.video_file && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <HiPlay className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {formData.video_file.name}
                            </p>
                            <p className="text-sm text-gray-600">
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
                          className="text-red-600 hover:text-red-700"
                        >
                          <HiXCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting || isUploading}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <HiChevronLeft className="h-5 w-5" />
            Quay lại
          </button>

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Tiếp theo
              <HiChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting || isUploading ? (
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

export default CreateVideoLesson;
