import { HubRouteGuard } from "@/components/learning-hub";
import { VoucherVault } from "@/components/user/vouchers/voucher-vault";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kho mã giảm giá của tôi | Mây Mây",
  description: "Quản lý mã thưởng cá nhân và ưu đãi khóa học trên Học viện Mây Mây.",
};

export default function VouchersPage() {
  return (
    <HubRouteGuard>
      <VoucherVault />
    </HubRouteGuard>
  );
}
