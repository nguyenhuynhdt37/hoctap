"use client";

import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import { RefundDetailData } from "@/types/user/refund";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  HiArrowLeft,
  HiCheckCircle,
  HiClock,
  HiTag,
  HiUser,
  HiXCircle,
} from "react-icons/hi";
import { DetailRow } from "./detail-row";
import { SectionCard } from "./section-card";
import { TimelineItem } from "./timeline-item";

interface RefundRequestDetailProps {
  data: RefundDetailData;
}

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
  string,
  { label: string; badgeClass: string; description: string }
> = {
  requested: {
    label: "Đã yêu cầu",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
    description: "Chờ giảng viên xử lý",
  },
  instructor_approved: {
    label: "GV đã duyệt",
    badgeClass: "bg-green-100 text-green-700 border-green-300",
    description: "Đã chấp nhận yêu cầu",
  },
  instructor_rejected: {
    label: "GV đã từ chối",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    description: "Đã từ chối hoàn tiền",
  },
  admin_approved: {
    label: "Admin đã duyệt",
    badgeClass: "bg-green-100 text-green-700 border-green-300",
    description: "Admin đã thông qua",
  },
  admin_rejected: {
    label: "Admin đã từ chối",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    description: "Admin từ chối yêu cầu",
  },
  refunded: {
    label: "Đã hoàn tiền",
    badgeClass: "bg-green-100 text-green-700 border-green-300",
    description: "Tiền đã hoàn cho học viên",
  },
};

export default function RefundRequestDetail({
  data,
}: RefundRequestDetailProps) {
  const router = useRouter();
  const [thumbnailError, setThumbnailError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const statusInfo = statusMeta[data.refund.status] || statusMeta.requested;

  const courseThumbnail = data.course.thumbnail
    ? getGoogleDriveImageUrl(data.course.thumbnail)
    : "";
  const instructorAvatar = data.instructor.avatar
    ? getGoogleDriveImageUrl(data.instructor.avatar)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
        >
          <HiArrowLeft className="h-5 w-5" />
          <span className="font-semibold text-sm">Quay lại</span>
        </button>

        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              {data.refund.status === "instructor_rejected" ||
              data.refund.status === "admin_rejected" ? (
                <HiXCircle className="h-8 w-8 text-red-500" />
              ) : (
                <HiCheckCircle className="h-8 w-8 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Trạng thái hiện tại</p>
              <div className="text-2xl font-bold text-gray-900">
                {statusInfo.label}
              </div>
              <div className="text-sm text-gray-500">
                {statusInfo.description}
              </div>
            </div>
          </div>
          <div className="md:ml-auto text-right">
            <p className="text-sm text-gray-600 mb-1">Số tiền hoàn</p>
            <div className="text-3xl font-extrabold text-green-600">
              {formatCurrency(data.refund.amount)}
            </div>
            <p className="text-xs text-gray-500">
              Yêu cầu ID:{" "}
              <span className="font-mono">
                {data.refund.id.slice(0, 10)}...
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard
              title="Thông tin yêu cầu"
              icon={<HiClock className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
                <DetailRow
                  label="ID yêu cầu"
                  value={<span className="font-mono">{data.refund.id}</span>}
                  onCopy={() => handleCopy(data.refund.id)}
                />
                <DetailRow
                  label="Trạng thái"
                  value={
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                  }
                />
                <DetailRow
                  label="Số tiền yêu cầu"
                  value={formatCurrency(data.refund.amount)}
                />
                <DetailRow label="Lý do" value={data.refund.reason} />
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
              icon={<HiClock className="h-5 w-5 text-green-600" />}
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
              icon={<HiTag className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
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
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        data.purchase.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-yellow-100 text-yellow-700 border-yellow-300"
                      }`}
                    >
                      {data.purchase.status === "completed"
                        ? "Hoàn thành"
                        : "Đang xử lý"}
                    </span>
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
              icon={<HiCheckCircle className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
                <DetailRow
                  label="Trạng thái"
                  value={
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        data.earnings.status === "holding"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-green-100 text-green-700 border-green-300"
                      }`}
                    >
                      {data.earnings.status === "holding"
                        ? "Đang giữ"
                        : "Đã giải ngân"}
                    </span>
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
              icon={<HiTag className="h-5 w-5 text-green-600" />}
            >
              <Link
                href={`/learning/${data.course.course_id}`}
                className="block group"
              >
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 mb-4">
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
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <p className="text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors line-clamp-2">
                  {data.course.title}
                </p>
              </Link>
            </SectionCard>

            <SectionCard
              title="Giảng viên"
              icon={<HiUser className="h-5 w-5 text-green-600" />}
            >
              <div className="flex items-center gap-3">
                {instructorAvatar && !avatarError ? (
                  <Image
                    src={instructorAvatar}
                    alt={data.instructor.fullname}
                    width={56}
                    height={56}
                    className="rounded-full object-cover object-center aspect-square border border-green-200"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center border border-green-200">
                    {data.instructor.fullname
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {data.instructor.fullname}
                  </p>
                  <p className="text-sm text-gray-600">Người tạo khóa học</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
