import { WalletSummary } from "@/types/user/wallet";
import { HiCheckCircle, HiLockClosed, HiTrendingDown, HiTrendingUp } from "react-icons/hi";

interface Props {
  wallet: WalletSummary | null;
}

const formatCurrency = (val?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

const formatDateTime = (val?: string | null) => {
  if (!val) return "Chưa có giao dịch";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(val));
  } catch {
    return "Chưa có giao dịch";
  }
};

export function WalletSummaryCard({ wallet }: Props) {
  const isLocked = wallet?.is_locked ?? false;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-[#1B3348] via-[#244C73] to-[#356FA7] p-7 text-white shadow-lg ring-1 ring-white/15">
      {/* Vầng sáng nền hiệu ứng mây bồng bềnh */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[#BFD7ED]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            Số dư khả dụng
          </span>
          <p className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {formatCurrency(wallet?.balance)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-2xs backdrop-blur-md">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white"
              aria-hidden="true"
            >
              <path
                d="M4 8.5C4 6.567 5.567 5 7.5 5h9A3.5 3.5 0 0 1 20 8.5v7A3.5 3.5 0 0 1 16.5 19h-9A3.5 3.5 0 0 1 4 15.5v-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M16 12.5h1.2a1.3 1.3 0 0 0 0-2.6H16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {wallet?.currency || "VND"}
          </span>
        </div>
      </div>

      <div className="relative mt-7 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
        {/* Tổng nạp */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
            <HiTrendingUp className="h-4 w-4 text-[#A8D1FA]" />
            <span>Tổng nạp</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">
            {formatCurrency(wallet?.total_in)}
          </p>
        </div>

        {/* Tổng chi tiêu / rút */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
            <HiTrendingDown className="h-4 w-4 text-[#FDB8B8]" />
            <span>Tổng chi tiêu</span>
          </div>
          <p className="mt-1 text-base font-bold text-white">
            {formatCurrency(wallet?.total_out)}
          </p>
        </div>

        {/* Trạng thái ví */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/70">Trạng thái ví</p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {isLocked ? "Đã khóa tạm thời" : "Hoạt động bình thường"}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                isLocked
                  ? "border-red-300/40 bg-red-500/25 text-white"
                  : "border-white/30 bg-white/20 text-white"
              }`}
            >
              {isLocked ? (
                <>
                  <HiLockClosed className="h-3.5 w-3.5 text-red-200" />
                  <span>Đã khóa</span>
                </>
              ) : (
                <>
                  <HiCheckCircle className="h-3.5 w-3.5 text-[#A8D1FA]" />
                  <span>Sẵn sàng sử dụng</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Giao dịch gần nhất */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md sm:col-span-2">
          <p className="text-xs font-medium text-white/70">
            Giao dịch gần nhất
          </p>
          <p className="mt-0.5 text-sm font-medium text-white/95">
            {formatDateTime(wallet?.last_transaction_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
