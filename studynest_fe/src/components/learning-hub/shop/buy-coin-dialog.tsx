"use client";

import { Alert, Button, Modal } from "@/components/ui";
import { buyCoinQuote, formatVnd } from "@/lib/learning-hub/coin-logic";
import api from "@/lib/utils/fetcher/client/axios";
import { Coins } from "pulsoicon-react";
import { useId, useState } from "react";

const quickCoins = [10, 50, 100, 500] as const;

/** Nạp tiền qua PayPal để nhận Coin thật; Coin thưởng không mua được bằng tiền. */
export function BuyCoinDialog({ open, rateVnd, onClose }: { open: boolean; rateVnd: number; onClose: () => void }) {
  const inputId = useId();
  const [coin, setCoin] = useState(100);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const quote = buyCoinQuote(coin, rateVnd);

  async function pay() {
    if (!quote.valid || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await api.post("/wallets/create", {
        amount_vnd: quote.vnd,
        return_origin: window.location.origin,
        return_pathname: window.location.pathname,
      });
      if (!response.data?.approve_url) throw new Error("missing approve_url");
      window.open(response.data.approve_url, "_blank", "noopener,noreferrer");
      onClose();
    } catch {
      setError("Chưa tạo được giao dịch PayPal. Bạn thử lại nhé.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mua Coin" size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose} className="min-h-11">Đóng</Button>
        <Button isLoading={pending} loadingText="Đang mở PayPal…" disabled={!quote.valid} onClick={() => void pay()} className="min-h-11">
          Thanh toán {formatVnd(quote.vnd)}
        </Button>
      </>}>
      <p className="text-sm">1 Coin = {formatVnd(rateVnd)}. Coin mua bằng tiền dùng được cho khóa học và mọi giao dịch.</p>
      <div className="mt-4 space-y-2">
        <label htmlFor={inputId} className="block text-sm font-semibold">Số Coin muốn mua</label>
        <div className="relative">
          <input id={inputId} type="number" inputMode="numeric" min={1} step={1} value={coin || ""}
            onChange={(event) => setCoin(Math.floor(Number(event.target.value)) || 0)}
            aria-describedby={`${inputId}-hint`}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-20 text-base font-semibold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <Coins aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-accent-vanilla-foreground" />
        </div>
        <p id={`${inputId}-hint`} role={quote.valid ? undefined : "alert"} className={quote.valid ? "text-sm text-muted-foreground" : "text-sm text-destructive-foreground"}>
          {quote.valid ? `Bạn sẽ trả ${formatVnd(quote.vnd)}.` : quote.reason}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {quickCoins.map((value) => (
            <Button key={value} variant={coin === value ? "primary" : "outline"} size="sm" aria-pressed={coin === value}
              onClick={() => setCoin(value)} className="min-h-11 rounded-full px-4">{value} Coin</Button>
          ))}
        </div>
      </div>
      {error && <Alert className="mt-4" variant="destructive">{error}</Alert>}
    </Modal>
  );
}
