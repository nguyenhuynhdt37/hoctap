"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Lock,
  ShieldCheck,
  Unlock,
  UserCheck,
  Wallet,
  X,
} from "pulsoicon-react";
import { Button } from "@/components/ui";
import {
  DEFAULT_COIN_VND_RATE,
  formatCoin,
  formatVnd,
  formatVndAsCoin,
} from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { AdminWithdrawDetail } from "@/types/admin/withdraw";
import {
  formatWithdrawDateTime,
  getWithdrawStatusMeta,
} from "../withdraw-visuals";

interface Props {
  data: AdminWithdrawDetail;
  onUpdated?: () => Promise<unknown>;
}

export default function AdminWithdrawDetail({ data, onUpdated }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null,
  );
  const [comment, setComment] = useState("");

  const statusMeta = getWithdrawStatusMeta(data.status);
  const canAction = data.status === "pending";
  const wallet = data.wallets;
  const coinRate = wallet?.coin_vnd_rate || DEFAULT_COIN_VND_RATE;
  const paidCoins = wallet?.paid_coins;
  const bonusCoins = wallet?.bonus_coins ?? 0;

  const steps = [
    {
      title: "1. Giảng viên gửi lệnh rút",
      time: data.requested_at,
      done: true,
    },
    {
      title: "2. Admin xét duyệt",
      time: data.approved_at || data.rejected_at,
      done: Boolean(data.approved_at || data.rejected_at || data.status !== "pending"),
    },
    {
      title: "3. Kết quả chi trả",
      time: data.status === "paid" ? data.approved_at : data.rejected_at,
      done: data.status === "paid" || data.status === "rejected" || data.status === "failed",
    },
  ];

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) {
      toast.error("Vui lòng nhập lý do từ chối chi trả.");
      return;
    }
    setSubmitting(action);
    try {
      await api.post("/admin/withdraw/approve_deny", {
        approve: action === "approve",
        withdraw_ids: [data.id],
        ...(comment.trim() ? { reason: comment.trim() } : {}),
      });
      toast.success(
        action === "approve"
          ? "Đã duyệt lệnh chi trả rút tiền!"
          : "Đã từ chối lệnh rút tiền và hoàn số dư về ví giảng viên.",
      );
      if (onUpdated) await onUpdated();
      else router.refresh();
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Không thể xử lý yêu cầu rút tiền.";
      toast.error(detail);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-foreground sm:p-6 lg:p-8">
      {/* Payout Hero Banner */}
      <section className="relative overflow-hidden rounded-[2rem] border border-primary-pastel/75 bg-gradient-to-br from-primary-light/90 via-surface to-accent/35 p-6 shadow-[0_24px_48px_-16px_rgba(53,111,167,0.16)] sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/75 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/withdraws"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeft size={13} />
                Danh sách lệnh rút
              </Link>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Hồ sơ Chi trả &amp; Kiểm tra Ví Giảng viên
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Withdraw ID:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(data.id);
                  toast.success("Đã sao chép Withdraw ID");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/90 px-2.5 py-1 font-mono text-xs text-foreground hover:border-primary hover:text-primary"
              >
                <span>{data.id}</span>
                <Copy size={12} animated={false} />
              </button>
              {data.paypal_batch_id && (
                <span className="rounded-lg bg-info-bg px-2.5 py-1 font-mono text-[11px] font-semibold text-info-foreground">
                  PayPal Batch: {data.paypal_batch_id}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/80 bg-surface/90 p-5 text-left shadow-xs backdrop-blur-sm lg:min-w-[260px] lg:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Số tiền yêu cầu rút
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {data.coin_amount != null
                ? formatCoin(data.coin_amount)
                : formatVndAsCoin(data.amount, coinRate)}
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              ≈ {formatVnd(Math.round(data.amount || 0))}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
              <Clock size={13} animated={false} />
              {formatWithdrawDateTime(data.requested_at)}
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Timeline */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className={`rounded-2xl border p-4 text-xs ${
              s.done
                ? "border-primary-pastel bg-primary-light/40"
                : "border-border bg-surface opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">{s.title}</span>
              {s.done && (
                <CheckCircle2 size={15} animated={false} className="text-primary" />
              )}
            </div>
            <p className="mt-1 text-muted-foreground">
              {formatWithdrawDateTime(s.time)}
            </p>
          </div>
        ))}
      </section>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Lecturer + Wallet Health */}
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UserCheck size={18} className="text-primary" />
              Thông tin Giảng viên
            </h2>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {data.lecturer.avatar ? (
                  <img
                    src={getImageUrl(data.lecturer.avatar)}
                    alt={data.lecturer.fullname}
                    className="h-14 w-14 rounded-2xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-pastel bg-primary-light text-lg font-bold text-primary">
                    {data.lecturer.fullname.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-foreground">
                    {data.lecturer.fullname}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.lecturer.email}
                  </p>
                </div>
              </div>

              {wallet && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${
                      wallet.kyc_verified
                        ? "border-success-border bg-success-bg text-success-foreground"
                        : "border-warning-border bg-warning-bg text-warning-foreground"
                    }`}
                  >
                    {wallet.kyc_verified ? (
                      <CheckCircle2 size={13} animated={false} />
                    ) : (
                      <AlertTriangle size={13} animated={false} />
                    )}
                    {wallet.kyc_verified ? "Đã xác minh KYC" : "Chưa xác minh KYC"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold ${
                      wallet.is_locked
                        ? "border-destructive-border bg-destructive-bg text-destructive-foreground"
                        : "border-info-border bg-info-bg text-info-foreground"
                    }`}
                  >
                    {wallet.is_locked ? (
                      <Lock size={13} animated={false} />
                    ) : (
                      <Unlock size={13} animated={false} />
                    )}
                    {wallet.is_locked ? "Ví đang bị khóa" : "Ví hoạt động bình thường"}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Wallet Health Metrics */}
          {wallet && (
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_10px_28px_-14px_rgba(53,111,167,0.10)]">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Wallet size={18} className="text-primary" />
                Đối soát Ví Giảng viên
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-primary-light/55 p-4">
                  <p className="text-xs text-muted-foreground">Số dư Coin hiện tại</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {paidCoins != null
                      ? formatCoin(paidCoins)
                      : formatVndAsCoin(wallet.balance, coinRate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    ≈{" "}
                    {formatVnd(
                      Math.round(
                        paidCoins != null ? paidCoins * coinRate : wallet.balance || 0,
                      ),
                    )}
                    {bonusCoins > 0 ? ` · +${formatCoin(bonusCoins)} thưởng` : ""}
                  </p>
                </div>
                <div className="rounded-2xl bg-success-bg/60 p-4">
                  <p className="text-xs text-muted-foreground">Tổng thu nhập vào</p>
                  <p className="mt-1 text-lg font-bold text-success-foreground">
                    +{formatVndAsCoin(wallet.total_in, coinRate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    ≈ {formatVnd(Math.round(wallet.total_in || 0))}
                  </p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Tổng đã rút ra</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    -{formatVndAsCoin(wallet.total_out, coinRate)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    ≈ {formatVnd(Math.round(wallet.total_out || 0))}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Giao dịch gần nhất: {formatWithdrawDateTime(wallet.last_transaction_at)}
              </p>
            </section>
          )}

          {data.reason && (
            <section className="rounded-3xl border border-destructive-border bg-destructive-bg/50 p-5 text-sm text-destructive-foreground">
              <p className="font-semibold">Ghi chú / Lý do từ chối:</p>
              <p className="mt-1">{data.reason}</p>
            </section>
          )}
        </div>

        {/* Right: Approval Console */}
        <div className="lg:col-span-4">
          <section className="rounded-3xl border border-primary-pastel/75 bg-primary-light/35 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck size={18} className="text-primary" />
              Xét duyệt Chi trả
            </h2>

            {canAction ? (
              <div className="mt-4 space-y-4">
                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground">
                    Ghi chú kiểm duyệt (bắt buộc khi từ chối)
                  </span>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Nhập ghi chú đối soát hoặc lý do từ chối..."
                    className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>

                <div className="flex flex-col gap-2.5">
                  <Button
                    disabled={submitting !== null}
                    onClick={() => void handleAction("approve")}
                    className="w-full"
                  >
                    <CheckCircle2 size={15} />
                    {submitting === "approve"
                      ? "Đang phê duyệt..."
                      : "Phê duyệt chi trả"}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={submitting !== null}
                    onClick={() => void handleAction("reject")}
                    className="w-full"
                  >
                    <X size={15} />
                    {submitting === "reject"
                      ? "Đang từ chối..."
                      : "Từ chối lệnh rút"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-surface/90 p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">
                  Lệnh rút tiền đã ở trạng thái “{statusMeta.label}”.
                </p>
                <p className="mt-1">
                  Không cần thêm thao tác xét duyệt cho lệnh này.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
