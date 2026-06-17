"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { RefundableCourseItem } from "@/types/user/refund";
import Image from "next/image";
import { useEffect, useState } from "react";
import { HiClock } from "react-icons/hi";

interface RefundableCourseListItemProps {
  item: RefundableCourseItem;
  onRequestRefund: (purchaseItemId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) => {
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
    return value;
  }
};

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
  if (time.total <= 0) {
    return "Đã hết hạn";
  }

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
    getTimeRemaining(item.deadline)
  );
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const thumbnailSrc = item.course.thumbnail
    ? getGoogleDriveImageUrl(item.course.thumbnail)
    : "";
  const instructorAvatarSrc = item.instructor.avatar
    ? getGoogleDriveImageUrl(item.instructor.avatar)
    : "";

  useEffect(() => {
    const interval = setInterval(() => {
      const time = getTimeRemaining(item.deadline);
      setTimeRemaining(time);

      if (time.total <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [item.deadline]);

  const canRefund = timeRemaining.total > 0 && item.can_refund;

  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Thumbnail */}
        <div className="relative w-full md:w-56 h-48 md:h-40 shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {thumbnailSrc && !thumbnailError ? (
            <Image
              src={thumbnailSrc}
              alt={item.course.title}
              fill
              className="object-cover"
              onError={() => setThumbnailError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-sm">Không có ảnh</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-4 relative">
          {/* Countdown Timer - Top Right */}
          {timeRemaining.total > 0 && (
            <div className="absolute top-0 right-0 rounded-lg bg-yellow-500 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-md z-10">
              <HiClock className="h-3.5 w-3.5" />
              <span className="tabular-nums font-mono">
                {formatCountdown(timeRemaining)}
              </span>
            </div>
          )}
          {timeRemaining.total <= 0 && (
            <div className="absolute top-0 right-0 rounded-lg bg-red-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md z-10">
              Đã hết hạn
            </div>
          )}

          {/* Header */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 pr-32">
              {item.course.title}
            </h3>

            {/* Instructor Info with Avatar */}
            <div className="flex items-center gap-2 mb-4">
              {instructorAvatarSrc && !avatarError ? (
                <Image
                  src={instructorAvatarSrc}
                  alt={item.instructor.fullname}
                  width={28}
                  height={28}
                  className="rounded-full object-cover object-center aspect-square border border-green-200"
                  onError={() => setAvatarError(true)}
                  unoptimized
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center border border-green-200">
                  {item.instructor.fullname
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-600 font-medium">
                {item.instructor.fullname}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-gray-100">
            <div>
              <div className="text-xs text-gray-500 mb-1">Giá gốc</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(item.original_price)}
              </div>
            </div>
            {item.discounted_price < item.original_price && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Giá đã mua</div>
                <div className="text-sm font-semibold text-green-600">
                  {formatCurrency(item.discounted_price)}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Giảm{" "}
                  {formatCurrency(item.original_price - item.discounted_price)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500 mb-1">Mua ngày</div>
              <div className="text-sm font-medium text-gray-700">
                {formatDateTime(item.purchase_date)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Hạn hoàn tiền</div>
              <div className="text-sm font-medium text-gray-700">
                {formatDateTime(item.deadline)}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => onRequestRefund(item.purchase_item_id)}
              disabled={!canRefund}
              className="px-6 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
            >
              {timeRemaining.total <= 0
                ? "Đã hết hạn"
                : !item.can_refund
                ? "Không thể hoàn tiền"
                : "Yêu cầu hoàn tiền"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
