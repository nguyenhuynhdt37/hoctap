import AdminRefundDetail from "@/components/admin/refunds/detail";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { AdminRefundDetailData } from "@/types/admin/refund";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function RefundDataLoader({ id }: { id: string }) {
  const store = await cookies();
  const res = await fetcher(`/admin/refunds/requests/${id}`, store);
  if (!res.ok) {
    notFound();
  }
  const data: AdminRefundDetailData = await res.json();
  return <AdminRefundDetail data={data} />;
}

export default async function AdminRefundDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">
              Đang tải chi tiết yêu cầu hoàn tiền...
            </p>
          </div>
        </div>
      }
    >
      <RefundDataLoader id={id} />
    </Suspense>
  );
}

