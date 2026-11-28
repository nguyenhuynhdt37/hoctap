"use client";

import Failed from "@/components/shared/transaction/failed";
import Success from "@/components/shared/transaction/success";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import api from "@/lib/utils/fetcher/client/axios";
import type {
  WalletTransaction,
  WalletTransactionsResponse,
} from "@/types/user/wallet";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 5;

const Transaction = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const orderId = searchParams.get("order_id");
  const transactionIdParam = searchParams.get("transaction_id");
  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"), "/wallets");

  const [transaction, setTransaction] = useState<WalletTransaction | null>(null);
  const [loadingTx, setLoadingTx] = useState<boolean>(
    Boolean(status === "success" && (orderId || transactionIdParam)),
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState<boolean>(false);

  // Tự động tra cứu bản ghi giao dịch thật theo order_id / transaction_id để lấy ID mở biên lai
  useEffect(() => {
    if (status !== "success") return;
    if (!orderId && !transactionIdParam) {
      setLoadingTx(false);
      return;
    }

    let cancelled = false;
    setLoadingTx(true);

    const lookup = async () => {
      try {
        if (transactionIdParam) {
          const res = await api.get<WalletTransaction>(
            `/user/transaction/${transactionIdParam}`,
          );
          if (!cancelled && res.data?.id) {
            setTransaction(res.data);
          }
          return;
        }
        if (orderId) {
          const res = await api.get<WalletTransactionsResponse>(
            `/user/transaction?search=${encodeURIComponent(orderId)}&limit=1`,
          );
          const matched = res.data?.transactions?.[0] ?? null;
          if (!cancelled && matched) {
            setTransaction(matched);
          }
        }
      } catch {
        // Fallback an toàn nếu không tra cứu được chi tiết
      } finally {
        if (!cancelled) setLoadingTx(false);
      }
    };

    void lookup();
    return () => {
      cancelled = true;
    };
  }, [status, orderId, transactionIdParam]);

  const resolvedTxId = transaction?.id || transactionIdParam || null;
  const receiptHref = resolvedTxId
    ? `/wallets/transactions/${resolvedTxId}`
    : "/wallets/transactions";

  useEffect(() => {
    if (status !== "success" || paused) return;
    if (secondsLeft <= 0) {
      router.replace(redirectUrl);
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [status, paused, secondsLeft, redirectUrl, router]);

  if (status === "success") {
    return (
      <Success
        orderId={orderId}
        transaction={transaction}
        loadingTx={loadingTx}
        receiptHref={receiptHref}
        redirectHref={redirectUrl}
        secondsLeft={secondsLeft}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
      />
    );
  }

  if (status === "failed" || status === "canceled") {
    return (
      <Failed
        orderId={orderId}
        statusLabel={
          status === "canceled"
            ? "Bạn đã hủy thanh toán"
            : "Thanh toán chưa hoàn tất"
        }
        redirectHref={redirectUrl}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 rounded-full border border-primary-pastel bg-surface px-6 py-3.5 text-sm font-semibold text-primary shadow-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Đang xác thực kết quả giao dịch...</span>
      </div>
    </div>
  );
};

export default Transaction;
