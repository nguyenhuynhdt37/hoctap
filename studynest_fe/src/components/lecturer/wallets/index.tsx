"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  CoinBadge,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  DEFAULT_COIN_VND_RATE,
  formatVnd,
  formatVndAsCoin,
  vndToCoin,
} from "@/lib/learning-hub/coin-logic";
import { useCoinBalances } from "@/lib/learning-hub/shop-hooks";
import api from "@/lib/utils/fetcher/client/axios";
import { showToast } from "@/lib/utils/helpers/toast";
import {
  LecturerTransactionsResponse,
  LecturerWallet,
} from "@/types/lecturer/wallet";
import { isAxiosError } from "axios";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Coins,
  Download,
  History,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from "pulsoicon-react";
import {
  useDebouncedUrlSearch,
  useUrlQueryState,
} from "@/hooks/useUrlQueryState";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";

const WALLET_ENDPOINT = "/lecturer/wallets/lecturer/wallet";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return "Chưa ghi nhận giao dịch";
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
    return "Chưa ghi nhận giao dịch";
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    deposit: "Nạp tiền",
    earning_release: "Thu nhập khóa học",
    earning_payout: "Giải ngân rút tiền",
    earning_refund: "Hoàn tiền",
    withdraw_request: "Yêu cầu rút tiền",
    income: "Thu nhập",
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: "Thành công",
    canceled: "Đã hủy",
    pending: "Đang xử lý",
    failed: "Thất bại",
  };
  return labels[status] || status;
};

const isIncomeTransaction = ({
  direction,
  type,
}: {
  direction?: "in" | "out";
  type: string;
}) => {
  if (direction === "in") return true;
  if (direction === "out") return false;
  return (
    type === "deposit" ||
    type === "earning_release" ||
    type === "earning_refund" ||
    type === "income"
  );
};

const extractAxiosError = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string };
    return data?.detail || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const TYPE_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "earning_release", label: "Thu nhập" },
  { value: "deposit", label: "Nạp tiền" },
  { value: "withdraw_request", label: "Yêu cầu rút" },
] as const;

const LECTURER_WALLETS_QUERY_SCHEMA = {
  page: { type: "number", default: 1, min: 1 },
  limit: { type: "number", default: 20, min: 1, max: 100 },
  status: {
    type: "string",
    default: "all",
    allowed: ["all", "completed", "pending", "canceled"] as const,
  },
  type: {
    type: "string",
    default: "all",
    allowed: [
      "all",
      "earning_release",
      "deposit",
      "withdraw_request",
    ] as const,
  },
  search: { type: "string", default: "" as string },
} as const;

export default function LecturerWallets() {
  const router = useRouter();
  const { values, setParam } = useUrlQueryState(LECTURER_WALLETS_QUERY_SCHEMA);
  const page = values.page;
  const limit = values.limit;
  const status = values.status;
  const type = values.type;
  const search = values.search;
  const [refreshing, setRefreshing] = useState(false);

  const {
    inputValue: searchInput,
    setInputValue: setSearchInput,
    commitNow: commitSearchNow,
  } = useDebouncedUrlSearch(search, (val) => setParam("search", val));

  const {
    data: coins,
    mutate: mutateCoins,
  } = useCoinBalances();

  const {
    data: wallet,
    error: walletError,
    mutate: mutateWallet,
  } = useSWR<LecturerWallet>(
    WALLET_ENDPOINT,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false },
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [page, limit, status, type, search]);

  const {
    data: transactionsData,
    error: transactionsError,
    mutate: mutateTx,
  } = useSWR<LecturerTransactionsResponse>(
    `/lecturer/transactions?${queryString}`,
    async (url) => {
      const response = await api.get(url);
      return response.data;
    },
    { revalidateOnFocus: false },
  );

  const rateVnd = coins?.rateVnd ?? DEFAULT_COIN_VND_RATE;
  const paidCoin = coins?.paid ?? vndToCoin(wallet?.balance ?? 0, rateVnd);
  const bonusCoin = coins?.bonus ?? 0;

  const totalIn = Number(wallet?.total_in ?? 0);
  const totalOut = Number(wallet?.total_out ?? 0);
  const withdrawnPct =
    totalIn > 0 ? Math.min(100, Math.round((totalOut / totalIn) * 100)) : 0;

  const isLocked = Boolean(wallet?.is_locked);

  const error =
    (walletError &&
      extractAxiosError(
        walletError,
        "Không thể tải thông tin ví. Vui lòng thử lại.",
      )) ||
    (transactionsError &&
      extractAxiosError(
        transactionsError,
        "Không thể tải danh sách giao dịch.",
      ));

  const totalPages = transactionsData
    ? Math.max(1, Math.ceil(transactionsData.total / limit))
    : 1;

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([mutateWallet(), mutateTx(), mutateCoins()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCsv = () => {
    const items = transactionsData?.items ?? [];
    if (items.length === 0) {
      showToast.error("Chưa có giao dịch để xuất tệp CSV.");
      return;
    }
    const headers = [
      "Mã giao dịch",
      "Loại",
      "Chiều",
      "Số Coin",
      "Số tiền (VND)",
      "Trạng thái",
      "Mô tả",
      "Thời gian",
    ];
    const escapeCell = (v: string | number) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    const lines = [
      headers.map(escapeCell).join(","),
      ...items.map(({ transaction: tx }) => {
        const isIncome = isIncomeTransaction(tx);
        return [
          tx.transaction_code || tx.id,
          getTypeLabel(tx.type),
          isIncome ? "Cộng" : "Trừ",
          vndToCoin(tx.amount, rateVnd),
          tx.amount,
          getStatusLabel(tx.status),
          tx.description || "",
          formatDateTime(tx.created_at),
        ]
          .map(escapeCell)
          .join(",");
      }),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `so-cai-vi-giang-vien-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast.success("Đã xuất sổ cái giao dịch ra tệp CSV.");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header tiêu đề + nút làm mới */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-primary-light/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <WalletIcon animated={false} className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kho bạc giảng viên</span>
            </span>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Ví &amp; Sổ Cái Dòng Tiền
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý số dư Coin vàng, theo dõi dòng tiền thu nhập, nạp và rút
              về tài khoản PayPal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full bg-surface"
              disabled={refreshing}
              onClick={() => void handleRefreshAll()}
              leftIcon={
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              }
            >
              Làm mới
            </Button>
            <Link href="/lecturer/hold">
              <Button
                type="button"
                variant="pastel"
                size="sm"
                className="rounded-full border border-primary-pastel/80"
                leftIcon={<Clock className="h-4 w-4" />}
              >
                Kho tạm giữ
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
                Tạo lệnh rút tiền
              </Button>
            </Link>
          </div>
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Bố cục Hero Kho Bạc 2 cột (7/5) */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Cột trái (7/12): Thẻ Kho Bạc Coin Vàng */}
          <div className="relative overflow-hidden rounded-[30px] border border-accent-vanilla-border bg-gradient-to-br from-primary-light/85 via-surface to-accent-vanilla/85 p-6 shadow-sm sm:p-7 lg:col-span-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-surface/70 blur-2xl"
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-8 -right-8 h-52 w-52 text-primary/10"
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

            <div className="relative flex h-full flex-col justify-between gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-vanilla-border bg-surface/90 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">
                      <Coins
                        animated={false}
                        className="h-3.5 w-3.5 text-[#C98A2C]"
                        aria-hidden="true"
                      />
                      Số dư Coin khả dụng
                    </span>
                    <Badge
                      variant={isLocked ? "destructive" : "success"}
                      size="sm"
                      dot
                    >
                      {isLocked ? "Ví đã khóa" : "Đang hoạt động"}
                    </Badge>
                    {wallet?.kyc_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">
                        <ShieldCheck
                          animated={false}
                          className="h-3 w-3"
                          aria-hidden="true"
                        />
                        Đã xác minh
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 font-display text-3xl font-bold tracking-tight tabular-nums text-warning-foreground sm:text-4xl">
                    <Coins
                      animated={false}
                      className="h-8 w-8 shrink-0 text-[#C98A2C]"
                      aria-hidden="true"
                    />
                    <span>{paidCoin.toLocaleString("vi-VN")} Coin</span>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground tabular-nums">
                    Quy đổi tương đương ≈ {formatVnd(paidCoin * rateVnd)} (1 Coin
                    = {formatVnd(rateVnd)})
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <CoinBadge kind="gold" amount={paidCoin} size="sm" />
                    <CoinBadge kind="white" amount={bonusCoin} size="sm" />
                  </div>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent-vanilla-border bg-surface/90 text-[#C98A2C] shadow-2xs">
                  <WalletIcon className="h-6 w-6" />
                </div>
              </div>

              {/* Giao dịch gần nhất — nền sáng tương phản chuẩn WCAG AA */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface bg-surface/90 px-4 py-3 shadow-2xs backdrop-blur-xs">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Giao dịch gần nhất
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                    {formatDateTime(wallet?.last_transaction_at)}
                  </p>
                </div>
                <Link
                  href="/lecturer/withdraw/create"
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors hover:bg-primary-hover"
                >
                  <span>Rút Coin ngay</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Cột phải (5/12): Tổng thu / Tổng rút & Lối tắt */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="rounded-[24px] border-success-border/80 bg-gradient-to-br from-success-bg/75 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-success-foreground">
                    Tổng thu nhập &amp; nạp vào
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-success-border bg-surface text-success-foreground">
                    <ArrowUpRight animated={false} className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-warning-foreground">
                  <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                  {formatVndAsCoin(totalIn, rateVnd)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  ≈ {formatCurrency(totalIn)}
                </p>
              </Card>

              <Card className="rounded-[24px] border-secondary-pastel/80 bg-gradient-to-br from-secondary-light/75 via-surface to-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary-foreground">
                    Tổng đã rút về tài khoản
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-secondary-pastel bg-surface text-secondary-foreground">
                    <ArrowDownLeft animated={false} className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 inline-flex items-center gap-1.5 font-display text-2xl font-bold tabular-nums text-foreground">
                  <Coins animated={false} className="h-5 w-5 text-[#C98A2C]" aria-hidden="true" />
                  {formatVndAsCoin(totalOut, rateVnd)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${withdrawnPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-primary">
                    {withdrawnPct}%
                  </span>
                </div>
              </Card>
            </div>

            {/* Lối tắt quản lý rút tiền */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/lecturer/withdraw" className="block">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  className="rounded-full bg-surface"
                  leftIcon={<History className="h-4 w-4" />}
                >
                  Lịch sử rút
                </Button>
              </Link>
              <Link href="/lecturer/hold" className="block">
                <Button
                  type="button"
                  variant="pastel"
                  fullWidth
                  className="rounded-full border border-primary-pastel/70"
                  leftIcon={<Clock className="h-4 w-4" />}
                >
                  Đang tạm giữ
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Sổ Cái Lịch Sử Giao Dịch */}
        <Card
          variant="surface"
          density="none"
          className="overflow-hidden rounded-[28px] border border-border shadow-xs"
        >
          {/* Header & Bộ lọc */}
          <div className="space-y-4 border-b border-border bg-gradient-to-r from-primary-light/40 via-surface to-accent-vanilla/40 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Sổ cái lịch sử giao dịch
                </h2>
                <p className="text-xs text-muted-foreground">
                  Nhấp vào bất kỳ dòng giao dịch nào để mở biên lai đối soát chi
                  tiết
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start rounded-full bg-surface sm:self-auto"
                onClick={handleExportCsv}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Xuất CSV
              </Button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Segmented Type Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TYPE_TABS.map((tab) => {
                  const active = type === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setParam("type", tab.value)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-surface text-muted-foreground border border-border hover:border-primary-pastel hover:text-primary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tìm kiếm + Lọc trạng thái */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 sm:w-60 sm:flex-initial">
                  <Search
                    animated={false}
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm mã hoặc mô tả..."
                    className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa"
                      onClick={() => commitSearchNow("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={status}
                  onChange={(e) =>
                    setParam(
                      "status",
                      e.target.value as (typeof LECTURER_WALLETS_QUERY_SCHEMA.status.allowed)[number],
                    )
                  }
                  aria-label="Lọc trạng thái giao dịch"
                  className="h-9 rounded-full border border-border bg-surface px-3.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="completed">Thành công</option>
                  <option value="pending">Đang xử lý</option>
                  <option value="canceled">Đã hủy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nội dung bảng giao dịch */}
          {!transactionsData && !transactionsError ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : (transactionsData?.items?.length ?? 0) === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<WalletIcon className="h-8 w-8 text-primary" />}
                title="Chưa có giao dịch nào"
                description="Các giao dịch thu nhập, nạp và rút Coin sẽ hiển thị chi tiết tại đây."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-background/70">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Loại giao dịch
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Biến động Coin
                      </th>
                      <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Trạng thái
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Mô tả &amp; Mã chứng từ
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Thời gian
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {transactionsData?.items.map((item) => {
                      const tx = item.transaction;
                      const isIncome = isIncomeTransaction(tx);
                      const typeLabel = getTypeLabel(tx.type);
                      const badgeVariant =
                        tx.status === "completed"
                          ? "success"
                          : tx.status === "canceled" || tx.status === "failed"
                            ? "destructive"
                            : "warning";

                      return (
                        <tr
                          key={tx.id}
                          className="cursor-pointer transition-colors hover:bg-primary-light/20"
                          onClick={() =>
                            router.push(`/lecturer/wallets/transactions/${tx.id}`)
                          }
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                                  isIncome
                                    ? "border-success-border bg-success-bg text-success-foreground"
                                    : "border-accent-vanilla-border bg-accent-vanilla/70 text-warning-foreground"
                                }`}
                              >
                                {isIncome ? (
                                  <ArrowUpRight
                                    animated={false}
                                    className="h-4 w-4"
                                  />
                                ) : (
                                  <ArrowDownLeft
                                    animated={false}
                                    className="h-4 w-4"
                                  />
                                )}
                              </div>
                              <span className="text-sm font-semibold text-foreground">
                                {typeLabel}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div
                              className={`inline-flex items-center gap-1 font-display text-base font-bold tabular-nums ${
                                isIncome
                                  ? "text-warning-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              <Coins
                                animated={false}
                                className="h-4 w-4 text-[#C98A2C]"
                                aria-hidden="true"
                              />
                              <span>
                                {isIncome ? "+" : "-"}
                                {formatVndAsCoin(tx.amount, rateVnd)}
                              </span>
                            </div>
                            <p className="text-[11px] tabular-nums text-muted-foreground">
                              ≈ {formatCurrency(tx.amount)}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-center">
                            <Badge variant={badgeVariant} size="sm" dot>
                              {getStatusLabel(tx.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-sm truncate text-sm text-foreground">
                              {tx.description || "Không có mô tả"}
                            </p>
                            {tx.transaction_code && (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                Mã: {tx.transaction_code}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(tx.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-background/50 px-6 py-4 sm:flex-row">
                  <div className="text-xs tabular-nums text-muted-foreground">
                    Hiển thị {(page - 1) * limit + 1}–
                    {Math.min(page * limit, transactionsData?.total || 0)} trên
                    tổng{" "}
                    <strong className="text-foreground">
                      {transactionsData?.total || 0}
                    </strong>{" "}
                    giao dịch
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={limit}
                      onChange={(e) =>
                        setParam("limit", Number(e.target.value))
                      }
                      aria-label="Số dòng mỗi trang"
                      className="h-8 rounded-full border border-border bg-surface px-3 text-xs text-foreground"
                    >
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setParam("page", 1)}
                        disabled={page === 1}
                        aria-label="Trang đầu"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setParam("page", Math.max(1, page - 1))}
                        disabled={page === 1}
                        aria-label="Trang trước"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-2.5 text-xs font-semibold tabular-nums text-foreground">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setParam("page", Math.min(totalPages, page + 1))
                        }
                        disabled={page === totalPages}
                        aria-label="Trang sau"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setParam("page", totalPages)}
                        disabled={page === totalPages}
                        aria-label="Trang cuối"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-primary-pastel hover:text-primary disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </button>
                    </div>
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
