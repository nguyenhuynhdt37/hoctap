"use client";

import TiptapEditor from "@/components/shared/tiptap_editor";
import { Alert, Button, Card } from "@/components/ui";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type {
  LessonDetail,
  VideoData,
  VideoFormData,
} from "@/types/lecturer/lesson-api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Save,
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

const EDIT_VIDEO_SCHEMA = {
  source: {
    type: "string",
    default: "youtube",
    allowed: ["youtube", "file"] as const,
  },
} as const;

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

function extractYoutubeId(url: string): string | null {
  const trimmed = (url || "").trim();
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

const EditVideoLesson = () => {
  const router = useRouter();
  const params = useParams();
  const lessonId = (params?.id as string) || "";

  const { values: urlState, setParam } = useUrlQueryState(EDIT_VIDEO_SCHEMA);
  const activeSource = urlState.source;

  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [localDurationSec, setLocalDurationSec] = useState<number>(0);

  const [pipelineState, setPipelineState] =
    useState<LessonPipelineState | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineDoneRef = useRef(false);
  const videoData404Ref = useRef(false);

  const [formData, setFormData] = useState<VideoFormData>({
    title: "",
    description: "",
    is_preview: false,
    uploadMethod: "youtube",
    video_url: "",
    video_file: null,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof VideoFormData, string>>
  >({});

  // Data fetching
  const {
    data: lessonDetail,
    isLoading: isLoadingLesson,
    mutate: mutateLessonDetail,
  } = useSWR<LessonDetail>(
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
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 404) {
          videoData404Ref.current = true;
        }
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        return status !== 404;
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

  const sectionName = useMemo(() => {
    if (!chaptersData?.sections || !lessonDetail?.section_id) return "";
    return (
      chaptersData.sections.find(
        (s: { section_id: string; section_title: string }) =>
          s.section_id === lessonDetail.section_id
      )?.section_title || ""
    );
  }, [chaptersData, lessonDetail]);

  // Reset refs when lessonId changes
  useEffect(() => {
    videoData404Ref.current = false;
    setMounted(false);
  }, [lessonId]);

  // Populate initial form data
  useEffect(() => {
    if (lessonDetail && !mounted) {
      setFormData({
        title: lessonDetail.title || "",
        description: lessonDetail.description || "",
        is_preview: lessonDetail.is_preview || false,
        uploadMethod:
          videoData && videoData.source_type !== "youtube_url"
            ? "file"
            : "youtube",
        video_url: videoData?.video_url || "",
        video_file: null,
      });
      setMounted(true);
    }
  }, [lessonDetail, mounted, videoData]);

  // Sync video_url when videoData arrives after lessonDetail
  useEffect(() => {
    if (mounted && videoData && !videoData404Ref.current) {
      setFormData((prev) =>
        prev.video_url
          ? prev
          : {
              ...prev,
              video_url: videoData.video_url || "",
            }
      );
    }
  }, [mounted, videoData]);

  useEffect(() => {
    return () => {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    };
  }, [videoObjectUrl]);

  // WebSocket pipeline helpers
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
          lesson_id: incoming.lesson_id || prev?.lesson_id || lessonId,
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
          mutateVideoData().catch(() => undefined);
        }
        return merged;
      });
    },
    [lessonId, mutateVideoData]
  );

  const startFallbackPoll = useCallback(
    (targetLessonId: string) => {
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
          }>(`/lecturer/lessons/${targetLessonId}/upload_progress`);
          if (res.data?.pipeline) {
            applyIncomingPipeline(res.data.pipeline);
          }
        } catch {
          // ignore
        }
      }, 3000);
    },
    [applyIncomingPipeline]
  );

  const startPipelineSocket = useCallback(
    (targetLessonId: string, retryCount = 0) => {
      cleanupPipelineConnections();
      pipelineDoneRef.current = false;
      connectWebSocket(
        `/api/v1/lecturer/lessons/ws/pipeline/${targetLessonId}`,
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
              startPipelineSocket(targetLessonId, retryCount + 1);
            }, 2500);
          } else if (!pipelineDoneRef.current) {
            startFallbackPoll(targetLessonId);
          }
        }
      )
        .then((ws) => {
          wsRef.current = ws;
          setWsConnected(true);
        })
        .catch(() => {
          setWsConnected(false);
          startFallbackPoll(targetLessonId);
        });
    },
    [applyIncomingPipeline, cleanupPipelineConnections, startFallbackPoll]
  );

  useEffect(() => {
    return () => {
      cleanupPipelineConnections();
    };
  }, [cleanupPipelineConnections]);

  // Derived states
  const plainDescription = useMemo(
    () => stripRichText(formData.description),
    [formData.description]
  );

  const hasLessonChanges = useMemo(() => {
    if (!lessonDetail) return false;
    return (
      formData.title.trim() !== (lessonDetail.title || "").trim() ||
      formData.description.trim() !== (lessonDetail.description || "").trim() ||
      formData.is_preview !== lessonDetail.is_preview
    );
  }, [formData, lessonDetail]);

  const hasVideoChanges = useMemo(() => {
    if (activeSource === "file") {
      return formData.video_file !== null;
    }
    const nextUrl = formData.video_url.trim();
    const curUrl = (videoData?.video_url || "").trim();
    return Boolean(nextUrl && nextUrl !== curUrl);
  }, [activeSource, formData.video_file, formData.video_url, videoData]);

  const hasChanges = hasLessonChanges || hasVideoChanges;

  const previewYoutubeUrl = useMemo(() => {
    const candidate =
      activeSource === "youtube"
        ? formData.video_url || videoData?.video_url || ""
        : videoData?.video_url || "";
    const id = extractYoutubeId(candidate);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }, [activeSource, formData.video_url, videoData]);

  const applyVideoFile = (file: File | null) => {
    if (!file) {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
      setLocalDurationSec(0);
      setFormData((prev) => ({ ...prev, video_file: null }));
      return;
    }
    if (!file.type.startsWith("video/")) {
      setErrors((prev) => ({
        ...prev,
        video_file: "Tệp được chọn phải có định dạng video",
      }));
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        video_file: "Tệp video không được vượt quá 2GB",
      }));
      return;
    }
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    setVideoObjectUrl(URL.createObjectURL(file));
    setLocalDurationSec(0);
    setFormData((prev) => ({ ...prev, video_file: file }));
    setErrors((prev) => ({ ...prev, video_file: undefined }));
  };

  // AI Generators
  const handleGenerateTitle = async () => {
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề nháp trước");
      return;
    }
    setIsGeneratingTitle(true);
    setError(null);
    try {
      const res = await api.post("/lecturers/chat/lesson/rewrite_the_title", {
        title: formData.title.trim(),
      });
      if (res.data && typeof res.data === "string") {
        setFormData((prev) => ({ ...prev, title: res.data }));
        showToast.success("AI đã tối ưu tiêu đề bài học");
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
      const res = await api.post("/lecturers/chat/lesson/create_description", {
        title: formData.title.trim(),
        section_name: sectionName || "Chương học chính",
      });
      if (res.data && typeof res.data === "string") {
        setFormData((prev) => ({ ...prev, description: res.data }));
        showToast.success("AI đã viết mô tả bài học");
      }
    } catch (err: unknown) {
      setError(formatApiError(err, "Không thể tạo mô tả tự động"));
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleReindex = async () => {
    if (!lessonId || isReindexing) return;
    setIsReindexing(true);
    setError(null);
    try {
      await api.post(`/lecturer/lessons/${lessonId}/reindex`);
      applyIncomingPipeline({
        lesson_id: lessonId,
        stage: "queued",
        stage_label: "Đang chạy lại chỉ mục AI",
        percent: 10,
        error: null,
        is_completed: false,
        message: "Đã nhận yêu cầu chạy lại trích xuất & tạo vector AI...",
      });
      startPipelineSocket(lessonId);
      showToast.success("Đã kích hoạt chạy lại chỉ mục AI");
    } catch (err: unknown) {
      const msg = formatApiError(err, "Không thể chạy lại chỉ mục AI");
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleSubmit = async () => {
    const newErrors: Partial<Record<keyof VideoFormData, string>> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tiêu đề bài học";
    }
    if (!plainDescription) {
      newErrors.description = "Vui lòng nhập mô tả bài học";
    }
    if (hasVideoChanges && activeSource === "youtube") {
      if (!extractYoutubeId(formData.video_url)) {
        newErrors.video_url =
          "Đường dẫn YouTube chưa hợp lệ (youtube.com/watch?v=... hoặc youtu.be/...)";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast.error("Vui lòng kiểm tra lại các trường bắt buộc");
      return;
    }
    if (!hasChanges) {
      showToast.info("Chưa có thay đổi nào cần lưu");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (hasLessonChanges) {
        await api.put(`/lecturer/lessons/${lessonId}`, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          is_preview: formData.is_preview,
        });
        await mutateLessonDetail();
      }

      if (hasVideoChanges) {
        setIsUploading(true);
        applyIncomingPipeline({
          lesson_id: lessonId,
          stage: activeSource === "file" ? "uploading" : "queued",
          stage_label:
            activeSource === "file"
              ? "Đang tải tệp video mới lên YouTube"
              : "Đang cập nhật liên kết & chỉ mục AI",
          percent: 5,
          error: null,
          is_completed: false,
          message:
            activeSource === "file"
              ? "Đang tải tệp video mới và tách âm thanh AI song song..."
              : "Đang liên kết YouTube mới và lập lại chỉ mục AI...",
        });
        startPipelineSocket(lessonId);

        if (activeSource === "file" && formData.video_file) {
          const fd = new FormData();
          fd.append("video", formData.video_file);
          await api.put(`/lecturer/lessons/${lessonId}/video/file`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          applyVideoFile(null);
        } else if (activeSource === "youtube" && formData.video_url.trim()) {
          await api.put(`/lecturer/lessons/${lessonId}/video/link`, {
            video_url: formData.video_url.trim(),
          });
          videoData404Ref.current = false;
          await mutateVideoData().catch(() => undefined);
        }
      }

      const msg = "Đã cập nhật bài học thành công!";
      setSuccessMessage(msg);
      showToast.success(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = formatApiError(err, "Đã xảy ra lỗi khi cập nhật bài học");
      setError(msg);
      showToast.error(msg);
      if (hasVideoChanges) {
        pipelineDoneRef.current = true;
        cleanupPipelineConnections();
        applyIncomingPipeline({
          stage: "failed",
          stage_label: "Cập nhật video thất bại",
          error: msg,
          message: msg,
          is_completed: false,
        });
      }
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (isLoadingLesson || !mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Đang tải trình biên tập bài học Video...
          </p>
        </div>
      </div>
    );
  }

  const courseId = lessonDetail?.course_id || "";
  const hasTranscript = (videoData?.transcript_length ?? 0) > 0;
  const displayDuration = localDurationSec || videoData?.duration_seconds || 0;

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar điều hướng 1 chạm */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={
              courseId
                ? `/lecturer/chapters?course_id=${courseId}`
                : "/lecturer/courses"
            }
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Chương & bài học</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/lecturer/resources?lesson_id=${lessonId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span>Tài liệu bài học</span>
            </Link>
            {courseId && (
              <Link
                href={`/lecturer/quizzes-lesson?lesson_id=${lessonId}&course_id=${courseId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-warning-border hover:bg-warning-bg/70 hover:text-warning-foreground"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Câu hỏi trắc nghiệm</span>
              </Link>
            )}
          </div>
        </div>

        {/* Hero Banner Cloudy Blue */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-info-bg/50 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/75 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Video className="h-3.5 w-3.5" />
                  <span>Biên tập bài học Video</span>
                </span>
                {sectionName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/85 px-3 py-1 text-xs font-semibold text-foreground">
                    <span>Chương:</span>
                    <span className="max-w-[260px] truncate text-primary">
                      {sectionName}
                    </span>
                  </span>
                )}
                {hasChanges && (
                  <span className="inline-flex items-center rounded-full border border-warning-border bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                    Có thay đổi chưa lưu
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formData.title.trim() || "Chỉnh sửa bài học Video"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Cập nhật nội dung, thay đổi nguồn video và quản lý trạng thái
                chỉ mục AI trực tiếp trên cùng một màn hình.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {videoData && !videoData404Ref.current && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleReindex}
                  isLoading={isReindexing}
                  loadingText="Đang chạy..."
                  leftIcon={
                    !isReindexing ? <RefreshCw className="h-4 w-4" /> : undefined
                  }
                >
                  Chạy lại chỉ mục AI
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || !hasChanges}
                isLoading={isSubmitting || isUploading}
                loadingText={isUploading ? "Đang tải video..." : "Đang lưu..."}
                leftIcon={
                  !isSubmitting && !isUploading ? (
                    <Save className="h-4 w-4" />
                  ) : undefined
                }
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            {error}
          </Alert>
        )}
        {successMessage && !pipelineState && (
          <Alert variant="success" className="mb-5">
            {successMessage}
          </Alert>
        )}

        {/* WebSocket Realtime Pipeline Progress */}
        {pipelineState && (
          <Card
            className={`mb-6 border-2 p-6 ${
              pipelineState.stage === "failed"
                ? "border-destructive-border bg-destructive-bg/40"
                : pipelineState.stage === "retrying"
                  ? "border-warning-border bg-warning-bg/45"
                  : pipelineState.is_completed
                    ? "border-success-border bg-success-bg/40"
                    : "border-primary-pastel bg-primary-light/30"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                    pipelineState.stage === "failed"
                      ? "border border-destructive-border bg-destructive-bg text-destructive-foreground"
                      : pipelineState.stage === "retrying"
                        ? "border border-warning-border bg-warning-bg text-warning-foreground"
                        : pipelineState.is_completed
                          ? "border border-success-border bg-success-bg text-success-foreground"
                          : "bg-primary text-primary-foreground"
                  }`}
                >
                  {pipelineState.stage === "failed" ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : pipelineState.stage === "retrying" ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : pipelineState.is_completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {pipelineState.stage_label}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        wsConnected
                          ? "border-success-border bg-success-bg text-success-foreground"
                          : "border-border bg-surface text-muted-foreground"
                      }`}
                    >
                      <Wifi animated={false} className="h-3 w-3" />
                      <span>
                        {wsConnected ? "WebSocket trực tiếp" : "Đồng bộ định kỳ"}
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pipelineState.message}
                  </p>
                  {pipelineState.source_label && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      <Bot animated={false} className="h-3 w-3" />
                      <span>Nguồn dữ liệu: {pipelineState.source_label}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-2xl font-bold text-foreground">
                  {pipelineState.percent.toFixed(0)}%
                </p>
                {pipelineState.stage === "failed" && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleReindex}
                    isLoading={isReindexing}
                    className="mt-2"
                    leftIcon={
                      !isReindexing ? (
                        <RefreshCw className="h-3.5 w-3.5" />
                      ) : undefined
                    }
                  >
                    Thử lại ngay
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/70 bg-surface p-4">
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
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, pipelineState.percent))}%`,
                  }}
                />
              </div>
              {pipelineState.error && (
                <p className="mt-2 rounded-xl border border-destructive-border bg-destructive-bg/70 px-3 py-2 text-xs text-destructive-foreground">
                  Chi tiết lỗi: {pipelineState.error}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Bố cục Studio 2 cột (8/4) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI (8/12) */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Nội dung bài học */}
            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2.5 border-b border-border/70 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    1. Thông tin bài học
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Chỉnh sửa tiêu đề, mô tả và quyền xem thử miễn phí
                  </p>
                </div>
              </div>

              <div className="space-y-5">
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
                    placeholder="Nhập tiêu đề bài học..."
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
                    placeholder="Nhập mô tả chi tiết bài học..."
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-xs font-medium text-destructive-foreground">
                      {errors.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-info-border bg-info-bg/55 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface shadow-xs">
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
                          ? "Học viên chưa mua khóa học vẫn xem được bài giảng này."
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

            {/* 2. Thay đổi nguồn Video */}
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
                      Giữ nguyên video cũ hoặc cập nhật link YouTube / tải tệp
                      video mới
                    </p>
                  </div>
                </div>

                <div className="inline-flex rounded-xl border border-border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setParam("source", "youtube")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeSource === "youtube"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Link YouTube</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setParam("source", "file")}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeSource === "file"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Tải tệp mới</span>
                  </button>
                </div>
              </div>

              {activeSource === "youtube" ? (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-foreground">
                    Đường dẫn video YouTube
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
                        setErrors((prev) => ({ ...prev, video_url: undefined }));
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
                    <p className="text-xs font-medium text-destructive-foreground">
                      {errors.video_url}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      Khi bạn đổi sang link YouTube khác và bấm Lưu thay đổi, hệ
                      thống sẽ tự động lập lại chỉ mục AI cho video mới.
                    </span>
                  </p>
                </div>
              ) : (
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
                    className={`rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
                      isDraggingFile
                        ? "border-primary bg-primary-light/50"
                        : "border-primary-pastel/80 bg-background/60 hover:border-primary"
                    }`}
                  >
                    <input
                      id="edit-video-file-input"
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        applyVideoFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                    <label
                      htmlFor="edit-video-file-input"
                      className="block cursor-pointer"
                    >
                      <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">
                        {formData.video_file
                          ? formData.video_file.name
                          : "Kéo thả tệp video mới để thay thế video cũ"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        MP4, MOV, WebM (tối đa 2GB) · Tự động tách âm thanh &
                        lập chỉ mục AI
                      </p>
                    </label>
                  </div>

                  {formData.video_file && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-success-border bg-success-bg/70 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-success-foreground">
                            {formData.video_file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(formData.video_file.size / 1_048_576).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Gỡ tệp video"
                        onClick={() => applyVideoFile(null)}
                        className="cursor-pointer rounded-lg p-1.5 text-destructive-foreground hover:bg-destructive-bg"
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
              )}
            </Card>

            {/* Thanh hành động dưới cùng */}
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() =>
                    router.push(
                      courseId
                        ? `/lecturer/chapters?course_id=${courseId}`
                        : "/lecturer/courses"
                    )
                  }
                  leftIcon={<Layers className="h-4 w-4" />}
                >
                  Về Chương & bài học
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isUploading || !hasChanges}
                  isLoading={isSubmitting || isUploading}
                  loadingText={
                    isUploading ? "Đang tải video..." : "Đang lưu..."
                  }
                  leftIcon={
                    !isSubmitting && !isUploading ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : undefined
                  }
                >
                  Lưu thay đổi
                </Button>
              </div>
            </Card>
          </div>

          {/* CỘT PHẢI (4/12): Live Player Preview & Trạng thái Chỉ mục AI */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-primary-pastel/80 bg-surface shadow-[0_18px_40px_-16px_rgba(53,111,167,0.16)]">
              <div className="flex items-center justify-between border-b border-border/70 bg-primary-light/50 px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Xem trước bài giảng</span>
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
                {activeSource === "file" && videoObjectUrl ? (
                  <video
                    src={videoObjectUrl}
                    controls
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (Number.isFinite(d) && d > 0) setLocalDurationSec(d);
                    }}
                    className="h-full w-full bg-black object-contain"
                  />
                ) : previewYoutubeUrl ? (
                  <iframe
                    src={previewYoutubeUrl}
                    title="Xem trước video bài học"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : videoData?.video_url ? (
                  <video
                    src={videoData.video_url}
                    controls
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-surface/90 text-primary">
                      <Play className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Bài học này chưa có video
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-[11px] font-semibold text-primary">
                  {sectionName || "Bài học Video"}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold text-foreground">
                  {formData.title.trim() || "Chưa có tiêu đề"}
                </h3>
                {displayDuration > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary-light/70 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Clock className="h-3 w-3" />
                    <span>Thời lượng: {formatDuration(displayDuration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thẻ trạng thái Chỉ mục AI (Gia sư AI RAG) */}
            <Card className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Chỉ mục Gia sư AI (RAG)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {hasTranscript
                        ? "Đã có dữ liệu transcript cho AI"
                        : "Chưa có transcript chi tiết"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    hasTranscript
                      ? "border-success-border bg-success-bg text-success-foreground"
                      : "border-warning-border bg-warning-bg text-warning-foreground"
                  }`}
                >
                  {hasTranscript ? "Sẵn sàng" : "Chưa có"}
                </span>
              </div>

              {videoData && !videoData404Ref.current && (
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  onClick={handleReindex}
                  isLoading={isReindexing}
                  loadingText="Đang chạy lại..."
                  leftIcon={
                    !isReindexing ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : undefined
                  }
                  className="mt-4 w-full"
                >
                  Chạy lại trích xuất & chỉ mục AI
                </Button>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EditVideoLesson;
