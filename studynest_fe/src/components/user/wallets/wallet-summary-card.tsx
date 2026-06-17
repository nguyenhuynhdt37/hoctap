import { WalletSummary } from "@/types/user/wallet";

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
    <div className="relative overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-6 text-white shadow-lg">
      <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Số dư ví
          </span>
          <p className="text-3xl font-semibold sm:text-4xl">
            {formatCurrency(wallet?.balance)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white/90"
            >
              <path
                d="M4 8.5C4 6.567 5.567 5 7.5 5h9A3.5 3.5 0 0 1 20 8.5v7A3.5 3.5 0 0 1 16.5 19h-9A3.5 3.5 0 0 1 4 15.5v-7Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16 12.5h1.2a1.3 1.3 0 0 0 0-2.6H16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase">
            {wallet?.currency || "VND"}
          </span>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 text-sm text-white/80 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Tổng nạp
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_in)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Tổng rút
          </p>
          <p className="mt-1 text-base font-semibold text-white">
            {formatCurrency(wallet?.total_out)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Trạng thái
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {isLocked ? "Đã khóa" : "Đang hoạt động"}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                isLocked
                  ? "bg-red-500/15 text-red-500 border-red-400/40"
                  : "bg-white/15 text-white border-white/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isLocked ? "bg-red-500" : "bg-white"
                }`}
              />
              {isLocked ? "Ví đã khóa" : "Ví đang hoạt động"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Giao dịch gần nhất
          </p>
          <p className="mt-1 text-base font-medium text-white">
            {formatDateTime(wallet?.last_transaction_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
