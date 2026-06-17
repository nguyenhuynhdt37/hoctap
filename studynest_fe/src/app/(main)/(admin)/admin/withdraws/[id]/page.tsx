import AdminWithdrawDetailComponent from "@/components/admin/withdraws/detail";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import type { AdminWithdrawDetail } from "@/types/admin/withdraw";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function WithdrawDataLoader({ id }: { id: string }) {
  const store = await cookies();
  const res = await fetcher(`/admin/withdraw/${id}`, store);
  if (!res.ok) {
    notFound();
  }
  const data: AdminWithdrawDetail = await res.json();
  return <AdminWithdrawDetailComponent data={data} />;
}

export default async function AdminWithdrawDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Đang tải chi tiết yêu cầu...</p>
          </div>
        </div>
      }
    >
      <WithdrawDataLoader id={id} />
    </Suspense>
  );
}
