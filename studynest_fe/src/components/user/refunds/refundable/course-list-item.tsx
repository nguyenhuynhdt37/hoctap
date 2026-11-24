"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Clock, Coins, ShieldCheck } from "pulsoicon-react";
import { Badge, Button } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { RefundableCourseItem } from "@/types/user/refund";
import { cn } from "@/lib/utils";
import {
  formatRefundCoin,
  formatRefundDateTime,
} from "../shared/refund-status";

interface RefundableCourseListItemProps {
  item: RefundableCourseItem;
  onRequestRefund: (purchaseItemId: string) => void;
}

const getTimeRemaining = (deadline: string) => {
  try {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, total: diff };
  } catch {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
};

const formatCountdown = (time: ReturnType<typeof getTimeRemaining>) => {
  if (time.total <= 0) return "Đã hết hạn bảo vệ";

  const parts: string[] = [];
  if (time.days > 0) parts.push(`${time.days} ngày`);
  if (time.hours > 0) parts.push(`${time.hours} giờ`);
  if (time.minutes > 0) parts.push(`${time.minutes} phút`);
  parts.push(`${time.seconds} giây`);

  return parts.join(" ");
};

export default function RefundableCourseListItem({
  item,
  onRequestRefund,
}: RefundableCourseListItemProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(item.deadline),
  );
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail ? getImageUrl(item.course.thumbnail) : "";
  const instructorAvatarSrc = item.instructor.avatar
    ? getImageUrl(item.instructor.avatar)
    : "";

  useEffect(() => {
    const interval = setInterval(() => {
      const time = getTimeRemaining(item.deadline);
      setTimeRemaining(time);
      if (time.total <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [item.deadline]);

  const canRefund = timeRemaining.total > 0 && item.can_refund;
  const savedAmount = Math.max(0, item.original_price - item.discounted_price);
  const initials = (item.instructor.fullname || "GV")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <article className="group overflow-hidden rounded-[24px] border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:border-primary-pastel hover:shadow-[0_16px_32px_-12px_rgba(53,111,167,0.14)] sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row">
        {/* Ảnh khóa học */}
        <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-primary-light/40 md:h-44 md:w-60">
          {thumbnailSrc && !thumbnailError ? (
            <Image
              src={thumbnailSrc}
              alt={item.course.title}
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

          {/* Nhãn trạng thái đếm ngược nổi trên ảnh */}
          <div
            className={cn(
              "absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-xs backdrop-blur-md",
              canRefund
                ? "border-accent-vanilla-border bg-accent-vanilla/95 text-accent-vanilla-foreground"
                : "border-destructive-border bg-destructive-bg/95 text-destructive-foreground",
            )}
          >
            <Clock aria-hidden="true" animated={false} className="size-3" />
            <span className="tabular-nums font-mono">{formatCountdown(timeRemaining)}</span>
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
                  {item.course.title}
                </h3>

                <div className="mt-2 flex items-center gap-2">
                  {instructorAvatarSrc && !avatarError ? (
                    <Image
                      src={instructorAvatarSrc}
                      alt={item.instructor.fullname}
                      width={26}
                      height={26}
                      className="aspect-square rounded-full border border-primary-pastel object-cover"
                      onError={() => setAvatarError(true)}
                      unoptimized
                    />
                  ) : (
                    <span className="grid size-6.5 place-items-center rounded-full border border-primary-pastel bg-primary-light text-[10px] font-bold text-primary">
                      {initials}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {item.instructor.fullname}
                  </span>
                </div>
              </div>

              <Badge variant={canRefund ? "success" : "destructive"} size="sm">
                {canRefund ? "Đủ điều kiện hoàn" : "Hết hạn hoàn"}
              </Badge>
            </div>

            {/* Lưới 4 chỉ số tài sản */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <div className="rounded-xl border border-border/80 bg-background/65 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Giá niêm yết</p>
                <p className="mt-0.5 text-xs font-bold text-foreground tabular-nums">
                  {formatRefundCoin(item.original_price)}
                </p>
              </div>

              <div className="rounded-xl border border-primary-pastel/70 bg-primary-light/55 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-primary">Coin hoàn tối đa</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-extrabold text-primary tabular-nums">
                  <Coins aria-hidden="true" animated={false} className="size-3.5" />
                  {formatRefundCoin(item.discounted_price)}
                </p>
                {savedAmount > 0 && (
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Đã ưu đãi {formatRefundCoin(savedAmount)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/80 bg-background/65 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Ngày đầu tư</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground tabular-nums">
                  {formatRefundDateTime(item.purchase_date)}
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-background/65 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Hạn bảo vệ</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground tabular-nums">
                  {formatRefundDateTime(item.deadline)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck aria-hidden="true" animated={false} className="size-4 text-primary" />
              Hoàn trực tiếp về Ví Coin sau khi được phê duyệt
            </span>

            <Button
              type="button"
              variant={canRefund ? "primary" : "outline"}
              size="sm"
              disabled={!canRefund}
              onClick={() => onRequestRefund(item.purchase_item_id)}
              className="min-h-10 rounded-full px-5 font-bold"
            >
              <span>{canRefund ? "Yêu cầu hoàn Coin" : "Không thể hoàn"}</span>
              {canRefund && <ArrowRight aria-hidden="true" className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
