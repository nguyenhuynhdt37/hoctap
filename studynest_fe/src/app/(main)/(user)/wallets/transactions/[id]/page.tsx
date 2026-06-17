import UserTransactionDetail from "@/components/user/wallets/detail";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Đang tải chi tiết giao dịch...</p>
          </div>
        </div>
      }
    >
      <UserTransactionDetail transactionId={id} />
    </Suspense>
  );
}
