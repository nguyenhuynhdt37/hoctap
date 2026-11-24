"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleX,
  Clock,
  Coins,
  Copy,
  FileText,
  ShieldCheck,
  Tag,
  User,
  Wallet,
} from "pulsoicon-react";
import { Badge, Button } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import type { RefundDetailData } from "@/types/user/refund";
import { cn } from "@/lib/utils";
import {
  formatRefundCoin,
  formatRefundCoinNumber,
  formatRefundDateTime,
  formatRefundVnd,
  getRefundStatusMeta,
} from "../shared/refund-status";
import { RefundStudioShell } from "../shared/refund-studio-shell";
import { DetailRow } from "./detail-row";
import { SectionCard } from "./section-card";
import { TimelineItem } from "./timeline-item";

interface RefundRequestDetailProps {
  data: RefundDetailData;
}

function stripHtml(raw?: string | null): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "—";
}

export default function RefundRequestDetail({ data }: RefundRequestDetailProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const statusInfo = getRefundStatusMeta(data.refund.status);
  const isRejected =
    data.refund.status === "instructor_rejected" || data.refund.status === "admin_rejected";
  const isCompleted =
    data.refund.status === "refunded" || data.refund.status === "admin_approved";

  const courseThumbnail = data.course.thumbnail ? getImageUrl(data.course.thumbnail) : "";
  const instructorAvatar = data.instructor.avatar ? getImageUrl(data.instructor.avatar) : "";
  const instructorInitials = (data.instructor.fullname || "GV")
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const timeline = useMemo(
    () => [
      {
        title: "Học viên khởi tạo hồ sơ hoàn Coin",
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
        title: "Kho Bạc & Quản trị viên xử lý",
        time: data.refund.admin_reviewed_at,
        description: data.refund.admin_comment,
        done: Boolean(data.refund.admin_reviewed_at),
      },
      {
        title: "Hoàn tất đối soát",
        time: data.refund.resolved_at,
        description: null,
        done: Boolean(data.refund.resolved_at),
      },
    ],
    [data],
  );

  const handleCopy = (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => showToast.success("Đã sao chép vào clipboard"))
        .catch(() => undefined);
    }
  };

  return (
    <RefundStudioShell
      activeTab="detail"
      eyebrow={`Cloud Shield · Hồ sơ #${data.refund.id.slice(0, 8).toUpperCase()}`}
      title={statusInfo.label}
      description={statusInfo.description}
      backHref="/refunds/my-requests"
      backLabel="Yêu cầu của tôi"
      tone={isRejected ? "destructive" : isCompleted ? "success" : "vanilla"}
      heroRight={
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-border/80 bg-surface/92 px-5 py-4 shadow-xs backdrop-blur-sm lg:items-end">
          <div
            aria-hidden="true"
            className={cn(
              "stamp-down inline-flex items-center gap-1.5 rounded-full border-2 border-dashed px-3 py-0.5 text-[10px] font-extrabold tracking-[0.14em] uppercase",
              isRejected
                ? "border-destructive/45 text-destructive-foreground"
                : isCompleted
                  ? "border-success-foreground/45 text-success-foreground"
                  : "border-accent-vanilla-foreground/45 text-accent-vanilla-foreground",
            )}
          >
            {isRejected ? (
              <CircleX animated={false} className="size-3" />
            ) : (
              <CheckCircle2 animated={false} className="size-3" />
            )}
            <span>{statusInfo.stampText}</span>
          </div>
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Giá trị hoàn Coin
          </p>
          <p
            className={cn(
              "inline-flex items-center gap-1.5 font-display text-3xl font-bold tabular-nums",
              isRejected ? "text-destructive-foreground" : "text-primary",
            )}
          >
            <Coins aria-hidden="true" animated={false} className="size-6 text-accent-vanilla-foreground" />
            <span>{formatRefundCoinNumber(data.refund.amount)} Coin</span>
          </p>
          <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
            Tương đương {formatRefundVnd(data.refund.amount)}
          </p>
        </div>
      }
    >
      {/* Bố cục 2 cột 8/4 đồng bộ tuyệt đối với /refunds/create và /wallets/transactions/[id] */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (8/12): Dòng thời gian + Hồ sơ + Mua hàng + Thu nhập */}
        <div className="space-y-6 lg:col-span-8">
          <SectionCard
            title="Hành trình xét duyệt hồ sơ"
            subtitle="Theo dõi minh bạch từng mốc phản hồi của giảng viên và Kho Bạc"
            icon={<Clock aria-hidden="true" animated={false} className="size-4" />}
          >
            <div>
              {timeline.map((item, index) => (
                <TimelineItem
                  key={item.title}
                  title={item.title}
                  timeLabel={formatRefundDateTime(item.time)}
                  description={item.description}
                  isDone={item.done}
                  isActive={!item.done && Boolean(timeline[index - 1]?.done)}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Chi tiết yêu cầu hoàn Coin"
            icon={<FileText aria-hidden="true" animated={false} className="size-4" />}
          >
            <div>
              <DetailRow
                label="Mã hồ sơ"
                value={<span className="font-mono">{data.refund.id}</span>}
                onCopy={() => handleCopy(data.refund.id)}
              />
              <DetailRow
                label="Trạng thái"
                value={
                  <Badge variant={statusInfo.badgeVariant} size="sm">
                    {statusInfo.label}
                  </Badge>
                }
              />
              <DetailRow
                label="Số Coin yêu cầu"
                value={formatRefundCoin(data.refund.amount)}
              />
              <DetailRow label="Lý do gửi yêu cầu" value={stripHtml(data.refund.reason)} />
              <DetailRow
                label="Thời gian khởi tạo"
                value={formatRefundDateTime(data.refund.created_at)}
              />
              {data.refund.instructor_reviewed_at && (
                <DetailRow
                  label="Giảng viên phản hồi lúc"
                  value={formatRefundDateTime(data.refund.instructor_reviewed_at)}
                />
              )}
              {data.refund.admin_reviewed_at && (
                <DetailRow
                  label="Quản trị viên xử lý lúc"
                  value={formatRefundDateTime(data.refund.admin_reviewed_at)}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Thông tin đơn khóa học gốc"
            icon={<Tag aria-hidden="true" animated={false} className="size-4" />}
          >
            <div>
              <DetailRow
                label="Mã đơn hàng"
                value={<span className="font-mono">{data.purchase.purchase_item_id}</span>}
                onCopy={() => handleCopy(data.purchase.purchase_item_id)}
              />
              <DetailRow
                label="Giá niêm yết"
                value={formatRefundCoin(data.purchase.original_price)}
              />
              <DetailRow
                label="Giá thực thanh toán"
                value={formatRefundCoin(data.purchase.discounted_price)}
              />
              {data.purchase.discount_id && (
                <DetailRow
                  label="Mã ưu đãi đã dùng"
                  value={<span className="font-mono">{data.purchase.discount_id}</span>}
                  onCopy={() =>
                    data.purchase.discount_id && handleCopy(data.purchase.discount_id)
                  }
                />
              )}
              <DetailRow
                label="Trạng thái đơn"
                value={
                  <Badge
                    variant={data.purchase.status === "completed" ? "success" : "warning"}
                    size="sm"
                  >
                    {data.purchase.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                  </Badge>
                }
              />
              <DetailRow
                label="Thời gian đăng ký"
                value={formatRefundDateTime(data.purchase.created_at)}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Đối soát phân bổ Kho Bạc"
            icon={<ShieldCheck aria-hidden="true" animated={false} className="size-4" />}
          >
            <div>
              <DetailRow
                label="Trạng thái tạm giữ"
                value={
                  <Badge
                    variant={data.earnings.status === "holding" ? "warning" : "success"}
                    size="sm"
                  >
                    {data.earnings.status === "holding" ? "Đang tạm giữ bảo vệ" : "Đã đối soát"}
                  </Badge>
                }
              />
              <DetailRow
                label="Phần giảng viên"
                value={formatRefundCoin(data.earnings.amount_instructor)}
              />
              <DetailRow
                label="Phần nền tảng"
                value={formatRefundCoin(data.earnings.amount_platform)}
              />
              <DetailRow
                label="Số Coin hoàn thực tế"
                value={
                  <span className="font-bold text-primary">
                    {formatRefundCoin(data.earnings.refund_amount_real)}
                  </span>
                }
              />
              <DetailRow
                label="Thời hạn tạm giữ đến"
                value={formatRefundDateTime(data.earnings.hold_until)}
              />
            </div>
          </SectionCard>
        </div>

        {/* CỘT PHẢI (4/12, Sticky): Khóa học + Giảng viên + Hành động tài sản */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-span-4">
          <SectionCard
            title="Khóa học liên quan"
            icon={<BookOpen aria-hidden="true" animated={false} className="size-4" />}
          >
            <Link href={`/learning/${data.course.course_id}`} className="group block">
              <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-2xl border border-border bg-primary-light/40">
                {courseThumbnail && !thumbnailError ? (
                  <Image
                    src={courseThumbnail}
                    alt={data.course.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    onError={() => setThumbnailError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="grid size-full place-items-center text-primary">
                    <BookOpen aria-hidden="true" animated={false} className="size-8" />
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                {data.course.title}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">
                <span>Mở khóa học</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </Link>
          </SectionCard>

          <SectionCard
            title="Giảng viên phụ trách"
            icon={<User aria-hidden="true" animated={false} className="size-4" />}
          >
            <div className="flex items-center gap-3.5">
              {instructorAvatar && !avatarError ? (
                <Image
                  src={instructorAvatar}
                  alt={data.instructor.fullname}
                  width={52}
                  height={52}
                  className="aspect-square rounded-full border border-primary-pastel object-cover"
                  onError={() => setAvatarError(true)}
                  unoptimized
                />
              ) : (
                <span className="grid size-13 shrink-0 place-items-center rounded-full border border-primary-pastel bg-primary-light text-sm font-bold text-primary">
                  {instructorInitials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {data.instructor.fullname}
                </p>
                <p className="text-xs text-muted-foreground">Giảng viên tạo khóa học</p>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-[24px] border border-primary-pastel/80 bg-gradient-to-br from-primary-light/65 via-surface to-accent-vanilla/45 p-5 shadow-xs space-y-3">
            <p className="text-xs font-bold text-foreground">Quản lý Kho Coin của bạn</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sao chép mã hồ sơ khi cần hỗ trợ hoặc kiểm tra số dư Coin trong ví ngay.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(data.refund.id)}
                className="min-h-10 w-full rounded-full bg-surface font-bold"
              >
                <Copy aria-hidden="true" className="size-3.5" />
                <span>Sao chép mã hồ sơ</span>
              </Button>
              <Link
                href="/wallets"
                className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <Wallet aria-hidden="true" animated={false} className="size-3.5" />
                <span>Mở Ví & Kho Coin</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </RefundStudioShell>
  );
}
