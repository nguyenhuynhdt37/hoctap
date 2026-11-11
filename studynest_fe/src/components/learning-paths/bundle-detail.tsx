"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import useSWR from "swr";
import api from "@/lib/utils/fetcher/client/axios";
import { Button, Badge, Input, Modal } from "@/components/ui";
import { useUserStore } from "@/stores/user";
import type {
  Bundle,
  BundleQuote,
  BundleReceipt,
} from "@/types/learning-paths";
import { fetchLearning, price, LoadError, Loading, message } from "./shared";
export default function BundleDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const { data, error, mutate } = useSWR<Bundle>(
    `/bundles/${encodeURIComponent(slug)}`,
    fetchLearning,
  );
  const {
    data: quote,
    error: quoteError,
    mutate: refreshQuote,
    isValidating,
  } = useSWR<BundleQuote>(
    data
      ? [
          `/bundles/versions/${data.id}/quote${couponCode ? `?coupon_code=${encodeURIComponent(couponCode)}` : ""}`,
          user?.id,
        ]
      : null,
    ([url]: [string, string | undefined]) => fetchLearning<BundleQuote>(url),
    { revalidateOnFocus: false },
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const confirmation = useRef<HTMLDivElement>(null);
  const identity = useRef<{ hash: string; key: string } | null>(null);

  function open() {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setFailure("");
    setConfirm(true);
  }
  async function purchase() {
    if (!data || !quote || busy || isValidating) return;
    setBusy(true);
    setFailure("");
    try {
      const storageKey = `studynest:combo:${user?.id}:${data.id}:${quote.quote_hash}`;
      if (identity.current?.hash !== quote.quote_hash) {
        let stored: string | null = null;
        try {
          stored = sessionStorage.getItem(storageKey);
        } catch {}
        identity.current = {
          hash: quote.quote_hash,
          key: stored ?? crypto.randomUUID(),
        };
        try {
          sessionStorage.setItem(storageKey, identity.current.key);
        } catch {}
      }
      const { data: receipt } = await api.post<BundleReceipt>(
        "/bundles/checkout",
        {
          version_id: data.id,
          quote_hash: quote.quote_hash,
          idempotency_key: identity.current.key,
          coupon_code: quote.coupon_code,
        },
        { timeout: 30000 },
      );
      router.push(`/combo/don-hang/${receipt.id}`);
    } catch (error) {
      setFailure(message(error));
      setConfirm(false);
      await refreshQuote();
    } finally {
      setBusy(false);
    }
  }
  if (error) return <LoadError error={error} retry={() => mutate()} />;
  if (!data) return <Loading />;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 text-foreground sm:px-6">
      <Link className="text-sm text-primary underline" href="/combo">
        ← Tất cả combo
      </Link>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <section className="space-y-7">
          <header className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="primary">Combo · Phiên bản {data.version}</Badge>
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{data.title}</h1>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          </header>
          <h2 className="text-xl font-semibold">Các khóa có trong combo</h2>
          <div className="space-y-3">
            {data.items?.map((item) => (
              <article
                key={item.course_id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row"
              >
                {item.thumbnail && (
                  <img
                    alt=""
                    loading="lazy"
                    src={item.thumbnail}
                    className="aspect-video w-full rounded-xl object-cover sm:h-24 sm:w-40"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Giá lẻ tham chiếu: {price(item.list_price)}
                  </p>
                  <p className="text-sm text-primary">
                    Phần giá trong combo: {price(item.allocated_price)}
                  </p>
                  {item.slug && (
                    <Link
                      className="text-sm text-primary underline"
                      href={`/course/${item.slug}`}
                    >
                      Xem nội dung khóa
                    </Link>
                  )}
                  {!item.available && (
                    <p className="text-sm text-warning-foreground">
                      Tạm ngừng nhận đăng ký mới
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
          <section className="space-y-3 rounded-2xl bg-surface-muted p-6">
            <h2 className="font-semibold">Quyền lợi và hoàn tiền</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bạn nhận quyền học từng khóa được liệt kê tại thời điểm mua. Khóa
              bổ sung vào phiên bản sau không tự thuộc đơn đã mua.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.refund_policy}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Bạn có thể áp dụng một mã ưu đãi riêng của combo. Mã giảm giá khóa
              lẻ không áp dụng cho gói này.
            </p>
          </section>
        </section>
        <aside className="space-y-5 rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold">Báo giá của bạn</h2>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              setCouponCode(couponInput.trim().toUpperCase());
              setConfirm(false);
              setFailure("");
            }}
          >
            <Input
              label="Mã ưu đãi combo"
              maxLength={40}
              value={couponInput}
              disabled={busy}
              onChange={(event) =>
                setCouponInput(event.target.value.toUpperCase())
              }
              placeholder="Nhập mã nếu có"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={busy || !couponInput.trim() || isValidating}
              >
                Áp dụng
              </Button>
              {couponCode && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setCouponCode("");
                    setCouponInput("");
                    setConfirm(false);
                  }}
                >
                  Bỏ mã
                </Button>
              )}
            </div>
            {quote?.coupon_code && !quoteError && (
              <p role="status" className="text-xs text-success-foreground">
                Đang áp dụng {quote.coupon_code}.
              </p>
            )}
          </form>
          {quoteError ? (
            <LoadError error={quoteError} retry={() => refreshQuote()} />
          ) : !quote ? (
            <p role="status">Đang tính quyền sở hữu và giá…</p>
          ) : (
            <>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Giá trọn gói</dt>
                  <dd>{price(quote.full_price)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Phần đã sở hữu</dt>
                  <dd>− {price(quote.owned_credit)}</dd>
                </div>
                {Number(quote.discount_amount) > 0 && (
                  <div className="flex justify-between gap-4 text-success-foreground">
                    <dt>Mã {quote.coupon_code}</dt>
                    <dd>− {price(quote.discount_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold">
                  <dt>Cần thanh toán</dt>
                  <dd className="text-primary">{price(quote.total)}</dd>
                </div>
              </dl>
              {quote.items.some((i) => i.already_owned) && (
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {quote.items
                    .filter((i) => i.already_owned)
                    .map((i) => (
                      <li key={i.course_id}>✓ Đã sở hữu: {i.title}</li>
                    ))}
                </ul>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {user
                  ? quote.policy
                  : "Đăng nhập để loại trừ các khóa bạn đã sở hữu."}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Thời hạn gửi yêu cầu hoàn tiền: {quote.refund_days} ngày kể từ
                lúc mua, theo giá thực trả của từng khóa.
              </p>
              <Button fullWidth disabled={busy || isValidating} onClick={open}>
                {!user
                  ? "Đăng nhập để xem giá của bạn"
                  : Number(quote.total) === 0
                    ? "Xác nhận quyền học"
                    : "Tiếp tục mua bằng ví"}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                disabled={busy}
                onClick={() => refreshQuote()}
              >
                Cập nhật báo giá
              </Button>
            </>
          )}
          {failure && (
            <p role="alert" className="text-sm text-destructive-foreground">
              {failure}
            </p>
          )}
          <Link
            href="/wallets"
            className="block text-center text-sm text-primary underline"
          >
            Xem ví và nạp tiền
          </Link>
          <p className="text-xs text-muted-foreground">
            Chỉ trừ ví sau khi bạn xác nhận ở bước tiếp theo.
          </p>
        </aside>
      </div>
      <Modal
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
        title="Xác nhận mua combo"
        description="Kiểm tra danh sách và số tiền trước khi thanh toán."
        footer={
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Quay lại
            </Button>
            <Button
              disabled={busy || isValidating || !quote}
              onClick={purchase}
            >
              {busy ? "Đang xử lý…" : `Xác nhận ${price(quote?.total ?? 0)}`}
            </Button>
          </>
        }
      >
        <div
          ref={confirmation}
          tabIndex={-1}
          className="space-y-5 outline-none"
        >
          <p className="font-medium">{data.title}</p>
          {quote?.coupon_code && (
            <p className="text-sm text-success-foreground">
              Mã {quote.coupon_code} · Giảm {price(quote.discount_amount)}
            </p>
          )}
          <ul className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {quote?.items.map((i) => (
              <li
                key={i.course_id}
                className="flex justify-between gap-4 border-b border-border pb-2"
              >
                <span>
                  {i.title}
                  {i.already_owned ? " · Đã sở hữu" : ""}
                </span>
                <span className="shrink-0">{price(i.payable)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Thanh toán bằng số dư ví học tập. Phần hoàn tiền của từng khóa được
            giới hạn theo giá thực trả đã hiển thị.
          </p>
        </div>
      </Modal>
    </main>
  );
}
