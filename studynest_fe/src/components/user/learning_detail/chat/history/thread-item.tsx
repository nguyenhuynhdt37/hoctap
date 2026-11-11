"use client";

import { memo, useState } from "react";
import { HiTrash } from "react-icons/hi";
import { ChatSession, TutorScope } from "@/types/user/tutor-chat";
import api from "@/lib/utils/fetcher/client/axios";

interface ChatHistoryItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelected: (threadId: string, scope: TutorScope) => void;
  onDeleted: () => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

function ChatHistoryItem({
  session,
  isActive,
  onSelected,
  onDeleted,
}: ChatHistoryItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelect = async () => {
    if (isActive || isSelecting) return;

    setIsSelecting(true);

    try {
      // Gọi API để set thread này làm active
      await api.patch(`/tutor-chat/threads/${session.id}`, {
        is_active: true,
      });
      onSelected(session.id, session.scope);
    } catch (err: any) {
      console.error("Failed to set active thread:", err);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);

    try {
      await api.delete(`/tutor-chat/threads/${session.id}`);
      onDeleted();
    } catch (err: any) {
      console.error("Failed to delete thread:", err);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <div
      onClick={handleSelect}
      className={`group relative p-3 rounded-xl cursor-pointer transition-colors ${
        isActive
          ? "bg-primary-pastel/70 border border-primary-light"
          : "hover:bg-surface border border-transparent"
      } ${isSelecting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Confirm Delete Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 bg-surface rounded-xl border border-red-200 flex items-center justify-center gap-2 z-10">
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Đang xóa..." : "Xóa"}
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg hover:bg-border disabled:opacity-50"
          >
            Hủy
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-foreground truncate">
              {session.title}
            </h4>
            {session.isActive && (
              <span className="px-1.5 py-0.5 bg-primary-pastel text-primary text-[10px] rounded flex-shrink-0 font-medium">
                Đang hoạt động
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatDate(session.createdAt)}
            </span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">
              {session.messageCount} tin nhắn
            </span>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
          aria-label="Xóa cuộc trò chuyện"
        >
          <HiTrash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default memo(ChatHistoryItem);
