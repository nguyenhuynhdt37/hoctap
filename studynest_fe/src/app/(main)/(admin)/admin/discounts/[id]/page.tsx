import DiscountDataLoader from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DiscountDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <DiscountDataLoader discountId={id} />;
}
