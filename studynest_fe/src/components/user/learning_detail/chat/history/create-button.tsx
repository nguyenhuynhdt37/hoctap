"use client";

import { memo, useState } from "react";
import { HiPlus } from "react-icons/hi";
import api from "@/lib/utils/fetcher/client/axios";
import { ChatThread } from "@/types/user/tutor-chat";

interface CreateThreadResponse {
  thread: ChatThread;
}

interface CreateButtonProps {
  lessonId: string;
  onCreated: (thread: ChatThread) => void;
}

function CreateButton({ lessonId, onCreated }: CreateButtonProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating || !lessonId) return;

    setIsCreating(true);

    try {
      const response = await api.post<CreateThreadResponse>(
        `/tutor-chat/lessons/${lessonId}/threads`,
        { title: "Cuộc trò chuyện mới" }
      );
      onCreated(response.data.thread);
    } catch (err: any) {
      console.error("Failed to create thread:", err);
      // Có thể hiển thị toast error ở đây nếu cần
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
    >
      {isCreating ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Đang tạo...</span>
        </>
      ) : (
        <>
          <HiPlus className="w-4 h-4" />
          <span>Cuộc trò chuyện mới</span>
        </>
      )}
    </button>
  );
}

export default memo(CreateButton);
