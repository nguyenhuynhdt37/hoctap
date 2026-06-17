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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Ghi chú của bạn
      </h2>

      {lessonOverview?.lesson_type === "video" && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
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
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 font-medium text-sm"
            >
              {showCreateNote ? "Hủy" : "+ Thêm ghi chú"}
            </button>
          </div>

          {showCreateNote && (
            <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian
                  </label>
                  <div className="px-3 py-2 bg-white border border-teal-200 rounded-lg text-gray-700">
                    {formatTime(newNoteTimeSeconds)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Video đã được tạm dừng tại thời gian này
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim() || isCreatingNote}
                    className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="p-4 bg-white border border-teal-200 rounded-xl hover:border-teal-300 transition-colors"
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
                          className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm font-semibold hover:bg-teal-200 hover:text-teal-800 transition-colors cursor-pointer"
                          title="Click để tua đến thời gian này"
                        >
                          {formatTime(note.time_seconds)}
                        </button>
                        <span className="text-xs text-gray-500">
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
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa ghi chú"
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="text-gray-700">
                      <MarkdownRenderer
                        content={note.content}
                        isHtml={false}
                        className="prose prose-sm max-w-none text-gray-700"
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
              <p className="text-gray-600">
                Chưa có ghi chú nào cho video này.
              </p>
            </div>
          )}
        </div>
      )}

      {lessonOverview?.lesson_type !== "video" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú của bạn
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú cho bài học này..."
              className="w-full p-4 border border-teal-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
              rows={6}
            />
          </div>
          <div className="flex justify-start">
            <button className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-3 rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl">
              Lưu ghi chú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

