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
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-3 inline-block h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">
              Đang tải chi tiết giao dịch...
            </p>
          </div>
        </div>
      }
    >
      <UserTransactionDetail transactionId={id} />
    </Suspense>
  );
}
