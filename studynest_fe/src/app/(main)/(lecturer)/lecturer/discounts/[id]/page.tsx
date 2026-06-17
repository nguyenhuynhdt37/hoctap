import DiscountDetails from "@/components/lecturer/discounts/details";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DiscountDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <DiscountDetails discountId={id} />;
}

