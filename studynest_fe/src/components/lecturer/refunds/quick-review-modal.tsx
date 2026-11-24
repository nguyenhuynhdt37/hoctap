"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, Coins } from "pulsoicon-react";
import { Alert, Button, Modal } from "@/components/ui";
import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import type { LecturerRefundRequestItem } from "@/types/lecturer/refund";

interface QuickReviewModalProps {
  item: LecturerRefundRequestItem | null;
  initialAction?: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const APPROVE_TEMPLATES = [
  "Đồng ý hoàn Coin để bạn chọn lộ trình phù hợp hơn. Chúc bạn học tốt!",
  "Đã xác nhận yêu cầu, chúc bạn sớm tìm được khóa học đúng mục tiêu.",
];

const REJECT_TEMPLATES = [
  "Học viên đã hoàn thành phần lớn nội dung bài học nên chưa đủ điều kiện hoàn Coin.",
  "Khóa học đã cung cấp đầy đủ nội dung như mô tả, rất mong bạn tiếp tục đồng hành hoặc nhắn Hỏi đáp để mình hỗ trợ thêm.",
];

function stripHtml(raw?: string | null): string {
  if (!raw) return "Không có mô tả chi tiết.";
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "Không có mô tả chi tiết.";
}

export function QuickReviewModal({
  item,
  initialAction = "approve",
  onClose,
  onSuccess,
}: QuickReviewModalProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setComment("");
      setError("");
      setSubmitting(null);
    }
  }, [item, initialAction]);

  if (!item) return null;

  const handleSubmit = async (action: "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) {
      setError("Vui lòng nhập lý do phản hồi rõ ràng khi từ chối yêu cầu hoàn Coin.");
      return;
    }

    setSubmitting(action);
    setError("");
    try {
      await api.post(`/lecturer/refunds/${item.refund_id}/lecturer-review`, {
        action,
        ...(comment.trim() ? { reason: comment.trim() } : {}),
      });
      showToast.success(
        action === "approve"
          ? "Đã chấp thuận yêu cầu hoàn Coin."
          : "Đã từ chối yêu cầu hoàn Coin.",
      );
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.message ||
        "Không thể xử lý yêu cầu. Vui lòng thử lại.";
      setError(msg);
      showToast.error(msg);
    } finally {
      setSubmitting(null);
    }
  };

  const templates = initialAction === "reject" ? REJECT_TEMPLATES : APPROVE_TEMPLATES;

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      size="lg"
      title="Xét duyệt yêu cầu hoàn Coin"
      description={`${item.student?.fullname || "Học viên"} · ${item.course?.title || "Khóa học"}`}
    >
      <div className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Tóm tắt giá trị & lý do học viên */}
        <div className="rounded-2xl border border-primary-pastel/80 bg-primary-light/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Giá trị yêu cầu hoàn
            </span>
            <span className="inline-flex items-center gap-1.5 font-display text-xl font-bold text-primary tabular-nums">
              <Coins aria-hidden="true" animated={false} className="size-4 text-accent-vanilla-foreground" />
              {formatVndAsCoin(item.refund_amount)}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Lý do học viên gửi
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">
              {stripHtml(item.reason)}
            </p>
          </div>
        </div>

        {/* Mẫu phản hồi nhanh 1 chạm */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Mẫu phản hồi nhanh (bấm để chèn)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setComment(tpl)}
                className="rounded-full border border-primary-pastel bg-primary-light/50 px-3 py-1 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary-light cursor-pointer"
              >
                + {tpl}
              </button>
            ))}
          </div>
        </div>

        {/* Ô nhập ghi chú phản hồi */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-foreground">
            Phản hồi gửi tới học viên{" "}
            <span className="font-normal text-muted-foreground">
              (bắt buộc nếu từ chối)
            </span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Nhập lời nhắn lịch sự, minh bạch gửi tới học viên..."
            className="w-full rounded-2xl border border-border bg-background p-3.5 text-xs text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting !== null}
            className="min-h-10 rounded-full px-4"
          >
            Để sau
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit("reject")}
            isLoading={submitting === "reject"}
            loadingText="Đang từ chối..."
            disabled={submitting !== null}
            className="min-h-10 rounded-full px-5 font-bold"
          >
            <CircleX aria-hidden="true" className="size-4" />
            <span>Từ chối yêu cầu</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleSubmit("approve")}
            isLoading={submitting === "approve"}
            loadingText="Đang chấp thuận..."
            disabled={submitting !== null}
            className="min-h-10 rounded-full px-5 font-bold"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            <span>Chấp thuận hoàn Coin</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
