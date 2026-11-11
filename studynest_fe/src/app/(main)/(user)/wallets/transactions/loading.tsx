export default function WalletTransactionsLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải lịch sử giao dịch"
      className="mx-auto max-w-5xl space-y-6 px-4 py-8 animate-pulse"
    >
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-2xl bg-primary-light/60" />
          <div className="h-4 w-80 rounded-xl bg-border/60" />
        </div>
        <div className="h-10 w-28 rounded-full bg-primary-light/70" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-20 rounded-[24px] border border-border bg-surface/80 p-4 shadow-xs" />

      {/* Table Skeleton */}
      <div className="rounded-[28px] border border-border bg-surface/80 p-6 shadow-xs">
        <div className="space-y-3">
          <div className="h-10 w-full rounded-xl bg-primary-light/40" />
          <div className="h-14 w-full rounded-xl bg-border/30" />
          <div className="h-14 w-full rounded-xl bg-border/20" />
          <div className="h-14 w-full rounded-xl bg-border/30" />
          <div className="h-14 w-full rounded-xl bg-border/20" />
        </div>
      </div>
    </div>
  );
}
