"use client";

import MarkdownRenderer from "@/components/shared/markdown-renderer";
import TiptapEditor from "@/components/shared/tiptap_editor";
import api from "@/lib/utils/fetcher/client/axios";
import { LessonNote, LessonOverview } from "@/types/user/learning";
import { useState } from "react";
import useSWR from "swr";

interface NotesTabProps {
  notes: string;
  setNotes: (v: string) => void;
  lessonOverview?: LessonOverview;
  onSeekToTime?: (timeSeconds: number) => void;
}

export default function NotesTab({
  notes,
  setNotes,
  lessonOverview,
  onSeekToTime,
}: NotesTabProps) {
  const { data: lessonNotes, mutate: mutateNotes } = useSWR<LessonNote[]>(
    lessonOverview?.lesson_type === "video" && lessonOverview?.id
      ? `lesson-notes-${lessonOverview.id}`
      : null,
    async () => {
      if (!lessonOverview?.id) throw new Error("Lesson ID is required");
      const response = await api.get<LessonNote[]>(
        `/learning/${lessonOverview.id}/lesson_notes`
      );
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const [showCreateNote, setShowCreateNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTimeSeconds, setNewNoteTimeSeconds] = useState(0);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const getCurrentVideoTime = () => {
    if (lessonOverview?.id) {
      const getTimeFn = (window as any)[`getCurrentTime_${lessonOverview.id}`];
      if (getTimeFn) {
        return getTimeFn();
      }
    }
    return 0;
  };

  const pauseVideo = () => {
    if (lessonOverview?.id) {
      const pauseFn = (window as any)[`pauseVideo_${lessonOverview.id}`];
      if (pauseFn) {
        pauseFn();
      }
    }
  };

  const handleOpenCreateNote = () => {
    pauseVideo();
    const currentTime = getCurrentVideoTime();
    setNewNoteTimeSeconds(currentTime);
    setShowCreateNote(true);
  };

  const handleCreateNote = async () => {
    if (!lessonOverview?.id || !newNoteContent.trim()) {
      return;
    }

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
      }
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
      return;
    }

    try {
      const response = await api.delete<{
        message: string;
        id: string;
      }>(`/learning/lesson_notes/${noteId}`);

      if (response.data) {
        await mutateNotes();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Ghi chú của bạn
      </h2>

      {lessonOverview?.lesson_type === "video" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Ghi chú theo thời gian video
            </h3>
            <button
              onClick={() => {
                if (showCreateNote) {
                  setShowCreateNote(false);
                  setNewNoteContent("");
                  setNewNoteTimeSeconds(0);
                } else {
                  handleOpenCreateNote();
                }
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium text-sm cursor-pointer"
            >
              {showCreateNote ? "Hủy" : "+ Thêm ghi chú"}
            </button>
          </div>

          {showCreateNote && (
            <div className="mb-6 p-4 bg-primary-pastel/40 border border-primary-light/50 rounded-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Thời gian
                  </label>
                  <div className="px-3 py-2 bg-surface border border-border rounded-xl text-foreground">
                    {formatTime(newNoteTimeSeconds)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Video đã được tạm dừng tại thời gian này
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nội dung ghi chú
                  </label>
                  <TiptapEditor
                    value={newNoteContent}
                    onChange={setNewNoteContent}
                    placeholder="Nhập nội dung ghi chú..."
                    maxHeight="200px"
                    autoFocus={true}
                    showToolbar={false}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateNote(false);
                      setNewNoteContent("");
                      setNewNoteTimeSeconds(0);
                    }}
                    className="px-4 py-2 border border-border text-foreground bg-surface rounded-xl hover:bg-background transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim() || isCreatingNote}
                    className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCreatingNote ? "Đang tạo..." : "Tạo ghi chú"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {lessonNotes && lessonNotes.length > 0 ? (
            <div className="space-y-3">
              {lessonNotes
                .sort((a, b) => a.time_seconds - b.time_seconds)
                .map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-surface border border-border rounded-2xl hover:border-primary-light transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (onSeekToTime && lessonOverview?.id) {
                              const seekFn = (window as any)[
                                `seekVideo_${lessonOverview.id}`
                              ];
                              if (seekFn) {
                                seekFn(note.time_seconds);
                              } else if (onSeekToTime) {
                                onSeekToTime(note.time_seconds);
                              }
                            }
                          }}
                          className="px-2.5 py-1 bg-primary-pastel text-primary rounded-lg text-sm font-semibold hover:bg-primary-light/50 transition-colors cursor-pointer"
                          title="Click để tua đến thời gian này"
                        >
                          {formatTime(note.time_seconds)}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa ghi chú"
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="text-foreground">
                      <MarkdownRenderer
                        content={note.content}
                        isHtml={false}
                        className="prose prose-sm max-w-none text-foreground/90"
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-6 bg-surface border border-border rounded-2xl text-center">
              <p className="text-muted-foreground">
                Chưa có ghi chú nào cho video này.
              </p>
            </div>
          )}
        </div>
      )}

      {lessonOverview?.lesson_type !== "video" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Ghi chú của bạn
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú cho bài học này..."
              className="w-full p-4 bg-surface border border-border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-base text-foreground outline-none"
              rows={6}
            />
          </div>
          <div className="flex justify-start">
            <button className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-hover transition-all duration-200 font-semibold shadow-sm hover:shadow-md cursor-pointer">
              Lưu ghi chú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

