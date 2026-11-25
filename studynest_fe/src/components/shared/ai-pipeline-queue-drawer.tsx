"use client";

import { Button } from "@/components/ui";
import { connectWebSocket } from "@/hooks/websocket/connectWebSocket";
import { formatApiError } from "@/lib/utils";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  Video,
  Wifi,
  X,
} from "pulsoicon-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface AiQueueJob {
  job_id: string;
  job_type: "video" | "resource";
  lesson_id: string | null;
  resource_id: string | null;
  instructor_id: string | null;
  title: string;
  course_title: string;
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
  updated_at: number;
}

type DrawerTab = "running" | "failed" | "completed";

interface AiPipelineQueueDrawerProps {
  role: "LECTURER" | "ADMIN";
}

export function AiPipelineQueueDrawer({ role }: AiPipelineQueueDrawerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("running");
  const [jobsMap, setJobsMap] = useState<Record<string, AiQueueJob>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const notifiedFailedRef = useRef<Set<string>>(new Set());

  const upsertJob = useCallback((job: AiQueueJob) => {
    if (!job?.job_id) return;
    setJobsMap((prev) => ({
      ...prev,
      [job.job_id]: { ...(prev[job.job_id] || {}), ...job },
    }));
    if (
      job.stage === "failed" &&
      !notifiedFailedRef.current.has(`${job.job_id}:${job.updated_at}`)
    ) {
      notifiedFailedRef.current.add(`${job.job_id}:${job.updated_at}`);
      showToast.error(`Xử lý AI gặp lỗi: ${job.title}`);
    }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get<{ items: AiQueueJob[] }>(
        "/lecturer/lessons/ai-queue"
      );
      const list = Array.isArray(res.data?.items) ? res.data.items : [];
      const nextMap: Record<string, AiQueueJob> = {};
      for (const item of list) {
        if (item?.job_id) nextMap[item.job_id] = item;
      }
      setJobsMap(nextMap);
    } catch {
      // ignore transient error
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    let attempt = 0;

    const connect = () => {
      if (unmountedRef.current) return;
      connectWebSocket(
        "/api/v1/lecturer/lessons/ws/queue",
        role,
        (data) => {
          if (!data || typeof data !== "object") return;
          if (data.type === "queue_snapshot" && Array.isArray(data.items)) {
            const nextMap: Record<string, AiQueueJob> = {};
            for (const item of data.items as AiQueueJob[]) {
              if (item?.job_id) nextMap[item.job_id] = item;
            }
            setJobsMap(nextMap);
          } else if (data.type === "lesson_pipeline_progress" && data.job_id) {
            upsertJob(data as AiQueueJob);
          }
        },
        () => {
          setWsConnected(false);
          if (!unmountedRef.current && attempt < 6) {
            attempt += 1;
            reconnectTimerRef.current = setTimeout(connect, 3000 * attempt);
          }
        }
      )
        .then((ws) => {
          if (unmountedRef.current) {
            ws.close();
            return;
          }
          wsRef.current = ws;
          attempt = 0;
          setWsConnected(true);
        })
        .catch(() => {
          setWsConnected(false);
          if (!unmountedRef.current) {
            fetchSnapshot();
          }
        });
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [fetchSnapshot, role, upsertJob]);

  const allJobs = useMemo(
    () =>
      Object.values(jobsMap).sort(
        (a, b) => (b.updated_at || 0) - (a.updated_at || 0)
      ),
    [jobsMap]
  );

  const runningJobs = useMemo(
    () =>
      allJobs.filter(
        (j) => !j.is_completed && j.stage !== "completed" && j.stage !== "failed"
      ),
    [allJobs]
  );
  const failedJobs = useMemo(
    () => allJobs.filter((j) => j.stage === "failed"),
    [allJobs]
  );
  const completedJobs = useMemo(
    () => allJobs.filter((j) => j.is_completed || j.stage === "completed"),
    [allJobs]
  );

  const activeAvgPct = useMemo(() => {
    if (runningJobs.length === 0) return 0;
    const sum = runningJobs.reduce((acc, j) => acc + (j.percent || 0), 0);
    return Math.round(sum / runningJobs.length);
  }, [runningJobs]);

  const handleOpenDrawer = () => {
    if (failedJobs.length > 0 && runningJobs.length === 0) {
      setTab("failed");
    } else if (runningJobs.length > 0) {
      setTab("running");
    } else if (completedJobs.length > 0) {
      setTab("completed");
    }
    setOpen(true);
    fetchSnapshot();
  };

  const handleRetryJob = async (job: AiQueueJob) => {
    setRetryingIds((prev) => ({ ...prev, [job.job_id]: true }));
    try {
      if (job.job_type === "resource" && job.resource_id) {
        await api.post(`/lecturer/lessons/resources/${job.resource_id}/reindex`);
      } else if (job.lesson_id) {
        await api.post(`/lecturer/lessons/${job.lesson_id}/reindex`);
      }
      showToast.success(`Đã kích hoạt chạy lại: ${job.title}`);
    } catch (err: unknown) {
      showToast.error(formatApiError(err, "Không thể chạy lại tác vụ AI"));
    } finally {
      setRetryingIds((prev) => ({ ...prev, [job.job_id]: false }));
    }
  };

  const handleRetryAllFailed = async () => {
    for (const job of failedJobs) {
      await handleRetryJob(job);
    }
  };

  const visibleJobs =
    tab === "running"
      ? runningJobs
      : tab === "failed"
        ? failedJobs
        : completedJobs;

  return (
    <>
      {/* Nút Pill Hàng đợi AI trên Header */}
      <button
        type="button"
        onClick={handleOpenDrawer}
        title={
          role === "ADMIN"
            ? "Trung tâm hàng đợi xử lý Video & AI toàn hệ thống"
            : "Trung tâm hàng đợi xử lý Video & Tài liệu AI"
        }
        className={`relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-xs ${
          failedJobs.length > 0
            ? "border-destructive-border bg-destructive-bg text-destructive-foreground hover:opacity-90"
            : runningJobs.length > 0
              ? "border-primary-pastel bg-primary-light text-primary hover:bg-primary-light/80"
              : "border-border bg-surface text-foreground hover:border-primary-pastel hover:bg-primary-light/40 hover:text-primary"
        }`}
      >
        {runningJobs.length > 0 ? (
          <RefreshCw animated={false} className="h-3.5 w-3.5 animate-spin" />
        ) : failedJobs.length > 0 ? (
          <AlertTriangle animated={false} className="h-3.5 w-3.5" />
        ) : (
          <Bot animated={false} className="h-3.5 w-3.5 text-primary" />
        )}

        <span className="hidden sm:inline">
          {failedJobs.length > 0
            ? `${failedJobs.length} lỗi AI`
            : runningJobs.length > 0
              ? `Đang xử lý ${runningJobs.length} · ${activeAvgPct}%`
              : "Hàng đợi AI"}
        </span>

        {(runningJobs.length > 0 || failedJobs.length > 0) && (
          <span
            className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold sm:hidden ${
              failedJobs.length > 0
                ? "bg-destructive-foreground text-white"
                : "bg-primary text-white"
            }`}
          >
            {failedJobs.length > 0 ? failedJobs.length : runningJobs.length}
          </span>
        )}
      </button>

      {/* Slide-over Drawer Trung tâm Hàng đợi AI (Portal ra document.body để không bị cắt bởi backdrop-blur của Header) */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex justify-end bg-foreground/25 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col border-l border-primary-pastel bg-surface shadow-2xl"
          >
            {/* Header Drawer */}
            <div className="border-b border-border/70 bg-gradient-to-r from-primary-light/80 via-surface to-accent/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-pastel bg-surface text-primary shadow-xs">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">
                      Trung tâm Hàng đợi AI
                    </h2>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>
                        {role === "ADMIN"
                          ? "Phạm vi: Toàn hệ thống"
                          : "Phạm vi: Khóa học của bạn"}
                      </span>
                      <span>·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          wsConnected
                            ? "text-success-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Wifi animated={false} className="h-3 w-3" />
                        {wsConnected ? "Realtime" : "Tĩnh"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Làm mới hàng đợi"
                    onClick={fetchSnapshot}
                    disabled={isRefreshing}
                    className="cursor-pointer rounded-xl p-2 text-muted-foreground hover:bg-surface hover:text-primary"
                  >
                    <RefreshCw
                      animated={false}
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Đóng hàng đợi AI"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer rounded-xl p-2 text-muted-foreground hover:bg-surface hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 3 Tabs */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-background/80 p-1">
                <button
                  type="button"
                  onClick={() => setTab("running")}
                  className={`cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    tab === "running"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Đang chạy ({runningJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("failed")}
                  className={`cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    tab === "failed"
                      ? "bg-destructive-foreground text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Lỗi ({failedJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("completed")}
                  className={`cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    tab === "completed"
                      ? "bg-success-foreground text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Hoàn tất ({completedJobs.length})
                </button>
              </div>
            </div>

            {/* Body Drawer */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {tab === "failed" && failedJobs.length > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-destructive-border bg-destructive-bg/50 px-3.5 py-2.5">
                  <span className="text-xs font-semibold text-destructive-foreground">
                    Có {failedJobs.length} tác vụ cần chạy lại
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRetryAllFailed}
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    Chạy lại tất cả
                  </Button>
                </div>
              )}

              {visibleJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-background/60 px-6 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-foreground">
                    {tab === "running"
                      ? "Không có tác vụ nào đang chạy"
                      : tab === "failed"
                        ? "Tuyệt vời! Không có tác vụ nào lỗi"
                        : "Chưa có tác vụ nào hoàn tất gần đây"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mọi video bài giảng và tài liệu PDF vừa tải lên sẽ tự động
                    xuất hiện và cập nhật tiến độ realtime tại đây.
                  </p>
                </div>
              ) : (
                visibleJobs.map((job) => {
                  const isVideo = job.job_type !== "resource";
                  const isRetryingThis = Boolean(retryingIds[job.job_id]);
                  const targetHref =
                    !isVideo && job.lesson_id
                      ? `/lecturer/resources?lesson_id=${job.lesson_id}`
                      : job.lesson_id
                        ? `/lecturer/lessons/${job.lesson_id}/edit`
                        : null;

                  return (
                    <div
                      key={job.job_id}
                      className={`rounded-2xl border p-4 shadow-xs transition-all ${
                        job.stage === "failed"
                          ? "border-destructive-border bg-destructive-bg/25"
                          : job.stage === "retrying"
                            ? "border-warning-border bg-warning-bg/35"
                            : job.is_completed
                              ? "border-success-border/80 bg-success-bg/25"
                              : "border-primary-pastel bg-surface"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                              isVideo
                                ? "border-primary-pastel bg-primary-light text-primary"
                                : "border-accent-border bg-accent text-accent-foreground"
                            }`}
                          >
                            {isVideo ? (
                              <Video animated={false} className="h-4 w-4" />
                            ) : (
                              <FileText animated={false} className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {job.title}
                            </p>
                            {job.course_title && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {job.course_title}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-bold text-foreground">
                          {job.percent.toFixed(0)}%
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {job.message || job.stage_label}
                      </p>

                      {/* Thanh tiến độ */}
                      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-primary-light">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.stage === "failed"
                              ? "bg-destructive-foreground"
                              : job.stage === "retrying"
                                ? "bg-[#C98A2C]"
                                : job.is_completed
                                  ? "bg-success-foreground"
                                  : "bg-primary"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, job.percent))}%`,
                          }}
                        />
                      </div>

                      {/* Metadata chips */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {job.source_label && (
                          <span className="rounded-full bg-surface px-2 py-0.5 font-medium text-primary">
                            {job.source_label}
                          </span>
                        )}
                        {job.chunks_total > 0 && (
                          <span>
                            {job.chunks_done}/{job.chunks_total} đoạn AI
                          </span>
                        )}
                        {job.speed_mb_s > 0 && job.stage === "uploading" && (
                          <span>{job.speed_mb_s.toFixed(1)} MB/s</span>
                        )}
                        {job.attempt > 1 && (
                          <span className="font-semibold text-warning-foreground">
                            Lần thử {job.attempt}/{job.max_attempts}
                          </span>
                        )}
                      </div>

                      {job.error && (
                        <p className="mt-2 rounded-xl border border-destructive-border bg-surface/90 px-2.5 py-1.5 text-[11px] text-destructive-foreground">
                          {job.error}
                        </p>
                      )}

                      {/* Hành động */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                        {targetHref && role === "LECTURER" ? (
                          <Link
                            href={targetHref}
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>Mở chi tiết</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {isVideo ? "Video bài giảng" : "Tài liệu PDF"}
                          </span>
                        )}

                        {(job.stage === "failed" || job.is_completed) && (
                          <Button
                            type="button"
                            variant={
                              job.stage === "failed" ? "primary" : "outline"
                            }
                            size="sm"
                            onClick={() => handleRetryJob(job)}
                            isLoading={isRetryingThis}
                            loadingText="Đang chạy..."
                            leftIcon={
                              !isRetryingThis ? (
                                <RefreshCw className="h-3.5 w-3.5" />
                              ) : undefined
                            }
                          >
                            {job.stage === "failed" ? "Chạy lại ngay" : "Lập lại chỉ mục"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
