"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Download,
  NotebookPen,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "pulsoicon-react";
import useSWR from "swr";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import { LessonNote, LessonOverview } from "@/types/user/learning";
import { QAImageLightbox, QAMarkdownContent, type LightboxImage } from "../qa/qa-media-content";

interface NotesTabProps {
  notes: string;
  setNotes: (v: string) => void;
  lessonOverview?: LessonOverview;
  onSeekToTime?: (timeSeconds: number) => void;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function stripHtmlForExport(content: string): string {
  return content.replace(/<[^>]+>/g, "").trim();
}

export default function NotesTab({
  notes,
  setNotes,
  lessonOverview,
  onSeekToTime,
}: NotesTabProps) {
  const isVideo = lessonOverview?.lesson_type === "video";
  const storageKey = `maymay:lesson-note:${lessonOverview?.id || "draft"}`;

  const { data: lessonNotes, mutate: mutateNotes } = useSWR<LessonNote[]>(
    isVideo && lessonOverview?.id ? `lesson-notes-${lessonOverview.id}` : null,
    async () => {
      if (!lessonOverview?.id) throw new Error("Lesson ID is required");
      const response = await api.get<LessonNote[]>(
        `/learning/${lessonOverview.id}/lesson_notes`,
      );
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  const [showCreateNote, setShowCreateNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTimeSeconds, setNewNoteTimeSeconds] = useState(0);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedLocallyAt, setSavedLocallyAt] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);

  // Khôi phục ghi chú cục bộ cho bài học non-video
  useEffect(() => {
    if (isVideo || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved && !notes) {
        setNotes(saved);
      }
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, isVideo]);

  const getCurrentVideoTime = () => {
    if (lessonOverview?.id) {
      const getTimeFn = (window as unknown as Record<string, (() => number) | undefined>)[
        `getCurrentTime_${lessonOverview.id}`
      ];
      if (typeof getTimeFn === "function") {
        return getTimeFn();
      }
    }
    return 0;
  };

  const pauseVideo = () => {
    if (lessonOverview?.id) {
      const pauseFn = (window as unknown as Record<string, (() => void) | undefined>)[
        `pauseVideo_${lessonOverview.id}`
      ];
      if (typeof pauseFn === "function") {
        pauseFn();
      }
    }
  };

  const seekToTimestamp = (seconds: number) => {
    if (lessonOverview?.id) {
      const seekFn = (window as unknown as Record<string, ((s: number) => void) | undefined>)[
        `seekVideo_${lessonOverview.id}`
      ];
      if (typeof seekFn === "function") {
        seekFn(seconds);
        return;
      }
    }
    onSeekToTime?.(seconds);
  };

  const handleOpenCreateNote = () => {
    pauseVideo();
    const currentTime = getCurrentVideoTime();
    setNewNoteTimeSeconds(Math.floor(currentTime || 0));
    setShowCreateNote(true);
  };

  const handleCreateNote = async () => {
    if (!lessonOverview?.id || !newNoteContent.trim()) return;

    setIsCreatingNote(true);
    try {
      const response = await api.post<{
        message: string;
        id: string;
        status: string;
      }>(`/learning/lesson_note/${lessonOverview.id}/create`, {
        time_seconds: newNoteTimeSeconds,
        content: newNoteContent.trim(),
      });

      if (response.data) {
        setNewNoteContent("");
        setNewNoteTimeSeconds(0);
        setShowCreateNote(false);
        await mutateNotes();
        showToast.success("Đã lưu ghi chú tại mốc thời gian video.");
      }
    } catch {
      showToast.error("Không thể tạo ghi chú lúc này. Vui lòng thử lại.");
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const response = await api.delete<{
        message: string;
        id: string;
      }>(`/learning/lesson_notes/${noteId}`);

      if (response.data) {
        setConfirmDeleteId(null);
        await mutateNotes();
        showToast.success("Đã xóa ghi chú.");
      }
    } catch {
      showToast.error("Không thể xóa ghi chú. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  const sortedNotes = useMemo(() => {
    const list = [...(lessonNotes ?? [])].sort((a, b) => a.time_seconds - b.time_seconds);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (n) =>
        n.content.toLowerCase().includes(q) ||
        formatTime(n.time_seconds).includes(q),
    );
  }, [lessonNotes, searchQuery]);

  const handleExportMarkdown = () => {
    const title = lessonOverview?.title || "Bai-hoc";
    let body = `# Ghi chú bài học: ${title}\n\n`;

    if (isVideo) {
      const list = [...(lessonNotes ?? [])].sort((a, b) => a.time_seconds - b.time_seconds);
      if (list.length === 0) {
        showToast.info("Chưa có ghi chú nào để xuất.");
        return;
      }
      body += list
        .map((n) => `## [${formatTime(n.time_seconds)}]\n${stripHtmlForExport(n.content)}\n`)
        .join("\n");
    } else {
      if (!notes.trim()) {
        showToast.info("Chưa có ghi chú nào để xuất.");
        return;
      }
      body += notes.trim() + "\n";
    }

    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghi-chu-${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 48)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast.success("Đã tải xuống tệp ghi chú Markdown (.md).");
  };

  const handleSaveLocalNote = () => {
    try {
      window.localStorage.setItem(storageKey, notes);
      const time = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSavedLocallyAt(time);
      showToast.success("Đã lưu ghi chú bài học trên thiết bị này.");
    } catch {
      showToast.error("Không thể lưu ghi chú vào bộ nhớ trình duyệt.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER TIMELINE NOTE STUDIO ── */}
      <header className="rounded-[24px] border border-primary-pastel/70 bg-gradient-to-r from-primary-light/70 via-surface to-secondary/35 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-primary-foreground uppercase">
              <NotebookPen className="size-3" animated={false} aria-hidden="true" />
              Sổ tay học tập
            </span>
            <h2 className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">
              {isVideo
                ? `Ghi chú theo dòng thời gian (${lessonNotes?.length ?? 0})`
                : "Ghi chú cá nhân cho bài học"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportMarkdown}
              leftIcon={<Download className="size-3.5" />}
            >
              Xuất .md
            </Button>

            {isVideo && (
              <Button
                size="sm"
                onClick={() => {
                  if (showCreateNote) {
                    setShowCreateNote(false);
                    setNewNoteContent("");
                    setNewNoteTimeSeconds(0);
                  } else {
                    handleOpenCreateNote();
                  }
                }}
                leftIcon={showCreateNote ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              >
                {showCreateNote ? "Đóng khung tạo" : "Ghi chú mốc hiện tại"}
              </Button>
            )}
          </div>
        </div>

        {/* Thanh tìm kiếm nhanh cho video notes */}
        {isVideo && (lessonNotes?.length ?? 0) > 0 && (
          <div className="mt-4">
            <label className="relative block max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-primary"
                animated={false}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nội dung hoặc mốc thời gian (vd: 02:15)…"
                className="h-9 w-full rounded-full border border-border bg-surface pr-3 pl-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </label>
          </div>
        )}
      </header>

      {/* ── CHẾ ĐỘ VIDEO: TẠO GHI CHÚ & TIMELINE DỌC ── */}
      {isVideo ? (
        <div className="space-y-5">
          {showCreateNote && (
            <div className="rounded-[24px] border border-primary-pastel bg-primary-light/30 p-5 shadow-2xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface px-3 py-1 text-xs font-extrabold text-primary">
                  <Clock className="size-3.5" animated={false} aria-hidden="true" />
                  Đánh dấu tại {formatTime(newNoteTimeSeconds)}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Video đã tạm dừng để bạn tập trung ghi chép
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <TiptapEditor
                  value={newNoteContent}
                  onChange={setNewNoteContent}
                  placeholder="Ghi lại ý chính, công thức hoặc câu hỏi cần ôn lại tại mốc này..."
                  maxHeight="220px"
                  autoFocus={true}
                  showToolbar={false}
                />
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateNote(false);
                    setNewNoteContent("");
                    setNewNoteTimeSeconds(0);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  disabled={!newNoteContent.trim() || isCreatingNote}
                  isLoading={isCreatingNote}
                  onClick={() => void handleCreateNote()}
                  leftIcon={<Check className="size-3.5" />}
                >
                  Lưu ghi chú
                </Button>
              </div>
            </div>
          )}

          {sortedNotes.length > 0 ? (
            <div className="relative space-y-4 pl-6 before:absolute before:top-3 before:bottom-3 before:left-2 before:w-0.5 before:rounded-full before:bg-primary-pastel">
              {sortedNotes.map((note) => {
                const isConfirming = confirmDeleteId === note.id;
                const isDeleting = deletingId === note.id;
                return (
                  <article
                    key={note.id}
                    className="relative rounded-[22px] border border-border/80 bg-surface p-4 shadow-2xs transition-colors hover:border-primary-pastel sm:p-5"
                  >
                    {/* Chấm tròn trên trục Timeline */}
                    <span
                      aria-hidden="true"
                      className="absolute top-6 -left-[22px] size-3 rounded-full border-2 border-surface bg-primary ring-2 ring-primary-pastel"
                    />

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => seekToTimestamp(note.time_seconds)}
                          title="Bấm để tua video tới mốc thời gian này"
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light px-3 py-1 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer tabular-nums"
                        >
                          <Play className="size-3" solid animated={false} aria-hidden="true" />
                          {formatTime(note.time_seconds)}
                        </button>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Xác nhận xóa inline an toàn */}
                      <div className="flex items-center gap-1.5">
                        {isConfirming ? (
                          <>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => void handleDeleteNote(note.id)}
                              className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                              {isDeleting ? "Đang xóa…" : "Xác nhận xóa"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-surface cursor-pointer"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(note.id)}
                            aria-label="Xóa ghi chú"
                            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive-foreground cursor-pointer"
                          >
                            <Trash2 className="size-3.5" animated={false} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    <QAMarkdownContent
                      content={note.content}
                      onOpenImage={setLightboxImage}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-primary-pastel bg-background/60 p-10 text-center">
              <p className="font-display text-base font-bold text-foreground">
                {searchQuery
                  ? `Không tìm thấy ghi chú nào khớp với “${searchQuery}”`
                  : "Chưa có ghi chú nào cho bài giảng này"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bấm <strong>“Ghi chú mốc hiện tại”</strong> bất cứ lúc nào khi xem video để lưu nhanh ý quan trọng và tua lại chỉ bằng 1 chạm.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── CHẾ ĐỘ NON-VIDEO: SỔ GHI CHÚ LƯU CỤC BỘ ── */
        <div className="rounded-[24px] border border-border/80 bg-surface p-5 space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Viết tóm tắt bài học, các bước giải hoặc điều cần nhớ..."
            rows={7}
            className="w-full resize-y rounded-2xl border border-border bg-background/70 p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {savedLocallyAt
                ? `Đã lưu cục bộ lúc ${savedLocallyAt}`
                : "Ghi chú được lưu riêng trên trình duyệt của bạn và có thể xuất ra file .md"}
            </span>
            <Button size="sm" onClick={handleSaveLocalNote} leftIcon={<Check className="size-3.5" />}>
              Lưu ghi chú
            </Button>
          </div>
        </div>
      )}

      <QAImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
