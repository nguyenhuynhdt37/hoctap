"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Lock,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  X,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { AdminRefundDetailData } from "@/types/admin/refund";
import {
  formatRefundCoin,
  formatRefundDateTime,
  getRefundStatusMeta,
} from "../refund-visuals";

interface AdminRefundDetailProps {
  data: AdminRefundDetailData;
  onUpdated?: () => Promise<unknown>;
}

export default function AdminRefundDetail({
  data,
  onUpdated,
}: AdminRefundDetailProps) {
  const router = useRouter();
  const { refund, purchase, course, instructor, earnings } = data;
  const [comment, setComment] = useState(refund.admin_comment ?? "");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null,
  );

  const statusMeta = getRefundStatusMeta(refund.status);
  const canRespond =
    refund.status === "requested" || refund.status === "instructor_rejected";

  const steps = [
    {
      title: "1. Học viên yêu cầu",
      time: refund.created_at,
      note: refund.reason,
      done: true,
    },
    {
      title: "2. Giảng viên phản hồi",
      time: refund.instructor_reviewed_at,
      note: refund.instructor_comment,
      done: Boolean(
        refund.instructor_reviewed_at ||
          refund.status === "instructor_approved" ||
          refund.status === "instructor_rejected",
      ),
    },
    {
      title: "3. Admin phân xử",
      time: refund.admin_reviewed_at,
      note: refund.admin_comment,
      done: Boolean(
        refund.admin_reviewed_at ||
          refund.status === "admin_approved" ||
          refund.status === "admin_rejected",
      ),
    },
    {
      title: "4. Hoàn tiền về ví",
      time: refund.resolved_at,
      note:
        refund.status === "refunded"
          ? "Tiền đã hoàn thành công về ví học viên"
          : null,
      done: refund.status === "refunded",
    },
  ];

  async function handleDecision(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) {
      toast.error("Vui lòng nhập lý do từ chối hoàn tiền.");
      return;
    }
    setSubmitting(action);
    try {
      await api.post(`/admin/refunds/${refund.id}/lecturer-review`, {
        action,
        reason: comment.trim() || undefined,
      });
      toast.success(
        action === "approve"
          ? "Đã phê duyệt hoàn tiền cho học viên!"
          : "Đã từ chối yêu cầu hoàn tiền.",
      );
      if (onUpdated) await onUpdated();
      else router.refresh();
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xử lý yêu cầu hoàn tiền.";
      toast.error(detail);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Case Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-secondary-light/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/75 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/refunds"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeft size={13} />
                Danh sách hoàn tiền
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
              >
                <RotateCcw size={12} animated={false} />
                {statusMeta.label}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Hồ sơ Phân xử Hoàn tiền
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Mã hồ sơ:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(refund.id);
                  toast.success("Đã sao chép Refund ID");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-2.5 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
              >
                <span>{refund.id}</span>
                <Copy size={12} animated={false} />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-surface/90 p-5 text-left shadow-xs backdrop-blur-sm lg:min-w-[260px] lg:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Số tiền yêu cầu hoàn
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {formatRefundCoin(refund.amount)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
              <Clock size={13} animated={false} />
              Gửi lúc: {formatRefundDateTime(refund.created_at)}
            </p>
          </div>
        </div>
      </section>

      {/* 4-Step Resolution Stepper */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_32px_-14px_rgba(53,111,167,0.10)]">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Tiến trình Phân xử Hoàn tiền
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className={`rounded-2xl border p-4 text-xs transition-colors ${
                step.done
                  ? "border-primary-pastel bg-primary-light/40"
                  : "border-border/70 bg-background/50 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground">{step.title}</span>
                {step.done && (
                  <CheckCircle2
                    size={15}
                    animated={false}
                    className="shrink-0 text-primary"
                  />
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {formatRefundDateTime(step.time)}
              </p>
              {step.note && (
                <p className="mt-2 line-clamp-3 rounded-xl bg-surface/85 p-2 text-[11px] text-foreground">
                  {step.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Main 2-Column Case Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Student Reason */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="text-base font-semibold text-foreground">
              Lý do Học viên yêu cầu hoàn tiền
            </h2>
            <p className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-4 text-sm leading-relaxed text-foreground">
              {refund.reason || "Học viên không nhập lý do chi tiết."}
            </p>
          </section>

          {/* Course & Purchase Info */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BookOpen size={18} className="text-primary" />
              Khóa học &amp; Hạng mục Đơn hàng
            </h2>
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-border/80 bg-background/40 p-4 sm:flex-row sm:items-center">
              {course.thumbnail ? (
                <img
                  src={getImageUrl(course.thumbnail)}
                  alt={course.title}
                  className="h-20 w-32 shrink-0 rounded-2xl border border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <BookOpen size={24} />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-base font-bold text-foreground">
                  {course.title}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    Giá gốc:{" "}
                    <strong className="text-foreground">
                      {formatRefundCoin(purchase.original_price)}
                    </strong>
                  </span>
                  <span>
                    Thực thu:{" "}
                    <strong className="text-primary">
                      {formatRefundCoin(purchase.discounted_price)}
                    </strong>
                  </span>
                  <span>Ngày mua: {formatRefundDateTime(purchase.created_at)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Escrow & Earnings Breakdown */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Lock size={17} className="text-accent-vanilla-foreground" />
              Đối soát Doanh thu &amp; Escrow
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-background/60 p-3.5 text-xs">
                <p className="text-muted-foreground">Trạng thái Escrow</p>
                <p className="mt-1 font-bold text-foreground">
                  {earnings?.status || "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5 text-xs">
                <p className="text-muted-foreground">Phần Giảng viên</p>
                <p className="mt-1 font-bold text-primary">
                  {formatRefundCoin(earnings?.amount_instructor)}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5 text-xs">
                <p className="text-muted-foreground">Phần Phí sàn</p>
                <p className="mt-1 font-bold text-accent-foreground">
                  {formatRefundCoin(earnings?.amount_platform)}
                </p>
              </div>
              <div className="rounded-2xl bg-background/60 p-3.5 text-xs">
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Calendar size={11} animated={false} />
                  Giữ đến
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatRefundDateTime(earnings?.hold_until)}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Decision Console + Instructor */}
        <div className="space-y-6 lg:col-span-4">
          {/* Admin Decision Console */}
          <section className="rounded-3xl border border-primary-pastel/75 bg-primary-light/35 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck size={18} className="text-primary" />
              Quyết định Phân xử của Admin
            </h2>

            {canRespond ? (
              <div className="mt-4 space-y-4">
                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground">
                    Ghi chú phân xử (bắt buộc nếu từ chối)
                  </span>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Nhập nhận định đối soát hoặc lý do chấp thuận / từ chối..."
                    className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>

                <div className="flex flex-col gap-2.5">
                  <Button
                    disabled={submitting !== null}
                    onClick={() => void handleDecision("approve")}
                    className="w-full"
                  >
                    <CheckCircle2 size={15} />
                    {submitting === "approve"
                      ? "Đang phê duyệt..."
                      : "Chấp thuận hoàn tiền"}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={submitting !== null}
                    onClick={() => void handleDecision("reject")}
                    className="w-full"
                  >
                    <X size={15} />
                    {submitting === "reject"
                      ? "Đang từ chối..."
                      : "Từ chối yêu cầu"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-surface/90 p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Hồ sơ đã được chốt ở trạng thái “{statusMeta.label}”.
                </p>
                <p className="mt-1">{statusMeta.description}</p>
              </div>
            )}
          </section>

          {/* Instructor Card */}
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCheck size={18} className="text-primary" />
              Giảng viên phụ trách
            </h2>
            <div className="mt-4 flex items-center gap-3.5">
              {instructor.avatar ? (
                <img
                  src={getImageUrl(instructor.avatar)}
                  alt={instructor.fullname}
                  className="h-12 w-12 rounded-2xl border border-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light font-bold text-primary">
                  {instructor.fullname.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {instructor.fullname}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  ID: {instructor.id.slice(0, 10)}...
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
