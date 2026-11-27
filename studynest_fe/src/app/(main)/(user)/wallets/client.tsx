"use client";

import { PageDataScope, pageErrorMessage, useProtectedPageSWR } from "@/components/shared/page-load-state";
import { Button } from "@/components/ui";
import WalletPage from "@/components/user/wallets";
import type { WalletSummary, WalletTransactionsResponse } from "@/types/user/wallet";
import WalletLoading from "./loading";

const TRANSACTION_ENDPOINT =
  "/user/transaction/top5?page=1&limit=5&order_by=created_at&order_dir=desc";

export default function WalletLoader() {
  const wallet = useProtectedPageSWR<WalletSummary>("/wallets");
  const transactions = useProtectedPageSWR<WalletTransactionsResponse>(TRANSACTION_ENDPOINT);

  if ((!wallet.data && !wallet.error) || (!transactions.data && !transactions.error)) {
    return <WalletLoading />;
  }

  const networkError = "Không thể kết nối đến server. Vui lòng thử lại.";
  const error = wallet.error
    ? pageErrorMessage(wallet.error, "Không thể tải thông tin ví. Vui lòng thử lại.", networkError)
    : transactions.error
      ? pageErrorMessage(transactions.error, "Không thể tải lịch sử giao dịch.", networkError)
      : null;

  function retry() {
    if (wallet.error) void wallet.mutate();
    if (transactions.error) void transactions.mutate();
  }

  return (
    <>
      <PageDataScope>
        <WalletPage
          wallet={wallet.data ?? null}
          transactions={transactions.data?.transactions ?? []}
          error={error}
        />
      </PageDataScope>
      {error && (
        <div className="user-container max-w-5xl pb-8">
          <Button type="button" variant="outline" disabled={wallet.isValidating || transactions.isValidating} onClick={retry}>
            Thử lại
          </Button>
        </div>
      )}
    </>
  );
}
