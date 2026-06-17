import Link from "next/link";

export default function LecturerPayoutsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
        <p className="mt-2 text-sm text-gray-600">
          Chức năng thanh toán cho giảng viên đang được quản lý trong mục rút
          tiền.
        </p>
        <Link
          href="/lecturer/withdraw"
          className="mt-5 inline-flex rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
        >
          Đi tới rút tiền
        </Link>
      </section>
    </main>
  );
}
