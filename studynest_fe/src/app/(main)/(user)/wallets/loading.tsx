export default function WalletLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải thông tin ví"
      className="mx-auto max-w-5xl space-y-8 px-4 py-8 animate-pulse"
    >
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-2xl bg-primary-light/60" />
        <div className="h-4 w-72 rounded-xl bg-border/60" />
      </div>

      {/* Grid: Summary Card + Deposit Card */}
      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        {/* Summary Card Skeleton */}
        <div className="h-[340px] rounded-[28px] border border-primary-pastel/60 bg-gradient-to-br from-[#1B3348]/20 via-[#264D73]/20 to-[#356FA7]/20 p-6 shadow-sm" />

        {/* Deposit Card Skeleton */}
        <div className="h-[340px] rounded-[28px] border border-border bg-surface/70 p-6 shadow-xs" />
      </div>

      {/* Transactions Table Skeleton */}
      <div className="rounded-[28px] border border-border bg-surface/80 p-6 shadow-xs">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-48 rounded-xl bg-border/80" />
          <div className="h-9 w-24 rounded-full bg-primary-light/70" />
        </div>
        <div className="space-y-3">
          <div className="h-10 w-full rounded-xl bg-primary-light/40" />
          <div className="h-14 w-full rounded-xl bg-border/30" />
          <div className="h-14 w-full rounded-xl bg-border/20" />
          <div className="h-14 w-full rounded-xl bg-border/30" />
        </div>
      </div>
    </div>
  );
}
