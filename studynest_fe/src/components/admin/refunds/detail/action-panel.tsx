import { HiClock } from "react-icons/hi";

interface ActionPanelProps {
  comment: string;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  loading: "approve" | "reject" | null;
}

export function ActionPanel({
  comment,
  onCommentChange,
  onApprove,
  onReject,
  loading,
}: ActionPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <HiClock className="h-6 w-6 text-yellow-500" />
        <div>
          <p className="text-base font-semibold text-gray-900">
            Yêu cầu đang chờ phản hồi của bạn
          </p>
          <p className="text-sm text-gray-600">
            Hãy đưa ra quyết định và ghi chú cho học viên (nếu cần).
          </p>
        </div>
      </div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Ghi chú gửi học viên
      </label>
      <textarea
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Chia sẻ lý do hoặc hướng giải quyết..."
        className="w-full min-h-[120px] rounded-lg border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-sm p-3 transition"
      />
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={onReject}
          disabled={loading === "reject"}
          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-70"
        >
          {loading === "reject" ? "Đang từ chối..." : "Từ chối yêu cầu"}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={loading === "approve"}
          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-70"
        >
          {loading === "approve" ? "Đang chấp nhận..." : "Chấp nhận hoàn tiền"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        * Lý do là bắt buộc khi bạn từ chối yêu cầu.
      </p>
    </div>
  );
}

