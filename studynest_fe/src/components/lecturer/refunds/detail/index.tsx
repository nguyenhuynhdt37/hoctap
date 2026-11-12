"use client";

import { Badge, Card } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { LecturerRefundDetailData } from "@/types/lecturer/refund";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Tag,
  User,
  XCircle,
} from "lucide-react";
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
}

type RefundStatus = LecturerRefundDetailData["refund"]["status"];

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
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
  { label: string; variant: BadgeVariant; description: string }
> = {
  requested: {
    label: "Đã yêu cầu",
    variant: "warning",
    description: "Chờ giảng viên xử lý",
  },
  instructor_approved: {
    label: "GV đã duyệt",
    variant: "info",
    description: "Đã chấp nhận yêu cầu",
  },
  instructor_rejected: {
    label: "GV đã từ chối",
    variant: "destructive",
    description: "Đã từ chối hoàn tiền",
  },
  admin_approved: {
    label: "Admin đã duyệt",
    variant: "success",
    description: "Admin đã thông qua",
  },
  admin_rejected: {
    label: "Admin đã từ chối",
    variant: "destructive",
    description: "Admin từ chối yêu cầu",
  },
  refunded: {
    label: "Đã hoàn tiền",
    variant: "success",
    description: "Tiền đã hoàn cho học viên",
  },
};

export default function LecturerRefundDetail({
  data,
}: LecturerRefundDetailProps) {
  const router = useRouter();
  const [comment, setComment] = useState(data.refund.instructor_comment ?? "");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null
  );
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const statusInfo = statusMeta[data.refund.status];
  const canRespond = data.refund.status === "requested";

  const courseThumbnail = data.course.thumbnail
    ? getImageUrl(data.course.thumbnail)
    : "";
  const instructorAvatar = data.instructor.avatar
    ? getImageUrl(data.instructor.avatar)
    : "";

  const timeline = useMemo(
    () => [
      {
        title: "Học viên tạo yêu cầu",
        time: data.refund.created_at,
        description: data.refund.reason,
        done: true,
      },
      {
        title: "Giảng viên phản hồi",
        time: data.refund.instructor_reviewed_at,
        description: data.refund.instructor_comment,
        done: Boolean(data.refund.instructor_reviewed_at),
      },
      {
        title: "Admin xử lý",
        time: data.refund.admin_reviewed_at,
        description: data.refund.admin_comment,
        done: Boolean(data.refund.admin_reviewed_at),
      },
      {
        title: "Hoàn tất",
        time: data.refund.resolved_at,
        description: null,
        done: Boolean(data.refund.resolved_at),
      },
    ],
    [data]
  );

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    showToast.success("Đã sao chép vào clipboard");
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
          : "Bạn đã từ chối yêu cầu."
      );
      router.refresh();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Không thể xử lý yêu cầu. Vui lòng thử lại.";
      showToast.error(message);
    } finally {
      setSubmitting(null);
    }
  };

  const isRejected =
    data.refund.status === "instructor_rejected" ||
    data.refund.status === "admin_rejected";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </button>

        <Card
          variant="surface"
          className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6"
        >
          <div className="flex items-center gap-4">
            <div
              className={`h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 ${
                isRejected
                  ? "bg-destructive-bg border-destructive-border"
                  : data.refund.status === "requested"
                  ? "bg-warning-bg border-warning-border"
                  : "bg-success-bg border-success-border"
              }`}
            >
              {isRejected ? (
                <XCircle className="h-7 w-7 text-destructive-foreground" />
              ) : data.refund.status === "requested" ? (
                <Clock className="h-7 w-7 text-warning-foreground" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-success-foreground" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Trạng thái hiện tại
              </p>
              <div className="font-display text-2xl font-semibold text-foreground tracking-tight">
                {statusInfo.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {statusInfo.description}
              </div>
            </div>
          </div>
          <div className="md:ml-auto md:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Số tiền hoàn
            </p>
            <div className="text-3xl font-bold text-primary tabular-nums">
              {formatCurrency(data.refund.amount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Yêu cầu ID:{" "}
              <span className="font-mono">
                {data.refund.id.slice(0, 10)}...
              </span>
            </p>
          </div>
        </Card>

        {canRespond && (
          <ActionPanel
            comment={comment}
            onCommentChange={setComment}
            onApprove={() => handleAction("approve")}
            onReject={() => handleAction("reject")}
            loading={submitting}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Thông tin yêu cầu"
              icon={<Clock className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-1">
                <DetailRow
                  label="ID yêu cầu"
                  value={<span className="font-mono">{data.refund.id}</span>}
                  onCopy={() => handleCopy(data.refund.id)}
                />
                <DetailRow
                  label="Trạng thái"
                  value={
                    <Badge variant={statusInfo.variant} size="sm" dot>
                      {statusInfo.label}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Số tiền yêu cầu"
                  value={formatCurrency(data.refund.amount)}
                />
                <DetailRow label="Lý do học viên" value={data.refund.reason} />
                <DetailRow
                  label="Thời gian tạo"
                  value={formatDateTime(data.refund.created_at)}
                />
                {data.refund.instructor_reviewed_at && (
                  <DetailRow
                    label="Giảng viên đã xử lý"
                    value={formatDateTime(data.refund.instructor_reviewed_at)}
                  />
                )}
                {data.refund.admin_reviewed_at && (
                  <DetailRow
                    label="Admin đã xử lý"
                    value={formatDateTime(data.refund.admin_reviewed_at)}
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Dòng thời gian"
              icon={<Clock className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-2">
                {timeline.map((item, index) => (
                  <TimelineItem
                    key={item.title}
                    title={item.title}
                    timeLabel={formatDateTime(item.time)}
                    description={item.description}
                    isDone={item.done}
                    isActive={!item.done && timeline[index - 1]?.done}
                    isLast={index === timeline.length - 1}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Thông tin mua hàng"
              icon={<Tag className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-1">
                <DetailRow
                  label="Mã đơn hàng"
                  value={
                    <span className="font-mono">
                      {data.purchase.purchase_item_id}
                    </span>
                  }
                  onCopy={() => handleCopy(data.purchase.purchase_item_id)}
                />
                <DetailRow
                  label="Giá gốc"
                  value={formatCurrency(data.purchase.original_price)}
                />
                <DetailRow
                  label="Giá sau giảm"
                  value={formatCurrency(data.purchase.discounted_price)}
                />
                {data.purchase.discount_id && (
                  <DetailRow
                    label="Mã giảm giá"
                    value={
                      <span className="font-mono">
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
                  label="Trạng thái đơn"
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

            <SectionCard
              title="Thông tin thu nhập"
              icon={<CheckCircle2 className="h-5 w-5 text-primary" />}
            >
              <div className="space-y-1">
                <DetailRow
                  label="Trạng thái"
                  value={
                    <Badge
                      variant={
                        data.earnings.status === "holding"
                          ? "warning"
                          : "success"
                      }
                      size="sm"
                      dot
                    >
                      {data.earnings.status === "holding"
                        ? "Đang giữ"
                        : "Đã giải ngân"}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Thu nhập giảng viên"
                  value={formatCurrency(data.earnings.amount_instructor)}
                />
                <DetailRow
                  label="Thu nhập nền tảng"
                  value={formatCurrency(data.earnings.amount_platform)}
                />
                <DetailRow
                  label="Số tiền hoàn thực tế"
                  value={formatCurrency(data.earnings.refund_amount_real)}
                />
                <DetailRow
                  label="Giữ đến"
                  value={formatDateTime(data.earnings.hold_until)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Khóa học"
              icon={<Tag className="h-5 w-5 text-primary" />}
            >
              <Link
                href={`/learning/${data.course.course_id}`}
                className="block group"
              >
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-background border border-border mb-4">
                  {courseThumbnail && !thumbnailError ? (
                    <Image
                      src={courseThumbnail}
                      alt={data.course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      onError={() => setThumbnailError(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-primary-light/30">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {data.course.title}
                </p>
              </Link>
            </SectionCard>

            <SectionCard
              title="Giảng viên"
              icon={<User className="h-5 w-5 text-primary" />}
            >
              <div className="flex items-center gap-3">
                {instructorAvatar && !avatarError ? (
                  <Image
                    src={instructorAvatar}
                    alt={data.instructor.fullname}
                    width={56}
                    height={56}
                    className="rounded-full object-cover object-center aspect-square border border-border"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary-light text-primary font-bold flex items-center justify-center border border-primary-pastel">
                    {data.instructor.fullname
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">
                    {data.instructor.fullname}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Người tạo khóa học
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
