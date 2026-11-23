"use client";

import { PageDataScope, pageErrorMessage, PageLoadError, useProtectedPageSWR } from "@/components/shared/page-load-state";
import WalletTransactions from "@/components/user/wallets/transactions";
import type { WalletTransactionsQuery, WalletTransactionsResponse } from "@/types/user/wallet";
import WalletTransactionsLoading from "./loading";

const defaultQuery: WalletTransactionsQuery = {
  page: 1,
  limit: 10,
  orderBy: "created_at",
  orderDir: "desc",
  search: "",
  status: "all",
  type: "all",
  method: "all",
};

const queryString = new URLSearchParams({
  page: defaultQuery.page.toString(),
  limit: defaultQuery.limit.toString(),
  order_by: defaultQuery.orderBy,
  order_dir: defaultQuery.orderDir,
});

export default function WalletTransactionsLoader() {
  const { data, error, isValidating, mutate } = useProtectedPageSWR<WalletTransactionsResponse>(`/user/transaction?${queryString}`);

  if (!data && error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageLoadError
          message={pageErrorMessage(
            error,
            "Không thể tải danh sách giao dịch. Vui lòng thử lại.",
            "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.",
          )}
          onRetry={() => void mutate()}
          retrying={isValidating}
        />
      </div>
    );
  }

  if (!data) return <WalletTransactionsLoading />;

  return (
    <PageDataScope>
      <WalletTransactions initialData={data} initialQuery={defaultQuery} initialError={null} />
    </PageDataScope>
  );
}
