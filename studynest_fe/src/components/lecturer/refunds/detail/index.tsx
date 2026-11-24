"use client";

import { formatVndAsCoin } from "@/lib/learning-hub/coin-logic";
import { Badge, Button, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { LecturerRefundDetailData } from "@/types/lecturer/refund";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  FileText,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Tag,
  User,
  Wallet,
  XCircle,
} from "pulsoicon-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionPanel } from "./action-panel";
import { DetailRow } from "./detail-row";
import { SectionCard } from "./section-card";
import { TimelineItem } from "./timeline-item";

interface LecturerRefundDetailProps {
  data: LecturerRefundDetailData;
  onUpdated?: () => Promise<unknown>;
}

type RefundStatus = LecturerRefundDetailData["refund"]["status"];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return formatVndAsCoin(value);
};

const formatVndApprox = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " đ";
};

const stripHtml = (input?: string | null) => {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const statusMeta: Record<
  RefundStatus,
  {
    label: string;
    variant: BadgeVariant;
    description: string;
    stampText: string;
  }
> = {
  requested: {
    label: "Chờ giảng viên duyệt",
    variant: "warning",
    description: "Học viên vừa gửi yêu cầu và đang đợi phản hồi từ bạn",
    stampText: "CHỜ DUYỆT",
  },
  instructor_approved: {
    label: "Giảng viên đã chấp thuận",
    variant: "info",
    description: "Bạn đã đồng ý hoàn tiền · đang chuyển Admin xác nhận cuối",
    stampText: "GV ĐÃ DUYỆT",
  },
  instructor_rejected: {
    label: "Giảng viên đã từ chối",
    variant: "destructive",
    description: "Bạn đã từ chối yêu cầu hoàn tiền này",
    stampText: "GV TỪ CHỐI",
  },
  admin_approved: {
    label: "Admin đã phê duyệt",
    variant: "success",
    description: "Quản trị viên đã thông qua và đang tiến hành hoàn Coin",
    stampText: "ĐÃ PHÊ DUYỆT",
  },
  admin_rejected: {
    label: "Admin đã từ chối",
    variant: "destructive",
    description: "Quản trị viên không chấp thuận yêu cầu hoàn tiền này",
    stampText: "ĐÃ TỪ CHỐI",
  },
  refunded: {
    label: "Đã hoàn tiền thành công",
    variant: "success",
    description: "Khoản Coin đã được hoàn về ví học viên và chốt đối soát",
    stampText: "ĐÃ HOÀN TIỀN",
  },
};

export default function LecturerRefundDetail({
  data,
  onUpdated,
}: LecturerRefundDetailProps) {
  const router = useRouter();
  const [comment, setComment] = useState(data.refund.instructor_comment ?? "");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null,
  );
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const statusInfo = statusMeta[data.refund.status];
  const canRespond = data.refund.status === "requested";
  const isRejected =
    data.refund.status === "instructor_rejected" ||
    data.refund.status === "admin_rejected";

  const courseThumbnail = data.course.thumbnail
    ? getImageUrl(data.course.thumbnail)
    : "";
  const instructorAvatar = data.instructor.avatar
    ? getImageUrl(data.instructor.avatar)
    : "";

  const cleanReason = stripHtml(data.refund.reason);
  const cleanInstructorComment = stripHtml(data.refund.instructor_comment);
  const cleanAdminComment = stripHtml(data.refund.admin_comment);

  // Tính tỷ lệ phân bổ Kho Bạc (Thù lao GV vs Phí nền tảng)
  const earningsBreakdown = useMemo(() => {
    const inst = Math.max(0, Number(data.earnings.amount_instructor ?? 0));
    const plat = Math.max(0, Number(data.earnings.amount_platform ?? 0));
    const total = inst + plat;
    const instPct = total > 0 ? Math.round((inst / total) * 100) : 0;
    const platPct = total > 0 ? Math.max(0, 100 - instPct) : 0;
    return { inst, plat, total, instPct, platPct };
  }, [data.earnings.amount_instructor, data.earnings.amount_platform]);

  // Tính mức tiết kiệm của đơn gốc
  const purchaseDiscount = Math.max(
    0,
    (data.purchase.original_price ?? 0) - (data.purchase.discounted_price ?? 0),
  );

  const timeline = useMemo(
    () => [
      {
        title: "Học viên gửi yêu cầu hoàn tiền",
        time: data.refund.created_at,
        description: data.refund.reason,
        done: true,
        rejected: false,
        active: false,
      },
      {
        title: "Giảng viên thẩm định & phản hồi",
        time: data.refund.instructor_reviewed_at,
        description: data.refund.instructor_comment,
        done: Boolean(data.refund.instructor_reviewed_at),
        rejected: data.refund.status === "instructor_rejected",
        active: data.refund.status === "requested",
      },
      {
        title: "Quản trị viên đối soát cuối",
        time: data.refund.admin_reviewed_at,
        description: data.refund.admin_comment,
        done: Boolean(data.refund.admin_reviewed_at),
        rejected: data.refund.status === "admin_rejected",
        active: data.refund.status === "instructor_approved",
      },
      {
        title: "Hoàn tất quyết toán",
        time: data.refund.resolved_at,
        description: null,
        done: Boolean(data.refund.resolved_at),
        rejected: false,
        active: data.refund.status === "admin_approved",
      },
    ],
    [data],
  );

  const handleCopy = (value: string) => {
    navigator.clipboard?.writeText(value);
    showToast.success("Đã sao chép vào clipboard");
  };

  const handleCopyRefundId = () => {
    handleCopy(data.refund.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) {
      showToast.error("Vui lòng nhập lý do khi từ chối yêu cầu.");
      return;
    }
    try {
      setSubmitting(action);
      await api.post(`/lecturer/refunds/${data.refund.id}/lecturer-review`, {
        action,
        ...(comment.trim() ? { reason: comment.trim() } : {}),
      });
      showToast.success(
        action === "approve"
          ? "Bạn đã chấp nhận hoàn tiền."
          : "Bạn đã từ chối yêu cầu.",
      );
      if (onUpdated) await onUpdated();
      else router.refresh();
    } catch (error: unknown) {
      const errObj = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const message =
        errObj?.response?.data?.message ||
        errObj?.response?.data?.detail ||
        "Không thể xử lý yêu cầu. Vui lòng thử lại.";
      showToast.error(message);
    } finally {
      setSubmitting(null);
    }
  };

  const heroBgClass = isRejected
    ? "border-destructive-border bg-gradient-to-br from-destructive-bg/75 via-surface to-secondary-light/45"
    : data.refund.status === "requested"
      ? "border-warning-border bg-gradient-to-br from-accent-vanilla/90 via-surface to-primary-light/60"
      : "border-success-border bg-gradient-to-br from-success-bg/75 via-surface to-primary-light/60";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => router.push("/lecturer/refund")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground shadow-2xs transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Trạm Hoàn Tiền</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={handleCopyRefundId}
              leftIcon={
                copiedId ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
            >
              {copiedId
                ? "Đã chép mã"
                : `Mã #${data.refund.id.slice(0, 8).toUpperCase()}`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              onClick={() => window.print()}
              leftIcon={<Printer className="h-3.5 w-3.5" />}
            >
              In hồ sơ
            </Button>
          </div>
        </div>

        {/* Hero Chứng Từ Đối Soát */}
        <section
          className={`relative overflow-hidden rounded-[28px] border p-6 shadow-sm sm:p-8 ${heroBgClass}`}
        >
          {/* Họa tiết vân Guilloché SVG */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-primary/10"
            viewBox="0 0 240 240"
            fill="none"
          >
            <circle
              cx="120"
              cy="120"
              r="98"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="120" cy="120" r="68" stroke="currentColor" strokeWidth="1.2" />
            <circle
              cx="120"
              cy="120"
              r="38"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="3 5"
            />
          </svg>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Trái: Biểu tượng trạng thái + Tiêu đề */}
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${
                  isRejected
                    ? "border-destructive-border bg-surface text-destructive-foreground"
                    : data.refund.status === "requested"
                      ? "border-warning-border bg-surface text-warning-foreground"
                      : "border-success-border bg-surface text-success-foreground"
                }`}
              >
                {isRejected ? (
                  <XCircle className="h-7 w-7" />
                ) : data.refund.status === "requested" ? (
                  <Clock className="h-7 w-7" />
                ) : (
                  <CheckCircle2 className="h-7 w-7" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <ShieldCheck animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                    Hồ sơ đối soát hoàn tiền
                  </span>
                  <Badge variant={statusInfo.variant} size="sm" dot>
                    {statusInfo.stampText}
                  </Badge>
                </div>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {statusInfo.label}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {statusInfo.description}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Ngày lập hồ sơ:{" "}
                  <strong className="text-foreground">
                    {formatDateTime(data.refund.created_at)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Phải: Số Coin hoàn cỡ lớn */}
            <div className="rounded-2xl border border-border/80 bg-surface/90 px-5 py-4 backdrop-blur-xs lg:min-w-[260px] lg:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Số Coin yêu cầu hoàn
              </p>
              <div className="mt-1 inline-flex items-center gap-2 font-display text-3xl font-bold tabular-nums text-primary sm:text-4xl">
                <Coins animated={false} className="h-7 w-7 shrink-0" aria-hidden="true" />
                <span>{formatCurrency(data.refund.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                Quy đổi tương đương ≈ {formatVndApprox(data.refund.amount)}
              </p>
            </div>
          </div>

          {/* Mini-strip 3 chỉ số tóm tắt */}
          <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/75 bg-surface/85 px-4 py-3 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground">Thực trả đơn gốc</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(data.purchase.discounted_price)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/75 bg-surface/85 px-4 py-3 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground">
                Thù lao giảng viên liên quan
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-primary">
                {formatCurrency(data.earnings.amount_instructor)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/75 bg-surface/85 px-4 py-3 backdrop-blur-xs">
              <p className="text-xs text-muted-foreground">
                Số Coin hoàn thực tế
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(data.earnings.refund_amount_real)}
              </p>
            </div>
          </div>
        </section>

        {/* Bảng Xét Duyệt Trực Tiếp (chỉ hiện khi đang chờ giảng viên xử lý) */}
        {canRespond && (
          <ActionPanel
            comment={comment}
            onCommentChange={setComment}
            onApprove={() => handleAction("approve")}
            onReject={() => handleAction("reject")}
            loading={submitting}
          />
        )}

        {/* Bố cục chính 2 cột 8/4 */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Cột trái (8/12) */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Hành trình xét duyệt 4 bước */}
            <SectionCard
              title="Hành trình xét duyệt hồ sơ"
              subtitle="Theo dõi đầy đủ 4 bước từ khi học viên gửi yêu cầu đến khi hoàn tất"
              icon={<Clock animated={false} className="h-5 w-5" />}
              accent="primary"
            >
              <div>
                {timeline.map((step, index) => (
                  <TimelineItem
                    key={step.title}
                    title={step.title}
                    time={step.time}
                    description={step.description}
                    done={step.done}
                    rejected={step.rejected}
                    active={step.active}
                    isLast={index === timeline.length - 1}
                  />
                ))}
              </div>
            </SectionCard>

            {/* 2. Hồ sơ yêu cầu & Lý do học viên */}
            <SectionCard
              title="Chi tiết yêu cầu & Ghi chú đối soát"
              subtitle="Nội dung phản ánh từ học viên và nhận xét của các bên"
              icon={<FileText animated={false} className="h-5 w-5" />}
              accent="vanilla"
            >
              {cleanReason && (
                <div className="mb-4 rounded-2xl border border-primary-pastel/70 bg-primary-light/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1.5">
                    Lý do học viên cung cấp
                  </p>
                  <p className="text-sm leading-relaxed text-foreground">
                    &ldquo;{cleanReason}&rdquo;
                  </p>
                </div>
              )}

              <div>
                <DetailRow
                  label="Mã hồ sơ hoàn tiền"
                  value={
                    <span className="font-mono text-xs">{data.refund.id}</span>
                  }
                  onCopy={() => handleCopy(data.refund.id)}
                />
                <DetailRow
                  label="Trạng thái hiện tại"
                  value={
                    <Badge variant={statusInfo.variant} size="sm" dot>
                      {statusInfo.label}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Nhận xét của giảng viên"
                  value={cleanInstructorComment || "Chưa có nhận xét"}
                />
                {cleanAdminComment && (
                  <DetailRow
                    label="Nhận xét của quản trị viên"
                    value={cleanAdminComment}
                  />
                )}
                <DetailRow
                  label="Thời điểm tạo yêu cầu"
                  value={formatDateTime(data.refund.created_at)}
                />
              </div>
            </SectionCard>

            {/* 3. Đối soát phân bổ Kho Bạc (Earnings Breakdown) */}
            <SectionCard
              title="Đối soát phân bổ Kho Bạc"
              subtitle="Tỷ lệ chia sẻ doanh thu và trạng thái tạm giữ quỹ của đơn hàng"
              icon={<Coins animated={false} className="h-5 w-5" />}
              accent="secondary"
              rightSlot={
                <Badge
                  variant={
                    data.earnings.status === "holding" ? "warning" : "success"
                  }
                  size="sm"
                  dot
                >
                  {data.earnings.status === "holding"
                    ? "Đang tạm giữ"
                    : data.earnings.status === "freeze"
                      ? "Đang đóng băng"
                      : "Đã giải ngân"}
                </Badge>
              }
            >
              {/* Thanh phân bổ tỷ lệ % trực quan */}
              {earningsBreakdown.total > 0 && (
                <div className="mb-5 space-y-2 rounded-2xl border border-border/80 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-primary">
                      Thù lao giảng viên ({earningsBreakdown.instPct}%)
                    </span>
                    <span className="font-semibold text-secondary-foreground">
                      Phí nền tảng ({earningsBreakdown.platPct}%)
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary-light">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${earningsBreakdown.instPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 3 ô số liệu */}
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-primary-pastel/70 bg-primary-light/40 p-3.5">
                  <p className="text-xs text-primary font-medium">
                    Thù lao giảng viên
                  </p>
                  <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(data.earnings.amount_instructor)}
                  </p>
                </div>
                <div className="rounded-2xl border border-secondary-pastel/70 bg-secondary-light/40 p-3.5">
                  <p className="text-xs text-secondary-foreground font-medium">
                    Phí nền tảng
                  </p>
                  <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground">
                    {formatCurrency(data.earnings.amount_platform)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-accent-vanilla/50 p-3.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    Hoàn thực tế
                  </p>
                  <p className="mt-1 font-display text-lg font-bold tabular-nums text-primary">
                    {formatCurrency(data.earnings.refund_amount_real)}
                  </p>
                </div>
              </div>

              <div>
                <DetailRow
                  label="Mốc giữ quỹ đến"
                  value={formatDateTime(data.earnings.hold_until)}
                />
              </div>
            </SectionCard>

            {/* 4. Thông tin đơn hàng gốc */}
            <SectionCard
              title="Thông tin đơn hàng gốc"
              subtitle="Chi tiết thanh toán khi học viên đăng ký khóa học"
              icon={<Receipt animated={false} className="h-5 w-5" />}
              accent="primary"
            >
              <div>
                <DetailRow
                  label="Mã mục đơn hàng"
                  value={
                    <span className="font-mono text-xs">
                      {data.purchase.purchase_item_id}
                    </span>
                  }
                  onCopy={() => handleCopy(data.purchase.purchase_item_id)}
                />
                <DetailRow
                  label="Giá niêm yết gốc"
                  value={formatCurrency(data.purchase.original_price)}
                />
                <DetailRow
                  label="Giá thực trả sau ưu đãi"
                  value={
                    <span className="font-semibold text-primary">
                      {formatCurrency(data.purchase.discounted_price)}
                    </span>
                  }
                />
                {purchaseDiscount > 0 && (
                  <DetailRow
                    label="Mức giảm đã áp dụng"
                    value={
                      <Badge variant="secondary" size="sm">
                        -{formatCurrency(purchaseDiscount)}
                      </Badge>
                    }
                  />
                )}
                {data.purchase.discount_id && (
                  <DetailRow
                    label="Mã giảm giá áp dụng"
                    value={
                      <span className="font-mono text-xs">
                        {data.purchase.discount_id}
                      </span>
                    }
                    onCopy={() =>
                      data.purchase.discount_id &&
                      handleCopy(data.purchase.discount_id)
                    }
                  />
                )}
                <DetailRow
                  label="Trạng thái đơn hàng"
                  value={
                    <Badge
                      variant={
                        data.purchase.status === "completed"
                          ? "success"
                          : "warning"
                      }
                      size="sm"
                      dot
                    >
                      {data.purchase.status === "completed"
                        ? "Hoàn thành"
                        : "Đang xử lý"}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Thời gian mua"
                  value={formatDateTime(data.purchase.created_at)}
                />
              </div>
            </SectionCard>
          </div>

          {/* Cột phải Sticky (4/12) */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:col-span-4">
            {/* Thẻ Khóa học liên quan */}
            <SectionCard
              title="Khóa học liên quan"
              icon={<Tag animated={false} className="h-5 w-5" />}
              accent="primary"
            >
              <Link
                href={`/learning/${data.course.course_id}`}
                className="group block"
              >
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-primary-light/40">
                  {courseThumbnail && !thumbnailError ? (
                    <Image
                      src={courseThumbnail}
                      alt={data.course.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={() => setThumbnailError(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Không có ảnh bìa
                    </div>
                  )}
                </div>
                <p className="font-display text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
                  {data.course.title}
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>Mở trang khóa học</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            </SectionCard>

            {/* Thẻ Giảng viên phụ trách */}
            <SectionCard
              title="Giảng viên phụ trách"
              icon={<User animated={false} className="h-5 w-5" />}
              accent="secondary"
            >
              <div className="flex items-center gap-3.5">
                {instructorAvatar && !avatarError ? (
                  <Image
                    src={instructorAvatar}
                    alt={data.instructor.fullname}
                    width={56}
                    height={56}
                    className="aspect-square rounded-full border border-border object-cover object-center"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary-pastel bg-primary-light font-bold text-primary">
                    {data.instructor.fullname
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {data.instructor.fullname}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Giảng viên sở hữu khóa học
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Điều hướng nhanh */}
            <Card
              variant="surface"
              className="rounded-[24px] border border-border bg-gradient-to-br from-surface to-primary-light/30 p-5 shadow-2xs print:hidden"
            >
              <h3 className="font-display text-sm font-semibold text-foreground mb-3">
                Điều hướng nhanh đối soát
              </h3>
              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  fullWidth
                  className="justify-between rounded-full"
                  onClick={() => router.push("/lecturer/refund")}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Trạm Hoàn Tiền
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="justify-between rounded-full bg-surface"
                  onClick={() => router.push("/lecturer/wallets")}
                  leftIcon={<Wallet className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Ví Giảng Viên
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
