"use client";

import { Button, Card } from "@/components/ui";
import { CheckCircle2, Clock, MessageSquare, XCircle } from "pulsoicon-react";

interface ActionPanelProps {
  comment: string;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  loading: "approve" | "reject" | null;
}

const APPROVE_TEMPLATES = [
  "Đồng ý hoàn tiền theo đúng chính sách hỗ trợ của khóa học.",
  "Chấp thuận hoàn tiền do khóa học chưa phù hợp mục tiêu hiện tại của bạn.",
];

const REJECT_TEMPLATES = [
  "Học viên đã hoàn thành phần lớn nội dung khóa học theo lịch sử học tập.",
  "Yêu cầu nằm ngoài thời hạn hỗ trợ hoàn tiền theo quy định nền tảng.",
];

export function ActionPanel({
  comment,
  onCommentChange,
  onApprove,
  onReject,
  loading,
}: ActionPanelProps) {
  return (
    <Card
      variant="surface"
      density="none"
      className="overflow-hidden rounded-[24px] border border-warning-border bg-gradient-to-br from-accent-vanilla/70 via-surface to-surface shadow-sm print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning-border/60 bg-accent-vanilla/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-surface text-warning-foreground shadow-2xs">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              Hồ sơ đang chờ quyết định của bạn
            </p>
            <p className="text-xs text-muted-foreground">
              Chọn mẫu phản hồi nhanh hoặc nhập ghi chú chi tiết gửi học viên &amp; quản trị viên.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Các chip mẫu phản hồi nhanh 1 chạm */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-success-foreground mr-1">
              <CheckCircle2 animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
              Mẫu chấp thuận:
            </span>
            {APPROVE_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => onCommentChange(tpl)}
                className="rounded-full border border-success-border bg-success-bg/70 px-3 py-1 text-xs font-medium text-success-foreground transition-colors hover:bg-success-bg cursor-pointer text-left"
              >
                {tpl}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-destructive-foreground mr-1">
              <XCircle animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
              Mẫu từ chối:
            </span>
            {REJECT_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => onCommentChange(tpl)}
                className="rounded-full border border-destructive-border bg-destructive-bg/65 px-3 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive-bg cursor-pointer text-left"
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Ô nhập ghi chú */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="lecturer-refund-comment"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"
            >
              <MessageSquare
                animated={false}
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>Ghi chú phản hồi gửi học viên</span>
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {comment.trim().length} ký tự
            </span>
          </div>
          <textarea
            id="lecturer-refund-comment"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Chia sẻ lý do hoặc hướng giải quyết rõ ràng, lịch sự..."
            className="min-h-[116px] w-full rounded-2xl border border-border bg-surface p-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Cụm nút hành động */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            * Bắt buộc nhập lý do rõ ràng nếu bạn chọn{" "}
            <strong className="text-destructive-foreground">Từ chối</strong>.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              onClick={onReject}
              isLoading={loading === "reject"}
              disabled={loading !== null}
              loadingText="Đang từ chối..."
              leftIcon={<XCircle className="h-4 w-4" />}
            >
              Từ chối yêu cầu
            </Button>
            <Button
              type="button"
              variant="primary"
              className="rounded-full shadow-sm"
              onClick={onApprove}
              isLoading={loading === "approve"}
              disabled={loading !== null}
              loadingText="Đang chấp nhận..."
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Chấp nhận hoàn tiền
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
