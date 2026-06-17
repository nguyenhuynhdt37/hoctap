import EditDiscount from "@/components/admin/discounts/edit";
import { fetcher } from "@/lib/utils/fetcher/server/fetcher";
import { DiscountDetail } from "@/types/admin/discount";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function DiscountEditDataLoader({
  discountId,
}: {
  discountId: string;
}) {
  const stores = await cookies();
  const response = await fetcher(`/admin/discounts/${discountId}`, stores);

  if (!response.ok) {
    notFound();
  }

  const data: DiscountDetail = await response.json();
  return <EditDiscount data={data} discountId={discountId} />;
}

export default async function EditDiscountPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Đang tải thông tin...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <DiscountEditDataLoader discountId={id} />
    </Suspense>
  );
}

