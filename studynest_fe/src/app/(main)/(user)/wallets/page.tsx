import WalletPage from "@/components/user/wallets";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import {
  WalletSummary,
  WalletTransaction,
  WalletTransactionsResponse,
} from "@/types/user/wallet";
import { cookies } from "next/headers";

const TRANSACTION_ENDPOINT =
  "/user/transaction/top5?page=1&limit=5&order_by=created_at&order_dir=desc";

export default async function Wallets() {
  const store = await cookies();

  let wallet: WalletSummary | null = null;
  let transactions: WalletTransaction[] = [];
  let error: string | null = null;

  try {
    const [walletResponse, transactionResponse] = await Promise.all([
      fetcher("/wallets", store),
      fetcher(TRANSACTION_ENDPOINT, store),
    ]);

    if (walletResponse.ok) {
      wallet = (await walletResponse.json()) as WalletSummary;
    } else {
      const errorData = await walletResponse.json().catch(() => ({}));
      error =
        errorData?.detail ||
        errorData?.message ||
        "Không thể tải thông tin ví. Vui lòng thử lại.";
    }

    if (transactionResponse.ok) {
      const transactionData =
        (await transactionResponse.json()) as WalletTransactionsResponse;
      transactions = transactionData.transactions || [];
    } else {
      const errorData = await transactionResponse.json().catch(() => ({}));
      if (!error) {
        error =
          errorData?.detail ||
          errorData?.message ||
          "Không thể tải lịch sử giao dịch.";
      }
    }
  } catch (err) {
    console.error("Wallet page error:", err);
    error = "Không thể kết nối đến server. Vui lòng thử lại.";
  }

  return (
    <WalletPage wallet={wallet} transactions={transactions} error={error} />
  );
}
