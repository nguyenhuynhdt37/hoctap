import { Button, Card } from "@/components/ui";
import { Clock } from "lucide-react";

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
    <Card variant="surface" className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-warning-bg border border-warning-border flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5 text-warning-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Yêu cầu đang chờ phản hồi của bạn
          </p>
          <p className="text-sm text-muted-foreground">
            Hãy đưa ra quyết định và ghi chú cho học viên (nếu cần).
          </p>
        </div>
      </div>
      <label className="block text-sm font-medium text-foreground mb-2">
        Ghi chú gửi học viên
      </label>
      <textarea
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Chia sẻ lý do hoặc hướng giải quyết..."
        className="w-full min-h-[120px] rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm p-3.5 transition-colors"
      />
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-4">
        <Button
          type="button"
          variant="destructive"
          onClick={onReject}
          isLoading={loading === "reject"}
          loadingText="Đang từ chối..."
        >
          Từ chối yêu cầu
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onApprove}
          isLoading={loading === "approve"}
          loadingText="Đang chấp nhận..."
        >
          Chấp nhận hoàn tiền
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        * Lý do là bắt buộc khi bạn từ chối yêu cầu.
      </p>
    </Card>
  );
}

