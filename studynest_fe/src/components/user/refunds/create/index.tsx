"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  Coins,
  FileText,
  ShieldCheck,
} from "pulsoicon-react";
import TiptapEditor from "@/components/shared/tiptap_editor";
import { Alert, Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import {
  formatRefundCoin,
  formatRefundDateTime,
} from "../shared/refund-status";
import { RefundStudioShell } from "../shared/refund-studio-shell";

const QUICK_REASONS = [
  "Nội dung khóa học chưa phù hợp với trình độ hiện tại của mình.",
  "Mình đăng ký nhầm khóa học và muốn chuyển Coin sang khóa học khác.",
  "Lịch học cá nhân thay đổi nên chưa thể theo kịp lộ trình khóa học.",
];

export default function CreateRefundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseItemId = searchParams.get("purchase_item_id") || "";

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    refund_id: string;
    refund_amount: number;
    deadline: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!purchaseItemId.trim()) {
      setError("Thiếu thông tin đơn hàng. Vui lòng chọn khóa học từ danh sách đủ điều kiện.");
      return;
    }

    const plainReason = reason.replace(/<[^>]*>/g, "").trim();
    if (!plainReason) {
      setError("Vui lòng nhập lý do hoàn Coin để đội ngũ xem xét nhanh nhất.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/users/refunds/request", {
        purchase_item_id: purchaseItemId,
        reason: reason.trim(),
      });

      setSuccess({
        refund_id: response.data.refund_id,
        refund_amount: response.data.refund_amount,
        deadline: response.data.deadline,
      });
    } catch (err: unknown) {
      const maybeErr = err as { response?: { data?: { detail?: string; message?: string } } };
      const errorMsg =
        maybeErr?.response?.data?.detail ||
        maybeErr?.response?.data?.message ||
        "Không thể gửi yêu cầu hoàn Coin. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <RefundStudioShell
        activeTab="create"
        eyebrow="Cloud Shield · Biên nhận hồ sơ"
        title="Đã tiếp nhận yêu cầu hoàn Coin"
        description="Hồ sơ của bạn đã được ghi nhận vào hệ thống Kho Bạc Mây Mây và chuyển tới giảng viên xem xét."
        backHref="/refunds/my-requests"
        backLabel="Danh sách yêu cầu"
        tone="success"
        heroRight={
          <div
            aria-hidden="true"
            className="stamp-down inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-success-foreground/45 bg-surface/85 px-3.5 py-1.5 text-[11px] font-extrabold tracking-[0.14em] text-success-foreground uppercase"
          >
            <CheckCircle2 animated={false} className="size-3.5" />
            <span>ĐÃ TIẾP NHẬN</span>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-[24px] border border-success-border bg-surface p-6 shadow-xs sm:p-8 lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/65 p-4">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Mã hồ sơ hoàn Coin
                </p>
                <p className="mt-1.5 break-all font-mono text-xs font-bold text-foreground">
                  {success.refund_id}
                </p>
              </div>

              <div className="rounded-2xl border border-success-border bg-success-bg/55 p-4">
                <p className="text-[11px] font-bold tracking-wider text-success-foreground uppercase">
                  Giá trị hoàn dự kiến
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold text-success-foreground tabular-nums">
                  <Coins aria-hidden="true" animated={false} className="size-4" />
                  {formatRefundCoin(success.refund_amount)}
                </p>
              </div>

              <div className="rounded-2xl border border-accent-vanilla-border bg-accent-vanilla/50 p-4">
                <p className="text-[11px] font-bold tracking-wider text-accent-vanilla-foreground uppercase">
                  Hạn phản hồi dự kiến
                </p>
                <p className="mt-1.5 text-xs font-bold text-foreground tabular-nums">
                  {formatRefundDateTime(success.deadline)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/70 pt-5">
              <Link
                href={`/refunds/${success.refund_id}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <span>Theo dõi chi tiết hồ sơ</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/refunds/my-requests"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-5 text-xs font-bold text-foreground transition-colors hover:border-primary-pastel hover:bg-primary-light hover:text-primary"
              >
                <span>Xem tất cả yêu cầu</span>
              </Link>
            </div>
          </div>

          <aside className="rounded-[24px] border border-primary-pastel bg-primary-light/45 p-6 lg:col-span-4">
            <h2 className="font-display text-lg font-bold text-foreground">
              Bước tiếp theo là gì?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Ngay khi giảng viên và quản trị viên xác nhận, toàn bộ số Coin sẽ được cộng thẳng về Kho Coin của bạn để bạn thoải mái đầu tư khóa học phù hợp hơn.
            </p>
          </aside>
        </div>
      </RefundStudioShell>
    );
  }

  return (
    <RefundStudioShell
      activeTab="create"
      eyebrow="Cloud Shield · Khởi tạo hồ sơ"
      title="Gửi yêu cầu hoàn Coin"
      description="Chia sẻ rõ lý do của bạn để giảng viên và Kho Bạc Mây Mây xem xét, bảo toàn quyền lợi nhanh chóng."
      backHref="/refunds/refundable"
      backLabel="Khóa học đủ điều kiện"
      tone="blue"
    >
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Cột trái (8/12): Biểu mẫu gửi yêu cầu */}
        <section
          aria-label="Biểu mẫu yêu cầu hoàn Coin"
          className="rounded-[24px] border border-border bg-surface p-6 shadow-xs sm:p-7 lg:col-span-8"
        >
          {error && (
            <div className="mb-5">
              <Alert variant="destructive">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Gợi ý lý do nhanh 1 chạm */}
            <div className="space-y-2">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Gợi ý lý do nhanh (bấm để chèn)
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REASONS.map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setReason(`<p>${template}</p>`)}
                    className="rounded-full border border-primary-pastel/80 bg-primary-light/55 px-3 py-1.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary-light cursor-pointer"
                  >
                    + {template}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold tracking-wider text-foreground uppercase">
                Lý do hoàn Coin <span className="text-destructive">*</span>
              </label>
              <div className="overflow-hidden rounded-2xl border border-border-strong bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <TiptapEditor
                  value={reason}
                  onChange={setReason}
                  placeholder="Mô tả chi tiết lý do bạn muốn hoàn Coin cho khóa học này..."
                  minHeight="210px"
                  showToolbar={true}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Mô tả cụ thể giúp giảng viên và quản trị viên xử lý hồ sơ nhanh hơn.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-warning-border bg-warning-bg/75 p-4 text-warning-foreground">
              <CircleAlert aria-hidden="true" animated={false} className="mt-0.5 size-5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold">Lưu ý quan trọng về quyền hoàn Coin</p>
                <p className="mt-0.5">
                  Mỗi đơn khóa học chỉ được gửi yêu cầu hoàn Coin{" "}
                  <strong className="font-extrabold">1 lần duy nhất</strong>. Sau khi gửi, bạn không thể hủy hoặc tạo lại yêu cầu mới cho đơn này.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="min-h-11 rounded-full px-6 font-bold"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!reason.replace(/<[^>]*>/g, "").trim() || isSubmitting}
                className="min-h-11 rounded-full px-6 font-bold"
              >
                <span>{isSubmitting ? "Đang gửi hồ sơ..." : "Gửi yêu cầu hoàn Coin"}</span>
                {!isSubmitting && <ArrowRight aria-hidden="true" className="size-4" />}
              </Button>
            </div>
          </form>
        </section>

        {/* Cột phải (4/12): Cẩm nang Bảo Toàn Tài Sản 3 bước */}
        <aside
          aria-label="Lộ trình xử lý hoàn Coin"
          className="space-y-4 lg:sticky lg:top-24 lg:col-span-4"
        >
          <div className="rounded-[24px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/70 via-surface to-accent-vanilla/45 p-5 shadow-xs">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-[11px] font-bold tracking-wider text-primary uppercase">
              <ShieldCheck aria-hidden="true" animated={false} className="size-3.5" />
              <span>Quy trình 3 bước minh bạch</span>
            </div>

            <ol className="mt-4 space-y-3.5">
              <li className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Gửi hồ sơ hoàn Coin</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Hệ thống khóa trạng thái đơn và lưu biên nhận tức thì.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary-pastel bg-surface text-xs font-bold text-primary">
                  2
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Giảng viên & Kho Bạc đối soát</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Mọi phản hồi và thời gian duyệt được cập nhật công khai.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-success-border bg-success-bg text-xs font-bold text-success-foreground">
                  3
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Cộng Coin trực tiếp vào ví</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Số Coin bảo toàn sẵn sàng để tái đầu tư khóa học mới.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-[24px] border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center gap-2 text-primary">
              <Clock aria-hidden="true" animated={false} className="size-4" />
              <span className="text-xs font-bold">Mã đơn đang yêu cầu</span>
            </div>
            <p className="mt-2 break-all rounded-xl border border-border bg-background px-3 py-2 font-mono text-[11px] font-semibold text-foreground">
              {purchaseItemId || "Chưa chọn đơn khóa học"}
            </p>
            {!purchaseItemId && (
              <Link
                href="/refunds/refundable"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <FileText aria-hidden="true" animated={false} className="size-3.5" />
                <span>Chọn từ danh sách khóa học đủ điều kiện</span>
              </Link>
            )}
          </div>
        </aside>
      </div>
    </RefundStudioShell>
  );
}
