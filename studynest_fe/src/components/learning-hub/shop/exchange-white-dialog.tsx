"use client";

import { Alert, Button, CoinBadge, Modal } from "@/components/ui";
import { exchangeWhiteQuote, WHITE_PER_GOLD_EXCHANGE } from "@/lib/learning-hub/coin-logic";
import { hubEndpoints } from "@/lib/learning-hub/endpoints";
import api from "@/lib/utils/fetcher/client/axios";
import Link from "next/link";
import { ArrowRight, Coins } from "pulsoicon-react";
import { useId, useState } from "react";

const QUICK_GOLD = [1, 5, 10, 20, 50] as const;

export interface ExchangeWhiteResult {
  gold_spent: number;
  white_gained: number;
  paid: number;
  bonus: number;
  total: number;
}

export function ExchangeWhiteDialog({
  open,
  paidBalance,
  whiteBalance,
  onClose,
  onSuccess,
}: {
  open: boolean;
  paidBalance: number;
  whiteBalance: number;
  onClose: () => void;
  onSuccess: (result: ExchangeWhiteResult) => void;
}) {
  const inputId = useId();
  const [gold, setGold] = useState(5);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const quote = exchangeWhiteQuote(gold, paidBalance);
  const nextPaid = quote.valid ? paidBalance - quote.goldAmount : paidBalance;
  const nextWhite = quote.valid ? whiteBalance + quote.whiteGained : whiteBalance;

  async function submit() {
    if (!quote.valid || pending) return;
    setPending(true);
    setError("");
    try {
      const response = await api.post<ExchangeWhiteResult>(hubEndpoints.exchangeWhite, {
        gold_amount: quote.goldAmount,
      });
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Chưa đổi được lúc này. Bạn thử lại nhé.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quy đổi tại Cửa hàng"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="min-h-11">
            Đóng
          </Button>
          <Button
            isLoading={pending}
            loadingText="Đang đổi…"
            disabled={!quote.valid}
            onClick={() => void submit()}
            className="min-h-11 gap-1.5"
          >
            <span>Đổi</span>
            {quote.valid && (
              <>
                <CoinBadge kind="gold" amount={quote.goldAmount} surface="dark" size="sm" />
                <ArrowRight aria-hidden="true" className="size-3.5" />
                <CoinBadge kind="white" amount={`+${quote.whiteGained}`} surface="dark" size="sm" />
              </>
            )}
          </Button>
        </>
      }
    >
      {/* Tỷ lệ quy đổi trực quan bằng đồng xu */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-pastel/70 bg-primary-light/50 px-3.5 py-2.5 text-xs">
        <span className="font-semibold text-foreground">Tỷ lệ quy đổi</span>
        <span className="inline-flex items-center gap-1.5">
          <CoinBadge kind="gold" amount={1} size="sm" />
          <span className="font-bold text-muted-foreground">=</span>
          <CoinBadge kind="white" amount={WHITE_PER_GOLD_EXCHANGE} size="sm" />
        </span>
      </div>

      {/* Chọn nhanh */}
      <div className="mt-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Chọn nhanh
        </span>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {QUICK_GOLD.map((val) => {
            const selected = gold === val;
            return (
              <button
                key={val}
                type="button"
                aria-pressed={selected}
                onClick={() => setGold(val)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  selected
                    ? "border-[#C47E0A] bg-gradient-to-b from-[#FFF7DB] to-[#F7DE8C] text-[#784705] shadow-xs"
                    : "border-border bg-surface text-foreground hover:border-[#E2B545] hover:bg-[#FFFDF5]"
                }`}
              >
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Coins solid aria-hidden="true" animated={false} className="size-3.5 text-[#C47E0A]" />
                  <span>{val}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-[#475569] tabular-nums">
                  <span>→</span>
                  <Coins aria-hidden="true" animated={false} className="size-3 text-[#64748B]" />
                  <span>{val * WHITE_PER_GOLD_EXCHANGE}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nhập số lượng tùy ý */}
      <div className="mt-4 space-y-2">
        <label htmlFor={inputId} className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span>Số lượng muốn đổi</span>
          <span className="inline-flex items-center gap-1 font-normal text-muted-foreground">
            <span>Hiện có:</span>
            <CoinBadge kind="gold" amount={paidBalance} size="sm" />
          </span>
        </label>
        <div className="relative">
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={gold || ""}
            onChange={(event) => setGold(Math.floor(Number(event.target.value)) || 0)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-12 text-base font-bold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Coins
            solid
            aria-hidden="true"
            animated={false}
            className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-[#C47E0A]"
          />
        </div>
      </div>

      {/* Dự toán realtime số dư sau đổi */}
      <div className="mt-4 space-y-2 rounded-2xl border border-border bg-background/80 p-3.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Nhận ngay</span>
          <CoinBadge kind="white" amount={`+${quote.whiteGained}`} size="md" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
          <span className="text-muted-foreground">Số dư sau đổi</span>
          <span className="inline-flex items-center gap-1.5">
            <CoinBadge kind="gold" amount={nextPaid} size="sm" />
            <CoinBadge kind="white" amount={nextWhite} size="sm" />
          </span>
        </div>
      </div>

      {!quote.valid && quote.reason && (
        <p role="alert" className="mt-3 text-xs font-semibold text-destructive-foreground">
          {quote.reason}{" "}
          {gold > paidBalance && (
            <Link href="/wallets" className="underline underline-offset-4">
              Nạp thêm
            </Link>
          )}
        </p>
      )}

      {error && (
        <Alert className="mt-3" variant="destructive">
          {error}
        </Alert>
      )}
    </Modal>
  );
}
