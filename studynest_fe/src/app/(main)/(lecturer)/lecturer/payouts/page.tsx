import Link from "next/link";

export default function LecturerPayoutsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-soft-sm">
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
          Thanh toán
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chức năng thanh toán cho giảng viên đang được quản lý trong mục rút
          tiền.
        </p>
        <Link
          href="/lecturer/withdraw"
          className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover shadow-soft-xs"
        >
          Đi tới rút tiền
        </Link>
      </section>
    </main>
  );
}
