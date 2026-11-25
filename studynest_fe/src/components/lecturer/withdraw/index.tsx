"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import {
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { getImageUrl } from "@/lib/utils/helpers/image";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Download,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Wallet,
  XCircle,
} from "pulsoicon-react";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

interface WithdrawItem {
  id: string;
  lecturer_id: string;
  fullname: string;
  email: string;
  avatar: string | null;
  amount: number;
  coin_amount?: number | null;
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

interface CheckCanRequestResponse {
  pending: boolean;
  can_withdraw: boolean;
  reason: string | null;
  balance?: number;
  paid_balance?: number;
  min_coin?: number;
  rate_vnd?: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatDateTime = (val?: string | null) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "—";
  }
};

const STATUS_META: Record<
  string,
  { label: string; variant: BadgeVariant; step: number; rejected?: boolean }
> = {
  pending: { label: "Chờ duyệt", variant: "warning", step: 1 },
  approved: { label: "Đã duyệt", variant: "info", step: 2 },
  payout_pending: { label: "Đang chuyển PayPal", variant: "warning", step: 2 },
  paid: { label: "Đã thanh toán", variant: "success", step: 3 },
  rejected: { label: "Đã từ chối", variant: "destructive", step: 2, rejected: true },
  failed: { label: "Thanh toán thất bại", variant: "destructive", step: 3, rejected: true },
};

const getStatusMeta = (status: string) =>
  STATUS_META[status] ?? {
    label: status,
    variant: "neutral" as BadgeVariant,
    step: 1,
  };

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "payout_pending", label: "Chờ PayPal" },
  { value: "approved", label: "Đã duyệt" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "rejected", label: "Đã từ chối" },
  { value: "failed", label: "Thất bại" },
] as const;

const WITHDRAW_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 10, min: 1, max: 100 },
  status: {
    type: "string",
    default: "all",
    allowed: [
      "all",
      "pending",
      "payout_pending",
      "approved",
      "paid",
      "rejected",
      "failed",
    ] as const,
  },
  order_by: {
    type: "string",
    default: "requested_at",
    allowed: ["requested_at", "amount", "status"] as const,
  },
  order_dir: {
    type: "string",
    default: "desc",
    allowed: ["asc", "desc"] as const,
  },
  view: {
    type: "string",
    default: "grid",
    allowed: ["grid", "table"] as const,
  },
} as const;

export default function WithdrawPage() {
  const { values, setParam } = useUrlQueryState(WITHDRAW_QUERY_SCHEMA);
  const page = values.page;
  const limit = values.limit;
  const status = values.status;
  const orderBy = values.order_by;
  const orderDir = values.order_dir;
  const viewMode = values.view;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("order_by", orderBy);
    params.set("order_dir", orderDir);
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [page, limit, orderBy, orderDir, status]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<WithdrawResponse>(
      `/lecturer/withdraw?${queryString}`,
      async (url) => {
        const res = await api.get(url);
        return res.data;
      },
      { revalidateOnFocus: false },
    );

  const { data: checkData, mutate: mutateCheck } =
    useSWR<CheckCanRequestResponse | null>(
      "/lecturer/withdraw/check-can-request",
      async (url) => {
        try {
          const res = await api.get(url);
          return res.data;
        } catch {
          return null;
        }
      },
      { revalidateOnFocus: false, shouldRetryOnError: false },
    );

  const rateVnd = checkData?.rate_vnd ?? DEFAULT_COIN_VND_RATE;

  const getItemCoins = (item: WithdrawItem) =>
    item.coin_amount && Number(item.coin_amount) > 0
      ? Math.round(Number(item.coin_amount))
      : vndToCoin(item.amount, rateVnd);

  // Thống kê Bento từ dữ liệu thực (quy đổi nhất quán sang Coin theo tỷ giá hiện hành)
  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const totalRequests = data?.total ?? items.length;
    const paidItems = items.filter(
      (i) => i.status === "paid" || i.status === "approved",
    );
    const pendingItems = items.filter(
      (i) => i.status === "pending" || i.status === "payout_pending",
    );
    const paidVnd = paidItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const paidCoins = paidItems.reduce((sum, i) => sum + getItemCoins(i), 0);
    const pendingVnd = pendingItems.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0,
    );
    const pendingCoins = pendingItems.reduce((sum, i) => sum + getItemCoins(i), 0);
    return {
      totalRequests,
      paidCount: paidItems.length,
      pendingCount: pendingItems.length,
      paidVnd,
      paidCoins,
      pendingVnd,
      pendingCoins,
    };
  }, [data, rateVnd]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    showToast.success("Đã sao chép mã lệnh rút tiền");
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1600);
  };

  const handleRefresh = async () => {
    await Promise.all([mutate(), mutateCheck()]);
  };

  const handleExportCsv = () => {
    const items = data?.items ?? [];
    if (items.length === 0) {
      showToast.error("Chưa có dữ liệu rút tiền để xuất.");
      return;
    }
    const headers = [
      "Mã lệnh",
      "Thời gian yêu cầu",
      "Số Coin",
      "Số tiền (VND)",
      "Trạng thái",
      "Thời gian từ chối",
    ];
    const escapeCell = (v: string | number) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    const lines = [
      headers.map(escapeCell).join(","),
      ...items.map((item) =>
        [
          item.id,
          formatDateTime(item.requested_at),
          getItemCoins(item),
          item.amount,
          getStatusMeta(item.status).label,
          item.rejected_at ? formatDateTime(item.rejected_at) : "",
        ]
          .map(escapeCell)
          .join(","),
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lich-su-rut-tien-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success("Đã xuất lịch sử rút tiền ra tệp CSV.");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero Kho Bạc Rút Tiền */}
        <section className="relative overflow-hidden rounded-[32px] border border-primary-pastel bg-gradient-to-br from-primary-light via-surface to-accent-vanilla/75 p-6 shadow-sm sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-primary-pastel/45 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-secondary-pastel/40 blur-3xl"
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-2 h-44 w-44 text-primary/12"
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <circle cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="100" cy="100" r="28" stroke="currentColor" strokeWidth="1.2" />
          </svg>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-pastel bg-surface/90 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-2xs backdrop-blur-xs">
                <Banknote animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Trung tâm rút tiền giảng viên</span>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Lịch sử &amp; Điều phối Rút tiền
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Theo dõi minh bạch tiến trình giải ngân từ Coin thu nhập giảng
                dạy sang tài khoản PayPal của bạn theo thời gian thực.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                disabled={isValidating}
                onClick={() => void handleRefresh()}
                leftIcon={
                  <RefreshCw
                    className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                  />
                }
              >
                Làm mới
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface/90"
                onClick={handleExportCsv}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Xuất CSV
              </Button>
              <Link href="/lecturer/wallets">
                <Button
                  type="button"
                  variant="pastel"
                  size="sm"
                  className="rounded-full border border-primary-pastel/80"
                  leftIcon={<Wallet className="h-4 w-4" />}
                >
                  Ví giảng viên
                </Button>
              </Link>
              <Link href="/lecturer/withdraw/create">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="rounded-full shadow-sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Tạo yêu cầu rút tiền
                </Button>
              </Link>
            </div>
          </div>

          {/* Bento 4 Chỉ số Rút tiền Đa Sắc Mây */}
          <div className="relative mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-accent-vanilla-border bg-surface/92 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-warning-foreground">
                <span>Số dư Coin rút được</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-vanilla text-[#C98A2C]">
                  <Coins animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                {checkData?.balance !== undefined
                  ? `${checkData.balance.toLocaleString("vi-VN")} Coin`
                  : "—"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {checkData?.rate_vnd
                  ? `Tỷ giá: 1 Coin = ${formatVnd(checkData.rate_vnd)}`
                  : "Đang cập nhật tỷ giá..."}
              </p>
            </div>

            <div className="rounded-2xl border border-success-border/80 bg-success-bg/55 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-success-foreground">
                <span>Đã duyệt / Thanh toán (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-success-foreground">
                  <CheckCircle2 animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                {stats.paidCoins.toLocaleString("vi-VN")} Coin
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {stats.paidCount} lệnh · ≈ {formatCurrency(stats.paidVnd)}
              </p>
            </div>

            <div className="rounded-2xl border border-accent-vanilla-border/80 bg-accent-vanilla/75 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-accent-vanilla-foreground">
                <span>Đang chờ xử lý (trang)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-accent-vanilla-foreground">
                  <Clock animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                {stats.pendingCoins.toLocaleString("vi-VN")} Coin
              </div>
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {stats.pendingCount} lệnh · ≈ {formatCurrency(stats.pendingVnd)}
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-pastel/80 bg-secondary-light/55 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-medium text-secondary-foreground">
                <span>Tổng lịch sử yêu cầu</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-secondary-foreground">
                  <Banknote animated={false} className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">
                {stats.totalRequests.toLocaleString("vi-VN")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {checkData?.can_withdraw
                  ? "Tài khoản đủ điều kiện tạo lệnh mới"
                  : checkData?.reason || "Theo dõi trạng thái thanh toán"}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <Alert variant="destructive">
            Không thể tải danh sách yêu cầu rút tiền. Vui lòng thử lại.
          </Alert>
        )}

        {/* Bộ lọc kính mờ */}
        <Card
          variant="surface"
          density="none"
          className="rounded-[22px] border border-border/90 bg-surface/95 p-4 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Segmented Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setParam("status", tab.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-primary-light/60 hover:text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Sắp xếp + Chuyển chế độ xem */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={orderBy}
                onChange={(e) =>
                  setParam(
                    "order_by",
                    e.target.value as (typeof WITHDRAW_QUERY_SCHEMA.order_by.allowed)[number],
                  )
                }
                aria-label="Sắp xếp theo"
                className="h-9 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="requested_at">Theo thời gian</option>
                <option value="amount">Theo số tiền</option>
                <option value="status">Theo trạng thái</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-surface"
                onClick={() =>
                  setParam("order_dir", orderDir === "asc" ? "desc" : "asc")
                }
                leftIcon={
                  orderDir === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )
                }
              >
                {orderDir === "asc" ? "Tăng dần" : "Giảm dần"}
              </Button>

              <div
                className="inline-flex items-center rounded-full border border-border bg-background p-1"
                role="group"
                aria-label="Chế độ hiển thị"
              >
                <button
                  type="button"
                  onClick={() => setParam("view", "grid", { resetPage: false })}
                  aria-pressed={viewMode === "grid"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParam("view", "table", { resetPage: false })
                  }
                  aria-pressed={viewMode === "table"}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bảng</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Danh sách lệnh rút tiền */}
        {isLoading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-5 md:grid-cols-2"
                : "space-y-3"
            }
          >
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-[24px]" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <Card variant="surface" className="rounded-[24px] p-10">
            <EmptyState
              icon={<Banknote className="h-8 w-8 text-primary" />}
              title="Chưa có yêu cầu rút tiền nào"
              description={
                status !== "all"
                  ? "Không có yêu cầu nào ở trạng thái đang lọc. Hãy thử chuyển sang Tất cả."
                  : "Khi bạn tạo yêu cầu rút tiền từ thu nhập giảng dạy, chứng từ và tiến trình giải ngân sẽ hiển thị tại đây."
              }
              action={
                status !== "all" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setParam("status", "all")}
                  >
                    Xem tất cả trạng thái
                  </Button>
                ) : (
                  <Link href="/lecturer/withdraw/create">
                    <Button
                      type="button"
                      variant="primary"
                      className="rounded-full"
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Tạo yêu cầu đầu tiên
                    </Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {data?.items.map((item) => {
              const meta = getStatusMeta(item.status);
              const headerClass = meta.rejected
                ? "border-destructive-border/60 bg-destructive-bg/50"
                : meta.variant === "success"
                  ? "border-success-border/70 bg-success-bg/50"
                  : "border-accent-vanilla-border/70 bg-accent-vanilla/60";

              return (
                <Card
                  key={item.id}
                  variant="surface"
                  density="none"
                  className="overflow-hidden rounded-[24px] border border-border transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-pastel hover:shadow-md"
                >
                  {/* Header chứng từ */}
                  <div
                    className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${headerClass}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface bg-surface shadow-2xs">
                        {meta.rejected ? (
                          <XCircle
                            animated={false}
                            className="h-4 w-4 text-destructive-foreground"
                          />
                        ) : meta.variant === "success" ? (
                          <CheckCircle2
                            animated={false}
                            className="h-4 w-4 text-success-foreground"
                          />
                        ) : (
                          <Clock
                            animated={false}
                            className="h-4 w-4 text-warning-foreground"
                          />
                        )}
                      </span>
                      <div>
                        <Badge variant={meta.variant} size="sm" dot>
                          {meta.label}
                        </Badge>
                        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                          {formatDateTime(item.requested_at)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 font-display text-xl font-bold tabular-nums text-warning-foreground">
                        <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" aria-hidden="true" />
                        {getItemCoins(item).toLocaleString("vi-VN")} Coin
                      </p>
                      <p className="text-xs font-medium text-muted-foreground tabular-nums">
                        ≈ {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Thân thẻ: Tiến trình 3 bước mini + thông tin nhận */}
                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3.5">
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        {[
                          { step: 1, label: "Gửi yêu cầu" },
                          { step: 2, label: "Duyệt lệnh" },
                          { step: 3, label: "Trả PayPal" },
                        ].map((s) => {
                          const reached = meta.step >= s.step;
                          const isFailedStep = meta.rejected && meta.step === s.step;
                          return (
                            <div key={s.step} className="space-y-1.5">
                              <div
                                className={`h-1.5 w-full rounded-full ${
                                  isFailedStep
                                    ? "bg-destructive-foreground/75"
                                    : reached
                                      ? "bg-primary"
                                      : "bg-border"
                                }`}
                              />
                              <span
                                className={`block font-medium ${
                                  isFailedStep
                                    ? "text-destructive-foreground"
                                    : reached
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <img
                          src={
                            item.avatar
                              ? getImageUrl(item.avatar)
                              : "https://ui-avatars.com/api/?name=" +
                                encodeURIComponent(item.fullname) +
                                "&background=E8F2FA&color=356FA7"
                          }
                          alt={item.fullname}
                          className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.fullname}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.email}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyId(item.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary-pastel hover:text-primary cursor-pointer"
                      >
                        <span>#{item.id.slice(0, 8).toUpperCase()}</span>
                        {copiedId === item.id ? (
                          <Check animated={false} className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy animated={false} className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {item.rejected_at && (
                      <p className="text-xs text-destructive-foreground tabular-nums">
                        Từ chối lúc: {formatDateTime(item.rejected_at)}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card
            variant="surface"
            density="none"
            className="overflow-hidden rounded-[24px] border border-border shadow-2xs"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-primary-light/35">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Giảng viên &amp; Mã lệnh
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Thời gian yêu cầu
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Số Coin / Quy đổi
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {data?.items.map((item) => {
                    const meta = getStatusMeta(item.status);
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-primary-light/15"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.avatar
                                  ? getImageUrl(item.avatar)
                                  : "https://ui-avatars.com/api/?name=" +
                                    encodeURIComponent(item.fullname) +
                                    "&background=E8F2FA&color=356FA7"
                              }
                              alt={item.fullname}
                              className="h-9 w-9 rounded-full border border-border object-cover"
                            />
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {item.fullname}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCopyId(item.id)}
                                className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                #{item.id.slice(0, 8).toUpperCase()}
                                <Copy animated={false} className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm tabular-nums text-foreground">
                          {formatDateTime(item.requested_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1 font-display text-base font-bold tabular-nums text-warning-foreground">
                            <Coins animated={false} className="h-4 w-4 text-[#C98A2C]" aria-hidden="true" />
                            {getItemCoins(item).toLocaleString("vi-VN")} Coin
                          </div>
                          <div className="text-xs tabular-nums text-muted-foreground">
                            ≈ {formatCurrency(item.amount)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge variant={meta.variant} size="sm" dot>
                            {meta.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-3.5 sm:flex-row">
            <div className="text-xs text-muted-foreground tabular-nums">
              Hiển thị {(page - 1) * limit + 1}–
              {Math.min(page * limit, data?.total || 0)} trên tổng{" "}
              <strong className="text-foreground">{data?.total || 0}</strong>{" "}
              yêu cầu
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setParam("page", Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Trước
              </Button>
              <span className="px-2 text-xs font-semibold tabular-nums text-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setParam("page", Math.min(totalPages, page + 1))
                }
                disabled={page === totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
