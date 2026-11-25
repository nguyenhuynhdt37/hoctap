"use client";

import { Alert, Button, Card, EmptyState } from "@/components/ui";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { prepareImageUpload } from "@/lib/prepare-image-upload";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { LessonDetail } from "@/types/lecturer/lesson-api";
import type {
  CreateResourceLinkData,
  CreateResourceResponse,
  LessonResource,
} from "@/types/lecturer/resource";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "pulsoicon-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

const RESOURCES_QUERY_SCHEMA = {
  tab: {
    type: "string",
    default: "file",
    allowed: ["file", "link", "archive"] as const,
  },
  filter: {
    type: "string",
    default: "all",
    allowed: ["all", "file", "link", "archive"] as const,
  },
} as const;

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function getEmbedStatusMeta(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "done":
      return {
        label: "Đã lập chỉ mục AI",
        className:
          "border-success-border bg-success-bg text-success-foreground",
        canRetry: true,
      };
    case "processing":
      return {
        label: "Đang xử lý AI...",
        className: "border-primary-pastel bg-primary-light text-primary",
        canRetry: false,
      };
    case "error":
      return {
        label: "Lỗi chỉ mục AI",
        className:
          "border-destructive-border bg-destructive-bg text-destructive-foreground",
        canRetry: true,
      };
    case "empty":
      return {
        label: "Không có chữ để đọc",
        className:
          "border-warning-border bg-warning-bg text-warning-foreground",
        canRetry: true,
      };
    default:
      return {
        label: "Tệp đính kèm",
        className: "border-border bg-surface-muted text-muted-foreground",
        canRetry: false,
      };
  }
}

const Resources = () => {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const { values, setParam, searchParams } = useUrlQueryState(
    RESOURCES_QUERY_SCHEMA
  );
  const lessonId = params?.id || searchParams.get("lesson_id") || "";
  const activeTab = values.tab;
  const filterType = values.filter;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<CreateResourceLinkData[]>([
    { title: "", url: "" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingMap, setRetryingMap] = useState<Record<string, boolean>>({});
  const [resourceToDelete, setResourceToDelete] =
    useState<LessonResource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch lesson brief
  const { data: lessonDetail } = useSWR<LessonDetail | null>(
    lessonId ? `/lecturer/lessons/${lessonId}/detail` : null,
    async (url: string) => {
      try {
        const res = await api.get<LessonDetail>(url);
        return res.data;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Fetch resources
  const {
    data: resources,
    error,
    isLoading,
    mutate,
  } = useSWR<LessonResource[]>(
    lessonId ? `/lecturer/lessons/${lessonId}/resources` : null,
    async (url: string) => {
      const response = await api.get<LessonResource[]>(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 1500,
      keepPreviousData: true,
    }
  );

  // Tự động đồng bộ trạng thái embed_status realtime qua WebSocket của bài học
  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    connectWebSocket(
      `/api/v1/lecturer/lessons/ws/pipeline/${lessonId}`,
      "LECTURER",
      (data) => {
        if (!active || !data || typeof data !== "object") return;
        if (
          data.job_type === "resource" &&
          (data.is_completed ||
            data.stage === "completed" ||
            data.stage === "failed")
        ) {
          mutate();
        }
      }
    )
      .then((ws) => {
        if (!active) {
          ws.close();
          return;
        }
        wsRef.current = ws;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [lessonId, mutate]);

  const resourceList = resources || [];

  const stats = useMemo(() => {
    let done = 0;
    let processing = 0;
    let failed = 0;
    for (const r of resourceList) {
      const st = (r.embed_status || "").toLowerCase();
      if (st === "done") done += 1;
      else if (st === "processing") processing += 1;
      else if (st === "error") failed += 1;
    }
    return {
      total: resourceList.length,
      done,
      processing,
      failed,
    };
  }, [resourceList]);

  const filteredResources = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return resourceList.filter((r) => {
      const rType = (r.resource_type || "").toLowerCase();
      const typeOk =
        filterType === "all" ||
        (filterType === "link" && rType === "link") ||
        (filterType === "archive" &&
          (rType === "archive" || rType === "zip" || rType === "rar")) ||
        (filterType === "file" &&
          rType !== "link" &&
          rType !== "archive" &&
          rType !== "zip" &&
          rType !== "rar");
      const textOk =
        !q ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.url || "").toLowerCase().includes(q);
      return typeOk && textOk;
    });
  }, [resourceList, filterType, searchTerm]);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length > 0) {
      setSelectedFiles((prev) => [...prev, ...arr]);
    }
  };

  const handleSubmitFile = async () => {
    if (selectedFiles.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một tệp tài liệu!");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", await prepareImageUpload(file, "resource"));
      }
      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showToast.success(
        response.data.message ||
          "Đã tải lên tài liệu — hệ thống đang chạy chỉ mục AI dưới nền!"
      );
      setSelectedFiles([]);
      mutate();
    } catch (err: unknown) {
      showToast.error(
        formatApiError(err, "Có lỗi xảy ra khi tải lên tài liệu!")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitLinks = async () => {
    const validLinks = links.filter(
      (link) => link.title.trim() && link.url.trim()
    );
    if (validLinks.length === 0) {
      showToast.error("Vui lòng nhập ít nhất một liên kết hợp lệ!");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources/links`,
        validLinks
      );
      showToast.success(
        response.data.message || "Đã thêm liên kết tài nguyên!"
      );
      setLinks([{ title: "", url: "" }]);
      mutate();
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Có lỗi xảy ra khi thêm liên kết!"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitArchive = async () => {
    if (selectedFiles.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một tệp ZIP/RAR!");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      const response = await api.post<CreateResourceResponse>(
        `/lecturer/lessons/${lessonId}/resources/zip_rar`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      showToast.success(response.data.message || "Đã tải lên tệp nén!");
      setSelectedFiles([]);
      mutate();
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Có lỗi xảy ra khi tải lên tệp nén!"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReindexResource = async (resourceId: string) => {
    setRetryingMap((prev) => ({ ...prev, [resourceId]: true }));
    try {
      await api.post(`/lecturer/lessons/resources/${resourceId}/reindex`);
      showToast.success("Đã kích hoạt chạy lại chỉ mục AI cho tài liệu!");
      mutate();
    } catch (err: unknown) {
      showToast.error(
        formatApiError(err, "Không thể chạy lại chỉ mục AI cho tài liệu này")
      );
    } finally {
      setRetryingMap((prev) => ({ ...prev, [resourceId]: false }));
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/lecturer/lessons/resources/${resourceToDelete.id}`);
      showToast.success("Đã xóa tài nguyên!");
      setResourceToDelete(null);
      mutate();
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Có lỗi xảy ra khi xóa tài nguyên!"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lessonId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Alert variant="warning" title="Chưa chọn bài học">
          <p className="text-sm">
            Vui lòng chọn bài học từ trang Chương & bài học để quản lý tài
            nguyên đính kèm.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/lecturer/courses")}
          >
            Về danh sách khóa học
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-[1360px] px-4 pt-6 sm:px-6 lg:px-8">
        {/* Top Bar điều hướng 1 chạm */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              lessonDetail?.course_id
                ? router.push(
                    `/lecturer/chapters?course_id=${lessonDetail.course_id}`
                  )
                : router.back()
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm font-medium text-muted-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Chương & bài học</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/lecturer/lessons/${lessonId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary-pastel hover:bg-primary-light/50 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Chỉnh sửa bài học</span>
            </Link>
            {lessonDetail?.course_id && (
              <Link
                href={`/lecturer/quizzes-lesson?lesson_id=${lessonId}&course_id=${lessonDetail.course_id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-warning-border hover:bg-warning-bg/70 hover:text-warning-foreground"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Câu hỏi trắc nghiệm</span>
              </Link>
            )}
          </div>
        </div>

        {/* Hero Cloudy Blue */}
        <section className="relative mb-6 overflow-hidden rounded-[28px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/85 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.14)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/75 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Kho tài nguyên & Chỉ mục AI</span>
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lessonDetail?.title || "Quản lý tài nguyên bài học"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Đính kèm slide PDF, bài tập mẫu, liên kết tham khảo và tệp nén.
                Tài liệu PDF/Ảnh sẽ tự động chạy OCR & lập chỉ mục cho Gia sư AI
                trả lời chính xác hơn.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => mutate()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Làm mới trạng thái
            </Button>
          </div>
        </section>

        {/* Bento 4 Chỉ số pastel */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-primary-pastel/80 bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Tổng tài nguyên
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Paperclip className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-bold text-foreground">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-success-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Đã lập chỉ mục AI
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-bg text-success-foreground">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-bold text-success-foreground">
              {stats.done}
            </p>
          </div>

          <div className="rounded-2xl border border-info-border bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Đang xử lý AI
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-bg text-info-foreground">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-bold text-info-foreground">
              {stats.processing}
            </p>
          </div>

          <div className="rounded-2xl border border-destructive-border/80 bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Lỗi cần chạy lại
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive-bg text-destructive-foreground">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2.5 text-2xl font-bold text-destructive-foreground">
              {stats.failed}
            </p>
          </div>
        </div>

        {/* Bố cục 2 cột (5/7) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI (5/12): Trạm tải tài nguyên */}
          <div className="lg:col-span-5">
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground">
                Thêm tài nguyên mới
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Chọn loại tài nguyên bạn muốn đính kèm vào bài học này
              </p>

              {/* 3 Tabs đồng bộ URL ?tab=file|link|archive */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-background p-1">
                <button
                  type="button"
                  onClick={() => {
                    setParam("tab", "file");
                    setSelectedFiles([]);
                  }}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === "file"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>PDF / Tài liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParam("tab", "link")}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === "link"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Liên kết</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParam("tab", "archive");
                    setSelectedFiles([]);
                  }}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    activeTab === "archive"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Tệp ZIP/RAR</span>
                </button>
              </div>

              {/* Nội dung Tab File / Archive */}
              {activeTab === "file" || activeTab === "archive" ? (
                <div className="mt-5 space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.length) {
                        addFiles(e.dataTransfer.files);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                      isDragging
                        ? "border-primary bg-primary-light/50"
                        : "border-primary-pastel/80 bg-background/60 hover:border-primary"
                    }`}
                  >
                    <input
                      id="resource-studio-file-input"
                      type="file"
                      multiple
                      accept={
                        activeTab === "archive"
                          ? ".zip,.rar,.7z"
                          : ".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                      }
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="resource-studio-file-input"
                      className="block cursor-pointer"
                    >
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">
                        {activeTab === "archive"
                          ? "Kéo thả tệp ZIP / RAR vào đây"
                          : "Kéo thả PDF, Slide, Ảnh vào đây"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeTab === "archive"
                          ? "Gói mã nguồn mẫu hoặc bộ tài liệu nén"
                          : "Tệp PDF & Ảnh sẽ tự động lập chỉ mục cho Gia sư AI"}
                      </p>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="Gỡ tệp"
                            onClick={() =>
                              setSelectedFiles((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="cursor-pointer rounded-lg p-1 text-destructive-foreground hover:bg-destructive-bg"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isSubmitting || selectedFiles.length === 0}
                    isLoading={isSubmitting}
                    loadingText="Đang tải lên..."
                    leftIcon={
                      !isSubmitting ? (
                        <UploadCloud className="h-4 w-4" />
                      ) : undefined
                    }
                    onClick={
                      activeTab === "archive"
                        ? handleSubmitArchive
                        : handleSubmitFile
                    }
                  >
                    {activeTab === "archive"
                      ? `Tải lên ${selectedFiles.length || ""} tệp nén`
                      : `Tải lên ${selectedFiles.length || ""} tài liệu`}
                  </Button>
                </div>
              ) : (
                /* Nội dung Tab Liên kết */
                <div className="mt-5 space-y-3">
                  {links.map((link, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-2xl border border-border bg-background/60 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          Liên kết #{idx + 1}
                        </span>
                        {links.length > 1 && (
                          <button
                            type="button"
                            aria-label="Xóa liên kết"
                            onClick={() =>
                              setLinks((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="cursor-pointer text-xs text-destructive-foreground hover:underline"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) =>
                          setLinks((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, title: e.target.value }
                                : item
                            )
                          )
                        }
                        placeholder="Tên hiển thị (VD: Đề minh họa Bộ GD 2026)"
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) =>
                          setLinks((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, url: e.target.value } : item
                            )
                          )
                        }
                        placeholder="https://..."
                        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="pastel"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() =>
                        setLinks((prev) => [...prev, { title: "", url: "" }])
                      }
                    >
                      Thêm dòng
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      loadingText="Đang lưu..."
                      onClick={handleSubmitLinks}
                    >
                      Lưu liên kết
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* CỘT PHẢI (7/12): Danh sách tài nguyên & Trạng thái AI */}
          <div className="lg:col-span-7">
            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Danh sách tài nguyên ({filteredResources.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi trạng thái chỉ mục AI và chạy lại ngay nếu gặp lỗi
                  </p>
                </div>

                {/* Bộ lọc loại tài nguyên */}
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: "all", label: "Tất cả" },
                      { key: "file", label: "Tài liệu" },
                      { key: "link", label: "Liên kết" },
                      { key: "archive", label: "File nén" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setParam("filter", f.key)}
                      className={`cursor-pointer rounded-xl px-2.5 py-1 text-xs font-semibold transition-all ${
                        filterType === f.key
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-surface-muted text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tìm kiếm nhanh */}
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên tài liệu hoặc liên kết..."
                  className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Đang tải danh sách tài nguyên...
                  </p>
                </div>
              ) : error ? (
                <Alert variant="destructive" title="Không thể tải tài nguyên">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => mutate()}
                  >
                    Thử lại
                  </Button>
                </Alert>
              ) : filteredResources.length === 0 ? (
                <EmptyState
                  icon={<Paperclip className="h-8 w-8 text-primary" />}
                  title="Chưa có tài nguyên nào"
                  description="Tải lên slide PDF, đề cương hoặc thêm liên kết tham khảo ở cột bên trái."
                />
              ) : (
                <div className="space-y-3">
                  {filteredResources.map((res) => {
                    const embedMeta = getEmbedStatusMeta(res.embed_status);
                    const isRetryingThis = Boolean(retryingMap[res.id]);
                    const rType = (res.resource_type || "").toLowerCase();
                    const isFile =
                      rType !== "link" &&
                      rType !== "archive" &&
                      rType !== "zip" &&
                      rType !== "rar";
                    const Icon =
                      res.resource_type === "link"
                        ? LinkIcon
                        : res.resource_type === "archive"
                          ? Archive
                          : FileText;

                    return (
                      <div
                        key={res.id}
                        className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 transition-all hover:border-primary-pastel hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
                            <Icon animated={false} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-foreground">
                                {res.title || "Tài nguyên không tên"}
                              </p>
                              {isFile && (
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${embedMeta.className}`}
                                >
                                  {embedMeta.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {res.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {isFile && embedMeta.canRetry && (
                            <Button
                              type="button"
                              variant={
                                res.embed_status === "error"
                                  ? "primary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handleReindexResource(res.id)}
                              isLoading={isRetryingThis}
                              loadingText="Đang chạy..."
                              leftIcon={
                                !isRetryingThis ? (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                ) : undefined
                              }
                            >
                              {res.embed_status === "error"
                                ? "Chạy lại AI"
                                : "Lập lại AI"}
                            </Button>
                          )}

                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Mở tài nguyên"
                              title="Mở liên kết"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            aria-label="Xóa tài nguyên"
                            title="Xóa tài nguyên"
                            onClick={() => setResourceToDelete(res)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-destructive-border/70 bg-destructive-bg/70 text-destructive-foreground transition-colors hover:bg-destructive-bg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal xác nhận xóa tài nguyên */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-foreground">
              Xác nhận xóa tài nguyên
            </h3>
            <p className="mt-2 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground">
              {resourceToDelete.title}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Tài nguyên và toàn bộ dữ liệu chỉ mục AI đi kèm sẽ bị xóa vĩnh
              viễn.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteResource}
                disabled={isSubmitting}
                className="flex-1"
              >
                Xóa tài nguyên
              </Button>
              <Button
                variant="outline"
                onClick={() => setResourceToDelete(null)}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
