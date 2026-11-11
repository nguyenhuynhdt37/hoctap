"use client";
import Link from "next/link";
import useSWR from "swr";
import { fetchLearning, LoadError, Loading, price } from "./shared";
import type { BundleReceipt } from "@/types/learning-paths";
export function MyLearningPaths() {
  const { data, error, mutate } = useSWR<{
    items: { version_id: string; title: string; slug: string }[];
  }>("/learning-paths/my", fetchLearning);
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">Lộ trình của tôi</h1>
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <Loading />
      ) : data.items.length ? (
        data.items.map((item) => (
          <Link
            key={item.version_id}
            href={`/lo-trinh/${item.slug}?version=${item.version_id}`}
            className="block rounded-2xl border border-border bg-surface p-6 font-medium text-primary"
          >
            {item.title} →
          </Link>
        ))
      ) : (
        <p className="rounded-2xl border border-border bg-surface p-8">
          Bạn chưa theo dõi lộ trình nào.{" "}
          <Link href="/lo-trinh" className="text-primary underline">
            Khám phá lộ trình
          </Link>
        </p>
      )}
    </main>
  );
}
export function MyBundleOrders() {
  const { data, error, mutate } = useSWR<{ items: BundleReceipt[] }>(
    "/bundles/orders/my",
    fetchLearning,
  );
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">Đơn combo của tôi</h1>
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <Loading />
      ) : data.items.length ? (
        data.items.map((item) => (
          <Link
            key={item.id}
            href={`/combo/don-hang/${item.id}`}
            className="flex flex-wrap justify-between gap-4 rounded-2xl border border-border bg-surface p-6"
          >
            <span className="font-medium text-primary">{item.title} →</span>
            <span>{price(item.total_paid)}</span>
          </Link>
        ))
      ) : (
        <p className="rounded-2xl border border-border bg-surface p-8">
          Bạn chưa mua combo nào.
        </p>
      )}
    </main>
  );
}
export function BundleReceiptView({ id }: { id: string }) {
  const { data, error, mutate } = useSWR<BundleReceipt>(
    `/bundles/orders/${id}`,
    fetchLearning,
  );
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <header className="space-y-3 rounded-2xl border border-success-border bg-success-bg p-6">
            <p className="text-sm font-medium text-success-foreground">
              Đơn combo đã ghi nhận
            </p>
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <p>
              Tổng tiền đã thanh toán: <strong>{price(data.total_paid)}</strong>
            </p>
            {data.coupon_code && (
              <p className="text-sm text-success-foreground">
                Mã {data.coupon_code} · Đã giảm {price(data.discount_amount)}
              </p>
            )}
            <p className="break-all text-xs text-muted-foreground">
              Mã đơn: {data.id}
            </p>
          </header>
          <div className="space-y-3">
            {data.lines.map((line) => (
              <article
                key={line.id}
                className="space-y-2 rounded-2xl border border-border bg-surface p-5"
              >
                <h2 className="font-semibold">{line.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {line.already_owned
                    ? "Đã sở hữu trước khi mua combo"
                    : Number(line.paid) === 0
                      ? "Đã nhận quyền học miễn phí trong combo"
                      : line.purchase_status === "refunded"
                        ? `Đã hoàn tiền ${price(line.paid)}`
                        : `Đã thanh toán ${price(line.paid)}`}
                </p>
                {line.refund_deadline &&
                  line.purchase_status === "completed" &&
                  Number(line.paid) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Hạn gửi yêu cầu hoàn tiền:{" "}
                      {new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(line.refund_deadline))}{" "}
                      (giờ Việt Nam)
                    </p>
                  )}
                {line.purchase_item_id &&
                  line.purchase_status === "completed" &&
                  Number(line.paid) > 0 && (
                    <Link
                      className="text-sm text-primary underline"
                      href="/refunds/refundable"
                    >
                      Xem điều kiện hoặc yêu cầu hoàn tiền
                    </Link>
                  )}
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/my-learning"
              className="rounded-xl bg-primary px-5 py-3 text-primary-foreground"
            >
              Vào khóa học của tôi
            </Link>
            <Link
              href="/combo/don-hang"
              className="rounded-xl border border-border px-5 py-3 text-primary"
            >
              Tất cả đơn combo
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
