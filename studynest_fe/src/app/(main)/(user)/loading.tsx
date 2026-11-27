import { Skeleton } from "@/components/ui/states";

export default function UserLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải nội dung"
      className="mx-auto min-h-[65vh] max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
    >
      <Skeleton variant="text" className="h-9 w-64 max-w-full rounded-xl" />
      <Skeleton variant="text" className="h-4 w-96 max-w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="rect" className="h-64 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Đang tải nội dung…</span>
    </div>
  );
}
