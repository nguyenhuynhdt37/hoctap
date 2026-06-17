"use client";

import { memo } from "react";
import CommentForm from "./comment-form";

interface NewCommentFormProps {
  onSubmit: (content: string) => void;
  isSubmitting: boolean;
  onTyping?: () => void;
}

export default memo(function NewCommentForm({
  onSubmit,
  isSubmitting,
  onTyping,
}: NewCommentFormProps) {
  return (
    <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
      <CommentForm
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        onTyping={onTyping}
        placeholder="Viết câu hỏi hoặc bình luận của bạn..."
        submitLabel="Gửi"
      />
    </div>
  );
});

