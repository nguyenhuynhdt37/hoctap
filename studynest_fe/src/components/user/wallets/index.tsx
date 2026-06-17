"use client";

import api from "@/lib/utils/fetcher/client/axios";
import {
  WalletSummary,
  WalletTransaction,
  WalletTransactionsResponse,
} from "@/types/user/wallet";
import { useState } from "react";
import useSWR from "swr";
import { WalletDepositCard } from "./wallet-deposit-card";
import WalletHeader from "./wallet-header";
import { WalletSummaryCard } from "./wallet-summary-card";
import { WalletTransactionsTable } from "./wallet-transactions-table";

interface Props {
  wallet: WalletSummary | null;
  transactions: WalletTransaction[];
  error?: string | null;
}

const WALLET_ENDPOINT = "/wallets";
const TOP_TRANSACTIONS_ENDPOINT =
  "/user/transaction/top5?page=1&limit=5&order_by=created_at&order_dir=desc";

export default function WalletPage({ wallet, transactions, error }: Props) {
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryOrderId, setRetryOrderId] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState("");

  const { data: walletData, mutate: mutateWallet } = useSWR<WalletSummary>(
    WALLET_ENDPOINT,
    async (url) => {
      const res = await api.get(url);
      return res.data;
    },
    {
      fallbackData: wallet ?? undefined,
      revalidateOnFocus: false,
    }
  );

  const { data: topTransactions, mutate: mutateTransactions } =
    useSWR<WalletTransactionsResponse>(
      TOP_TRANSACTIONS_ENDPOINT,
      async (url) => {
        const res = await api.get(url);
        return res.data;
      },
      {
        fallbackData: {
          page: 1,
          limit: 5,
          total: transactions.length,
          transactions,
        },
        revalidateOnFocus: false,
      }
    );

  const handleDeposit = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    const cleanAmount = amount.replace(/[^\d]/g, "");
    const numAmount = Number(cleanAmount);

    if (!numAmount || numAmount < 50000) {
      setErrorMsg("Số tiền tối thiểu là 50,000 VND");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/wallets/create", {
        amount_vnd: numAmount,
        return_origin: window.location.origin,
        return_pathname: window.location.pathname,
      });

      if (res.data?.approve_url) {
        setSuccessMsg("Đã tạo giao dịch PayPal. Đang mở PayPal...");
        window.open(res.data.approve_url, "_blank", "noopener,noreferrer");
      } else {
        setSuccessMsg("Đã tạo giao dịch nạp tiền thành công");
      }

      setAmount("");
      await Promise.allSettled([mutateWallet(), mutateTransactions()]);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.detail || "Không thể tạo giao dịch nạp tiền"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (orderId?: string | null) => {
    if (!orderId) {
      setRetryMsg("Không tìm thấy mã PayPal");
      return;
    }

    setRetryMsg("");
    setRetryOrderId(orderId);

    try {
      const res = await api.post(`/wallets/retry_wallet_payment/${orderId}`);

      if (res.data?.approve_url) {
        window.open(res.data.approve_url, "_blank", "noopener,noreferrer");
        setRetryMsg("Đã mở lại PayPal. Hãy hoàn tất thanh toán");
      } else {
        setRetryMsg("Yêu cầu thanh toán lại đã được ghi nhận");
      }

      await mutateTransactions();
    } catch (err: any) {
      setRetryMsg(
        err?.response?.data?.detail ||
          "Không thể khôi phục giao dịch. Vui lòng thử lại"
      );
    } finally {
      setRetryOrderId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <WalletHeader />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <WalletSummaryCard wallet={walletData ?? null} />
        <WalletDepositCard
          amount={amount}
          loading={loading}
          error={errorMsg}
          success={successMsg}
          onAmountChange={setAmount}
          onDeposit={handleDeposit}
        />
      </div>

      <WalletTransactionsTable
        transactions={topTransactions?.transactions ?? []}
        retryOrderId={retryOrderId}
        onRetry={handleRetry}
      />

      {retryMsg && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            retryMsg.includes("Không")
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {retryMsg}
        </div>
      )}
    </div>
  );
}
