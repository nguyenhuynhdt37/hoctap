"use client";

import { Check, Clock, ShieldCheck, XCircle } from "pulsoicon-react";
import type { LecturerTransactionDetail } from "@/types/lecturer/wallet";
import { cn } from "@/lib/utils";
import { formatVnDateTime, getTransactionMethodLabel } from "../transactions/formatters";

interface TimelineStep {
  id: string;
  title: string;
  subtitle: string;
  time?: string | null;
  state: "done" | "active" | "pending" | "failed";
}

function buildSteps(data: LecturerTransactionDetail): TimelineStep[] {
  const status = (data.status || "").toLowerCase();
  const methodLabel = getTransactionMethodLabel(data.method, data.gateway);
  const isCompleted = status === "completed" || status === "approved";
  const isFailed = status === "canceled" || status === "failed" || status === "rejected";

  const steps: TimelineStep[] = [
    {
      id: "created",
      title: "Khởi tạo lệnh giao dịch",
      subtitle: `Ghi nhận yêu cầu qua ${methodLabel}`,
      time: data.created_at,
      state: "done",
    },
    {
      id: "verify",
      title: "Đối soát & xác thực cổng thanh toán",
      subtitle: data.gateway ? `Cổng ${data.gateway}` : "Kiểm tra an toàn hệ thống Mây Mây",
      time: data.confirmed_at || (isCompleted ? data.created_at : null),
      state: isCompleted ? "done" : isFailed ? "failed" : "active",
    },
    {
      id: "settled",
      title: isFailed ? "Lệnh đã đóng / không ghi sổ" : "Cập nhật số dư Kho Bạc Mây Mây",
      subtitle: isCompleted
        ? "Số dư Coin đã được đồng bộ vào ví của bạn"
        : isFailed
          ? "Giao dịch không làm thay đổi số dư thực tế"
          : "Sẽ tự động cộng/trừ ngay khi hoàn tất xác thực",
      time: isCompleted ? data.confirmed_at || data.created_at : null,
      state: isCompleted ? "done" : isFailed ? "failed" : "pending",
    },
  ];

  // Nối thêm mốc giải ngân nếu là thu nhập giảng dạy
  if (data.income) {
    if (data.income.hold_until) {
      steps.push({
        id: "hold",
        title: "Giai đoạn tạm giữ đối soát",
        subtitle: "Bảo vệ quyền lợi học viên và giảng viên",
        time: data.income.hold_until,
        state: data.income.available_at || data.income.paid_at ? "done" : "active",
      });
    }
    if (data.income.available_at || data.income.paid_at) {
      steps.push({
        id: "payout",
        title: data.income.paid_at ? "Đã giải ngân thù lao" : "Khả dụng rút tiền",
        subtitle: "Doanh thu sẵn sàng trong tài khoản giảng viên",
        time: data.income.paid_at || data.income.available_at,
        state: "done",
      });
    }
  }

  // Nối thêm mốc duyệt lệnh nếu là rút tiền
  if (data.withdraw) {
    if (data.withdraw.approved_at) {
      steps.push({
        id: "withdraw-approved",
        title: "Kho bạc đã phê duyệt lệnh rút",
        subtitle: "Khoản rút đã được xác nhận chuyển đi",
        time: data.withdraw.approved_at,
        state: "done",
      });
    } else if (data.withdraw.rejected_at) {
      steps.push({
        id: "withdraw-rejected",
        title: "Lệnh rút tiền bị từ chối",
        subtitle: "Coin đã được hoàn bảo toàn về ví",
        time: data.withdraw.rejected_at,
        state: "failed",
      });
    }
  }

  return steps;
}

export function TransactionFlowTimeline({ data }: { data: LecturerTransactionDetail }) {
  const steps = buildSteps(data);

  return (
    <section
      aria-label="Hành trình xử lý dòng tiền"
      className="rounded-[24px] border border-border bg-surface p-5 shadow-xs sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl border border-primary-pastel bg-primary-light text-primary">
            <ShieldCheck aria-hidden="true" animated={false} className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Hành trình dòng tiền
            </h2>
            <p className="text-xs text-muted-foreground">
              Theo dõi minh bạch từng mốc xác thực của giao dịch
            </p>
          </div>
        </div>
      </div>

      <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-0.5 before:bg-border">
        {steps.map((step) => {
          const isDone = step.state === "done";
          const isActive = step.state === "active";
          const isFailed = step.state === "failed";

          return (
            <li key={step.id} className="relative flex items-start gap-3.5 pl-1">
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2",
                  isDone
                    ? "border-success-border bg-success-bg text-success-foreground"
                    : isFailed
                      ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                      : isActive
                        ? "border-accent-vanilla-border bg-accent-vanilla text-accent-vanilla-foreground"
                        : "border-border bg-background text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check animated={false} className="size-3.5" />
                ) : isFailed ? (
                  <XCircle animated={false} className="size-3.5" />
                ) : (
                  <Clock animated={false} className="size-3.5" />
                )}
              </span>

              <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-background/70 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <p className="text-xs font-bold text-foreground">{step.title}</p>
                  {step.time && (
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {formatVnDateTime(step.time)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
