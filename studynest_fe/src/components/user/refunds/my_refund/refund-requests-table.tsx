"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Coins } from "pulsoicon-react";
import ContextMenu from "@/components/shared/context-menu";
import { Badge, Skeleton } from "@/components/ui";
import { getImageUrl } from "@/lib/utils/helpers/image";
import type { RefundRequestItem } from "@/types/user/refund";
import {
  formatRefundCoin,
  formatRefundDateTime,
  getRefundStatusMeta,
} from "../shared/refund-status";

interface RefundRequestsTableProps {
  requests: RefundRequestItem[];
  isLoading: boolean;
}

function stripHtml(raw?: string | null): string {
  if (!raw) return "—";
  const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "—";
}

function RefundRequestRow({
  request,
  onContextMenu,
}: {
  request: RefundRequestItem;
  onContextMenu: (e: React.MouseEvent, refundId: string) => void;
}) {
  const [thumbErr, setThumbErr] = useState(false);
  const statusMeta = getRefundStatusMeta(request.refund_status);
  const thumbSrc = request.course.thumbnail ? getImageUrl(request.course.thumbnail) : "";

  return (
    <tr
      onContextMenu={(e) => onContextMenu(e, request.refund_id)}
      className="group transition-colors hover:bg-primary-light/35"
    >
      <td className="px-5 py-4">
        <Link href={`/refunds/${request.refund_id}`} className="flex items-center gap-3.5">
          <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-primary-light/40">
            {thumbSrc && !thumbErr ? (
              <Image
                src={thumbSrc}
                alt={request.course.title}
                fill
                className="object-cover"
                onError={() => setThumbErr(true)}
                unoptimized
              />
            ) : (
              <div className="grid size-full place-items-center text-primary">
                <BookOpen aria-hidden="true" animated={false} className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-1 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
              {request.course.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {request.instructor.fullname}
            </p>
          </div>
        </Link>
      </td>

      <td className="px-4 py-4 whitespace-nowrap">
        <Badge variant={statusMeta.badgeVariant} size="sm">
          {statusMeta.label}
        </Badge>
      </td>

      <td className="px-4 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-primary tabular-nums">
          <Coins aria-hidden="true" animated={false} className="size-3.5 text-accent-vanilla-foreground" />
          {formatRefundCoin(request.refund_amount)}
        </span>
      </td>

      <td className="max-w-xs px-4 py-4">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {stripHtml(request.refund_reason)}
        </p>
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-muted-foreground tabular-nums">
        {formatRefundDateTime(request.requested_at)}
      </td>

      <td className="px-4 py-4 text-right whitespace-nowrap">
        <Link
          href={`/refunds/${request.refund_id}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-primary-pastel hover:bg-primary-light"
        >
          <span>Chi tiết</span>
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </td>
    </tr>
  );
}

export function RefundRequestsTable({
  requests,
  isLoading,
}: RefundRequestsTableProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    refundId: string;
  } | null>(null);

  const handleViewDetail = (refundId: string) => {
    window.location.href = `/refunds/${refundId}`;
  };

  const handleCopyId = (refundId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(refundId).catch(() => undefined);
    }
    setContextMenu(null);
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Đang tải danh sách yêu cầu hoàn Coin"
        className="space-y-3 rounded-[24px] border border-border bg-surface p-5 shadow-xs"
      >
        {[1, 2, 3, 4].map((k) => (
          <Skeleton key={k} className="h-16 rounded-2xl motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-primary-light/50">
            <tr>
              <th className="px-5 py-3.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                Khóa học
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                Trạng thái
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                Số Coin hoàn
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                Lý do
              </th>
              <th className="px-4 py-3.5 text-[11px] font-bold tracking-wider text-primary uppercase">
                Ngày yêu cầu
              </th>
              <th className="px-4 py-3.5 text-right text-[11px] font-bold tracking-wider text-primary uppercase">
                Hồ sơ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {requests.map((request) => (
              <RefundRequestRow
                key={request.refund_id}
                request={request}
                onContextMenu={(e, refundId) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, refundId });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Xem chi tiết hồ sơ",
              onClick: () => handleViewDetail(contextMenu.refundId),
            },
            {
              label: "Sao chép mã yêu cầu",
              onClick: () => handleCopyId(contextMenu.refundId),
            },
          ]}
        />
      )}
    </div>
  );
}
