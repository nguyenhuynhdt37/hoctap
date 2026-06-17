import WalletTxnDetail from "@/components/admin/wallets/transactions/detail";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import type { PlatformWalletHistoryDetail } from "@/types/admin/platform-wallet";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function WalletTxnDataLoader({ id }: { id: string }) {
  const store = await cookies();
  const res = await fetcher<PlatformWalletHistoryDetail>(
    `/admin/platform-wallet/history/${id}`,
    store,
    { cache: "no-store", headers: { accept: "application/json" } }
  );
  if (!res.ok) {
    notFound();
  }
  const data: PlatformWalletHistoryDetail = await res.json();
  return <WalletTxnDetail data={data} />;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Đang tải chi tiết giao dịch ví...</p>
          </div>
        </div>
      }
    >
      <WalletTxnDataLoader id={id} />
    </Suspense>
  );
}
