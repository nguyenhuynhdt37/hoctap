import { HubRouteGuard } from "@/components/learning-hub";
import { HubPageSkeleton } from "@/components/learning-hub/hub-page-state";
import { ShopView } from "@/components/learning-hub/shop/shop-view";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Cửa hàng Mây | Mây Mây",
  description: "Thử và đổi khung avatar, danh hiệu và biểu tượng bằng Coin.",
};

export default function ShopPage() {
  return (
    <HubRouteGuard>
      <Suspense fallback={<HubPageSkeleton label="Đang tải Cửa hàng Mây" />}>
        <ShopView />
      </Suspense>
    </HubRouteGuard>
  );
}
