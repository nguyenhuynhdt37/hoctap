"use client";
import { useEffect, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Badge, Button, Input } from "@/components/ui";
import api from "@/lib/utils/fetcher/client/axios";
import type { BundleCoupon } from "@/types/learning-paths";
import {
  control,
  fetchLearning,
  LoadError,
  message,
  price,
} from "@/components/learning-paths/shared";
function localDate(value: string | number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function state(c: BundleCoupon) {
  if (!c.is_active) return "Đã tắt";
  if (new Date(c.ends_at).getTime() <= Date.now()) return "Hết hạn";
  if (c.max_uses !== null && c.usage_count >= c.max_uses) return "Hết lượt";
  if (new Date(c.starts_at).getTime() > Date.now()) return "Đã lên lịch";
  return "Đang áp dụng";
}
export default function CouponManager({
  bundleId,
  onStateChange,
}: {
  bundleId: string;
  onStateChange?: (value: { dirty: boolean; busy: boolean }) => void;
}) {
  const url = `/admin/bundles/${bundleId}/coupons`;
  const { data, error, mutate } = useSWR<{ items: BundleCoupon[] }>(
    url,
    fetchLearning,
  );
  const [editing, setEditing] = useState<BundleCoupon | "new" | null>(null);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    onStateChange?.({ dirty: !!editing && dirty, busy });
  }, [editing, dirty, busy, onStateChange]);
  function pending(value: boolean) {
    setBusy(value);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const optionalNumber = (name: string) =>
      String(form.get(name) || "").trim() ? Number(form.get(name)) : null;
    const payload = {
      code: String(form.get("code")).trim().toUpperCase(),
      discount_type: type,
      value: String(form.get("value")),
      min_total: String(form.get("min_total") || "0"),
      max_discount: type === "percent" ? optionalNumber("max_discount") : null,
      starts_at: new Date(String(form.get("starts_at"))).toISOString(),
      ends_at: new Date(String(form.get("ends_at"))).toISOString(),
      max_uses: optionalNumber("max_uses"),
      per_user_limit: Number(form.get("per_user_limit")),
      is_active: form.get("is_active") === "on",
    };
    pending(true);
    setFailure("");
    setNotice("");
    try {
      if (editing && editing !== "new")
        await api.put(`${url}/${editing.id}`, payload);
      else await api.post(url, payload);
      setEditing(null);
      setDirty(false);
      await mutate();
      setNotice("Đã lưu mã ưu đãi riêng của combo.");
    } catch (error) {
      setFailure(message(error));
    } finally {
      pending(false);
    }
  }
  async function toggle(coupon: BundleCoupon) {
    pending(true);
    setFailure("");
    setNotice("");
    try {
      await api.put(`${url}/${coupon.id}/active?active=${!coupon.is_active}`);
      await mutate();
      setNotice(coupon.is_active ? "Đã tắt mã ưu đãi." : "Đã bật mã ưu đãi.");
    } catch (error) {
      setFailure(message(error));
    } finally {
      pending(false);
    }
  }
  const selected = editing && editing !== "new" ? editing : null;
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Mỗi đơn dùng tối đa một mã của combo này, sau khi trừ phần đã sở hữu. Mã
        giảm giá khóa lẻ không áp dụng tại đây. Lượt đã dùng được giữ khi hoàn
        tiền.
      </p>
      {failure && (
        <p
          role="alert"
          className="rounded-xl bg-destructive-bg p-4 text-sm text-destructive-foreground"
        >
          {failure}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-success-bg p-4 text-sm text-success-foreground"
        >
          {notice}
        </p>
      )}
      {!editing && (
        <Button
          disabled={busy}
          onClick={() => {
            setType("percent");
            setEditing("new");
            setDirty(false);
            setFailure("");
          }}
        >
          ＋ Tạo mã ưu đãi
        </Button>
      )}
      {editing && (
        <form
          key={selected?.id || "new"}
          onSubmit={save}
          onChange={() => setDirty(true)}
          className="space-y-5 rounded-2xl border border-primary-pastel bg-background p-5"
        >
          <h3 className="font-semibold">
            {selected ? `Chỉnh sửa ${selected.code}` : "Tạo mã cho combo"}
          </h3>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <Input
              name="code"
              label="Mã ưu đãi"
              required
              minLength={3}
              maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9_-]+"
              defaultValue={selected?.code || ""}
              readOnly={!!selected?.usage_count}
              placeholder="VD: KHAIGIANG20"
            />
            <label className="space-y-2 text-sm">
              <span className="font-medium">Loại ưu đãi</span>
              <select
                className={control}
                value={type}
                onChange={(e) => setType(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">Theo phần trăm</option>
                <option value="fixed">Giảm tiền cố định</option>
              </select>
            </label>
            <Input
              name="value"
              label={type === "percent" ? "Mức giảm · %" : "Mức giảm · VND"}
              type="number"
              required
              min="0.01"
              max={type === "percent" ? 100 : undefined}
              step="0.01"
              defaultValue={selected?.value?.toString() || ""}
            />
            <Input
              name="min_total"
              label="Thanh toán tối thiểu · VND"
              type="number"
              required
              min={0}
              step="0.01"
              defaultValue={selected?.min_total?.toString() || "0"}
            />
            {type === "percent" && (
              <Input
                name="max_discount"
                label="Giảm tối đa · VND (không bắt buộc)"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={selected?.max_discount?.toString() || ""}
              />
            )}
            <Input
              name="max_uses"
              label="Tổng lượt tối đa (trống = không giới hạn)"
              type="number"
              min={1}
              step={1}
              defaultValue={selected?.max_uses ?? ""}
            />
            <Input
              name="per_user_limit"
              label="Lượt tối đa mỗi tài khoản"
              type="number"
              required
              min={1}
              max={1000}
              step={1}
              defaultValue={selected?.per_user_limit ?? 1}
            />
            <Input
              name="starts_at"
              label="Bắt đầu · giờ trên thiết bị"
              type="datetime-local"
              required
              defaultValue={localDate(
                selected?.starts_at || Date.now() - 60000,
              )}
            />
            <Input
              name="ends_at"
              label="Kết thúc · giờ trên thiết bị"
              type="datetime-local"
              required
              defaultValue={localDate(
                selected?.ends_at || Date.now() + 30 * 86400000,
              )}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                name="is_active"
                type="checkbox"
                className="accent-primary"
                defaultChecked={selected?.is_active ?? true}
              />
              Cho phép áp dụng theo lịch
            </label>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setDirty(false);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu mã ưu đãi"}
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <LoadError error={error} retry={() => mutate()} />
      ) : !data ? (
        <p role="status">Đang tải mã ưu đãi…</p>
      ) : !data.items.length ? (
        <p className="rounded-xl border border-dashed border-border p-7 text-center text-sm text-muted-foreground">
          Combo chưa có mã ưu đãi riêng.
        </p>
      ) : (
        <div className="space-y-3">
          {data.items.map((c) => (
            <article
              key={c.id}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-primary">{c.code}</strong>
                <Badge
                  variant={state(c) === "Đang áp dụng" ? "success" : "outline"}
                >
                  {state(c)}
                </Badge>
              </div>
              <p className="text-sm">
                Giảm{" "}
                {c.discount_type === "percent" ? `${c.value}%` : price(c.value)}
                {c.max_discount ? `, tối đa ${price(c.max_discount)}` : ""} ·
                Đơn từ {price(c.min_total)}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {new Date(c.starts_at).toLocaleString("vi-VN")} →{" "}
                {new Date(c.ends_at).toLocaleString("vi-VN")}
                <br />
                Đã dùng {c.usage_count}
                {c.max_uses ? `/${c.max_uses}` : " lượt"} · {c.per_user_limit}{" "}
                lượt/tài khoản
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !!editing}
                  onClick={() => {
                    setEditing(c);
                    setDirty(false);
                    setType(c.discount_type);
                    setFailure("");
                  }}
                >
                  Chỉnh sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || !!editing}
                  onClick={() => toggle(c)}
                >
                  {c.is_active ? "Tắt mã" : "Bật mã"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
