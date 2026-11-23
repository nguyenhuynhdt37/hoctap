"use client";

import AdminWallets from "@/components/admin/wallets";
import { Alert, Button, Skeleton } from "@/components/ui";
import { useAuthedSWR } from "@/hooks/auth/useAuthedSWR";
import type { PlatformWalletOverview } from "@/types/admin/wallet";

export default function WalletDataLoader() {
  const { data, error, isValidating, mutate } = useAuthedSWR<PlatformWalletOverview>(
    "/admin/platform-wallet/overview",
    { shouldRetryOnError: false },
  );

  if (error) {
    return (
      <div>
        <Alert variant="destructive">Không thể tải thông tin ví nền tảng</Alert>
        <Button variant="outline" className="mt-4" disabled={isValidating} onClick={() => void mutate()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="space-y-6" role="status" aria-label="Đang tải thông tin ví">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((card) => <Skeleton key={card} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return <AdminWallets data={data} />;
}
