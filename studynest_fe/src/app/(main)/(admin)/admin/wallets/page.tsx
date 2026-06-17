import AdminWallets from "@/components/admin/wallets";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { PlatformWalletOverview } from "@/types/admin/wallet";
import { cookies } from "next/headers";
import { Suspense } from "react";

async function WalletDataLoader() {
  const stores = await cookies();
  const response = await fetcher("/admin/platform-wallet/overview", stores);

  if (!response.ok) {
    throw new Error("Không thể tải thông tin ví nền tảng");
  }

  const data: PlatformWalletOverview = await response.json();
  return <AdminWallets data={data} />;
}

export default async function WalletsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Đang tải thông tin ví...</p>
          </div>
        </div>
      }
    >
      <WalletDataLoader />
    </Suspense>
  );
}
