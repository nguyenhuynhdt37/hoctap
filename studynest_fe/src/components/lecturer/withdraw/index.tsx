"use client";

import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { ArrowDown, ArrowUp, Banknote, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

interface WithdrawItem {
  id: string;
  lecturer_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  amount: number;
  currency: string;
  status: string;
  requested_at: string;
  rejected_at: string | null;
}

interface WithdrawResponse {
  page: number;
  limit: number;
  total: number;
  items: WithdrawItem[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    payout_pending: "Đang chờ PayPal thanh toán",
    failed: "PayPal thanh toán thất bại",
    paid: "Đã rút tiền thành công",
  };
  return labels[status] || status;
};

const getStatusVariant = (status: string): BadgeVariant => {
  const variants: Record<string, BadgeVariant> = {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
    payout_pending: "warning",
    failed: "destructive",
    paid: "success",
  };
  return variants[status] || "neutral";
};

export default function WithdrawPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState<string>("all");
  const [orderBy, setOrderBy] = useState("requested_at");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("order_by", orderBy);
    params.set("order_dir", orderDir);
    if (status !== "all") params.set("status", status);
    return params.toString();
  };

  const { data, error, isLoading } = useSWR<WithdrawResponse>(
    `/lecturer/withdraw?${buildQuery()}`,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Lịch sử yêu cầu rút tiền
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Theo dõi các yêu cầu rút tiền của bạn
            </p>
          </div>
          <Link
            href="/lecturer/withdraw/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-semibold text-sm transition-colors shadow-soft-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo yêu cầu mới</span>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive">
            Không thể tải danh sách yêu cầu. Vui lòng thử lại
          </Alert>
        )}

        <Card variant="surface" className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 text-sm border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Đang chờ</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
              <option value="payout_pending">Đang chờ PayPal thanh toán</option>
              <option value="failed">PayPal thanh toán thất bại</option>
              <option value="paid">Đã rút tiền thành công</option>
            </select>

            <select
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 text-sm border border-border bg-surface text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="requested_at">Sắp xếp theo thời gian</option>
              <option value="amount">Sắp xếp theo số tiền</option>
              <option value="status">Sắp xếp theo trạng thái</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setOrderDir(orderDir === "asc" ? "desc" : "asc")}
              leftIcon={
                orderDir === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )
              }
            >
              {orderDir === "asc" ? "Tăng dần" : "Giảm dần"}
            </Button>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Banknote className="h-7 w-7" />}
                title="Chưa có yêu cầu rút tiền nào"
                description="Khi bạn tạo yêu cầu rút tiền, danh sách sẽ được hiển thị tại đây."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Avatar
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Thời gian
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Số tiền
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {data?.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-background/80 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <img
                              src={
                                item.avatar
                                  ? getImageUrl(item.avatar)
                                  : "https://ui-avatars.com/api/?name=" +
                                    encodeURIComponent(item.fullname) +
                                    "&background=E8F2FA&color=356FA7"
                              }
                              alt={item.fullname}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-foreground">
                            {formatDateTime(item.requested_at)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-base font-bold text-foreground tabular-nums">
                            {formatCurrency(item.amount)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant={getStatusVariant(item.status)}
                            size="sm"
                            dot
                          >
                            {getStatusLabel(item.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị {(page - 1) * limit + 1}-
                    {Math.min(page * limit, data?.total || 0)} trên tổng số{" "}
                    {data?.total || 0} yêu cầu
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Trước
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Trang {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
