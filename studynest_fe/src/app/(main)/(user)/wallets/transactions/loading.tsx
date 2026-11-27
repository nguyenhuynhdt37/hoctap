export default function WalletTransactionsLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải lịch sử giao dịch"
      className="user-container space-y-6 py-8 animate-pulse"
    >
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm min-w-0 space-y-2.5">
          <div className="h-6 w-40 rounded-full bg-primary-light/80" />
          <div className="h-9 w-64 max-w-full rounded-2xl bg-primary-light/60" />
          <div className="h-4 w-96 max-w-full rounded-xl bg-border/60" />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <div className="h-9 w-28 rounded-full bg-primary-light/60" />
          <div className="h-9 w-28 rounded-full bg-primary-light/60" />
        </div>
      </div>

      {/* Hero 2 Columns Skeleton */}
      <div className="grid gap-5 lg:grid-cols-[1.28fr_1fr]">
        <div className="h-64 rounded-[30px] bg-primary/15" />
        <div className="h-64 rounded-[30px] border border-border bg-surface/80" />
      </div>

      {/* 4 Bento Cards Skeleton */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-[24px] border border-border bg-surface/80" />
        <div className="h-24 rounded-[24px] border border-border bg-surface/80" />
        <div className="h-24 rounded-[24px] border border-border bg-surface/80" />
        <div className="h-24 rounded-[24px] border border-border bg-surface/80" />
      </div>

      {/* Smart Dock Skeleton */}
      <div className="h-36 rounded-[26px] border border-border bg-surface/80" />

      {/* Timeline Skeleton */}
      <div className="space-y-3">
        <div className="h-20 rounded-[24px] border border-border bg-surface/80" />
        <div className="h-20 rounded-[24px] border border-border bg-surface/80" />
        <div className="h-20 rounded-[24px] border border-border bg-surface/80" />
      </div>
    </div>
  );
}
