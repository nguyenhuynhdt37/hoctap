"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import { Alert, Button, Card } from "@/components/ui";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { VideoFormData } from "@/types/lecturer/lesson-api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Film,
  Layers,
  Lightbulb,
  Link as LinkIcon,
  Lock,
  Paperclip,
  Play,
  RefreshCw,
  Unlock,
  UploadCloud,
  Video,
  Wifi,
  X,
} from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

interface LessonPipelineState {
  lesson_id: string;
  stage:
    | "queued"
    | "uploading"
    | "extracting_audio"
    | "transcribing"
    | "embedding"
    | "retrying"
    | "completed"
    | "failed";
  stage_label: string;
  percent: number;
  upload_percent: number;
  speed_mb_s: number;
  uploaded_mb: number;
  total_mb: number;
  chunks_total: number;
  chunks_done: number;
  source_kind: string | null;
  source_label: string | null;
  attempt: number;
  max_attempts: number;
  next_retry_in: number;
  message: string;
  error: string | null;
  is_completed: boolean;
  video_url: string | null;
  video_id: string | null;
}

const PIPELINE_STEPS = [
  { key: "upload", label: "Tải video" },
  { key: "extract", label: "Trích nội dung" },
  { key: "embed", label: "Tạo vector AI" },
  { key: "done", label: "Hoàn tất" },
] as const;

function getPipelineStepIndex(stage: LessonPipelineState["stage"]): number {
  switch (stage) {
    case "queued":
    case "uploading":
      return 0;
    case "extracting_audio":
    case "transcribing":
      return 1;
    case "embedding":
    case "retrying":
      return 2;
    case "completed":
      return 4;
    default:
      return 2;
  }
}

const VIDEO_STUDIO_SCHEMA = {
  source: {
    type: "string",
    default: "file",
    allowed: ["file", "youtube"] as const,
  },
} as const;

function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]?.length === 11) return match[1];
  }
  return null;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function stripRichText(raw: string): string {
  return (raw || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

const CreateVideoLesson = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionId = searchParams.get("section_id");
  const courseId = searchParams.get("course_id");

  const { values: urlState, setParam } = useUrlQueryState(VIDEO_STUDIO_SCHEMA);
  const uploadMethod = urlState.source;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number>(0);

  const [pipelineState, setPipelineState] =
    useState<LessonPipelineState | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineDoneRef = useRef(false);

  const [formData, setFormData] = useState<VideoFormData>({
    title: "",
    description: "",
    is_preview: false,
    uploadMethod: "file",
    video_url: "",
    video_file: null,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof VideoFormData, string>>
  >({});

  // Đồng bộ uploadMethod với URL ?source=file|youtube
  useEffect(() => {
    setFormData((prev) =>
      prev.uploadMethod === uploadMethod ? prev : { ...prev, uploadMethod }
    );
  }, [uploadMethod]);

  // Cleanup object URL tránh rò rỉ bộ nhớ
  useEffect(() => {
    return () => {
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [videoObjectUrl]);

  // Fetch chapters để lấy tên chương học
  const { data: chaptersData } = useSWR(
    courseId ? `/lecturer/chapters/${courseId}` : null,
    async (url: string) => {
      const res = await api.get(url);
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const sectionName: string =
    chaptersData?.sections?.find(
      (section: { section_id: string; section_title: string }) =>
        section.section_id === sectionId
    )?.section_title || "";

  const youtubeEmbedUrl = useMemo(() => {
    if (!formData.video_url.trim()) return null;
    const id = extractYoutubeId(formData.video_url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }, [formData.video_url]);

  const plainDescription = useMemo(
    () => stripRichText(formData.description),
    [formData.description]
  );

  const checklist = useMemo(
    () => [
      {
        id: "title",
        label: "Tiêu đề bài học rõ ràng",
        done: formData.title.trim().length >= 3,
      },
      {
        id: "desc",
        label: "Mô tả nội dung bài học",
        done: plainDescription.length >= 10,
      },
      {
        id: "video",
        label:
          uploadMethod === "youtube"
            ? "Liên kết YouTube hợp lệ"
            : "Tệp video đã sẵn sàng",
        done:
          uploadMethod === "youtube"
            ? Boolean(youtubeEmbedUrl)
            : Boolean(formData.video_file),
      },
    ],
    [
      formData.title,
      plainDescription,
      uploadMethod,
      youtubeEmbedUrl,
      formData.video_file,
    ]
  );

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof VideoFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề bài học";
    }
    if (!plainDescription) {
      newErrors.description = "Vui lòng nhập mô tả bài học";
    }
    if (uploadMethod === "youtube") {
      if (!formData.video_url.trim()) {
        newErrors.video_url = "Vui lòng nhập đường dẫn video YouTube";
      } else if (!youtubeEmbedUrl) {
        newErrors.video_url =
          "Đường dẫn YouTube chưa hợp lệ (hỗ trợ youtube.com/watch?v=... hoặc youtu.be/...)";
      }
    } else if (!formData.video_file) {
      newErrors.video_file = "Vui lòng chọn tệp video để tải lên";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateTitle = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề nháp trước để AI tối ưu");
      return;
    }
    setIsGeneratingTitle(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/lesson/rewrite_the_title",
        { title: formData.title.trim() }
      );
      if (response.data && typeof response.data === "string") {
        setFormData((prev) => ({ ...prev, title: response.data }));
        showToast.success("AI đã tối ưu tiêu đề bài học");
      } else {
        setError("Không thể tối ưu tiêu đề tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo tiêu đề tự động"));
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề bài học trước");
      return;
    }
    setIsGeneratingDescription(true);
    setError(null);
    try {
      const response = await api.post(
        "/lecturers/chat/lesson/create_description",
        {
          title: formData.title.trim(),
          section_name: sectionName || "Chương học chính",
        }
      );
      if (response.data && typeof response.data === "string") {
        setFormData((prev) => ({ ...prev, description: response.data }));
        showToast.success("AI đã soạn mô tả bài học");
      } else {
        setError("Không thể tạo mô tả tự động. Vui lòng thử lại.");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo mô tả tự động"));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const applyVideoFile = (file: File | null) => {
    if (!file) {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
      setVideoDurationSec(0);
      setFormData((prev) => ({ ...prev, video_file: null }));
      return;
    }
    if (!file.type.startsWith("video/")) {
      setErrors((prev) => ({
        ...prev,
        video_file: "Tệp được chọn phải có định dạng video (MP4, MOV, WebM...)",
      }));
      return;
    }
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        video_file: "Tệp video không được vượt quá 2GB",
      }));
      return;
    }

    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    const nextObjUrl = URL.createObjectURL(file);
    setVideoObjectUrl(nextObjUrl);
    setVideoDurationSec(0);
    setFormData((prev) => ({ ...prev, video_file: file }));
    setErrors((prev) => ({ ...prev, video_file: undefined }));
  };

  const cleanupPipelineConnections = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (fallbackPollRef.current) {
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  const applyIncomingPipeline = useCallback(
    (incoming: Partial<LessonPipelineState>) => {
      setPipelineState((prev) => {
        const merged: LessonPipelineState = {
          lesson_id: incoming.lesson_id || prev?.lesson_id || "",
          stage: incoming.stage || prev?.stage || "queued",
          stage_label:
            incoming.stage_label || prev?.stage_label || "Đang xử lý",
          percent:
            typeof incoming.percent === "number"
              ? incoming.percent
              : (prev?.percent ?? 0),
          upload_percent:
            typeof incoming.upload_percent === "number"
              ? incoming.upload_percent
              : (prev?.upload_percent ?? 0),
          speed_mb_s:
            typeof incoming.speed_mb_s === "number"
              ? incoming.speed_mb_s
              : (prev?.speed_mb_s ?? 0),
          uploaded_mb:
            typeof incoming.uploaded_mb === "number"
              ? incoming.uploaded_mb
              : (prev?.uploaded_mb ?? 0),
          total_mb:
            typeof incoming.total_mb === "number"
              ? incoming.total_mb
              : (prev?.total_mb ?? 0),
          chunks_total:
            typeof incoming.chunks_total === "number"
              ? incoming.chunks_total
              : (prev?.chunks_total ?? 0),
          chunks_done:
            typeof incoming.chunks_done === "number"
              ? incoming.chunks_done
              : (prev?.chunks_done ?? 0),
          source_kind:
            incoming.source_kind !== undefined
              ? incoming.source_kind
              : (prev?.source_kind ?? null),
          source_label:
            incoming.source_label !== undefined
              ? incoming.source_label
              : (prev?.source_label ?? null),
          attempt: incoming.attempt ?? prev?.attempt ?? 1,
          max_attempts: incoming.max_attempts ?? prev?.max_attempts ?? 3,
          next_retry_in: incoming.next_retry_in ?? prev?.next_retry_in ?? 0,
          message: incoming.message || prev?.message || "",
          error:
            incoming.error !== undefined
              ? incoming.error
              : (prev?.error ?? null),
          is_completed:
            incoming.is_completed !== undefined
              ? incoming.is_completed
              : (prev?.is_completed ?? false),
          video_url: incoming.video_url ?? prev?.video_url ?? null,
          video_id: incoming.video_id ?? prev?.video_id ?? null,
        };

        if (merged.is_completed || merged.stage === "completed") {
          pipelineDoneRef.current = true;
          setSuccessMessage(
            merged.message || "Hoàn tất xử lý video & lập chỉ mục AI!"
          );
        }
        return merged;
      });
    },
    []
  );

  const startFallbackPoll = useCallback(
    (lessonId: string) => {
      if (fallbackPollRef.current) return;
      fallbackPollRef.current = setInterval(async () => {
        if (pipelineDoneRef.current) {
          if (fallbackPollRef.current) {
            clearInterval(fallbackPollRef.current);
            fallbackPollRef.current = null;
          }
          return;
        }
        try {
          const res = await api.get<{
            percent: number;
            speed_mb_s: number;
            uploaded_mb: number;
            total_mb: number;
            is_completed: boolean;
            pipeline?: LessonPipelineState | null;
          }>(`/lecturer/lessons/${lessonId}/upload_progress`);
          if (res.data?.pipeline) {
            applyIncomingPipeline(res.data.pipeline);
          } else if (res.data) {
            applyIncomingPipeline({
              lesson_id: lessonId,
              percent: res.data.percent,
              speed_mb_s: res.data.speed_mb_s,
              uploaded_mb: res.data.uploaded_mb,
              total_mb: res.data.total_mb,
              is_completed: res.data.is_completed,
              stage: res.data.is_completed ? "completed" : "uploading",
            });
          }
        } catch {
          // ignore transient poll error
        }
      }, 3000);
    },
    [applyIncomingPipeline]
  );

  const startPipelineSocket = useCallback(
    (lessonId: string, retryCount = 0) => {
      cleanupPipelineConnections();
      pipelineDoneRef.current = false;

      connectWebSocket(
        `/api/v1/lecturer/lessons/ws/pipeline/${lessonId}`,
        "LECTURER",
        (data) => {
          if (data && typeof data === "object") {
            applyIncomingPipeline(data as Partial<LessonPipelineState>);
          }
        },
        () => {
          setWsConnected(false);
          if (!pipelineDoneRef.current && retryCount < 5) {
            reconnectTimerRef.current = setTimeout(() => {
              startPipelineSocket(lessonId, retryCount + 1);
            }, 2500);
          } else if (!pipelineDoneRef.current) {
            startFallbackPoll(lessonId);
          }
        }
      )
        .then((ws) => {
          wsRef.current = ws;
          setWsConnected(true);
        })
        .catch(() => {
          setWsConnected(false);
          startFallbackPoll(lessonId);
        });
    },
    [applyIncomingPipeline, cleanupPipelineConnections, startFallbackPoll]
  );

  useEffect(() => {
    return () => {
      cleanupPipelineConnections();
    };
  }, [cleanupPipelineConnections]);

  const handleReindex = async () => {
    if (!createdLessonId || isReindexing) return;
    setIsReindexing(true);
    setError(null);
    try {
      await api.post(`/lecturer/lessons/${createdLessonId}/reindex`);
      pipelineDoneRef.current = false;
      applyIncomingPipeline({
        lesson_id: createdLessonId,
        stage: "queued",
        stage_label: "Đang chạy lại chỉ mục AI",
        percent: 10,
        error: null,
        is_completed: false,
        message: "Đã gửi yêu cầu chạy lại tiến trình tạo chỉ mục AI...",
      });
      startPipelineSocket(createdLessonId);
      showToast.success("Đã kích hoạt chạy lại chỉ mục AI");
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể chạy lại chỉ mục AI");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleBackToChapters = useCallback(() => {
    cleanupPipelineConnections();
    router.push(
      courseId ? `/lecturer/chapters?course_id=${courseId}` : "/lecturer/chapters"
    );
  }, [cleanupPipelineConnections, courseId, router]);

  const handleSubmit = async () => {
    if (!validateAll()) {
      showToast.error("Vui lòng hoàn thiện đầy đủ thông tin bài học và video");
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
      // Bước 1: Tạo bài học
      const createResponse = await api.post("/lecturer/lessons/create", {
        section_id: sectionId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        is_preview: formData.is_preview,
        lesson_type: "video",
      });

      const lessonId = createResponse.data?.id as string | undefined;
      if (!lessonId) {
        throw new Error("Không nhận được ID bài học từ máy chủ");
      }

      setCreatedLessonId(lessonId);
      setIsUploading(true);

      // Mở sẵn WebSocket theo dõi tiến độ realtime ngay trước khi kích hoạt upload/embedding
      applyIncomingPipeline({
        lesson_id: lessonId,
        stage: uploadMethod === "file" ? "uploading" : "queued",
        stage_label:
          uploadMethod === "file"
            ? "Đang tải video lên YouTube"
            : "Đang khởi tạo chỉ mục AI",
        percent: 5,
        total_mb: formData.video_file
          ? Number((formData.video_file.size / 1_048_576).toFixed(2))
          : 0,
        message:
          uploadMethod === "file"
            ? "Đang đẩy tệp video và tách âm thanh song song..."
            : "Đang liên kết YouTube và trích xuất nội dung AI...",
        error: null,
        is_completed: false,
      });
      startPipelineSocket(lessonId);

      // Bước 2: Gắn video theo phương thức đã chọn
      if (uploadMethod === "youtube") {
        await api.post(`/lecturer/lessons/${lessonId}/create/video/url`, {
          video_url: formData.video_url.trim(),
        });
        showToast.success("Đã gắn YouTube — đang chạy chỉ mục AI realtime!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (uploadMethod === "file" && formData.video_file) {
        const formDataUpload = new FormData();
        formDataUpload.append("video", formData.video_file);

        await api.post(
          `/lecturer/lessons/${lessonId}/create/video`,
          formDataUpload,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        showToast.success("Đã bắt đầu tải video & lập chỉ mục AI realtime!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi tạo bài học video");
      setError(msg);
      showToast.error(msg);
      pipelineDoneRef.current = true;
      cleanupPipelineConnections();
      applyIncomingPipeline({
        stage: "failed",
        stage_label: "Gắn video thất bại",
        error: msg,
        message: msg,
        is_completed: false,
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!sectionId || !courseId) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <Alert variant="destructive" title="Thiếu thông tin cần thiết">
            <p className="text-sm">
              Thiếu tham số <code>section_id</code> hoặc <code>course_id</code>.
              Vui lòng quay lại trang Chương & bài học.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/lecturer/courses")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Về danh sách khóa học
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar điều hướng 1 chạm */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/lecturer/chapters?course_id=${courseId}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Chương & bài học</span>
            </Link>
            <Link
              href={`/lecturer/lessons/create?section_id=${sectionId}&course_id=${courseId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Đổi loại bài học</span>
            </Link>
          </div>
        </div>

        {/* Hero Banner Cloudy Blue */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-info-bg/50 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/75 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Video className="h-3.5 w-3.5" />
                  <span>Video Lesson Studio</span>
                </span>
                {sectionName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-1 text-xs font-semibold text-foreground">
                    <span>Chương:</span>
                    <span className="max-w-[260px] truncate text-primary">
                      {sectionName}
                    </span>
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formData.title.trim() || "Tạo bài học Video mới"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Soạn thông tin bài giảng, tải video trực tiếp hoặc nhúng YouTube
                và xem trước ngay trình phát bên cột phải.
              </p>
            </div>

            {!createdLessonId && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading}
                isLoading={isSubmitting || isUploading}
                loadingText={
                  isUploading ? "Đang tải video..." : "Đang tạo bài học..."
                }
                leftIcon={
                  !isSubmitting && !isUploading ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : undefined
                }
              >
                Tạo bài học Video
              </Button>
            )}
          </div>
        </section>

        {/* Thông báo lỗi */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            {error}
          </Alert>
        )}

        {/* Khối WebSocket Realtime Pipeline Progress (Upload + Trích xuất + Embedding + Auto-Retry) */}
        {(pipelineState || successMessage) && (
          <Card
            className={`mb-6 border-2 p-6 ${
              pipelineState?.stage === "failed"
                ? "border-destructive-border bg-destructive-bg/40"
                : pipelineState?.stage === "retrying"
                  ? "border-warning-border bg-warning-bg/45"
                  : pipelineState?.is_completed
                    ? "border-success-border bg-success-bg/40"
                    : "border-primary-pastel bg-primary-light/30"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                    pipelineState?.stage === "failed"
                      ? "bg-destructive-bg text-destructive-foreground border border-destructive-border"
                      : pipelineState?.stage === "retrying"
                        ? "bg-warning-bg text-warning-foreground border border-warning-border"
                        : pipelineState?.is_completed
                          ? "bg-success-bg text-success-foreground border border-success-border"
                          : "bg-primary text-primary-foreground"
                  }`}
                >
                  {pipelineState?.stage === "failed" ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : pipelineState?.stage === "retrying" ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : pipelineState?.is_completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">
                      {pipelineState?.stage_label ||
                        "Bài học Video đã được tạo thành công!"}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        wsConnected
                          ? "border-success-border bg-success-bg text-success-foreground"
                          : "border-border bg-surface text-muted-foreground"
                      }`}
                    >
                      <Wifi animated={false} className="h-3 w-3" />
                      <span>{wsConnected ? "WebSocket trực tiếp" : "Đồng bộ định kỳ"}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pipelineState?.message || successMessage}
                  </p>
                  {pipelineState?.source_label && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      <Bot animated={false} className="h-3 w-3" />
                      <span>Nguồn dữ liệu: {pipelineState.source_label}</span>
                    </p>
                  )}
                </div>
              </div>

              {pipelineState && (
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-2xl font-bold text-foreground">
                    {pipelineState.percent.toFixed(0)}%
                  </p>
                  {pipelineState.speed_mb_s > 0 &&
                    pipelineState.stage === "uploading" && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {pipelineState.speed_mb_s.toFixed(2)} MB/s
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Timeline 4 chặng realtime */}
            {pipelineState && (
              <div className="mt-5 rounded-2xl border border-border/70 bg-surface p-4">
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const currentIdx = getPipelineStepIndex(pipelineState.stage);
                    const done = currentIdx > idx || pipelineState.is_completed;
                    const active =
                      currentIdx === idx &&
                      !pipelineState.is_completed &&
                      pipelineState.stage !== "failed";
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                          done
                            ? "border-success-border bg-success-bg/70 text-success-foreground"
                            : active
                              ? "border-primary bg-primary-light/70 text-primary"
                              : "border-border bg-background/60 text-muted-foreground"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2
                            animated={false}
                            className="h-4 w-4 shrink-0"
                          />
                        ) : (
                          <Circle
                            animated={false}
                            className={`h-4 w-4 shrink-0 ${
                              active ? "animate-pulse" : "opacity-60"
                            }`}
                          />
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Thanh tiến độ tổng */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-light">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pipelineState.stage === "failed"
                        ? "bg-destructive-foreground"
                        : pipelineState.stage === "retrying"
                          ? "bg-[#C98A2C]"
                          : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, pipelineState.percent))}%`,
                    }}
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3">
                    {pipelineState.total_mb > 0 && (
                      <span>
                        Dung lượng: {pipelineState.uploaded_mb.toFixed(1)} /{" "}
                        {pipelineState.total_mb.toFixed(1)} MB
                      </span>
                    )}
                    {pipelineState.chunks_total > 0 && (
                      <span>
                        Vector AI: {pipelineState.chunks_done}/
                        {pipelineState.chunks_total} đoạn
                      </span>
                    )}
                    {pipelineState.attempt > 1 && (
                      <span className="font-semibold text-warning-foreground">
                        Lần thử {pipelineState.attempt}/
                        {pipelineState.max_attempts}
                      </span>
                    )}
                  </div>
                  {!pipelineState.is_completed &&
                    pipelineState.stage !== "failed" && (
                      <span>
                        Tiến trình vẫn tiếp tục chạy nền nếu bạn rời trang.
                      </span>
                    )}
                </div>

                {pipelineState.error && (
                  <p className="mt-2 rounded-xl border border-destructive-border bg-destructive-bg/70 px-3 py-2 text-xs text-destructive-foreground">
                    Chi tiết lỗi: {pipelineState.error}
                  </p>
                )}
              </div>
            )}

            {createdLessonId && (
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                {pipelineState?.stage === "failed" && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleReindex}
                    isLoading={isReindexing}
                    loadingText="Đang khởi động lại..."
                    leftIcon={
                      !isReindexing ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : undefined
                    }
                  >
                    Chạy lại chỉ mục AI
                  </Button>
                )}
                <Button
                  type="button"
                  variant={
                    pipelineState?.stage === "failed" ? "outline" : "primary"
                  }
                  size="sm"
                  onClick={handleBackToChapters}
                  leftIcon={<Layers className="h-4 w-4" />}
                >
                  Về Chương & bài học
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/lecturer/resources?lesson_id=${createdLessonId}`)
                  }
                  leftIcon={<Paperclip className="h-4 w-4" />}
                >
                  Thêm tài liệu đính kèm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/lecturer/quizzes-lesson?lesson_id=${createdLessonId}&course_id=${courseId}`
                    )
                  }
                  leftIcon={<ClipboardList className="h-4 w-4" />}
                >
                  Gắn câu hỏi trắc nghiệm
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Bố cục Studio 2 cột (8/4) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI (8/12): Thông tin & Nguồn Video */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Thông tin bài học */}
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-border/70 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    1. Nội dung bài học
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Đặt tiêu đề hấp dẫn, mô tả ngắn gọn trọng tâm bài giảng
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Tiêu đề */}
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Tiêu đề bài học{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateTitle}
                      disabled={isGeneratingTitle || !formData.title.trim()}
                      isLoading={isGeneratingTitle}
                      loadingText="AI đang viết..."
                      leftIcon={
                        !isGeneratingTitle ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : undefined
                      }
                    >
                      AI tối ưu tiêu đề
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }));
                      if (errors.title) {
                        setErrors((prev) => ({ ...prev, title: undefined }));
                      }
                    }}
                    placeholder="Ví dụ: Bài 1 — Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc 3"
                    className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.title
                        ? "border-destructive-border focus:border-destructive-foreground focus:ring-destructive-border/40"
                        : "border-border focus:border-primary focus:ring-primary/20"
                    }`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs font-medium text-destructive-foreground">
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Mô tả */}
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Mô tả bài học{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={
                        isGeneratingDescription || !formData.title.trim()
                      }
                      isLoading={isGeneratingDescription}
                      loadingText="AI đang soạn..."
                      leftIcon={
                        !isGeneratingDescription ? (
                          <Bot className="h-3.5 w-3.5" />
                        ) : undefined
                      }
                    >
                      AI viết mô tả
                    </Button>
                  </div>
                  <TiptapEditor
                    value={formData.description}
                    onChange={(content) => {
                      setFormData((prev) => ({ ...prev, description: content }));
                      if (errors.description) {
                        setErrors((prev) => ({
                          ...prev,
                          description: undefined,
                        }));
                      }
                    }}
                    placeholder="Tóm tắt kiến thức chính, công thức trọng tâm hoặc lưu ý cho học viên..."
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-xs font-medium text-destructive-foreground">
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Cho phép học thử miễn phí */}
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-info-border bg-info-bg/55 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-info-foreground shadow-xs">
                      {formData.is_preview ? (
                        <Unlock className="h-4 w-4 text-success-foreground" />
                      ) : (
                        <Lock className="h-4 w-4 text-info-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Cho phép xem thử miễn phí (Preview)
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formData.is_preview
                          ? "Học viên chưa mua khóa học vẫn có thể xem trước bài video này."
                          : "Chỉ học viên đã đăng ký khóa học mới xem được bài giảng."}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_preview}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_preview: e.target.checked,
                        }))
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25" />
                  </label>
                </div>
              </div>
            </Card>

            {/* 2. Nguồn Video (Tải tệp trực tiếp ↔ Nhúng YouTube) */}
            <Card className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                    <Film className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      2. Nguồn Video bài giảng
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Chọn tải tệp video trực tiếp hoặc gắn liên kết YouTube
                    </p>
                  </div>
                </div>

                {/* Segmented Switch đồng bộ ?source=file|youtube */}
                <div className="inline-flex rounded-xl border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setParam("source", "file")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      uploadMethod === "file"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Tải tệp Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParam("source", "youtube")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      uploadMethod === "youtube"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Link YouTube</span>
                  </button>
                </div>
              </div>

              {uploadMethod === "file" ? (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) applyVideoFile(file);
                    }}
                    className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                      isDraggingFile
                        ? "border-primary bg-primary-light/50"
                        : "border-primary-pastel/80 bg-background/60 hover:border-primary"
                    }`}
                  >
                    <input
                      id="video-studio-file-input"
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        applyVideoFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                    <label
                      htmlFor="video-studio-file-input"
                      className="block cursor-pointer"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">
                        {formData.video_file
                          ? formData.video_file.name
                          : "Kéo thả tệp video vào đây hoặc nhấp để chọn"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hỗ trợ MP4, MOV, WebM, AVI · Tối đa 2GB · Tự động xử lý
                        nền
                      </p>
                    </label>
                  </div>

                  {formData.video_file && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success-border bg-success-bg/70 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-success-foreground">
                            {formData.video_file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(formData.video_file.size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                            {videoDurationSec > 0
                              ? ` · Thời lượng ${formatDuration(videoDurationSec)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Gỡ tệp video"
                        onClick={() => applyVideoFile(null)}
                        className="cursor-pointer rounded-lg p-1.5 text-destructive-foreground transition-colors hover:bg-destructive-bg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {errors.video_file && (
                    <p className="text-xs font-medium text-destructive-foreground">
                      {errors.video_file}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">
                      Đường dẫn video YouTube{" "}
                      <span className="text-destructive-foreground">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          video_url: e.target.value,
                        }));
                        if (errors.video_url) {
                          setErrors((prev) => ({
                            ...prev,
                            video_url: undefined,
                          }));
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={`w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                        errors.video_url
                          ? "border-destructive-border focus:border-destructive-foreground focus:ring-destructive-border/40"
                          : "border-border focus:border-primary focus:ring-primary/20"
                      }`}
                    />
                    {errors.video_url && (
                      <p className="mt-1 text-xs font-medium text-destructive-foreground">
                        {errors.video_url}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>
                        Hỗ trợ liên kết <code>youtube.com/watch?v=...</code>,{" "}
                        <code>youtu.be/...</code> hoặc video Không công khai
                        (Unlisted).
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Thanh hành động dưới cùng */}
            {!createdLessonId && (
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleBackToChapters}
                    disabled={isSubmitting || isUploading}
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Hủy & Quay lại
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isUploading}
                    isLoading={isSubmitting || isUploading}
                    loadingText={
                      isUploading ? "Đang tải video..." : "Đang tạo bài học..."
                    }
                    leftIcon={
                      !isSubmitting && !isUploading ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : undefined
                    }
                  >
                    Tạo bài học Video
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* CỘT PHẢI (4/12): Live Video Player Preview & Checklist */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
            {/* Thẻ Xem trước trình phát Video */}
            <div className="overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface shadow-[0_18px_40px_-16px_rgba(53,111,167,0.16)]">
              <div className="flex items-center justify-between border-b border-border/70 bg-primary-light/50 px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Xem trước trình phát</span>
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    formData.is_preview
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {formData.is_preview ? "Học thử miễn phí" : "Dành cho học viên"}
                </span>
              </div>

              <div className="aspect-video w-full bg-gradient-to-br from-primary-light via-surface-muted to-accent/35">
                {uploadMethod === "youtube" && youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title="Xem trước video YouTube"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : uploadMethod === "file" && videoObjectUrl ? (
                  <video
                    src={videoObjectUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      if (Number.isFinite(dur) && dur > 0) {
                        setVideoDurationSec(dur);
                      }
                    }}
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-surface/90 text-primary shadow-xs">
                      <Play className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">
                      {uploadMethod === "youtube"
                        ? "Dán link YouTube để xem trước ngay"
                        : "Chọn tệp video để phát thử tại đây"}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-[11px] font-semibold text-primary">
                  {sectionName || "Bài học Video"}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold text-foreground">
                  {formData.title.trim() || "Tiêu đề bài học Video..."}
                </h3>
                {plainDescription && (
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {plainDescription}
                  </p>
                )}
                {videoDurationSec > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-light/70 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Clock className="h-3 w-3" />
                    <span>Thời lượng: {formatDuration(videoDurationSec)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist sẵn sàng xuất bản */}
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Kiểm tra trước khi tạo
              </p>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    {item.done ? (
                      <CheckCircle2
                        animated={false}
                        className="h-4 w-4 shrink-0 text-success-foreground"
                      />
                    ) : (
                      <Circle
                        animated={false}
                        className="h-4 w-4 shrink-0 text-muted-foreground/60"
                      />
                    )}
                    <span
                      className={
                        item.done
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateVideoLesson;
