"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import {
  LessonDetail,
  UploadProgress,
  VideoData,
  VideoFormData,
} from "@/types/lecturer/lesson-api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";

// ============================================
// HELPER FUNCTIONS
// ============================================

const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

const EditVideoLesson = () => {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id as string;

  // ============================================
  // STATE
  // ============================================

  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoData404Ref = useRef<boolean>(false); // Track nếu video API đã trả về 404
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track timeout redirect

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

  // ============================================
  // DATA FETCHING
  // ============================================

  const { data: lessonDetail, mutate: mutateLessonDetail } =
    useSWR<LessonDetail>(
      lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
      async (url: string) => {
        const res = await api.get(url);
        return res.data;
      },
      { revalidateOnFocus: false }
    );

  const { data: videoData, mutate: mutateVideoData } = useSWR<VideoData>(
    lessonId && !videoData404Ref.current
      ? `/lecturer/lessons/${lessonId}/video`
      : null,
    async (url: string) => {
      try {
        const res = await api.get(url);
        return res.data;
      } catch (error: any) {
        // Nếu API trả về 404, set flag để không fetch lại
        if (error?.response?.status === 404) {
          videoData404Ref.current = true;
        }
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      // Không retry khi gặp 404
      shouldRetryOnError: (error: any) => {
        return error?.response?.status !== 404;
      },
    }
  );

  const { data: chaptersData } = useSWR(
    lessonDetail?.course_id
      ? `/lecturer/chapters/${lessonDetail.course_id}`
      : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const sectionName = useMemo(() => {
    if (!chaptersData?.sections || !lessonDetail?.section_id) return "";
    return (
      chaptersData.sections.find(
        (section: any) => section.section_id === lessonDetail.section_id
      )?.section_title || ""
    );
  }, [chaptersData, lessonDetail]);

  const progressPercentage = useMemo(
    () => ((currentStep + 1) / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  // Kiểm tra thay đổi lesson (title, description, is_preview)
  const hasLessonChanges = useMemo(() => {
    if (!lessonDetail) return false;

    // So sánh title (trim cả hai bên)
    const titleChanged =
      formData.title.trim() !== (lessonDetail.title || "").trim();

    // So sánh description (trim cả hai bên)
    const originalDescription = (lessonDetail.description || "").trim();
    const newDescription = formData.description.trim();
    const descriptionChanged = originalDescription !== newDescription;

    // So sánh is_preview
    const previewChanged = formData.is_preview !== lessonDetail.is_preview;

    return titleChanged || descriptionChanged || previewChanged;
  }, [formData, lessonDetail]);

  // Kiểm tra thay đổi video (URL hoặc file)
  const hasVideoChanges = useMemo(() => {
    // Nếu không có videoData (404), chỉ coi là thay đổi nếu user thực sự chọn video mới
    if (!videoData || videoData404Ref.current) {
      // Chỉ trả về true nếu user đã chọn phương thức và có dữ liệu video
      if (formData.uploadMethod === "youtube") {
        return formData.video_url.trim() !== "";
      }
      if (formData.uploadMethod === "file") {
        return formData.video_file !== null;
      }
      return false; // Không chọn phương thức nào → không có thay đổi
    }

    // Có videoData, kiểm tra thay đổi thực sự

    // Nếu uploadMethod không được set → không có thay đổi (giữ nguyên video hiện tại)
    if (!formData.uploadMethod) {
      return false;
    }

    // Nếu uploadMethod khớp với video hiện tại
    const isCurrentMethodYouTube =
      formData.uploadMethod === "youtube" &&
      videoData.source_type === "youtube_url";
    const isCurrentMethodFile =
      formData.uploadMethod === "file" &&
      videoData.source_type !== "youtube_url";

    // Nếu đang giữ nguyên phương thức hiện tại
    if (isCurrentMethodYouTube) {
      // Kiểm tra xem URL có thay đổi không
      const currentUrl = (videoData.video_url || "").trim();
      const newUrl = formData.video_url.trim();
      return newUrl !== "" && newUrl !== currentUrl;
    }

    if (isCurrentMethodFile) {
      // Kiểm tra xem có file mới được chọn không
      return formData.video_file !== null;
    }

    // Nếu đổi phương thức (từ YouTube sang File hoặc ngược lại)
    return true;
  }, [formData, videoData]);

  // Tổng hợp thay đổi
  const hasChanges = hasLessonChanges || hasVideoChanges;

  const isYouTubeVideo = videoData?.source_type === "youtube_url";
  const isCurrentVideoYouTube =
    isYouTubeVideo && videoData && !videoData404Ref.current;
  const isCurrentVideoFile =
    !isYouTubeVideo && videoData?.source_type && !videoData404Ref.current;

  // ============================================
  // INITIALIZE FORM DATA
  // ============================================

  // Reset videoData404Ref khi lessonId thay đổi (component mount lại)
  useEffect(() => {
    if (lessonId) {
      videoData404Ref.current = false;
    }
  }, [lessonId]);

  useEffect(() => {
    // Mount form ngay khi có lessonDetail (không cần đợi videoData)
    if (lessonDetail && !mounted) {
      // Luôn mount form với lesson data trước
      const initialFormData: VideoFormData = {
        title: lessonDetail.title || "",
        description: lessonDetail.description || "",
        is_preview: lessonDetail.is_preview || false,
        uploadMethod: "",
        video_url: "",
        video_file: null,
      };

      // Nếu có videoData và không phải 404, cập nhật thông tin video
      if (videoData && !videoData404Ref.current) {
        initialFormData.uploadMethod = isYouTubeVideo ? "youtube" : "file";
        initialFormData.video_url = videoData.video_url || "";
      }

      setFormData(initialFormData);
      setMounted(true);
      setIsLoading(false);
    }
  }, [lessonDetail, mounted, isYouTubeVideo, videoData]);

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Partial<Record<keyof VideoFormData, string>> = {};

      switch (step) {
        case 0:
          if (!formData.title.trim()) {
            newErrors.title = "Vui lòng nhập tiêu đề bài học";
          }
          if (!stripMarkdown(formData.description)) {
            newErrors.description = "Vui lòng nhập mô tả bài học";
          }
          break;

        case 1:
          if (!formData.uploadMethod) {
            newErrors.uploadMethod = "Vui lòng chọn phương thức upload";
          }
          break;

        case 2:
          // Chỉ validate video khi có thay đổi hoặc đang thay đổi phương thức
          if (formData.uploadMethod === "youtube") {
            // Validate YouTube URL chỉ khi URL thay đổi
            if (
              formData.video_url.trim() &&
              formData.video_url.trim() !== videoData?.video_url
            ) {
              if (
                !formData.video_url.includes("youtube.com") &&
                !formData.video_url.includes("youtu.be")
              ) {
                newErrors.video_url =
                  "URL không hợp lệ. Vui lòng nhập URL YouTube";
              }
            }
          } else if (formData.uploadMethod === "file") {
            // Chỉ yêu cầu file khi đang đổi từ YouTube sang file
            if (isYouTubeVideo && !formData.video_file) {
              newErrors.video_file =
                "Vui lòng chọn file video để thay đổi từ YouTube sang file";
            }
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData, videoData, isYouTubeVideo]
  );

  // ============================================
  // HANDLERS - NAVIGATION
  // ============================================

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [currentStep, totalSteps, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
      setError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // ============================================
  // HANDLERS - AI GENERATION
  // ============================================

  const handleGenerateTitle = useCallback(async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }

    setIsGeneratingTitle(true);
    setError(null);

    try {
      const response = await api.post(
        "/lecturers/chat/lesson/rewrite_the_title",
        { title: formData.title.trim() }
      );

      // API trả về text thuần trực tiếp
      const generatedTitle = response.data;

      if (generatedTitle && typeof generatedTitle === "string") {
        setFormData((prev) => ({ ...prev, title: generatedTitle }));
      } else {
        setError("Không thể tạo tiêu đề tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Không thể tạo tiêu đề tự động"
      );
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [formData.title]);

  const handleGenerateDescription = useCallback(async () => {
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
        setFormData((prev) => ({ ...prev, description: generatedDescription }));
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Không thể tạo mô tả tự động"
      );
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [formData.title, sectionName]);

  // ============================================
  // HANDLERS - FILE UPLOAD
  // ============================================

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("video/")) {
        setErrors((prev) => ({
          ...prev,
          video_file: "File phải là định dạng video",
        }));
        return;
      }

      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          video_file: "File video không được vượt quá 2GB",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, video_file: file }));
      setErrors((prev) => ({ ...prev, video_file: undefined }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setVideoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // ============================================
  // HANDLERS - UPLOAD PROGRESS
  // ============================================

  const checkUploadProgress = useCallback(async () => {
    if (!lessonId) return;

    try {
      const response = await api.get<UploadProgress>(
        `/lecturer/lessons/${lessonId}/upload_progress`
      );
      const progress = response.data;
      setUploadProgress(progress);

      // Nếu upload hoàn thành
      if (progress.is_completed) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Không gọi mutateVideoData() khi upload file vì video cần thời gian xử lý
        // API video có thể trả về 404 trong lúc này
        // Video sẽ được fetch lại khi user quay lại trang sau
        setSuccessMessage("✅ Video đã được upload và xử lý thành công!");

        // Redirect sau 3 giây
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
        redirectTimeoutRef.current = setTimeout(() => {
          if (lessonDetail?.course_id) {
            router.push(
              `/lecturer/chapters?course_id=${lessonDetail.course_id}`
            );
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
  }, [lessonId, lessonDetail, router]);

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

  // ============================================
  // HANDLERS - SUBMIT
  // ============================================

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep) || !lessonId) {
      if (!lessonId) {
        setError("Thiếu thông tin lesson ID");
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const messages: string[] = [];

      // Cập nhật lesson info (chỉ khi có thay đổi)
      if (hasLessonChanges) {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          is_preview: formData.is_preview,
        });
        messages.push("✅ Cập nhật thông tin bài học thành công!");
        await mutateLessonDetail();
      }

      if (hasVideoChanges) {
        setIsUploading(true);

        // Trường hợp 1: Upload video file
        if (formData.video_file) {
          const formDataUpload = new FormData();
          formDataUpload.append("video", formData.video_file);

          await api.put(
            `/lecturer/lessons/${lessonId}/video/file`,
            formDataUpload,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        }
        // Trường hợp 2: Update YouTube URL
        else if (
          formData.uploadMethod === "youtube" &&
          formData.video_url.trim()
        ) {
          try {
            // Gửi JSON body với video_url
            await api.put(`/lecturer/lessons/${lessonId}/video/link`, {
              video_url: formData.video_url.trim(),
            });

            messages.push("✅ Video YouTube đã được cập nhật!");
            videoData404Ref.current = false;
            try {
              await mutateVideoData();
            } catch (videoError: any) {
              if (videoError?.response?.status === 404) {
                videoData404Ref.current = true;
              }
            }
          } catch (youtubeError: any) {
            // Xử lý lỗi từ YouTube API
            const errorMessage =
              youtubeError?.response?.data?.detail ||
              youtubeError?.response?.data?.message ||
              youtubeError?.message ||
              "Lỗi khi cập nhật video YouTube";
            throw new Error(errorMessage);
          }
        } else {
          // Không có dữ liệu video để upload, không gọi API
          setIsUploading(false);
          return;
        }

        if (formData.video_file) {
          // Set videoData404Ref = true để tránh SWR gọi API video
          // vì video cần thời gian xử lý sau khi upload
          videoData404Ref.current = true;
          if (messages.length > 0) {
            setSuccessMessage(`${messages.join(" ")}`);
          }
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

        setIsUploading(false);
      }

      // Thông báo thành công (chỉ khi không có file upload đang chạy)
      if (messages.length > 0) {
        setSuccessMessage(`${messages.join(" ")} Đang chuyển hướng...`);
      } else {
        setSuccessMessage("✅ Không có thay đổi nào. Đang chuyển hướng...");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });

      setTimeout(() => {
        if (lessonDetail?.course_id) {
          router.push(`/lecturer/chapters?course_id=${lessonDetail.course_id}`);
        } else {
          router.push("/lecturer/chapters");
        }
      }, 3000);
    } catch (error: any) {
      setError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Đã xảy ra lỗi khi cập nhật bài học"
      );
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  }, [
    currentStep,
    validateStep,
    lessonId,
    formData,
    hasLessonChanges,
    hasVideoChanges,
    lessonDetail,
    mutateLessonDetail,
    mutateVideoData,
    router,
    startProgressPolling,
  ]);

  // Handler để quay về khi upload đang chạy nền
  const handleBackToChapters = useCallback(() => {
    stopProgressPolling();
    // Clear timeout redirect nếu có
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    if (lessonDetail?.course_id) {
      router.push(`/lecturer/chapters?course_id=${lessonDetail.course_id}`);
    } else {
      router.push("/lecturer/chapters");
    }
  }, [stopProgressPolling, lessonDetail, router]);

  // ============================================
  // EARLY RETURNS
  // ============================================

  if (!lessonId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 border border-border text-center">
          <Alert variant="destructive" title="Thiếu thông tin cần thiết">
            Thiếu thông tin lesson ID. Vui lòng quay lại trang trước.
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

  if (isLoading || !mounted || !lessonDetail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-sm text-muted-foreground">Đang tải...</span>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (lessonDetail?.course_id) {
                router.push(
                  `/lecturer/chapters?course_id=${lessonDetail.course_id}`
                );
              } else {
                router.push("/lecturer/chapters");
              }
            }}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            Quay lại danh sách bài học
          </Button>
          <h1 className="text-3xl font-bold font-display text-foreground mb-2">
            Chỉnh sửa bài học Video
          </h1>
          <p className="text-sm text-muted-foreground">
            Cập nhật thông tin và video cho bài học
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
                  Cập nhật thông tin cơ bản để mô tả bài học video của bạn
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
                    Nhập tiêu đề và nhấn &ldquo;Tạo mô tả tự động&rdquo; để AI tạo mô tả
                    chi tiết cho bạn
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
                  Video hiện tại hoặc chọn phương thức upload mới
                </p>
              </div>

              {/* Current Video Info */}
              {videoData && !videoData404Ref.current && (
                <Card variant="pastel-blue" className="p-6 border border-border">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-primary text-white rounded-xl flex items-center justify-center shadow-xs">
                        <Video className="h-7 w-7" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-2">
                        Video hiện tại
                      </h3>
                      {isYouTubeVideo ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              YouTube Video
                            </span>
                          </div>
                          <div className="bg-surface rounded-xl p-3 border border-border">
                            <p className="text-sm text-foreground break-all">
                              {videoData.video_url}
                            </p>
                            {videoData.duration_seconds && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Thời lượng:{" "}
                                {formatDuration(videoData.duration_seconds)}
                              </p>
                            )}
                          </div>
                          {videoData.file_id && (
                            <div className="mt-3">
                              <div className="w-full aspect-video rounded-xl overflow-hidden border border-border bg-slate-900">
                                <iframe
                                  src={`https://www.youtube.com/embed/${videoData.file_id}`}
                                  title="YouTube video player"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <UploadCloud className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              Video File
                            </span>
                          </div>
                          <div className="bg-surface rounded-xl p-3 border border-border">
                            <p className="text-sm text-foreground">
                              File ID: {videoData.file_id || "N/A"}
                            </p>
                            {videoData.duration_seconds && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Thời lượng:{" "}
                                {formatDuration(videoData.duration_seconds)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        Bạn có thể giữ nguyên video hiện tại hoặc chọn phương
                        thức khác bên dưới để thay đổi
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Chọn phương thức upload (hoặc giữ nguyên video hiện tại)
                </h3>
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
                        : isCurrentVideoYouTube
                        ? "border-primary-pastel bg-primary-light/20"
                        : "border-border hover:border-primary-pastel hover:bg-surface-muted bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                          formData.uploadMethod === "youtube" ||
                          isCurrentVideoYouTube
                            ? "bg-primary text-white"
                            : "bg-primary-light text-primary"
                        }`}
                      >
                        <Video className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">YouTube URL</h3>
                        <p className="text-sm text-muted-foreground">
                          Liên kết video từ YouTube
                        </p>
                        {isCurrentVideoYouTube && (
                          <Badge variant="success" size="sm" className="mt-1">
                            Đang sử dụng
                          </Badge>
                        )}
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
                      setFormData((prev) => ({ ...prev, uploadMethod: "file" }))
                    }
                    className={`p-6 border-2 rounded-2xl transition-all text-left cursor-pointer ${
                      formData.uploadMethod === "file"
                        ? "border-primary bg-primary-light/40 shadow-xs"
                        : isCurrentVideoFile
                        ? "border-primary-pastel bg-primary-light/20"
                        : "border-border hover:border-primary-pastel hover:bg-surface-muted bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                          formData.uploadMethod === "file" || isCurrentVideoFile
                            ? "bg-primary text-white"
                            : "bg-primary-light text-primary"
                        }`}
                      >
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">Upload File</h3>
                        <p className="text-sm text-muted-foreground">
                          Tải video từ máy tính
                        </p>
                        {isCurrentVideoFile && (
                          <Badge variant="success" size="sm" className="mt-1">
                            Đang sử dụng
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload file video trực tiếp. Hỗ trợ định dạng MP4, MOV,
                      AVI (tối đa 2GB).
                    </p>
                  </button>
                </div>
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
                    ? isCurrentVideoYouTube &&
                      formData.video_url === videoData?.video_url
                      ? "Video YouTube hiện tại sẽ được giữ nguyên. Để thay đổi, nhập URL mới vào ô bên dưới."
                      : "Dán link video YouTube của bạn vào ô bên dưới"
                    : isCurrentVideoFile
                    ? "Video file hiện tại sẽ được giữ nguyên. Để thay đổi, chọn file mới bên dưới."
                    : "Chọn file video từ máy tính của bạn"}
                </p>
              </div>

              {formData.uploadMethod === "youtube" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      URL Video YouTube
                      {!isCurrentVideoYouTube ||
                      formData.video_url !== videoData?.video_url ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-normal ml-2">
                          (Để giữ nguyên, không cần nhập)
                        </span>
                      )}
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
                          placeholder={
                            isCurrentVideoYouTube
                              ? videoData?.video_url ||
                                "https://www.youtube.com/watch?v=..."
                              : "https://www.youtube.com/watch?v=..."
                          }
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
                      {isCurrentVideoYouTube &&
                      formData.video_url === videoData?.video_url ? (
                        <span className="text-success-foreground font-medium">
                          ✓ Video hiện tại sẽ được giữ nguyên
                        </span>
                      ) : (
                        <>
                          Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                          hoặc https://youtu.be/dQw4w9WgXcQ
                        </>
                      )}
                    </p>
                  </div>

                  {formData.video_url &&
                    !errors.video_url &&
                    (formData.video_url.includes("youtube.com") ||
                      formData.video_url.includes("youtu.be")) &&
                    formData.video_url !== videoData?.video_url && (
                      <Alert variant="info" icon={<Video className="h-5 w-5" />}>
                        <p className="font-semibold text-foreground">
                          Video YouTube mới đã được nhận diện
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Video sẽ được tự động cập nhật trên hệ thống sau khi
                          bạn hoàn tất
                        </p>
                      </Alert>
                    )}
                </div>
              )}

              {formData.uploadMethod === "file" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      File Video
                      {isYouTubeVideo ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-normal ml-2">
                          (Để giữ nguyên video hiện tại, không cần chọn file mới)
                        </span>
                      )}
                    </label>
                    {isCurrentVideoFile && (
                      <div className="bg-surface-muted border border-border rounded-xl p-3 mb-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Video hiện tại: {videoData?.file_id || "N/A"}
                          </p>
                          {videoData?.duration_seconds && (
                            <p className="text-xs text-muted-foreground">
                              Thời lượng:{" "}
                              {formatDuration(videoData.duration_seconds)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
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
                          {isCurrentVideoFile
                            ? "Click để chọn file video mới"
                            : "Click để chọn file video"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MP4, MOV, AVI (tối đa 2GB)
                        </p>
                        {isCurrentVideoFile && (
                          <p className="text-xs text-primary font-medium mt-2">
                            Để giữ nguyên video hiện tại, không chọn file mới
                          </p>
                        )}
                      </label>
                    </div>
                    {errors.video_file && (
                      <p className="text-destructive text-sm mt-2">
                        {errors.video_file}
                      </p>
                    )}
                    {!formData.video_file && isCurrentVideoFile && (
                      <p className="text-xs text-success-foreground mt-2 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Video hiện tại sẽ được giữ nguyên
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
                          <p className="text-xs text-primary font-medium mt-0.5">
                            File mới sẽ thay thế video hiện tại
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
                        aria-label="Xóa video mới đã chọn"
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
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              {!hasChanges && (
                <Alert variant="warning" className="py-2 px-3 text-xs">
                  Chưa có thay đổi nào. Vui lòng chỉnh sửa thông tin trước khi lưu.
                </Alert>
              )}
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  isUploading ||
                  showUploadProgress ||
                  !hasChanges
                }
                isLoading={isSubmitting || isUploading || showUploadProgress}
                loadingText={showUploadProgress ? "Đang upload..." : "Đang xử lý..."}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                title={
                  !hasChanges
                    ? "Vui lòng thay đổi thông tin trước khi lưu"
                    : showUploadProgress
                    ? "Đang upload video, vui lòng đợi..."
                    : undefined
                }
              >
                Hoàn tất
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EditVideoLesson;
