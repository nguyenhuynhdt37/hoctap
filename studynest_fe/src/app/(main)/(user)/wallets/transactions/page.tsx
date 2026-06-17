import WalletTransactions from "@/components/user/wallets/transactions";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import {
  WalletTransactionsQuery,
  WalletTransactionsResponse,
} from "@/types/user/wallet";
import { cookies } from "next/headers";

const defaultResponse: WalletTransactionsResponse = {
  page: 1,
  limit: 10,
  total: 0,
  transactions: [],
};

const defaultQuery: WalletTransactionsQuery = {
  page: 1,
  limit: 10,
  orderBy: "created_at" as const,
  orderDir: "desc" as const,
  search: "",
  status: "all",
  type: "all",
  method: "all",
};

export default async function WalletTransactionsPage() {
  const store = await cookies();

  let initialData: WalletTransactionsResponse = defaultResponse;
  let initialError: string | null = null;

  try {
    const queryString = new URLSearchParams({
      page: defaultQuery.page.toString(),
      limit: defaultQuery.limit.toString(),
      order_by: defaultQuery.orderBy,
      order_dir: defaultQuery.orderDir,
    }).toString();

    const response = await fetcher(`/user/transaction?${queryString}`, store);

    if (response.ok) {
      initialData = await response.json();
    } else {
      const errorData = await response.json().catch(() => ({}));
      initialError =
        errorData?.detail ||
        errorData?.message ||
        "Không thể tải danh sách giao dịch. Vui lòng thử lại.";
    }
  } catch (error) {
    console.error("Wallet transactions page error:", error);
    initialError =
      "Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối của bạn.";
  }

  return (
    <WalletTransactions
      initialData={initialData}
      initialQuery={defaultQuery}
      initialError={initialError}
    />
  );
}
